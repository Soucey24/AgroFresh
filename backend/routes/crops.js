import express from 'express';
import {
	listCrops,
	createCrop,
	getCrop,
	updateCrop,
	deleteCrop,
	bulkUpdateAvailability,
	predictHarvestForCrop,
	analyzeCropQuality,
	getCropPredictions,
	listMlCropTypes
} from '../controllers/cropController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../controllers/uploadController.js';
const router = express.Router();

router.get('/', listCrops);
router.get('/ml/crop-types', requireAuth, listMlCropTypes);
router.post('/', requireAuth, requireRole('farmer'), upload.single('image'), createCrop);
router.post('/bulk-update-availability', bulkUpdateAvailability);
router.post('/:id/predict-harvest', requireAuth, requireRole(['admin', 'farmer']), predictHarvestForCrop);
router.post('/:id/analyze-quality', requireAuth, requireRole(['admin', 'farmer']), upload.single('image'), analyzeCropQuality);
router.get('/:id/predictions', requireAuth, getCropPredictions);
router.get('/:id', getCrop);
router.put('/:id', requireAuth, requireRole('farmer'), upload.single('image'), updateCrop);
router.delete('/:id', requireAuth, requireRole(['admin', 'farmer']), deleteCrop);

export default router; 