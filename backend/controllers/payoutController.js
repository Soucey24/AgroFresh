import { supabase } from '../app.js';
import { createInAppNotifications } from '../services/notificationService.js';

export const listPayouts = async (req, res) => {
  try {
    const user = req.session.user;
    let query = supabase
      .from('payouts')
      .select('*, farmer:users!payouts_farmer_id_fkey(id,name,email,phone,payout_method,payout_provider,payout_account_name,payout_account_number), order:orders(id,status)')
      .order('created_at', { ascending: false });
    if (user.role === 'farmer') query = query.eq('farmer_id', user.id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
};

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

    const { data: farmer, error: farmerError } = await supabase.from('users')
      .select('payout_method,payout_provider,payout_account_name,payout_account_number')
      .eq('id', farmer_id).single();
    if (farmerError) throw farmerError;
    if (!farmer.payout_method || !farmer.payout_provider || !farmer.payout_account_name || !farmer.payout_account_number) {
      return res.status(400).json({ error: 'Complete your payout account details in Profile before requesting payment' });
    }

    const { data: existing } = await supabase.from('payouts')
      .select('id,status').eq('order_id', order_id).in('status', ['pending', 'processing', 'paid']).maybeSingle();
    if (existing) return res.status(409).json({ error: 'A payout already exists for this order', payout: existing });

    const reference_id = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert([
        {
          farmer_id,
          order_id,
          amount: numericAmount,
          status: 'pending',
          reference_id,
          provider_response: {
            payout_method: farmer.payout_method,
            payout_provider: farmer.payout_provider,
            payout_account_name: farmer.payout_account_name,
            payout_account_number: farmer.payout_account_number
          }
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

export const updatePayout = async (req, res) => {
  try {
    const payoutId = Number(req.params.id);
    const { status, admin_notes } = req.body;
    if (!['processing', 'paid', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid payout status' });
    const { data: payout, error: fetchError } = await supabase.from('payouts').select('*').eq('id', payoutId).single();
    if (fetchError) throw fetchError;
    const { data: updated, error } = await supabase.from('payouts').update({ status, admin_notes: admin_notes || null, processed_at: status === 'paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', payoutId).select().single();
    if (error) throw error;
    await createInAppNotifications({ userIds: [payout.farmer_id], type: 'payout_status', title: `Payout ${status}`, message: `Your payout request for order #${payout.order_id} is ${status}.`, link: '/farmers#quick-payout' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payout' });
  }
};