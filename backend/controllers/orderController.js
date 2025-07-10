import { db } from '../app.js';
import deliveryService from '../services/deliveryService.js';

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
    
    const crop = crops[0];
    const farmer_id = crop.farmer_id;
    
    // Check if enough quantity is available
    if (crop.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient quantity available' });
    }
    
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
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create the order
      const [result] = await db.query(
        'INSERT INTO orders (buyer_id, farmer_id, crop_id, quantity, delivery_info, tracking_number, tracking_url, delivery_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [buyer_id, farmer_id, crop_id, quantity, JSON.stringify(infoObj), tracking_number || null, tracking_url || null, delivery_status || null]
      );
      
      // Update crop quantity
      const newQuantity = crop.quantity - quantity;
      await db.query('UPDATE crops SET quantity = ? WHERE id = ?', [newQuantity, crop_id]);
      
      // Commit transaction
      await db.query('COMMIT');
      
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
      // Rollback on error
      await db.query('ROLLBACK');
      throw err;
    }
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
    
    const order = orders[0];
    const oldStatus = order.status;
    const newStatus = status || oldStatus;
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Update order status
      await db.query('UPDATE orders SET status=?, quantity=? WHERE id=?', [newStatus, quantity || order.quantity, req.params.id]);
      
      // If order is cancelled, restore crop quantity
      if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
        await db.query('UPDATE crops SET quantity = quantity + ? WHERE id = ?', [order.quantity, order.crop_id]);
      }
      // If order was cancelled and is now active again, reduce crop quantity
      else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
        await db.query('UPDATE crops SET quantity = quantity - ? WHERE id = ?', [order.quantity, order.crop_id]);
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({ message: 'Order updated' });
    } catch (err) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw err;
    }
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
    
    const order = orders[0];
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // If order is not cancelled, restore crop quantity
      if (order.status !== 'cancelled') {
        await db.query('UPDATE crops SET quantity = quantity + ? WHERE id = ?', [order.quantity, order.crop_id]);
      }
      
      // Delete the order
      await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({ message: 'Order deleted' });
    } catch (err) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw err;
    }
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
      `SELECT o.*, c.price, c.unit, c.name as crop_name
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE o.farmer_id = ? AND (o.status = 'completed' OR o.status = 'paid')`,
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
    await deliveryService.updateOrderTracking(req.params.id, { tracking_number, tracking_url, delivery_status });
    res.json({ message: 'Tracking info updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tracking info' });
  }
};

export const createDelivery = async (req, res) => {
  try {
    const { deliveryInfo, cartItems, orderId } = req.body;
    
    if (!deliveryInfo || !orderId) {
      return res.status(400).json({ error: 'Missing required delivery information' });
    }

    const result = await deliveryService.createSendstackDelivery({
      deliveryInfo,
      cartItems: cartItems || [],
      orderId
    });

    res.json(result);
  } catch (err) {
    console.error('Error creating delivery:', err);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
};

export const getOrderTracking = async (req, res) => {
  try {
    const trackingInfo = await deliveryService.getOrderTracking(req.params.id);
    res.json(trackingInfo);
  } catch (err) {
    console.error('Error fetching tracking info:', err);
    res.status(500).json({ error: 'Failed to fetch tracking info' });
  }
}; 