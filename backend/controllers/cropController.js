import { supabase } from '../app.js';
import MLService from '../services/mlService.js';
import { isFarmerApproved } from '../middleware/auth.js';
import { notifyCropDecision, notifyCropSubmitted } from '../services/notificationService.js';
import { uploadToSupabaseStorage, getStorageFallbackUrl } from '../services/storageService.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

const transformCrop = (crop) => ({
  id: crop.id,
  name: crop.name,
  category: crop.description,
  description: crop.description,
  price: parseFloat(crop.price),
  quantity: crop.quantity,
  unit: crop.unit || 'kg',
  expiryDate: crop.expiry_date,
  plantingDate: crop.planting_date || null,
  harvestDatePredicted: crop.harvest_date_predicted || null,
  predictedExpiry: crop.predicted_expiry || crop.expiry_date || null,
  farmer: crop.users?.name || 'Unknown',
  farmerId: crop.farmer_id,
  farmerBio: crop.users?.bio || null,
  farmerAvatar: crop.users?.avatar || null,
  farmerVerified: crop.farmer_verified !== false,
  location: crop.users?.location || 'Unknown',
  harvestDate: crop.created_at,
  image: crop.image,
  available: Boolean(crop.available),
  status: crop.status || 'draft',
  reviewNotes: crop.review_notes || null,
  reviewedAt: crop.reviewed_at || null,
  averageRating: crop.average_rating ?? null,
  reviewCount: crop.review_count ?? 0
});

const getDateDiffDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const normalizeCropType = (value = '') => {
  const raw = (value || '').toString().trim().toLowerCase();
  if (!raw) return 'tomato';

  const map = {
    tomato: 'tomato',
    tomatoes: 'tomato',
    'fresh tomato': 'tomato',
    lettuce: 'lettuce',
    cabbage: 'lettuce',
    yam: 'yam',
    yams: 'yam',
    maize: 'maize',
    corn: 'maize',
    pepper: 'pepper',
    peppers: 'pepper',
    cucumber: 'cucumber',
    cucumbers: 'cucumber',
    okra: 'okra',
    cassava: 'cassava',
    plantain: 'maize',
    banana: 'maize'
  };

  return map[raw] || 'tomato';
};

const attachCropRatings = async (crops) => {
  if (!Array.isArray(crops) || crops.length === 0) {
    return crops;
  }

  const cropIds = crops.map((crop) => crop.id);
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('crop_id, rating')
    .in('crop_id', cropIds);

  if (error) {
    console.warn('Could not load crop ratings:', error.message);
    return crops;
  }

  const ratingMap = reviews.reduce((acc, review) => {
    const current = acc[review.crop_id] || { total: 0, count: 0 };
    current.total += Number(review.rating) || 0;
    current.count += 1;
    acc[review.crop_id] = current;
    return acc;
  }, {});

  return crops.map((crop) => {
    const stats = ratingMap[crop.id];
    if (!stats) {
      return crop;
    }

    return {
      ...crop,
      average_rating: Number((stats.total / stats.count).toFixed(2)),
      review_count: stats.count
    };
  });
};

