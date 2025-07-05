import express from 'express';
import { createPayout } from '../controllers/payoutController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = express.Router();

router.post('/', requireAuth, requireRole('farmer'), createPayout);

export default router; 