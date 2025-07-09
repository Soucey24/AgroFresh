import { db } from '../app.js';

async function reportSales() {
  // Get sales for the past week
  const [sales] = await db.query(`
    SELECT farmer_id, COUNT(*) as orders, SUM(quantity) as total_quantity
    FROM orders
    WHERE status IN ('completed', 'paid')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY farmer_id
  `);
  for (const row of sales) {
    // You can email this to each farmer if you wish
    console.log(`Farmer ${row.farmer_id}: ${row.orders} orders, ${row.total_quantity} items sold in the past week.`);
  }
  process.exit(0);
}

reportSales(); 