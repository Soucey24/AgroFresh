import { db } from '../app.js';

async function deleteExpiredCrops() {
  await db.query("DELETE FROM crops WHERE expiring_date < NOW()");
  console.log('Expired crops deleted');
  process.exit(0);
}

deleteExpiredCrops(); 