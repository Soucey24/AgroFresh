import { db } from '../app.js';

async function deleteOldOrders() {
  // Delete cancelled orders
  await db.query("DELETE FROM orders WHERE status = 'cancelled'");
  // Delete orders older than 90 days
  await db.query("DELETE FROM orders WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)");
  console.log('Old and cancelled orders deleted');
  process.exit(0);
}

deleteOldOrders(); 