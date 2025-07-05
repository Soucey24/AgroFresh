import express from 'express';
import { 
  createPayment, 
  getPaymentStatus, 
  simulatePaymentCompletion,
  paymentWebhook,
  getPaymentHistory,
  cancelPayment
} from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Create new payment
router.post('/', requireAuth, createPayment);

// Get payment history for user (specific route before parameterized routes)
router.get('/history', requireAuth, getPaymentHistory);

// Simulate payment completion (for testing) - specific route
router.post('/simulate', requireAuth, simulatePaymentCompletion);

// Webhook endpoint for payment providers (no auth required for webhooks) - specific route
router.post('/webhook', paymentWebhook);

// Get payment status (parameterized route)
router.get('/:payment_id/status', requireAuth, getPaymentStatus);

// Cancel payment (parameterized route)
router.post('/:payment_id/cancel', requireAuth, cancelPayment);

export default router; 