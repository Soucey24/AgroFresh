import { db } from '../app.js';

async function fixNumericDeliveryStatus() {
  // Update all orders where delivery_status is '0' (string) to 'In Transit'
  const [result] = await db.query(
    "UPDATE orders SET delivery_status = 'In Transit' WHERE delivery_status = '0'"
  );
  console.log(`Updated ${result.affectedRows} orders with delivery_status = '0' to 'In Transit'.`);
  process.exit(0);
}

fixNumericDeliveryStatus(); 