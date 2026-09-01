import { supabase } from '../app.js';
import deliveryService from '../services/deliveryService.js';
import { isFarmerApproved } from '../middleware/auth.js';
import { notifyOrderCreated, notifyOrderStatusChanged } from '../services/notificationService.js';

const ORDER_STATUSES = new Set([
	'pending_payment',
	'confirmed',
	'farmer_preparing',
	'sent_to_operations_centre',
	'received_at_centre',
	'quality_check',
	'ready_for_dispatch',
	'packed',
	'dispatched',
	'delivered',
	'payout_ready',
	'paid',
	'cancelled'
]);

// State machine: valid transitions for the buyer -> farmer -> operations flow
const STATE_TRANSITIONS = {
	pending_payment: ['confirmed', 'cancelled'],
	confirmed: ['farmer_preparing', 'cancelled'],
	farmer_preparing: ['sent_to_operations_centre', 'cancelled'],
	sent_to_operations_centre: ['received_at_centre', 'cancelled'],
	received_at_centre: ['quality_check', 'cancelled'],
	quality_check: ['ready_for_dispatch', 'packed', 'cancelled'],
	ready_for_dispatch: ['packed', 'dispatched', 'cancelled'],
	packed: ['dispatched', 'cancelled'],
	dispatched: ['delivered', 'cancelled'],
	delivered: ['payout_ready', 'completed'],
	payout_ready: ['paid'],
	paid: [],
	cancelled: []
};

const handleError = (res, status, message, details) => {
	if (details) {
		console.error(message, details);
	}
	res.status(status).json({ error: message });
};

const canAccessOrder = (user, order) => {
	if (!user || !order) return false;
	if (user.role === 'admin' || user.role === 'vendor') return true;
	return user.id === order.buyer_id || user.id === order.farmer_id;
};

const canTransitionOrder = (user) => {
	// Only operations staff and admin can transition orders through states
	return user && ['admin', 'operations'].includes(user.role);
};

const isValidTransition = (currentStatus, newStatus) => {
	if (currentStatus === newStatus) return true; // Same status is ok
	const allowedTransitions = STATE_TRANSITIONS[currentStatus] || [];
	return allowedTransitions.includes(newStatus);
};

const createPayoutForOrder = async (order) => {
	try {
		// Get payment info to determine if buyer has paid
		const { data: payment } = await supabase
			.from('payments')
			.select('id, amount, status')
			.eq('order_id', order.id)
			.eq('status', 'completed')
			.maybeSingle();

		if (!payment) {
			console.warn(`[payout] No completed payment found for order ${order.id}`);
			return null;
		}

		// Check if payout already exists for this order
		const { data: existing } = await supabase
			.from('payouts')
			.select('id, status')
			.eq('order_id', order.id)
			.in('status', ['pending', 'processing', 'paid'])
			.maybeSingle();

		if (existing) {
			console.log(`[payout] Payout already exists for order ${order.id}`);
			return existing;
		}

		// Create new payout
		const reference_id = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
		const { data: payout, error } = await supabase
			.from('payouts')
			.insert([
				{
					farmer_id: order.farmer_id,
					order_id: order.id,
					amount: payment.amount,
					status: 'pending',
					reference_id,
					provider_response: null
				}
			])
			.select()
			.single();

		if (error) {
			console.error('[payout] Failed to create payout:', error);
			return null;
		}

		console.log(`[payout] Created payout ${payout.id} for order ${order.id}`);
		return payout;
	} catch (err) {
		console.error('[payout] Error creating payout:', err.message);
		return null;
	}
};

export const listOrders = async (req, res) => {
	try {
		const user = req.session.user;
		let query = supabase
			.from('orders')
			.select('*, crop:crops(id, name, price, unit, image), buyer:users!orders_buyer_id_fkey(id, name), farmer:users!orders_farmer_id_fkey(id, name)')
			.order('created_at', { ascending: false });

		if (user.role === 'buyer') {
			query = query.eq('buyer_id', user.id);
		}
		if (user.role === 'farmer') {
			query = query.eq('farmer_id', user.id);
		}

		const { data, error } = await query;
		if (error) throw error;

		res.json(data || []);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch orders', err.message);
	}
};

