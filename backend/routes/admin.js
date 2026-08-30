import express from 'express';
import { 
  getDashboardStats, 
  getRecentActivity, 
  getCropStats, 
  getOrderStats, 
  getPaymentStats,
  getAdminCrops,
  reviewCropListing,
  getAdminOrders,
  getAdminPayments,
  getAdminSettings,
  updateAdminSettings
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { approveFarmerVerification, getPendingVerifications } from '../controllers/adminController.js';
import {
  verifyUser,
  rejectUserVerification,
  getUnverifiedUsers,
  getVerificationStatusStats,
  getUserVerification,
  bulkApproveVerification,
} from '../controllers/verificationController.js';

const router = express.Router();

// All admin routes require either admin or legacy vendor role
router.use(requireAuth, requireRole(['admin', 'vendor']));

// Dashboard statistics
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);

// Recent activity
router.get('/activity', getRecentActivity);
router.get('/dashboard/activity', getRecentActivity);

// Crop statistics
router.get('/crops/stats', getCropStats);

// Order statistics
router.get('/orders/stats', getOrderStats);

// Payment statistics
router.get('/payments/stats', getPaymentStats);

// Admin crop listings with farmer info
router.get('/crops', getAdminCrops);
router.patch('/crops/:id/review', reviewCropListing);

// Admin orders with all details
router.get('/orders', getAdminOrders);

// Admin payments with all details
router.get('/payments', getAdminPayments);

// Admin settings
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

// Farmer verification review
router.get('/verifications/pending', getPendingVerifications);
router.patch('/verifications/:id/approve', approveFarmerVerification);
router.patch('/verifications/:id/reject', approveFarmerVerification);

// Face Verification Routes (Operations & Farmers)
router.get('/face-verification/stats', getVerificationStatusStats);
router.get('/face-verification/unverified', getUnverifiedUsers);
router.get('/face-verification/user/:userId', getUserVerification);
router.post('/face-verification/verify/:userId', verifyUser);
router.post('/face-verification/reject/:userId', rejectUserVerification);
router.post('/face-verification/bulk-verify', bulkApproveVerification);

export default router; 