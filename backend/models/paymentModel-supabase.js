import { supabase } from '../app.js';

// Create payment
export async function createPayment(orderId, buyerId, farmerId, amount, paymentMethod, phoneNumber = null) {
  const { data, error } = await supabase
    .from('payments')
    .insert([
      {
        order_id: orderId,
        buyer_id: buyerId,
        farmer_id: farmerId,
        amount,
        payment_method: paymentMethod,
        phone_number: phoneNumber,
        status: 'pending'
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Get payment by ID
export async function getPaymentById(paymentId) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      order:order_id(id, status, created_at),
      buyer:buyer_id(id, name, email),
      farmer:farmer_id(id, name, email)
    `)
    .eq('id', paymentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get payment by reference ID
export async function getPaymentByReferenceId(referenceId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reference_id', referenceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get payment by transaction ID
export async function getPaymentByTransactionId(transactionId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get payments by order ID
export async function getPaymentsByOrderId(orderId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId);

  if (error) throw error;
  return data;
}

// Get payments by buyer ID
export async function getPaymentsByBuyerId(buyerId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get payments by farmer ID
export async function getPaymentsByFarmerId(farmerId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get payments by status
export async function getPaymentsByStatus(status, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Update payment status
export async function updatePaymentStatus(paymentId, status, transactionId = null, completedAt = null) {
  const update = { 
    status,
    updated_at: new Date().toISOString()
  };
  
  if (transactionId) update.transaction_id = transactionId;
  if (completedAt) update.completed_at = completedAt;

  const { data, error } = await supabase
    .from('payments')
    .update(update)
    .eq('id', paymentId)
    .select();

  if (error) throw error;
  return data[0];
}

// Update payment with provider response
export async function updatePaymentWithProviderResponse(paymentId, providerResponse, metadata = null) {
  const update = {
    provider_response: providerResponse,
    updated_at: new Date().toISOString()
  };

  if (metadata) update.metadata = metadata;

  const { data, error } = await supabase
    .from('payments')
    .update(update)
    .eq('id', paymentId)
    .select();

  if (error) throw error;
  return data[0];
}

// Create payment webhook record
export async function createPaymentWebhook(paymentId, webhookType, payload) {
  const { data, error } = await supabase
    .from('payment_webhooks')
    .insert([
      {
        payment_id: paymentId,
        webhook_type: webhookType,
        payload,
        status: 'pending'
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Update webhook status
export async function updateWebhookStatus(webhookId, status) {
  const update = { status };
  if (status === 'processed') update.processed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('payment_webhooks')
    .update(update)
    .eq('id', webhookId)
    .select();

  if (error) throw error;
  return data[0];
}

// Create payment session
export async function createPaymentSession(sessionId, paymentId, buyerId, amount, paymentMethod, expiresAt) {
  const { data, error } = await supabase
    .from('payment_sessions')
    .insert([
      {
        session_id: sessionId,
        payment_id: paymentId,
        buyer_id: buyerId,
        amount,
        payment_method: paymentMethod,
        expires_at: expiresAt,
        status: 'active'
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// Get payment session by session ID
export async function getPaymentSessionBySessionId(sessionId) {
  const { data, error } = await supabase
    .from('payment_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Update payment session status
export async function updatePaymentSessionStatus(sessionId, status) {
  const { data, error } = await supabase
    .from('payment_sessions')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .select();

  if (error) throw error;
  return data[0];
}

// Delete payment
export async function deletePayment(paymentId) {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId);

  if (error) throw error;
}

// Legacy functions - not needed with Supabase
export async function createPaymentsTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}

export async function createPaymentWebhooksTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}

export async function createPaymentSessionsTable() {
  console.log('Tables are already created in Supabase. Use postgres-schema.sql');
}
