import crypto from 'crypto';
import axios from 'axios';
import { supabase } from '../app.js';
import { notifyPaymentCompleted } from '../services/notificationService.js';

const allowedMethods = new Set(['paystack']);
const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'refunded']);
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

console.log('[paystack] env loaded', {
  secretConfigured: Boolean(PAYSTACK_SECRET_KEY),
  secretPreview: PAYSTACK_SECRET_KEY ? `${PAYSTACK_SECRET_KEY.slice(0, 6)}...${PAYSTACK_SECRET_KEY.slice(-4)}` : 'missing',
  baseUrl: PAYSTACK_BASE_URL,
  callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'not-set'
});

const normalizePaystackStatus = (status) => {
	const normalized = String(status || '').toLowerCase();
	if (['success', 'completed'].includes(normalized)) return 'completed';
	if (['failed', 'error'].includes(normalized)) return 'failed';
	if (['pending', 'processing'].includes(normalized)) return 'pending';
	return 'pending';
};

const paystackRequest = async ({ method = 'get', url, data = {} }) => {
	if (!PAYSTACK_SECRET_KEY) {
		console.error('[paystack] missing secret key before request', { url, payload: data, baseUrl: PAYSTACK_BASE_URL });
		throw new Error('PAYSTACK_SECRET_KEY is not configured');
	}

	console.log('[paystack] sending request', {
		method: method.toUpperCase(),
		url: `${PAYSTACK_BASE_URL}${url}`,
		sendPayload: data
	});

	const response = await axios({
		method,
		url: `${PAYSTACK_BASE_URL}${url}`,
		headers: {
			Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
			'Content-Type': 'application/json'
		},
		data
	});

	console.log('[paystack] response received', {
		status: response.status,
		statusText: response.statusText,
		body: response.data
	});

	return response.data;
};

