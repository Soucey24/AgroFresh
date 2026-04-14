import { supabase } from '../app.js';
import crypto from 'crypto';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

const generateReferenceId = () => {
  return `AGRO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const createPayment = async (req, res) => {
  try {
    const { order_id, amount, payment_method, phone_number } = req.body;
    const buyer_id = req.session.user?.id;

    // Validation
    if (!order_id || !amount || !payment_method || !buyer_id) {
      return handleError(res, 400, 'Missing required fields: order_id, amount, payment_method');
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('farmer_id')
      .eq('id', order_id)
      .eq('buyer_id', buyer_id)
      .single();

    if (orderError && orderError.code === 'PGRST116') {
      return handleError(res, 404, 'Order not found');
    }

    if (orderError) throw orderError;

    const farmer_id = order.farmer_id;
    const reference_id = generateReferenceId();

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        order_id,
        buyer_id,
        farmer_id,
        amount: parseFloat(amount),
        payment_method,
        phone_number: phone_number || null,
        reference_id,
        status: 'pending'
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create payment session
    const session_id = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { error: sessionError } = await supabase
      .from('payment_sessions')
      .insert([{
        session_id,
        payment_id: payment.id,
        buyer_id,
        amount: parseFloat(amount),
        payment_method,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      }]);

    if (sessionError) throw sessionError;

    res.status(201).json({
      payment_id: payment.id,
      session_id,
      reference_id,
      status: 'pending',
      message: 'Payment initiated successfully'
    });
  } catch (err) {
    handleError(res, 500, 'Failed to create payment', err.message);
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const user_id = req.session.user?.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (error && error.code === 'PGRST116') {
      return handleError(res, 404, 'Payment not found');
    }

    if (error) throw error;

    // Authorization: only buyer or farmer can view
    if (user_id !== payment.buyer_id && user_id !== payment.farmer_id) {
      return handleError(res, 403, 'Not authorized to view this payment');
    }

    res.json({
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: parseFloat(payment.amount),
      payment_method: payment.payment_method,
      status: payment.status,
      reference_id: payment.reference_id,
      created_at: payment.created_at,
      completed_at: payment.completed_at
    });
  } catch (err) {
    handleError(res, 500, 'Failed to get payment status', err.message);
  }
};

export const paymentWebhook = async (req, res) => {
  try {
    const { reference_id, transaction_id, status, message, provider_data } = req.body;

    // Validation
    if (!reference_id || !status) {
      return handleError(res, 400, 'Missing required fields: reference_id, status');
    }

    // Get payment by reference ID
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference_id', reference_id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return handleError(res, 404, 'Payment not found');
    }

    if (fetchError) throw fetchError;

    // Store webhook data
    const { error: webhookError } = await supabase
      .from('payment_webhooks')
      .insert([{
        payment_id: payment.id,
        webhook_type: 'status_update',
        payload: req.body,
        status: 'pending'
      }]);

    if (webhookError) throw webhookError;

    // Determine new payment status
    let newStatus = payment.status;
    let completedAt = null;

    if (['success', 'completed'].includes(status)) {
      newStatus = 'completed';
      completedAt = new Date().toISOString();
    } else if (['failed', 'error'].includes(status)) {
      newStatus = 'failed';
    } else if (status === 'cancelled') {
      newStatus = 'cancelled';
    }

    // Update payment
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        completed_at: completedAt,
        transaction_id: transaction_id || null,
        provider_response: provider_data || null
      })
      .eq('id', payment.id);

    if (updateError) throw updateError;

    // Update order status if payment completed
    if (newStatus === 'completed') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', payment.order_id);

      if (orderError) throw orderError;
    }

    // Update payment session
    const sessionStatus = newStatus === 'completed' ? 'completed' : newStatus === 'failed' ? 'failed' : 'active';
    
    const { error: sessionError } = await supabase
      .from('payment_sessions')
      .update({ status: sessionStatus })
      .eq('payment_id', payment.id);

    if (sessionError) throw sessionError;

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      payment_id: payment.id,
      new_status: newStatus
    });
  } catch (err) {
    handleError(res, 500, 'Failed to process webhook', err.message);
  }
};

export const getPaymentSessions = async (req, res) => {
  try {
    const user_id = req.session.user?.id;

    const { data: sessions, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('buyer_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(sessions || []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch payment sessions', err.message);
  }
};

export const updatePaymentSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'expired', 'cancelled'].includes(status)) {
      return handleError(res, 400, 'Invalid status');
    }

    const { error } = await supabase
      .from('payment_sessions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session_id);

    if (error) throw error;

    res.json({ message: 'Payment session updated' });
  } catch (err) {
    handleError(res, 500, 'Failed to update payment session', err.message);
  }
};
