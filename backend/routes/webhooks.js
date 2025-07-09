import express from 'express';
import { db } from '../app.js';
const router = express.Router();

// Sendstack webhook
router.post('/sendstack', async (req, res) => {
  const { tracking_number, status } = req.body;
  if (!tracking_number || !status) return res.status(400).end();
  await db.query('UPDATE orders SET delivery_status=? WHERE tracking_number=?', [status, tracking_number]);
  res.status(200).end();
});

// Add similar for VDL if they support webhooks

export default router; 