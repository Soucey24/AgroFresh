import express from 'express';
import { db } from '../app.js';
import deliveryService from '../services/deliveryService.js';
const router = express.Router();

// Sendstack webhook
router.post('/sendstack', async (req, res) => {
  try {
    const { tracking_number, status } = req.body;
    console.log('Sendstack webhook received:', { tracking_number, status });
    
    if (!tracking_number || !status) {
      console.warn('Invalid webhook payload:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Update order status
    const [result] = await db.query(
      'UPDATE orders SET delivery_status=? WHERE tracking_number=?',
      [status, tracking_number]
    );
    
    if (result.affectedRows === 0) {
      console.warn('No order found with tracking number:', tracking_number);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log('Order status updated successfully for tracking number:', tracking_number);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Sendstack webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 