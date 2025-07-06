import express from 'express';
import { 
  getDashboardStats, 
  getRecentActivity, 
  getCropStats, 
  getOrderStats, 
  getPaymentStats,
  getAdminCrops,
  getAdminOrders,
  getAdminPayments,
  getAdminSettings,
  updateAdminSettings
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require vendor role
router.use(requireAuth, requireRole('vendor'));

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Recent activity
router.get('/activity', getRecentActivity);

// Crop statistics
router.get('/crops/stats', getCropStats);

// Order statistics
router.get('/orders/stats', getOrderStats);

// Payment statistics
router.get('/payments/stats', getPaymentStats);

// Admin crop listings with farmer info
router.get('/crops', getAdminCrops);

// Admin orders with all details
router.get('/orders', getAdminOrders);

// Admin payments with all details
router.get('/payments', getAdminPayments);

// Admin settings
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router; 