export const listCrops = async (req, res) => {
  try {
    if (req.session.user && req.session.user.role === 'farmer') {
      const approved = await isFarmerApproved(req.session.user.id);
      if (!approved) {
        return res.status(403).json({
          error: 'Your farmer profile is not approved yet. Please wait for admin verification before listing products.'
        });
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from('crops')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString());

    const isAdminView = req.session?.user?.role === 'admin' || req.session?.user?.role === 'vendor';
    const isFarmerView = req.session?.user?.role === 'farmer';
    let approvedFarmerIds = [];
    if (!isAdminView && !isFarmerView) {
      const { data: approvedRows, error: approvedError } = await supabase
        .from('user_verifications')
        .select('user_id')
        .eq('status', 'approved');

      if (approvedError) throw approvedError;
      approvedFarmerIds = (approvedRows || []).map((row) => row.user_id).filter(Boolean);
    }

    let query = supabase
      .from('crops')
      .select('*, users(id, name, location, bio, avatar)');

    if (!isAdminView && !isFarmerView) {
      if (approvedFarmerIds.length === 0) {
        return res.json([]);
      }
      query = query.in('farmer_id', approvedFarmerIds).eq('status', 'active');
    }

    if (isFarmerView) {
      query = query.eq('farmer_id', req.session.user.id);
    }

    if (isAdminView) {
      query = query.in('status', ['draft', 'active', 'rejected']);
    }

    const { data: crops, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) throw error;

    const cropsWithRatings = await attachCropRatings(crops);
    const transformedCrops = cropsWithRatings.map((crop) => transformCrop({
      ...crop,
      farmer_verified: isAdminView ? undefined : approvedFarmerIds.includes(crop.farmer_id)
    }));
    res.json(transformedCrops);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crops', err.message);
  }
};

export const createCrop = async (req, res) => {
  try {
    const { name, description, price, quantity, unit, expiry_date, planting_date, harvest_date_predicted, status } = req.body;
    const farmer_id = req.session.user?.id;

    if (!name || price === undefined || quantity === undefined || !farmer_id) {
      return handleError(res, 400, 'Missing required fields: name, price, quantity');
    }

    let image = null;
    if (req.file) {
      const storageResult = await uploadToSupabaseStorage(req.file, 'crops');
      image = storageResult?.url || getStorageFallbackUrl(req.file);
    } else if (req.body.image) {
      image = req.body.image;
    }

    const normalizedStatus = status === 'active' ? 'draft' : (status === 'rejected' ? 'rejected' : 'draft');

    const cropType = normalizeCropType(name || description || '');
    const region = req.session.user?.location || 'Ashanti';

    let predictedHarvestDate = harvest_date_predicted || null;
    let predictedExpiryDate = null;

    if (planting_date && !predictedHarvestDate && normalizedStatus !== 'draft') {
      const harvestPrediction = await MLService.predictHarvest(cropType, planting_date, region);
      if (harvestPrediction?.status === 'success' && harvestPrediction.data?.estimated_harvest) {
        predictedHarvestDate = harvestPrediction.data.estimated_harvest;

        const harvestTracking = await MLService.calculateFreshness(
          cropType,
          predictedHarvestDate,
          'room_temp',
          85
        );

        if (harvestTracking?.status === 'success' && harvestTracking.data?.predicted_expiry) {
          predictedExpiryDate = harvestTracking.data.predicted_expiry;
        }
      }
    }

    const derivedExpiryDate = expiry_date || predictedExpiryDate || predictedHarvestDate || null;

    // Create crop
    const { data: crop, error } = await supabase
      .from('crops')
      .insert([{
        name,
        description: description || null,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        unit: unit || 'kg',
        expiry_date: derivedExpiryDate,
        planting_date: planting_date || null,
        harvest_date_predicted: predictedHarvestDate,
        predicted_expiry: predictedExpiryDate || derivedExpiryDate,
        farmer_id,
        image,
        status: normalizedStatus,
        available: normalizedStatus === 'active' && parseInt(quantity) > 0
      }])
      .select('*, users(id, name, location)')
      .single();

    if (error) throw error;

    try {
      if (predictedHarvestDate) {
        await supabase.from('ai_predictions').insert([
          {
            crop_id: crop.id,
            prediction_type: 'harvest_timing',
            predicted_value: getDateDiffDays(planting_date, predictedHarvestDate),
            confidence_score: 0.85,
            reasoning: 'Predicted from planting date using ML harvest model',
            metadata: {
              estimated_harvest: predictedHarvestDate,
              planting_date,
              region,
              crop_type: cropType
            },
            model_version: 'ml-harvest-v1'
          }
        ]);
      }

      if (predictedExpiryDate) {
        await supabase.from('ai_predictions').insert([
          {
            crop_id: crop.id,
            prediction_type: 'expiry',
            predicted_value: getDateDiffDays(predictedHarvestDate || planting_date, predictedExpiryDate),
            confidence_score: 0.8,
            reasoning: 'Predicted from harvest date using ML freshness model',
            metadata: {
              predicted_expiry: predictedExpiryDate,
              harvest_date: predictedHarvestDate,
              crop_type: cropType
            },
            model_version: 'ml-freshness-v1'
          }
        ]);
      }
    } catch (predictionPersistError) {
      console.warn('Failed to persist AI predictions:', predictionPersistError.message);
    }

    void notifyCropSubmitted(crop.id).catch((notificationError) => {
      console.error('[notifications] crop submission SMS failed:', notificationError.message);
    });

    res.status(201).json(transformCrop(crop));
  } catch (err) {
    handleError(res, 500, 'Failed to create crop', err.message);
  }
};

export const getCrop = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: crop, error } = await supabase
      .from('crops')
      .select('*, users(id, name, location)')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }

    if (error) throw error;

    const currentUserRole = req.session?.user?.role;
    if (currentUserRole !== 'admin' && currentUserRole !== 'vendor' && crop?.farmer_id) {
      const approved = await isFarmerApproved(crop.farmer_id);
      if (!approved) {
        return handleError(res, 404, 'Crop not found');
      }
    }

    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('crop_id', crop.id);

    if (reviewError) {
      console.warn('Could not load crop ratings:', reviewError.message);
    }

    const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
    const averageRating = reviewCount > 0
      ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(2))
      : null;

    res.json(transformCrop({
      ...crop,
      average_rating: averageRating,
      review_count: reviewCount
    }));
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crop', err.message);
  }
};

