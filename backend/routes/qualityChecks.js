import express from 'express';
import {
	analyzeQuality,
	completeQualityCheck,
	getQualityCheck,
	listQualityChecks
} from '../controllers/qualityCheckController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Analyze quality using ML model
router.post('/analyze', analyzeQuality);

// Complete quality check and make decision
router.post('/:id/complete', completeQualityCheck);

// Get specific quality check
router.get('/:id', getQualityCheck);

// List quality checks (optionally filtered by order_id)
router.get('/', listQualityChecks);

export default router;
