import { db } from '../app.js';

export const createPayout = async (req, res) => {
  try {
    const { order_id, amount } = req.body;
    const farmer_id = req.session.user?.id;
    if (!order_id || !amount || !farmer_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Optionally, check that the order belongs to the farmer and is completed/paid
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ? AND farmer_id = ? AND (status = "completed" OR status = "paid")', [order_id, farmer_id]);
    if (orders.length === 0) {
      return res.status(400).json({ error: 'Order not found or not eligible for payout' });
    }
    // Insert payout request
    const [result] = await db.query(
      'INSERT INTO payouts (farmer_id, order_id, amount, status) VALUES (?, ?, ?, ?)',
      [farmer_id, order_id, amount, 'pending']
    );
    // Here you could trigger a payment process (integration with payment API)
    res.status(201).json({ id: result.insertId, farmer_id, order_id, amount, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payout request' });
  }
}; 