export const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, unit, expiry_date, status, review_notes } = req.body;
    const farmer_id = req.session.user?.id;

    // Get current crop
    const { data: currentCrop, error: fetchError } = await supabase
      .from('crops')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }

    if (fetchError) throw fetchError;

    // Check authorization
    if (currentCrop.farmer_id !== farmer_id && req.session.user.role !== 'admin') {
      return handleError(res, 403, 'Not authorized to update this crop');
    }

    let image = null;
    if (req.file) {
      const storageResult = await uploadToSupabaseStorage(req.file, 'crops');
      image = storageResult?.url || getStorageFallbackUrl(req.file);
    } else if (req.body.image) {
      image = req.body.image;
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (quantity !== undefined) {
      updateData.quantity = parseInt(quantity);
      updateData.available = parseInt(quantity) > 0 && (status === 'active' || (req.session.user && req.session.user.role === 'admin'));
    }
    if (unit !== undefined) updateData.unit = unit;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (image) updateData.image = image;
    if (status !== undefined && req.session.user?.role === 'admin') {
      updateData.status = status === 'active' ? 'active' : 'rejected';
      updateData.available = status === 'active';
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = req.session.user.id;
    }
    if (review_notes !== undefined && req.session.user?.role === 'admin') {
      updateData.review_notes = review_notes;
    }
    if (status !== undefined && req.session.user?.role === 'farmer') {
      updateData.status = 'draft';
      updateData.available = false;
    }

    // Update crop
    const { data: crop, error } = await supabase
      .from('crops')
      .update(updateData)
      .eq('id', id)
      .select('*, users(id, name, location)')
      .single();

    if (error) throw error;

    if (req.session.user?.role === 'admin' && status !== undefined) {
      void notifyCropDecision(crop.id, crop.status).catch((notificationError) => {
        console.error('[notifications] crop decision SMS failed:', notificationError.message);
      });
    }

    res.json(transformCrop(crop));
  } catch (err) {
    handleError(res, 500, 'Failed to update crop', err.message);
  }
};

export const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return handleError(res, 401, 'Not authenticated');
    }

    // Get crop
    const { data: crop, error: fetchError } = await supabase
      .from('crops')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }

    if (fetchError) throw fetchError;

    // Check authorization
    if (crop.farmer_id !== user.id && user.role !== 'admin') {
      return handleError(res, 403, 'Not authorized to delete this crop');
    }

    // Delete crop
    const { error } = await supabase
      .from('crops')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to delete crop', err.message);
  }
};

