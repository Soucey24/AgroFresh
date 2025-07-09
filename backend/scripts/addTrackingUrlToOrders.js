import { db } from '../app.js';

async function addTrackingUrlColumn() {
  await db.query(`
    ALTER TABLE orders
    ADD COLUMN tracking_url VARCHAR(255) NULL;
  `);
  console.log('tracking_url column added to orders table');
  process.exit(0);
}

addTrackingUrlColumn(); 