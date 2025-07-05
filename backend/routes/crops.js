import express from 'express';
import { listCrops, createCrop, getCrop, updateCrop, deleteCrop } from '../controllers/cropController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../controllers/uploadController.js';
const router = express.Router();

router.get('/', listCrops);
router.post('/', requireAuth, requireRole('farmer'), upload.single('image'), createCrop);
router.get('/:id', getCrop);
router.put('/:id', requireAuth, requireRole('farmer'), updateCrop);
router.delete('/:id', requireAuth, requireRole('farmer'), deleteCrop);

export default router; 