export const bulkUpdateAvailability = async (req, res) => {
  try {
    const { cropIds, available } = req.body;

    if (!Array.isArray(cropIds) || typeof available !== 'boolean') {
      return handleError(res, 400, 'Invalid input: provide cropIds array and available boolean');
    }

    if (cropIds.length === 0) {
      return handleError(res, 400, 'No crop IDs provided');
    }

    // Update all crops
    const { error } = await supabase
      .from('crops')
      .update({ available })
      .in('id', cropIds);

    if (error) throw error;

    res.json({ message: 'Availability updated successfully', updated: cropIds.length });
  } catch (err) {
    handleError(res, 500, 'Failed to update availability', err.message);
  }
};

export const searchCrops = async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length === 0) {
      return handleError(res, 400, 'Search query is required');
    }

    let query = supabase
      .from('crops')
      .select('*, users(id, name, location)')
      .ilike('name', `%${q}%`)
      .eq('available', true);

    const isAdminView = req.session?.user?.role === 'admin' || req.session?.user?.role === 'vendor';
    if (!isAdminView) {
      const { data: approvedRows, error: approvedError } = await supabase
        .from('user_verifications')
        .select('user_id')
        .eq('status', 'approved');

      if (approvedError) throw approvedError;
      const approvedFarmerIds = (approvedRows || []).map((row) => row.user_id).filter(Boolean);
      if (approvedFarmerIds.length === 0) {
        return res.json({ crops: [], count: 0 });
      }
      query = query.in('farmer_id', approvedFarmerIds);
    }

    const { data: crops, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const transformedCrops = crops.map(transformCrop);
    res.json({ crops: transformedCrops, count: transformedCrops.length });
  } catch (err) {
    handleError(res, 500, 'Failed to search crops', err.message);
  }
};

export const predictHarvestForCrop = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    const user = req.session.user;
    if (!user) {
      return handleError(res, 401, 'Not authenticated');
    }

    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('*')
      .eq('id', cropId)
      .single();

    if (cropError?.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }
    if (cropError) throw cropError;

    if (user.role !== 'admin' && crop.farmer_id !== user.id) {
      return handleError(res, 403, 'Not authorized to run predictions for this crop');
    }

    const cropType = (req.body.crop_type || crop.name || '').toString().trim().toLowerCase();
    const plantingDate = req.body.planting_date || crop.planting_date || (crop.created_at ? new Date(crop.created_at).toISOString().slice(0, 10) : null);
    const region = req.body.region || user.location || 'Ashanti';

    if (!cropType || !plantingDate) {
      return handleError(res, 400, 'Missing crop type or planting date for prediction');
    }

    const mlResult = await MLService.predictHarvest(cropType, plantingDate, region);
    if (!mlResult || mlResult.status !== 'success') {
      return handleError(res, 502, 'ML harvest prediction failed', mlResult?.error);
    }

    const prediction = mlResult.data;

    // best-effort updates for enhanced schema
    const { error: cropUpdateError } = await supabase
      .from('crops')
      .update({
        harvest_date_predicted: prediction.estimated_harvest,
        last_prediction_run: new Date().toISOString()
      })
      .eq('id', cropId);

    if (cropUpdateError) {
      console.warn('Could not update crop prediction fields:', cropUpdateError.message);
    }

    const { error: predictionError } = await supabase
      .from('ai_predictions')
      .insert([
        {
          crop_id: cropId,
          prediction_type: 'harvest_timing',
          predicted_value: Number(prediction.predicted_days || prediction.days_until || 0),
          confidence_score: prediction.confidence ?? null,
          metadata: {
            estimated_harvest: prediction.estimated_harvest,
            range: prediction.range,
            days_until: prediction.days_until,
            region
          },
          model_version: prediction.model_version || 'v0.1-placeholder'
        }
      ]);

    if (predictionError) {
      console.warn('Could not persist ai prediction:', predictionError.message);
    }

    return res.json({
      status: 'success',
      crop_id: cropId,
      prediction,
      persisted: !predictionError
    });
  } catch (err) {
    return handleError(res, 500, 'Failed to run harvest prediction', err.message);
  }
};

