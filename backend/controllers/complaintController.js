import { supabase } from '../app.js';
import { createInAppNotifications } from '../services/notificationService.js';

const handleError = (res, status, message, details) => {
  if (details) console.error(message, details);
  res.status(status).json({ error: message });
};

export const createComplaint = async (req, res) => {
  try {
    const buyerId = req.session.user.id;
    const { order_id, category, description } = req.body;
    if (!order_id || !category || !description?.trim()) {
      return handleError(res, 400, 'Order, category, and description are required');
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, farmer_id, crop:crops(name)')
      .eq('id', Number(order_id))
      .eq('buyer_id', buyerId)
      .single();
    if (orderError?.code === 'PGRST116') return handleError(res, 404, 'Order not found');
    if (orderError) throw orderError;

    const { data: complaint, error } = await supabase.from('complaints').insert([{
      buyer_id: buyerId,
      farmer_id: order.farmer_id,
      order_id: order.id,
      category: String(category).trim(),
      description: String(description).trim()
    }]).select().single();
    if (error) throw error;

    const admins = await supabase.from('users').select('id').in('role', ['admin', 'vendor']);
    if (!admins.error) {
      await createInAppNotifications({
        userIds: (admins.data || []).map((admin) => admin.id),
        type: 'complaint_created',
        title: `New complaint for order #${order.id}`,
        message: `A buyer reported an issue with ${order.crop?.name || 'an order'}.`,
        link: '/admin/orders'
      });
    }

    res.status(201).json(complaint);
  } catch (err) {
    handleError(res, 500, 'Failed to submit complaint', err.message);
  }
};

export const listComplaints = async (req, res) => {
  try {
    const query = supabase.from('complaints')
      .select('*, buyer:users!complaints_buyer_id_fkey(id,name,email), farmer:users!complaints_farmer_id_fkey(id,name,email), order:orders(id)')
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch complaints', err.message);
  }
};
