import { db } from '../app.js';

export const listOrders = async (req, res) => {
  try {
    let query = 'SELECT * FROM orders';
    let params = [];
    // Only show relevant orders for buyer/farmer
    if (req.session.user.role === 'buyer') {
      query += ' WHERE buyer_id = ?';
      params = [req.session.user.id];
    } else if (req.session.user.role === 'farmer') {
      query += ' WHERE farmer_id = ?';
      params = [req.session.user.id];
    }
    const [orders] = await db.query(query, params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const createOrder = async (req, res) => {
  let { crop_id, quantity, delivery_info, deliveryMethod, tracking_number, tracking_url, delivery_status } = req.body;
  const buyer_id = req.session.user?.id;
  if (!crop_id || !quantity || !buyer_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Get crop and farmer
    const [crops] = await db.query('SELECT * FROM crops WHERE id = ?', [crop_id]);
    if (crops.length === 0) return res.status(404).json({ error: 'Crop not found' });
    const farmer_id = crops[0].farmer_id;
    // Ensure delivery_info is an object and includes deliveryMethod
    let infoObj = {};
    if (typeof delivery_info === 'string') {
      try { infoObj = JSON.parse(delivery_info); } catch { infoObj = {}; }
    } else if (typeof delivery_info === 'object' && delivery_info !== null) {
      infoObj = { ...delivery_info };
    }
    if (deliveryMethod && !infoObj.deliveryMethod) {
      infoObj.deliveryMethod = deliveryMethod;
    }
    const [result] = await db.query(
      'INSERT INTO orders (buyer_id, farmer_id, crop_id, quantity, delivery_info, tracking_number, tracking_url, delivery_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [buyer_id, farmer_id, crop_id, quantity, JSON.stringify(infoObj), tracking_number || null, tracking_url || null, delivery_status || null]
    );
    res.status(201).json({ 
      id: result.insertId, 
      buyer_id, 
      farmer_id, 
      crop_id, 
      quantity, 
      delivery_info: infoObj,
      tracking_number,
      tracking_url,
      delivery_status,
      status: 'pending' 
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    // Only allow buyer, farmer, or admin to view
    if (
      req.session.user.role !== 'admin' &&
      req.session.user.id !== order.buyer_id &&
      req.session.user.id !== order.farmer_id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const updateOrder = async (req, res) => {
  const { status, quantity } = req.body;
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    // Only buyer, farmer, or admin can update
    if (
      req.session.user.role !== 'admin' &&
      req.session.user.id !== orders[0].buyer_id &&
      req.session.user.id !== orders[0].farmer_id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.query('UPDATE orders SET status=?, quantity=? WHERE id=?', [status || orders[0].status, quantity || orders[0].quantity, req.params.id]);
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    // Only admin can delete any order
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

export const salesReport = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE farmer_id = ? AND (status = 'completed' OR status = 'paid')",
      [req.session.user.id]
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};

// Endpoint to update tracking info for an order
export const updateOrderTracking = async (req, res) => {
  const { tracking_number, tracking_url, delivery_status } = req.body;
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    await db.query('UPDATE orders SET tracking_number=?, tracking_url=?, delivery_status=? WHERE id=?', [tracking_number, tracking_url, delivery_status, req.params.id]);
    res.json({ message: 'Tracking info updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tracking info' });
  }
};

export const getOrderTracking = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    if (order.tracking_url || order.tracking_number || order.delivery_status) {
      res.json({
        orderId: order.id,
        tracking_number: order.tracking_number,
        tracking_url: order.tracking_url,
        status: order.delivery_status,
        lastUpdated: order.updated_at || order.created_at,
        history: [], // Always return a history array for frontend safety
      });
    } else {
      // fallback to mock
      const tracking = {
        orderId: req.params.id,
        status: 'In Transit',
        lastUpdated: new Date().toISOString(),
        history: [
          { status: 'Order Placed', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { status: 'Dispatched', timestamp: new Date(Date.now() - 43200000).toISOString() },
          { status: 'In Transit', timestamp: new Date(Date.now() - 3600000).toISOString() }
        ]
      };
      res.json(tracking);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracking info' });
  }
}; 