export const analyzeCropQuality = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    const user = req.session.user;
    if (!user) {
      return handleError(res, 401, 'Not authenticated');
    }
    if (!req.file) {
      return handleError(res, 400, 'Image file is required');
    }

    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('*')
      .eq('id', cropId)
      .single();

    if (cropError?.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }
    if (cropError) throw cropError;

    if (user.role !== 'admin' && crop.farmer_id !== user.id) {
      return handleError(res, 403, 'Not authorized to analyze this crop');
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;
    const mlResult = await MLService.analyzeQuality(imagePath, req.file.originalname, cropId, imageUrl);
    if (!mlResult || mlResult.status !== 'success') {
      return handleError(res, 502, 'ML quality analysis failed', mlResult?.error);
    }

    const data = mlResult.data;

    const { error: cropUpdateError } = await supabase
      .from('crops')
      .update({
        quality_score: Number(data.quality_score),
        freshness_status: Number(data.quality_score) >= 75 ? 'fresh' : 'review',
        last_prediction_run: new Date().toISOString()
      })
      .eq('id', cropId);

    if (cropUpdateError) {
      console.warn('Could not update crop quality fields:', cropUpdateError.message);
    }

    return res.json({
      status: 'success',
      crop_id: cropId,
      analysis: data
    });
  } catch (err) {
    return handleError(res, 500, 'Failed to analyze crop quality', err.message);
  }
};

export const verifyCropPhoto = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    const user = req.session.user;
    if (!user) {
      return handleError(res, 401, 'Not authenticated');
    }
    if (!req.file) {
      return handleError(res, 400, 'Image file is required');
    }

    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('id, name, category, farmer_id')
      .eq('id', cropId)
      .single();

    if (cropError?.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }
    if (cropError) throw cropError;

    if (user.role !== 'admin' && crop.farmer_id !== user.id) {
      return handleError(res, 403, 'Not authorized to verify this crop photo');
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;
    const mlResult = await MLService.verifyCropPhoto(
      imagePath,
      req.file.originalname,
      crop.name,
      crop.category || 'unknown',
      cropId,
      imageUrl
    );

    if (!mlResult || mlResult.status === 'error') {
      return handleError(res, 502, 'Crop photo verification failed', mlResult?.error);
    }

    const data = mlResult.data || mlResult;
    const decision = data.decision || (data.is_real_crop ? 'approve' : 'reject');

    if (decision === 'reject' || data.requires_review) {
      await supabase.from('crops').update({
        status: 'draft',
        review_notes: data.reason || 'Photo validation flagged the listing for manual review.',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        last_prediction_run: new Date().toISOString()
      }).eq('id', cropId).throwOnError();
    }

    return res.json({
      status: 'success',
      crop_id: cropId,
      verification: data,
      decision
    });
  } catch (err) {
    return handleError(res, 500, 'Failed to verify crop photo', err.message);
  }
};

export const getCropPredictions = async (req, res) => {
  try {
    const cropId = Number(req.params.id);

    const [{ data: predictions, error: predError }, { data: analyses, error: analysisError }] = await Promise.all([
      supabase
        .from('ai_predictions')
        .select('*')
        .eq('crop_id', cropId)
        .order('generated_at', { ascending: false }),
      supabase
        .from('image_analysis')
        .select('*')
        .eq('crop_id', cropId)
        .order('analyzed_at', { ascending: false })
    ]);

    if (predError) throw predError;
    if (analysisError) throw analysisError;

    return res.json({
      crop_id: cropId,
      predictions: predictions || [],
      image_analysis: analyses || []
    });
  } catch (err) {
    return handleError(res, 500, 'Failed to fetch crop predictions', err.message);
  }
};

