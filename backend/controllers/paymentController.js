import crypto from 'crypto';
import { supabase } from '../app.js';

const allowedMethods = new Set(['mtn-momo', 'vodafone-cash', 'airteltigo-money', 'card', 'bank-transfer']);
const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'refunded']);

const handleError = (res, status, message, details) => {
	if (details) {
		console.error(message, details);
	}
	res.status(status).json({ error: message });
};

const generateReferenceId = () => `AGRO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const generateSessionId = () => crypto.randomBytes(24).toString('hex');

export const createPayment = async (req, res) => {
	try {
		const { order_id, amount, payment_method, phone_number } = req.body;
		const buyer_id = req.session.user?.id;

		if (!order_id || !amount || !payment_method || !buyer_id) {
			return handleError(res, 400, 'Missing required fields: order_id, amount, payment_method');
		}
		if (!allowedMethods.has(payment_method)) {
			return handleError(res, 400, 'Unsupported payment method');
		}

		const numericAmount = Number(amount);
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			return handleError(res, 400, 'Amount must be a positive number');
		}

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select('id, buyer_id, farmer_id, status')
			.eq('id', order_id)
			.eq('buyer_id', buyer_id)
			.single();

		if (orderError?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (orderError) throw orderError;
		if (['paid', 'completed', 'cancelled'].includes(order.status)) {
			return handleError(res, 400, `Order cannot be paid in '${order.status}' state`);
		}

		const reference_id = generateReferenceId();
		const { data: payment, error: paymentError } = await supabase
			.from('payments')
			.insert([
				{
					order_id,
					buyer_id,
					farmer_id: order.farmer_id,
					amount: numericAmount,
					payment_method,
					phone_number: phone_number || null,
					reference_id,
					status: 'processing'
				}
			])
			.select()
			.single();

		if (paymentError) throw paymentError;

		const session_id = generateSessionId();
		const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
		const { error: sessionError } = await supabase.from('payment_sessions').insert([
			{
				session_id,
				payment_id: payment.id,
				buyer_id,
				amount: numericAmount,
				payment_method,
				status: 'active',
				expires_at: expiresAt
			}
		]);

		if (sessionError) throw sessionError;

		res.status(201).json({
			payment_id: payment.id,
			order_id,
			reference_id,
			session_id,
			amount: numericAmount,
			status: payment.status
		});
	} catch (err) {
		handleError(res, 500, 'Failed to create payment', err.message);
	}
};

export const getPaymentStatus = async (req, res) => {
	try {
		const paymentId = Number(req.params.payment_id);
		const user = req.session.user;

		const { data: payment, error } = await supabase
			.from('payments')
			.select('*')
			.eq('id', paymentId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'Payment not found');
		}
		if (error) throw error;

		if (![payment.buyer_id, payment.farmer_id].includes(user.id) && !['admin', 'vendor'].includes(user.role)) {
			return handleError(res, 403, 'Not authorized to view this payment');
		}

		res.json({
			payment_id: payment.id,
			order_id: payment.order_id,
			amount: Number(payment.amount),
			payment_method: payment.payment_method,
			status: payment.status,
			reference_id: payment.reference_id,
			transaction_id: payment.transaction_id,
			created_at: payment.created_at,
			completed_at: payment.completed_at
		});
	} catch (err) {
		handleError(res, 500, 'Failed to fetch payment status', err.message);
	}
};

export const simulatePaymentCompletion = async (req, res) => {
	try {
		const { payment_id } = req.body;
		const paymentId = Number(payment_id);
		if (!paymentId) return handleError(res, 400, 'payment_id is required');

		const { data: payment, error: fetchError } = await supabase
			.from('payments')
			.select('id, order_id, status')
			.eq('id', paymentId)
			.single();

		if (fetchError?.code === 'PGRST116') return handleError(res, 404, 'Payment not found');
		if (fetchError) throw fetchError;
		if (terminalStatuses.has(payment.status)) {
			return handleError(res, 400, `Payment is already ${payment.status}`);
		}

		const now = new Date().toISOString();
		const transactionId = `SIM-${Date.now()}`;

		const { error: updatePaymentError } = await supabase
			.from('payments')
			.update({ status: 'completed', completed_at: now, transaction_id: transactionId, updated_at: now })
			.eq('id', paymentId);
		if (updatePaymentError) throw updatePaymentError;

		const { error: updateOrderError } = await supabase
			.from('orders')
			.update({ status: 'paid', updated_at: now })
			.eq('id', payment.order_id);
		if (updateOrderError) throw updateOrderError;

		const { error: updateSessionError } = await supabase
			.from('payment_sessions')
			.update({ status: 'completed', updated_at: now })
			.eq('payment_id', paymentId)
			.eq('status', 'active');
		if (updateSessionError) throw updateSessionError;

		res.json({ message: 'Payment marked as completed', payment_id: paymentId, transaction_id: transactionId });
	} catch (err) {
		handleError(res, 500, 'Failed to simulate payment completion', err.message);
	}
};

export const paymentWebhook = async (req, res) => {
	try {
		const { reference_id, transaction_id, status, provider_data } = req.body;
		if (!reference_id || !status) {
			return handleError(res, 400, 'reference_id and status are required');
		}

		const { data: payment, error: paymentFetchError } = await supabase
			.from('payments')
			.select('*')
			.eq('reference_id', reference_id)
			.single();

		if (paymentFetchError?.code === 'PGRST116') {
			return handleError(res, 404, 'Payment not found');
		}
		if (paymentFetchError) throw paymentFetchError;

		const normalized = String(status).toLowerCase();
		let nextStatus = payment.status;
		if (['success', 'completed'].includes(normalized)) nextStatus = 'completed';
		if (['failed', 'error'].includes(normalized)) nextStatus = 'failed';
		if (normalized === 'cancelled') nextStatus = 'cancelled';

		const now = new Date().toISOString();

		const { error: webhookError } = await supabase.from('payment_webhooks').insert([
			{
				payment_id: payment.id,
				webhook_type: 'status_update',
				payload: req.body,
				status: 'processed',
				processed_at: now
			}
		]);
		if (webhookError) throw webhookError;

		const { error: updatePaymentError } = await supabase
			.from('payments')
			.update({
				status: nextStatus,
				transaction_id: transaction_id || payment.transaction_id,
				provider_response: provider_data || null,
				completed_at: nextStatus === 'completed' ? now : payment.completed_at,
				updated_at: now
			})
			.eq('id', payment.id);
		if (updatePaymentError) throw updatePaymentError;

		if (nextStatus === 'completed') {
			const { error: orderError } = await supabase
				.from('orders')
				.update({ status: 'paid', updated_at: now })
				.eq('id', payment.order_id);
			if (orderError) throw orderError;
		}

		const sessionState = nextStatus === 'completed' ? 'completed' : nextStatus === 'cancelled' ? 'cancelled' : 'expired';
		const { error: sessionError } = await supabase
			.from('payment_sessions')
			.update({ status: sessionState, updated_at: now })
			.eq('payment_id', payment.id)
			.eq('status', 'active');
		if (sessionError) throw sessionError;

		res.json({ success: true, payment_id: payment.id, status: nextStatus });
	} catch (err) {
		handleError(res, 500, 'Failed to process payment webhook', err.message);
	}
};

export const getPaymentHistory = async (req, res) => {
	try {
		const user = req.session.user;
		const { page = 1, limit = 20, status } = req.query;
		const pageNumber = Math.max(Number(page), 1);
		const pageSize = Math.min(Math.max(Number(limit), 1), 100);
		const from = (pageNumber - 1) * pageSize;
		const to = from + pageSize - 1;

		let query = supabase
			.from('payments')
			.select('*, order:orders(id, status), buyer:users!payments_buyer_id_fkey(id, name), farmer:users!payments_farmer_id_fkey(id, name)')
			.order('created_at', { ascending: false })
			.range(from, to);

		if (user.role === 'buyer') query = query.eq('buyer_id', user.id);
		if (user.role === 'farmer') query = query.eq('farmer_id', user.id);
		if (status) query = query.eq('status', status);

		const { data, error } = await query;
		if (error) throw error;

		res.json({ payments: data || [], page: pageNumber, limit: pageSize });
	} catch (err) {
		handleError(res, 500, 'Failed to fetch payment history', err.message);
	}
};

export const cancelPayment = async (req, res) => {
	try {
		const paymentId = Number(req.params.payment_id);
		const user = req.session.user;

		const { data: payment, error: fetchError } = await supabase
			.from('payments')
			.select('*')
			.eq('id', paymentId)
			.single();

		if (fetchError?.code === 'PGRST116') return handleError(res, 404, 'Payment not found');
		if (fetchError) throw fetchError;

		if (user.role !== 'admin' && payment.buyer_id !== user.id) {
			return handleError(res, 403, 'Not authorized to cancel this payment');
		}
		if (terminalStatuses.has(payment.status)) {
			return handleError(res, 400, `Cannot cancel payment in '${payment.status}' state`);
		}

		const now = new Date().toISOString();
		const { error: updateError } = await supabase
			.from('payments')
			.update({ status: 'cancelled', updated_at: now })
			.eq('id', paymentId);
		if (updateError) throw updateError;

		const { error: sessionError } = await supabase
			.from('payment_sessions')
			.update({ status: 'cancelled', updated_at: now })
			.eq('payment_id', paymentId)
			.eq('status', 'active');
		if (sessionError) throw sessionError;

		res.json({ message: 'Payment cancelled successfully', payment_id: paymentId });
	} catch (err) {
		handleError(res, 500, 'Failed to cancel payment', err.message);
	}
};