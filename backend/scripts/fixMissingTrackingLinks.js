import { db } from '../app.js';

async function fixMissingTrackingLinks() {
  // Find all Sendstack orders with a tracking_number but missing tracking_url
  const [orders] = await db.query(`
    SELECT id, tracking_number, tracking_url, delivery_info
    FROM orders
    WHERE tracking_url IS NULL OR tracking_url = ''
  `);
  let updated = 0;
  for (const order of orders) {
    let info = order.delivery_info;
    if (typeof info === 'string') {
      try { info = JSON.parse(info); } catch { info = {}; }
    }
    if (info?.deliveryMethod === 'sendstack' && order.tracking_number) {
      const trackingUrl = `https://AgroFresh.sendstack.me/track/${order.tracking_number}`;
      await db.query('UPDATE orders SET tracking_url=? WHERE id=?', [trackingUrl, order.id]);
      updated++;
      console.log(`Updated order ${order.id} with tracking_url: ${trackingUrl}`);
    }
  }
  console.log(`Done. Updated ${updated} orders.`);
  process.exit(0);
}

fixMissingTrackingLinks(); 