export const createOrder = async (req, res) => {
	try {
		const { crop_id, quantity, delivery_info, deliveryMethod, delivery_method, delivery_address } = req.body;
		const buyer_id = req.session.user?.id;

		if (!crop_id) {
			return handleError(res, 400, 'Please select a crop to order');
		}
		if (!quantity) {
			return handleError(res, 400, 'Please enter the quantity');
		}
		if (!buyer_id) {
			return handleError(res, 401, 'You must be logged in to place an order');
		}

		const qty = Number(quantity);
		if (!Number.isInteger(qty) || qty <= 0) {
			return handleError(res, 400, 'Quantity must be a whole number greater than 0');
		}

		const { data: crop, error: cropError } = await supabase
			.from('crops')
			.select('id, farmer_id, quantity, available, users!crops_farmer_id_fkey(id, role)')
			.eq('id', crop_id)
			.single();

		if (cropError?.code === 'PGRST116') {
			return handleError(res, 404, 'This crop is no longer available');
		}
		if (cropError) throw cropError;

		const farmerApproved = await isFarmerApproved(crop.farmer_id);
		if (!farmerApproved) {
			console.warn('[order] Farmer not approved:', { farmerId: crop.farmer_id, cropId: crop_id });
			return handleError(res, 403, 'This farmer is not yet approved to sell. Please try another farmer.');
		}
		if (!crop.available) {
			return handleError(res, 400, 'This crop is currently unavailable');
		}
		if (crop.quantity < qty) {
			return handleError(res, 400, `Only ${crop.quantity} ${crop.quantity === 1 ? 'item' : 'items'} available. Please reduce your quantity.`);
		}

		let parsedDeliveryInfo = null;
		if (delivery_info) {
			try {
				parsedDeliveryInfo = typeof delivery_info === 'string' ? JSON.parse(delivery_info) : delivery_info;
			} catch (parseErr) {
				return handleError(res, 400, 'Invalid delivery information provided');
			}
		}
		if (!parsedDeliveryInfo && (deliveryMethod || delivery_method)) {
			parsedDeliveryInfo = { deliveryMethod: deliveryMethod || delivery_method };
		}

		const normalizedDeliveryMethod = (deliveryMethod || delivery_method || parsedDeliveryInfo?.deliveryMethod || parsedDeliveryInfo?.delivery_method || 'collection-point');
		const normalizedDeliveryAddress = delivery_address || parsedDeliveryInfo?.address || parsedDeliveryInfo?.pickupLocation || null;
		const normalizedDeliveryService = parsedDeliveryInfo?.deliveryService || normalizedDeliveryMethod;

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.insert([
				{
					buyer_id,
					farmer_id: crop.farmer_id,
					crop_id,
					quantity: qty,
					delivery_info: { ...parsedDeliveryInfo, deliveryMethod: normalizedDeliveryMethod, delivery_method: normalizedDeliveryMethod, deliveryService: normalizedDeliveryService },
					delivery_address: normalizedDeliveryAddress,
					delivery_service: normalizedDeliveryService,
					delivery_status: 'pending',
					status: 'pending_payment'
				}
			])
			.select()
			.single();

		if (orderError) {
			console.error('[order] Insert failed:', { orderError, payload: { buyer_id, farmer_id: crop.farmer_id, crop_id, quantity: qty, status: 'pending_payment' } });
			if (orderError.code === 'PGRST116') {
				return handleError(res, 500, 'Failed to save your order. Please try again.');
			}
			throw orderError;
		}

		const remaining = crop.quantity - qty;
		const { error: cropUpdateError } = await supabase
			.from('crops')
			.update({
				quantity: remaining,
				available: remaining > 0
			})
			.eq('id', crop.id);

		if (cropUpdateError) throw cropUpdateError;

		void notifyOrderCreated(order.id).catch((notificationError) => {
			console.error('[notifications] order creation SMS failed:', notificationError.message);
		});

		console.log('[order] Order created successfully:', { orderId: order.id, buyerId: buyer_id, farmerId: crop.farmer_id, cropId: crop_id });
		res.status(201).json(order);
	} catch (err) {
		console.error('[order] Error creating order:', { error: err.message, stack: err.stack });
		
		// Provide user-friendly error messages
		if (err.message.includes('unique') || err.message.includes('unique constraint')) {
			return handleError(res, 400, 'This order could not be created. Please try again.');
		}
		if (err.message.includes('violates foreign key')) {
			return handleError(res, 400, 'Invalid crop or farmer information');
		}
		
		handleError(res, 500, 'Failed to create your order. Please try again or contact support.', err.message);
	}
};