export const listMlCropTypes = async (_req, res) => {
  try {
    const result = await MLService.getCropTypes();
    if (!result || result.status === 'error') {
      return handleError(res, 502, 'Failed to fetch crop types from ML service', result?.error);
    }
    return res.json(result);
  } catch (err) {
    return handleError(res, 500, 'Failed to fetch ML crop types', err.message);
  }
};

export const calculateCropFreshness = async (req, res) => {
  try {
    const { id } = req.params;
    const { harvest_date, storage_condition, quality_score } = req.body;

    if (!harvest_date) {
      return handleError(res, 400, 'harvest_date is required');
    }

    // Get crop type
    const { data: crop, error: fetchError } = await supabase
      .from('crops')
      .select('category, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      return handleError(res, 404, 'Crop not found');
    }

    const cropType = (crop.category || crop.name || '').toString().trim().toLowerCase();

    // Call ML service
    const result = await MLService.calculateFreshness(
      cropType,
      harvest_date,
      storage_condition || 'room_temp',
      quality_score || 85.0
    );

    if (result.status === 'error') {
      return handleError(res, 502, 'ML service freshness calculation failed', result.error);
    }

    // Optionally persist to database
    try {
      const record = {
        crop_id: Number(id),
        prediction_type: 'freshness',
        predicted_value: result.data.freshness_score,
        confidence_score: result.data.confidence,
        metadata: {
          status: result.data.status,
          days_remaining: result.data.days_remaining,
          storage_condition: result.data.storage_condition
        },
        model_version: result.data.model_version || 'ml-freshness-v1'
      };
      await supabase.from('ai_predictions').insert([record]);
    } catch (persistErr) {
      console.warn('Failed to persist freshness prediction:', persistErr.message);
    }

    return res.json({ status: 'success', data: result.data });
  } catch (err) {
    return handleError(res, 500, 'Failed to calculate freshness', err.message);
  }
};

export const forecastCropPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality_score, freshness_status, days_ahead } = req.body;

    // Get crop type
    const { data: crop, error: fetchError } = await supabase
      .from('crops')
      .select('category, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      return handleError(res, 404, 'Crop not found');
    }

    const cropType = (crop.category || crop.name || '').toString().trim().toLowerCase();

    // Call ML service
    const result = await MLService.forecastPrice(
      cropType,
      quality_score || 85.0,
      freshness_status || 'good',
      days_ahead || 0
    );

    if (result.status === 'error') {
      return handleError(res, 502, 'ML service price forecast failed', result.error);
    }

    // Optionally persist to database
    try {
      const record = {
        crop_id: Number(id),
        prediction_type: 'price_forecast',
        predicted_value: result.data.forecasted_price,
        confidence_score: result.data.confidence,
        metadata: {
          base_price: result.data.base_price,
          forecast_date: result.data.forecast_date,
          adjustments: result.data.adjustments
        },
        model_version: result.data.model_version || 'ml-price-v1'
      };
      await supabase.from('ai_predictions').insert([record]);
    } catch (persistErr) {
      console.warn('Failed to persist price forecast:', persistErr.message);
    }

    return res.json({ status: 'success', data: result.data });
  } catch (err) {
    return handleError(res, 500, 'Failed to forecast price', err.message);
  }
};

export const recommendCropSellingTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality_score, freshness_status } = req.body;

    // Get crop type
    const { data: crop, error: fetchError } = await supabase
      .from('crops')
      .select('category, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      return handleError(res, 404, 'Crop not found');
    }

    const cropType = (crop.category || crop.name || '').toString().trim().toLowerCase();

    // Call ML service
    const result = await MLService.recommendSellingTime(
      cropType,
      quality_score || 85.0,
      freshness_status || 'good'
    );

    if (result.status === 'error') {
      return handleError(res, 502, 'ML service selling time recommendation failed', result.error);
    }

    return res.json({ status: 'success', data: result.data });
  } catch (err) {
    return handleError(res, 500, 'Failed to recommend selling time', err.message);
  }
};

