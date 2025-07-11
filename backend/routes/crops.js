import express from 'express';
import { listCrops, createCrop, getCrop, updateCrop, deleteCrop, bulkUpdateAvailability } from '../controllers/cropController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../controllers/uploadController.js';
const router = express.Router();

router.get('/', listCrops);
router.post('/', requireAuth, requireRole('farmer'), upload.single('image'), createCrop);
router.post('/bulk-update-availability', bulkUpdateAvailability);
router.get('/:id', getCrop);
router.put('/:id', requireAuth, requireRole('farmer'), upload.single('image'), updateCrop);
router.delete('/:id', requireAuth, requireRole(['admin', 'farmer']), deleteCrop);

export default router; 