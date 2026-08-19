import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createComplaint, listComplaints } from '../controllers/complaintController.js';

const router = express.Router();
router.post('/', requireAuth, createComplaint);
router.get('/', requireAuth, requireRole(['admin', 'vendor']), listComplaints);
export default router;