export const getOrder = async (req, res) => {
	try {
		const orderId = Number(req.params.id);
		const { data: order, error } = await supabase
			.from('orders')
			.select('*, crop:crops(*), buyer:users!orders_buyer_id_fkey(id, name, email), farmer:users!orders_farmer_id_fkey(id, name, email)')
			.eq('id', orderId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (error) throw error;

		if (!canAccessOrder(req.session.user, order)) {
			return handleError(res, 403, 'Not authorized to view this order');
		}

		res.json(order);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch order', err.message);
	}
};

export const updateOrder = async (req, res) => {
	try {
		const user = req.session.user;
		const orderId = Number(req.params.id);
		const { status, quantity, delivery_status, tracking_number, tracking_url, delivery_service, delivery_method, delivery_address } = req.body;

		const { data: order, error: fetchError } = await supabase
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single();

		if (fetchError?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (fetchError) throw fetchError;

		if (!canAccessOrder(user, order)) {
			return handleError(res, 403, 'Not authorized to update this order');
		}

		// Validate state transitions - operations/admin only
		if (status !== undefined && status !== order.status) {
			if (!canTransitionOrder(user)) {
				return handleError(res, 403, 'Only operations staff and admin can transition order statuses');
			}

			if (!ORDER_STATUSES.has(status)) {
				return handleError(res, 400, 'Invalid order status');
			}

			if (!isValidTransition(order.status, status)) {
				return handleError(res, 400, `Invalid transition from ${order.status} to ${status}. Valid transitions: ${STATE_TRANSITIONS[order.status]?.join(', ') || 'none'}`);
			}
		}

		const updatePayload = {};
		if (status !== undefined) {
			updatePayload.status = status;
		}

		if (quantity !== undefined) {
			const nextQty = Number(quantity);
			if (!Number.isInteger(nextQty) || nextQty <= 0) {
				return handleError(res, 400, 'Quantity must be a positive integer');
			}
			updatePayload.quantity = nextQty;
		}

		if (delivery_status !== undefined) updatePayload.delivery_status = delivery_status;
		if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
		if (tracking_url !== undefined) updatePayload.tracking_url = tracking_url;
		if (delivery_service !== undefined) updatePayload.delivery_service = delivery_service;
		if (delivery_method !== undefined) updatePayload.delivery_method = delivery_method;
		if (delivery_address !== undefined) updatePayload.delivery_address = delivery_address;
		updatePayload.updated_at = new Date().toISOString();

		if (Object.keys(updatePayload).length === 1 && !updatePayload.updated_at) {
			return handleError(res, 400, 'No valid fields provided to update');
		}

		const { data: updatedOrder, error: updateError } = await supabase
			.from('orders')
			.update(updatePayload)
			.eq('id', orderId)
			.select()
			.single();

		if (updateError) throw updateError;

		// Handle cancelled orders - restore crop quantity
		if (order.status !== 'cancelled' && updatePayload.status === 'cancelled') {
			const { data: crop } = await supabase
				.from('crops')
				.select('quantity')
				.eq('id', order.crop_id)
				.single();

			if (crop) {
				await supabase
					.from('crops')
					.update({ quantity: Number(crop.quantity) + Number(order.quantity), available: true })
					.eq('id', order.crop_id);
			}
		}

		// Auto-create payout when order is delivered
		if (order.status !== 'delivered' && updatePayload.status === 'delivered') {
			void createPayoutForOrder(updatedOrder).catch((err) => {
				console.error('[payout] Failed to create payout on delivery:', err.message);
			});
		}

		// Send status change notification
		if (updatePayload.status && updatePayload.status !== order.status) {
			void notifyOrderStatusChanged(order.id, updatePayload.status).catch((notificationError) => {
				console.error('[notifications] order status notification failed:', notificationError.message);
			});
		}

		res.json(updatedOrder);
	} catch (err) {
		handleError(res, 500, 'Failed to update order', err.message);
	}
};

export const deleteOrder = async (req, res) => {
	try {
		const user = req.session.user;
		const orderId = Number(req.params.id);

		const { data: order, error: fetchError } = await supabase
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single();

		if (fetchError?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (fetchError) throw fetchError;

		if (user.role !== 'admin' && user.id !== order.buyer_id) {
			return handleError(res, 403, 'Not authorized to delete this order');
		}

		const { error } = await supabase.from('orders').delete().eq('id', orderId);
		if (error) throw error;

		res.json({ message: 'Order deleted successfully' });
	} catch (err) {
		handleError(res, 500, 'Failed to delete order', err.message);
	}
};

export const salesReport = async (req, res) => {
	try {
		const farmerId = req.session.user?.id;
		const { data: rows, error } = await supabase
			.from('orders')
			.select('id, quantity, status, created_at, crop:crops(name, price)')
			.eq('farmer_id', farmerId)
			.order('created_at', { ascending: false });

		if (error) throw error;

		const report = (rows || []).map((row) => ({
			orderId: row.id,
			cropName: row.crop?.name || 'Unknown',
			quantity: row.quantity,
			status: row.status,
			createdAt: row.created_at,
			total: Number(row.quantity) * Number(row.crop?.price || 0)
		}));

		const totalSales = report
			.filter((item) => ['paid', 'completed'].includes(item.status))
			.reduce((sum, item) => sum + item.total, 0);

		res.json({ totalSales, report });
	} catch (err) {
		handleError(res, 500, 'Failed to generate sales report', err.message);
	}
};

export const getOrderTracking = async (req, res) => {
	try {
		const orderId = Number(req.params.id);
		const { data: order, error } = await supabase
			.from('orders')
			.select('id, buyer_id, farmer_id')
			.eq('id', orderId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (error) throw error;

		if (!canAccessOrder(req.session.user, order)) {
			return handleError(res, 403, 'Not authorized to view tracking');
		}

		const data = await deliveryService.getOrderTracking(orderId);
		res.json(data);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch tracking data', err.message);
	}
};

export const updateOrderTracking = async (req, res) => {
	try {
		const orderId = Number(req.params.id);
		const user = req.session.user;

		if (!['admin', 'vendor', 'farmer'].includes(user.role)) {
			return handleError(res, 403, 'Not authorized to update tracking');
		}

		const trackingInfo = {
			tracking_number: req.body.tracking_number || null,
			tracking_url: req.body.tracking_url || null,
			delivery_status: req.body.status || req.body.delivery_status || null
		};

		const data = await deliveryService.updateOrderTracking(orderId, trackingInfo);
		res.json({ message: 'Tracking updated', order: data });
	} catch (err) {
		handleError(res, 500, 'Failed to update tracking', err.message);
	}
};

export const createDelivery = async (req, res) => {
	try {
		const { orderId, order_id, deliveryInfo, cartItems } = req.body;
		const selectedOrderId = Number(orderId || order_id);

		if (!selectedOrderId || !deliveryInfo) {
			return handleError(res, 400, 'orderId and deliveryInfo are required');
		}

		const { data: order, error } = await supabase
			.from('orders')
			.select('id, buyer_id, farmer_id')
			.eq('id', selectedOrderId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (error) throw error;

		if (!canAccessOrder(req.session.user, order)) {
			return handleError(res, 403, 'Not authorized to create delivery for this order');
		}

		const result = await deliveryService.createSendstackDelivery({
			orderId: selectedOrderId,
			deliveryInfo,
			cartItems: cartItems || []
		});

		res.status(201).json(result);
	} catch (err) {
		handleError(res, 500, 'Failed to create delivery', err.message);
	}
};