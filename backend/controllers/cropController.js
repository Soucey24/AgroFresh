import { supabase } from '../app.js';
import MLService from '../services/mlService.js';

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
  farmer: crop.users?.name || 'Unknown',
  location: crop.users?.location || 'Unknown',
  harvestDate: crop.created_at,
  image: crop.image,
  available: crop.available
});

export const listCrops = async (req, res) => {
  try {
    // Delete crops older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from('crops')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString());

    // Build query
    let query = supabase
      .from('crops')
      .select('*, users(id, name, location)');

    // Filter by farmer if user is a farmer
    if (req.session.user && req.session.user.role === 'farmer') {
      query = query.eq('farmer_id', req.session.user.id);
    }

    const { data: crops, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) throw error;

    const transformedCrops = crops.map(transformCrop);
    res.json(transformedCrops);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crops', err.message);
  }
};

export const createCrop = async (req, res) => {
  try {
    const { name, description, price, quantity, unit, expiry_date } = req.body;
    const farmer_id = req.session.user?.id;

    // Validation
    if (!name || price === undefined || quantity === undefined || !farmer_id) {
      return handleError(res, 400, 'Missing required fields: name, price, quantity');
    }

    let image = null;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      image = req.body.image;
    }

    // Create crop
    const { data: crop, error } = await supabase
      .from('crops')
      .insert([{
        name,
        description: description || null,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        unit: unit || 'kg',
        expiry_date: expiry_date || null,
        farmer_id,
        image,
        available: parseInt(quantity) > 0
      }])
      .select('*, users(id, name, location)')
      .single();

    if (error) throw error;

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

    res.json(transformCrop(crop));
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crop', err.message);
  }
};

export const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, unit, expiry_date } = req.body;
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
      image = `/uploads/${req.file.filename}`;
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
      updateData.available = parseInt(quantity) > 0;
    }
    if (unit !== undefined) updateData.unit = unit;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (image) updateData.image = image;

    // Update crop
    const { data: crop, error } = await supabase
      .from('crops')
      .update(updateData)
      .eq('id', id)
      .select('*, users(id, name, location)')
      .single();

    if (error) throw error;

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

    const { data: crops, error } = await supabase
      .from('crops')
      .select('*, users(id, name, location)')
      .ilike('name', `%${q}%`)
      .eq('available', true)
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
