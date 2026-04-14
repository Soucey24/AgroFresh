import { supabase } from '../app.js';
import deliveryService from '../services/deliveryService.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

export const listOrders = async (req, res) => {
  try {
    const { role, id } = req.session.user;

    let query = supabase
      .from('orders')
      .select('*, crops(id, name, price), users!buyer_id(id, name), users!farmer_id(id, name)');

    // Filter based on role
    if (role === 'buyer') {
      query = query.eq('buyer_id', id);
    } else if (role === 'farmer') {
      query = query.eq('farmer_id', id);
    }

    const { data: orders, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) throw error;

    res.json(orders || []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch orders', err.message);
  }
};

export const createOrder = async (req, res) => {
  try {
    const { crop_id, quantity, delivery_info, deliveryMethod, tracking_number, tracking_url, delivery_status } = req.body;
    const buyer_id = req.session.user?.id;

    // Validation
    if (!crop_id || !quantity || !buyer_id) {
      return handleError(res, 400, 'Missing required fields: crop_id, quantity');
    }

    // Get crop and farmer
    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('farmer_id, quantity as available, price')
      .eq('id', crop_id)
      .single();

    if (cropError && cropError.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }

    if (cropError) throw cropError;

    // Check quantity
    const quantityNeeded = parseInt(quantity);
    if (crop.available < quantityNeeded) {
      return handleError(res, 400, `Only ${crop.available} items available`);
    }

    const farmer_id = crop.farmer_id;

    // Build delivery info
    let infoObj = {};
    if (typeof delivery_info === 'string') {
      try {
        infoObj = JSON.parse(delivery_info);
      } catch {
        infoObj = {};
      }
    } else if (typeof delivery_info === 'object' && delivery_info !== null) {
      infoObj = { ...delivery_info };
    }

    if (deliveryMethod && !infoObj.deliveryMethod) {
      infoObj.deliveryMethod = deliveryMethod;
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        buyer_id,
        farmer_id,
        crop_id,
        quantity: quantityNeeded,
        delivery_info: infoObj,
        tracking_number: tracking_number || null,
        delivery_address: null,
        delivery_status: delivery_status || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Update crop quantity
    const { error: updateError } = await supabase
      .from('crops')
      .update({
        quantity: crop.available - quantityNeeded,
        available: (crop.available - quantityNeeded) > 0
      })
      .eq('id', crop_id);

    if (updateError) throw updateError;

    res.status(201).json({
      id: order.id,
      buyer_id,
      farmer_id,
      crop_id,
      quantity: quantityNeeded,
      delivery_info: infoObj,
      status: 'pending'
    });
  } catch (err) {
    handleError(res, 500, 'Failed to create order', err.message);
  }
};

export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      return handleError(res, 404, 'Order not found');
    }

    if (error) throw error;

    // Authorization check
    if (
      user.role !== 'admin' &&
      user.id !== order.buyer_id &&
      user.id !== order.farmer_id
    ) {
      return handleError(res, 403, 'Not authorized to view this order');
    }

    res.json(order);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch order', err.message);
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantity } = req.body;
    const user = req.session.user;

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return handleError(res, 404, 'Order not found');
    }

    if (fetchError) throw fetchError;

    // Authorization check
    if (
      user.role !== 'admin' &&
      user.id !== order.buyer_id &&
      user.id !== order.farmer_id
    ) {
      return handleError(res, 403, 'Not authorized to update this order');
    }

    const newStatus = status || order.status;
    const newQuantity = quantity || order.quantity;

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        quantity: newQuantity
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Handle cancellation - restore crop quantity
    if (order.status !== 'cancelled' && newStatus === 'cancelled') {
      const { error: restoreError } = await supabase
        .from('crops')
        .update({
          quantity: supabase.rpc('add_quantity', { crop_id: order.crop_id, amount: order.quantity })
        })
        .eq('id', order.crop_id);

      // Fallback: get current quantity and add
      if (restoreError) {
        const { data: crop } = await supabase
          .from('crops')
          .select('quantity')
          .eq('id', order.crop_id)
          .single();

        if (crop) {
          await supabase
            .from('crops')
            .update({ quantity: crop.quantity + order.quantity })
            .eq('id', order.crop_id);
        }
      }
    }

    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to update order', err.message);
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    // Get order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return handleError(res, 404, 'Order not found');
    }

    if (fetchError) throw fetchError;

    // Authorization check - only buyer or admin can delete
    if (user.role !== 'admin' && user.id !== order.buyer_id) {
      return handleError(res, 403, 'Not authorized to delete this order');
    }

    // Delete order
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to delete order', err.message);
  }
};

export const updateOrderDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_service, delivery_address, tracking_number, delivery_eta } = req.body;

    const { error } = await supabase
      .from('orders')
      .update({
        delivery_service: delivery_service || null,
        delivery_address: delivery_address || null,
        tracking_number: tracking_number || null,
        delivery_eta: delivery_eta || null,
        delivery_info: {
          service: delivery_service,
          address: delivery_address,
          tracking: tracking_number,
          eta: delivery_eta
        }
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Delivery info updated' });
  } catch (err) {
    handleError(res, 500, 'Failed to update delivery info', err.message);
  }
};
