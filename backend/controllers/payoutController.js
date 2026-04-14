import { supabase } from '../app.js';

export const createPayout = async (req, res) => {
  try {
    const { order_id, amount } = req.body;
    const farmer_id = req.session.user?.id;
    if (!order_id || !amount || !farmer_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, farmer_id')
      .eq('id', order_id)
      .eq('farmer_id', farmer_id)
      .in('status', ['completed', 'paid'])
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }
    if (!order) {
      return res.status(400).json({ error: 'Order not found or not eligible for payout' });
    }

    const reference_id = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert([
        {
          farmer_id,
          order_id,
          amount: numericAmount,
          status: 'pending',
          reference_id
        }
      ])
      .select('*')
      .single();

    if (payoutError) {
      throw payoutError;
    }

    res.status(201).json(payout);
  } catch (err) {
    console.error('Failed to create payout request', err);
    res.status(500).json({ error: 'Failed to create payout request' });
  }
}; 