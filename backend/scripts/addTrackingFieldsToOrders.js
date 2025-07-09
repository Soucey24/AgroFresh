import { db } from '../app.js';

async function addTrackingFields() {
  try {
    await db.query(`ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) NULL`);
    console.log('tracking_number column added');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
    else console.log('tracking_number column already exists');
  }
  try {
    await db.query(`ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(255) NULL`);
    console.log('tracking_url column added');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
    else console.log('tracking_url column already exists');
  }
  try {
    await db.query(`ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(50) NULL`);
    console.log('delivery_status column added');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
    else console.log('delivery_status column already exists');
  }
  process.exit(0);
}

addTrackingFields(); 