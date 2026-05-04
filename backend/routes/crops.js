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
	listMlCropTypes,
	calculateCropFreshness,
	forecastCropPrice,
	recommendCropSellingTime
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
router.post('/:id/calculate-freshness', requireAuth, requireRole(['admin', 'farmer']), calculateCropFreshness);
router.post('/:id/forecast-price', requireAuth, requireRole(['admin', 'farmer']), forecastCropPrice);
router.post('/:id/recommend-selling-time', requireAuth, requireRole(['admin', 'farmer']), recommendCropSellingTime);
router.get('/:id/predictions', requireAuth, getCropPredictions);
router.get('/:id', getCrop);
router.put('/:id', requireAuth, requireRole('farmer'), upload.single('image'), updateCrop);
router.delete('/:id', requireAuth, requireRole(['admin', 'farmer']), deleteCrop);

export default router; 