import express from 'express';
import { listOrders, createOrder, getOrder, updateOrder, deleteOrder, salesReport, getOrderTracking } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = express.Router();

router.get('/', requireAuth, listOrders);
router.post('/', requireAuth, createOrder);
router.get('/:id', requireAuth, getOrder);
router.put('/:id', requireAuth, updateOrder);
router.delete('/:id', requireAuth, requireRole('admin'), deleteOrder);
router.get('/sales-report', requireAuth, requireRole('farmer'), salesReport);
router.get('/:id/tracking', requireAuth, getOrderTracking);

export default router; 