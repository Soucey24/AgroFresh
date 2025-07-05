import { db } from '../app.js';
import crypto from 'crypto';

// Generate unique reference ID for payments
const generateReferenceId = () => {
  return `AGRO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Generate session ID for payment sessions
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create a new payment
export const createPayment = async (req, res) => {
  try {
    const { order_id, amount, payment_method, phone_number, delivery_info } = req.body;
    const buyer_id = req.session.user?.id;

    if (!order_id || !amount || !payment_method || !buyer_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get order details
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ? AND buyer_id = ?', [order_id, buyer_id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    const farmer_id = order.farmer_id;

    // Create payment record
    const reference_id = generateReferenceId();
    const [paymentResult] = await db.query(
      `INSERT INTO payments (order_id, buyer_id, farmer_id, amount, payment_method, phone_number, reference_id, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, buyer_id, farmer_id, amount, payment_method, phone_number || null, reference_id, JSON.stringify({ delivery_info })]
    );

    const payment_id = paymentResult.insertId;

    // Create payment session
    const session_id = generateSessionId();
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await db.query(
      `INSERT INTO payment_sessions (session_id, payment_id, buyer_id, amount, payment_method, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session_id, payment_id, buyer_id, amount, payment_method, expires_at]
    );

    res.status(201).json({
      payment_id,
      session_id,
      reference_id,
      status: 'processing',
      message: 'Payment initiated successfully'
    });

  } catch (err) {
    console.error('Payment creation error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const user_id = req.session.user?.id;

    const [payments] = await db.query(
      `SELECT p.*, ps.session_id, ps.status as session_status 
       FROM payments p 
       LEFT JOIN payment_sessions ps ON p.id = ps.payment_id 
       WHERE p.id = ? AND (p.buyer_id = ? OR p.farmer_id = ?)`,
      [payment_id, user_id, user_id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];
    res.json({
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      status: payment.status,
      reference_id: payment.reference_id,
      created_at: payment.created_at,
      completed_at: payment.completed_at
    });

  } catch (err) {
    console.error('Payment status error:', err);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

// Webhook endpoint for payment providers
export const paymentWebhook = async (req, res) => {
  try {
    const { reference_id, transaction_id, status, message, provider_data } = req.body;

    if (!reference_id || !status) {
      return res.status(400).json({ error: 'Missing required webhook data' });
    }

    // Get payment by reference ID
    const [payments] = await db.query('SELECT * FROM payments WHERE reference_id = ?', [reference_id]);
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Store webhook data
    await db.query(
      `INSERT INTO payment_webhooks (payment_id, webhook_type, payload) VALUES (?, ?, ?)`,
      [payment.id, 'status_update', JSON.stringify(req.body)]
    );

    // Update payment status
    let newStatus = payment.status;
    let completed_at = null;

    if (status === 'success' || status === 'completed') {
      newStatus = 'completed';
      completed_at = new Date();
      
      // Update order status to paid
      await db.query('UPDATE orders SET status = "paid" WHERE id = ?', [payment.order_id]);
    } else if (status === 'failed' || status === 'error') {
      newStatus = 'failed';
    } else if (status === 'cancelled') {
      newStatus = 'cancelled';
    }

    await db.query(
      `UPDATE payments SET status = ?, completed_at = ?, provider_response = JSON_MERGE_PATCH(provider_response, ?) 
       WHERE id = ?`,
      [newStatus, completed_at, JSON.stringify({ last_webhook: req.body }), payment.id]
    );

    // Update payment session status
    if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
      await db.query(
        `UPDATE payment_sessions SET status = ? WHERE payment_id = ?`,
        [newStatus === 'completed' ? 'completed' : 'cancelled', payment.id]
      );
    }

    res.json({ success: true, message: 'Webhook processed successfully' });

  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// Simulate payment completion (for testing)
export const simulatePaymentCompletion = async (req, res) => {
  try {
    const { payment_id, status = 'completed' } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    const [payments] = await db.query('SELECT * FROM payments WHERE id = ?', [payment_id]);
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];
    let completed_at = null;

    if (status === 'completed') {
      completed_at = new Date();
      await db.query('UPDATE orders SET status = "paid" WHERE id = ?', [payment.order_id]);
    }

    await db.query(
      `UPDATE payments SET status = ?, completed_at = ? WHERE id = ?`,
      [status, completed_at, payment_id]
    );

    res.json({ 
      success: true, 
      message: `Payment ${status} successfully`,
      payment_id,
      status,
      completed_at
    });

  } catch (err) {
    console.error('Payment simulation error:', err);
    res.status(500).json({ error: 'Failed to simulate payment' });
  }
};

// Get payment history for user
export const getPaymentHistory = async (req, res) => {
  try {
    const user_id = req.session.user?.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.buyer_id = ? OR p.farmer_id = ?';
    let params = [user_id, user_id];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    const [payments] = await db.query(
      `SELECT p.*, o.status as order_status 
       FROM payments p 
       LEFT JOIN orders o ON p.order_id = o.id 
       ${whereClause} 
       ORDER BY p.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [totalCount] = await db.query(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

// Cancel payment
export const cancelPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const user_id = req.session.user?.id;

    const [payments] = await db.query(
      'SELECT * FROM payments WHERE id = ? AND buyer_id = ? AND status IN ("pending", "processing")',
      [payment_id, user_id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found or cannot be cancelled' });
    }

    await db.query(
      'UPDATE payments SET status = "cancelled" WHERE id = ?',
      [payment_id]
    );

    await db.query(
      'UPDATE payment_sessions SET status = "cancelled" WHERE payment_id = ?',
      [payment_id]
    );

    res.json({ success: true, message: 'Payment cancelled successfully' });

  } catch (err) {
    console.error('Payment cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
}; 