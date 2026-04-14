import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const tag = `smoke-${Date.now()}`;
  const buyerEmail = `${tag}-buyer@local.test`;
  const farmerEmail = `${tag}-farmer@local.test`;
  const hash = await bcrypt.hash('TempPass123!', 10);

  let buyer;
  let farmer;
  let crop;
  let order;
  let payment;

  try {
    console.log('1) Creating buyer and farmer users...');
    const buyerRes = await supabase.from('users').insert([{ name: 'Smoke Buyer', email: buyerEmail, password_hash: hash, role: 'buyer', status: 'Active' }]).select().single();
    if (buyerRes.error) throw buyerRes.error;
    buyer = buyerRes.data;

    const farmerRes = await supabase.from('users').insert([{ name: 'Smoke Farmer', email: farmerEmail, password_hash: hash, role: 'farmer', status: 'Active' }]).select().single();
    if (farmerRes.error) throw farmerRes.error;
    farmer = farmerRes.data;

    console.log('2) Creating crop...');
    const cropRes = await supabase
      .from('crops')
      .insert([{ name: 'Smoke Tomatoes', description: 'CRUD smoke test crop', price: 10.5, quantity: 50, unit: 'kg', available: true, farmer_id: farmer.id }])
      .select()
      .single();
    if (cropRes.error) throw cropRes.error;
    crop = cropRes.data;

    console.log('3) Creating order...');
    const orderRes = await supabase
      .from('orders')
      .insert([{ buyer_id: buyer.id, farmer_id: farmer.id, crop_id: crop.id, quantity: 5, status: 'pending', delivery_info: { method: 'pickup' } }])
      .select()
      .single();
    if (orderRes.error) throw orderRes.error;
    order = orderRes.data;

    console.log('4) Creating payment...');
    const paymentRes = await supabase
      .from('payments')
      .insert([{ order_id: order.id, buyer_id: buyer.id, farmer_id: farmer.id, amount: 52.5, payment_method: 'card', status: 'pending', reference_id: `SMOKE-${Date.now()}` }])
      .select()
      .single();
    if (paymentRes.error) throw paymentRes.error;
    payment = paymentRes.data;

    console.log('5) Reading created records...');
    const readOrder = await supabase.from('orders').select('*').eq('id', order.id).single();
    if (readOrder.error) throw readOrder.error;
    assert(readOrder.data.id === order.id, 'Order read validation failed');

    console.log('6) Updating order and payment...');
    const orderUpdateRes = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id);
    if (orderUpdateRes.error) throw orderUpdateRes.error;

    const paymentUpdateRes = await supabase.from('payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', payment.id);
    if (paymentUpdateRes.error) throw paymentUpdateRes.error;

    console.log('7) Deleting test records...');
    await supabase.from('payments').delete().eq('id', payment.id);
    await supabase.from('orders').delete().eq('id', order.id);
    await supabase.from('crops').delete().eq('id', crop.id);
    await supabase.from('users').delete().in('id', [buyer.id, farmer.id]);

    console.log('Supabase CRUD smoke test passed.');
    process.exit(0);
  } catch (error) {
    console.error('Supabase CRUD smoke test failed:', error.message || error);

    if (payment?.id) await supabase.from('payments').delete().eq('id', payment.id);
    if (order?.id) await supabase.from('orders').delete().eq('id', order.id);
    if (crop?.id) await supabase.from('crops').delete().eq('id', crop.id);
    if (buyer?.id || farmer?.id) {
      const ids = [buyer?.id, farmer?.id].filter(Boolean);
      await supabase.from('users').delete().in('id', ids);
    }

    process.exit(1);
  }
}

run();
