import { supabase } from '../app.js';
import deliveryService from '../services/deliveryService.js';

const ORDER_STATUSES = new Set([
	'pending',
	'confirmed',
	'preparing',
	'ready',
	'shipped',
	'delivered',
	'completed',
	'paid',
	'cancelled'
]);

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
		const { crop_id, quantity, delivery_info, deliveryMethod, delivery_address } = req.body;
		const buyer_id = req.session.user?.id;

		if (!crop_id || !quantity || !buyer_id) {
			return handleError(res, 400, 'Missing required fields: crop_id and quantity');
		}

		const qty = Number(quantity);
		if (!Number.isInteger(qty) || qty <= 0) {
			return handleError(res, 400, 'Quantity must be a positive integer');
		}

		const { data: crop, error: cropError } = await supabase
			.from('crops')
			.select('id, farmer_id, quantity, available')
			.eq('id', crop_id)
			.single();

		if (cropError?.code === 'PGRST116') {
			return handleError(res, 404, 'Crop not found');
		}
		if (cropError) throw cropError;
		if (!crop.available || crop.quantity < qty) {
			return handleError(res, 400, `Only ${crop.quantity} items available`);
		}

		let parsedDeliveryInfo = null;
		if (delivery_info) {
			parsedDeliveryInfo = typeof delivery_info === 'string' ? JSON.parse(delivery_info) : delivery_info;
		}
		if (!parsedDeliveryInfo && deliveryMethod) {
			parsedDeliveryInfo = { deliveryMethod };
		}

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.insert([
				{
					buyer_id,
					farmer_id: crop.farmer_id,
					crop_id,
					quantity: qty,
					delivery_info: parsedDeliveryInfo,
					delivery_address: delivery_address || null,
					status: 'pending'
				}
			])
			.select()
			.single();

		if (orderError) throw orderError;

		const remaining = crop.quantity - qty;
		const { error: cropUpdateError } = await supabase
			.from('crops')
			.update({
				quantity: remaining,
				available: remaining > 0
			})
			.eq('id', crop.id);

		if (cropUpdateError) throw cropUpdateError;

		res.status(201).json(order);
	} catch (err) {
		handleError(res, 500, 'Failed to create order', err.message);
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
		const { status, quantity, delivery_status, tracking_number, tracking_url } = req.body;

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

		const updatePayload = {};
		if (status !== undefined) {
			if (!ORDER_STATUSES.has(status)) {
				return handleError(res, 400, 'Invalid order status');
			}
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
		updatePayload.updated_at = new Date().toISOString();

		if (Object.keys(updatePayload).length === 1) {
			return handleError(res, 400, 'No valid fields provided to update');
		}

		const { data: updatedOrder, error: updateError } = await supabase
			.from('orders')
			.update(updatePayload)
			.eq('id', orderId)
			.select()
			.single();

		if (updateError) throw updateError;

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