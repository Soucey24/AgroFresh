import { supabase } from '../app.js';

const handleError = (res, status, message, details) => {
  if (details) console.error(message, details);
  res.status(status).json({ error: message });
};

export const listNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch notifications', err.message);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', Number(req.params.id))
      .eq('user_id', req.session.user.id)
      .is('read_at', null);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    handleError(res, 500, 'Failed to mark notification as read', err.message);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.session.user.id)
      .is('read_at', null);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    handleError(res, 500, 'Failed to mark notifications as read', err.message);
  }
};
