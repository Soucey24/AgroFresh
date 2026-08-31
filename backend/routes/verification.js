import express from 'express';
import {
  requestVerification,
  verifyUser,
  rejectUserVerification,
  getUnverifiedUsers,
  getVerificationStatusStats,
  getUserVerification,
  bulkApproveVerification,
} from '../controllers/verificationController.js';

const router = express.Router();

// Request verification (submit documents)
router.post('/request', requestVerification);

// Approve/verify a user
router.put('/verify/:userId', verifyUser);

// Reject a user verification
router.put('/reject/:userId', rejectUserVerification);

// Get unverified users by role
router.get('/unverified', getUnverifiedUsers);

// Get verification statistics
router.get('/stats', getVerificationStatusStats);

// Get verification info for specific user
router.get('/user/:userId', getUserVerification);

// Bulk approve verifications
router.post('/bulk-verify', bulkApproveVerification);

export default router;
