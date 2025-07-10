import express from 'express';
import { listOrders, createOrder, getOrder, updateOrder, deleteOrder, salesReport, getOrderTracking, updateOrderTracking, createDelivery } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = express.Router();

router.get('/', requireAuth, listOrders);
router.post('/', requireAuth, createOrder);
router.get('/sales-report', requireAuth, requireRole('farmer'), salesReport);
router.get('/:id', requireAuth, getOrder);
router.put('/:id', requireAuth, updateOrder);
router.delete('/:id', requireAuth, requireRole('admin'), deleteOrder);
router.get('/:id/tracking', requireAuth, getOrderTracking);
router.put('/:id/tracking', requireAuth, updateOrderTracking);
router.post('/delivery', requireAuth, createDelivery);

export default router; 