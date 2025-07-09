import fetch from 'node-fetch';
import { db } from '../app.js';

// Poll Sendstack for status updates
async function pollSendstackStatus(order) {
  if (!order.tracking_number) return;
  const res = await fetch(`https://api.sendstack.africa/bookings/${order.tracking_number}`, {
    headers: { 'Authorization': `Bearer ${process.env.SENDSTACK_API_KEY}` }
  });
  const data = await res.json();
  if (data.status) {
    await db.query('UPDATE orders SET delivery_status=? WHERE id=?', [data.status, order.id]);
  }
}

// Add similar function for VDL if they provide an API

async function pollAllOrders() {
  // Poll Sendstack orders
  const [sendstackOrders] = await db.query(
    "SELECT * FROM orders WHERE JSON_EXTRACT(delivery_info, '$.deliveryMethod') = '"sendstack"' AND tracking_number IS NOT NULL"
  );
  for (const order of sendstackOrders) {
    await pollSendstackStatus(order);
  }
  // Add VDL polling here if available
}

pollAllOrders().then(() => {
  console.log('Polling complete');
  process.exit(0);
}); 