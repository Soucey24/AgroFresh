import fetch from 'node-fetch';
import { db } from '../app.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Poll Sendstack for status updates
async function pollSendstackStatus(order) {
  if (!order.tracking_number || !process.env.SENDSTACK_API_KEY) {
    console.log('Skipping order - no tracking number or API key');
    return;
  }
  
  try {
    const res = await fetch(`https://api.sendstack.africa/bookings/${order.tracking_number}`, {
      headers: { 'Authorization': `Bearer ${process.env.SENDSTACK_API_KEY}` }
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch status for order ${order.id}: ${res.status}`);
      return;
    }
    
    const data = await res.json();
    if (data.status && data.status !== order.delivery_status) {
      await db.query('UPDATE orders SET delivery_status=? WHERE id=?', [data.status, order.id]);
      console.log(`Updated order ${order.id} status to: ${data.status}`);
    }
  } catch (error) {
    console.error(`Error polling status for order ${order.id}:`, error);
  }
}

async function pollAllOrders() {
  try {
    // Poll Sendstack orders
    const [sendstackOrders] = await db.query(
      "SELECT * FROM orders WHERE JSON_EXTRACT(delivery_info, '$.deliveryMethod') = 'sendstack' AND tracking_number IS NOT NULL"
    );
    
    console.log(`Found ${sendstackOrders.length} Sendstack orders to poll`);
    
    for (const order of sendstackOrders) {
      await pollSendstackStatus(order);
    }
  } catch (error) {
    console.error('Error polling orders:', error);
  }
}

pollAllOrders().then(() => {
  console.log('Polling complete');
  process.exit(0);
}).catch(error => {
  console.error('Polling failed:', error);
  process.exit(1);
}); 