const verifyPaystackSignature = (payload, signature) => {
	if (!PAYSTACK_SECRET_KEY) {
		return true;
	}
	if (!signature) {
		return false;
	}
	const digest = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');
	return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};

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
		const { order_id, amount, payment_method, payment_channel, phone_number, email } = req.body;
		const buyer_id = req.session.user?.id;

		if (!order_id) {
			return handleError(res, 400, 'Order ID is required');
		}
		if (!amount) {
			return handleError(res, 400, 'Payment amount is required');
		}
		if (!payment_method) {
			return handleError(res, 400, 'Please select a payment method');
		}
		if (!buyer_id) {
			return handleError(res, 401, 'You must be logged in to make a payment');
		}
		if (!allowedMethods.has(payment_method)) {
			return handleError(res, 400, `Payment method '${payment_method}' is not available. Please use: ${Array.from(allowedMethods).join(', ')}`);
		}

		const numericAmount = Number(amount);
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			return handleError(res, 400, 'Payment amount must be greater than 0');
		}

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select('id, buyer_id, farmer_id, status')
			.eq('id', order_id)
			.eq('buyer_id', buyer_id)
			.single();

		if (orderError?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found. Please check and try again.');
		}
		if (orderError) throw orderError;
		if (['paid', 'completed', 'cancelled'].includes(order.status)) {
			return handleError(res, 400, `This order has already been ${order.status}. You cannot make another payment.`);
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
					status: 'pending',
					payment_provider: payment_method === 'paystack' ? 'paystack' : null
				}
			])
			.select()
			.single();

		if (paymentError) throw paymentError;

		let authorizationUrl = null;
		let accessCode = null;

		if (payment_method === 'paystack') {
			const paystackPayload = {
				email: email || req.session.user?.email || 'customer@agrofresh.local',
				amount: Math.round(numericAmount * 100),
				currency: 'GHS',
				reference: reference_id,
				callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.FRONTEND_URL || 'http://localhost:8080'}/checkout`,
				metadata: {
					order_id,
					customer_name: req.session.user?.name || 'AgroFresh customer',
					phone_number: phone_number || '',
					buyer_id,
					payment_method
				}
			};
			if (['card', 'bank', 'mobile_money', 'ussd'].includes(payment_channel)) {
				paystackPayload.channels = [payment_channel];
			}

			console.log('[paystack] initializing transaction', { payload: paystackPayload, buyer_id, order_id, amount: numericAmount });

			const paystackResponse = await paystackRequest({
				method: 'post',
				url: '/transaction/initialize',
				data: paystackPayload
			});

			if (!paystackResponse?.status || !paystackResponse?.data?.authorization_url) {
				throw new Error(paystackResponse?.message || 'Paystack initialization failed');
			}

			authorizationUrl = paystackResponse.data.authorization_url;
			accessCode = paystackResponse.data.access_code;

			const { error: updateError } = await supabase
				.from('payments')
				.update({
					payment_provider: 'paystack',
					transaction_id: accessCode,
					provider_response: paystackResponse.data,
					updated_at: new Date().toISOString()
				})
				.eq('id', payment.id);
			if (updateError) throw updateError;
		}

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
			access_code: accessCode,
			authorization_url: authorizationUrl,
			public_key: process.env.PAYSTACK_PUBLIC_KEY || null,
			amount: numericAmount,
			status: payment.status,
			provider: payment_method === 'paystack' ? 'paystack' : 'legacy'
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
			.update({ status: 'confirmed', updated_at: now })
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

export const verifyPayment = async (req, res) => {
	try {
		const reference = req.params.reference || req.query.reference;
		if (!reference) {
			return handleError(res, 400, 'Payment reference is required');
		}

		const verificationResponse = await paystackRequest({
			method: 'get',
			url: `/transaction/verify/${encodeURIComponent(reference)}`
		});

		if (!verificationResponse?.status) {
			return handleError(res, 400, verificationResponse?.message || 'Payment verification failed');
		}

		const eventData = verificationResponse.data || {};
		const nextStatus = normalizePaystackStatus(eventData.status);
		const { data: payment, error: paymentFetchError } = await supabase
			.from('payments')
			.select('*')
			.eq('reference_id', reference)
			.single();

		if (paymentFetchError?.code === 'PGRST116') {
			return handleError(res, 404, 'Payment not found');
		}
		if (paymentFetchError) throw paymentFetchError;

		const now = new Date().toISOString();
		const { error: updatePaymentError } = await supabase
			.from('payments')
			.update({
				status: nextStatus,
				transaction_id: eventData.reference || payment.transaction_id,
				provider_response: eventData,
				completed_at: nextStatus === 'completed' ? now : payment.completed_at,
				updated_at: now
			})
			.eq('id', payment.id);
		if (updatePaymentError) throw updatePaymentError;

		if (nextStatus === 'completed') {
			const { error: orderError } = await supabase
				.from('orders')
				.update({ status: 'confirmed', updated_at: now })
				.eq('id', payment.order_id);
			if (orderError) throw orderError;
			if (payment.status !== 'completed') {
				await notifyPaymentCompleted(payment.id);
			}
		}

		res.json({
			success: true,
			payment_id: payment.id,
			status: nextStatus,
			reference_id: reference,
			amount: Number(payment.amount),
			gateway_response: eventData.gateway_response
		});
	} catch (err) {
		handleError(res, 500, 'Failed to verify payment', err.message);
	}
};

export const paymentWebhook = async (req, res) => {
	try {
		const paystackSignature = req.headers['x-paystack-signature'];
		const payload = req.body || {};
		if (PAYSTACK_SECRET_KEY && paystackSignature && !verifyPaystackSignature(payload, paystackSignature)) {
			return handleError(res, 401, 'Invalid Paystack signature');
		}

		const event = payload.event;
		const eventData = payload.data || {};
		if (!event || !eventData) {
			return handleError(res, 400, 'Invalid webhook payload');
		}

		const reference_id = eventData.reference;
		if (!reference_id) {
			return handleError(res, 400, 'Reference is required in webhook payload');
		}

		const { data: payment, error: paymentFetchError } = await supabase
			.from('payments')
			.select('*')
			.eq('reference_id', reference_id)
			.single();

		if (paymentFetchError?.code === 'PGRST116') {
			return res.status(404).json({ success: false, message: 'Payment not found' });
		}
		if (paymentFetchError) throw paymentFetchError;

		const nextStatus = normalizePaystackStatus(eventData.status || event);
		const now = new Date().toISOString();

		const { error: webhookError } = await supabase.from('payment_webhooks').insert([
			{
				payment_id: payment.id,
				webhook_type: event,
				payload: payload,
				status: 'processed',
				processed_at: now
			}
		]);
		if (webhookError) throw webhookError;

		const { error: updatePaymentError } = await supabase
			.from('payments')
			.update({
				status: nextStatus,
				transaction_id: eventData.reference || payment.transaction_id,
				provider_response: eventData,
				completed_at: nextStatus === 'completed' ? now : payment.completed_at,
				updated_at: now
			})
			.eq('id', payment.id);
		if (updatePaymentError) throw updatePaymentError;

		if (nextStatus === 'completed') {
			const { error: orderError } = await supabase
				.from('orders')
				.update({ status: 'confirmed', updated_at: now })
				.eq('id', payment.order_id);
			if (orderError) throw orderError;
			if (payment.status !== 'completed') {
				await notifyPaymentCompleted(payment.id);
			}
		}

		const sessionState = nextStatus === 'completed' ? 'completed' : nextStatus === 'failed' ? 'cancelled' : 'expired';
		const { error: sessionError } = await supabase
			.from('payment_sessions')
			.update({ status: sessionState, updated_at: now })
			.eq('payment_id', payment.id)
			.eq('status', 'active');
		if (sessionError) throw sessionError;

		res.json({ success: true, payment_id: payment.id, status: nextStatus, reference_id });
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