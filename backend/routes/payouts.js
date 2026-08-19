import express from 'express';
import { createPayout, listPayouts, updatePayout } from '../controllers/payoutController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = express.Router();

router.post('/', requireAuth, requireRole('farmer'), createPayout);
router.get('/', requireAuth, listPayouts);
router.patch('/:id', requireAuth, requireRole(['admin', 'vendor']), updatePayout);

export default router; 