import { supabase } from '../app.js';

// Create order
export async function createOrder(buyerId, farmerId, cropId, quantity, deliveryAddress = null) {
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        buyer_id: buyerId,
        farmer_id: farmerId,
        crop_id: cropId,
        quantity,
        delivery_address: deliveryAddress,
        status: 'pending'
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Get order by ID with details
export async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:buyer_id(id, name, email, location),
      farmer:farmer_id(id, name, email, location),
      crop:crop_id(id, name, price, quantity, unit, image)
    `)
    .eq('id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get orders by buyer ID
export async function getOrdersByBuyerId(buyerId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      farmer:farmer_id(id, name, email, location),
      crop:crop_id(id, name, price, quantity, unit, image)
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get orders by farmer ID
export async function getOrdersByFarmerId(farmerId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:buyer_id(id, name, email, location),
      crop:crop_id(id, name, price, quantity, unit, image)
    `)
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get orders by status
export async function getOrdersByStatus(status, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:buyer_id(id, name, email, location),
      farmer:farmer_id(id, name, email, location),
      crop:crop_id(id, name, price, quantity, unit, image)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Update order status
export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  return data[0];
}

// Update order with delivery info
export async function updateOrderDelivery(orderId, deliveryService, deliveryAddress, trackingNumber, deliveryEta) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      delivery_service: deliveryService,
      delivery_address: deliveryAddress,
      tracking_number: trackingNumber,
      delivery_eta: deliveryEta,
      delivery_info: JSON.stringify({
        service: deliveryService,
        address: deliveryAddress,
        tracking: trackingNumber,
        eta: deliveryEta
      })
    })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  return data[0];
}

// Update delivery status
export async function updateDeliveryStatus(orderId, deliveryStatus) {
  const { data, error } = await supabase
    .from('orders')
    .update({ delivery_status: deliveryStatus })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  return data[0];
}

// Delete order
export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
}

// Legacy function - not needed with Supabase
export async function createOrdersTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}
