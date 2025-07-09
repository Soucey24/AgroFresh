import { db } from '../app.js';
// import nodemailer or your preferred email library here

async function sendEmail(to, subject, text) {
  // TODO: Implement real email sending logic
  console.log(`Email to ${to}: ${subject} - ${text}`);
}

async function notifyOrderStatus() {
  // Find orders with status changes (example: status = 'shipped' or 'delivered')
  const [orders] = await db.query("SELECT * FROM orders WHERE status IN ('shipped', 'delivered') AND notified IS NULL");
  for (const order of orders) {
    // Get buyer and farmer emails
    const [[buyer]] = await db.query('SELECT email FROM users WHERE id = ?', [order.buyer_id]);
    const [[farmer]] = await db.query('SELECT email FROM users WHERE id = ?', [order.farmer_id]);
    // Notify buyer
    await sendEmail(buyer.email, `Your order #${order.id} is now ${order.status}`, `Order status: ${order.status}`);
    // Notify farmer
    await sendEmail(farmer.email, `Order #${order.id} is now ${order.status}`, `Order status: ${order.status}`);
    // Mark as notified
    await db.query('UPDATE orders SET notified = 1 WHERE id = ?', [order.id]);
  }
  console.log('Order status notifications sent');
  process.exit(0);
}

notifyOrderStatus(); 