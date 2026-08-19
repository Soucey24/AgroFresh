import { supabase } from '../app.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

export const createReview = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    const user = req.session.user;
    const { rating, comment } = req.body;

    if (!user) return handleError(res, 401, 'Not authenticated');
    if (!rating || Number(rating) < 1 || Number(rating) > 5) return handleError(res, 400, 'Rating must be between 1 and 5');

    // Ensure crop exists
    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('id')
      .eq('id', cropId)
      .single();

    if (cropError && cropError.code === 'PGRST116') {
      return handleError(res, 404, 'Crop not found');
    }
    if (cropError) throw cropError;

    const { data: purchase, error: purchaseError } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('crop_id', cropId)
      .in('status', ['paid', 'completed', 'delivered'])
      .limit(1)
      .maybeSingle();
    if (purchaseError) throw purchaseError;
    if (!purchase) return handleError(res, 403, 'Only buyers with a completed purchase can review this product');

    const { data: existingReview, error: existingReviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('crop_id', cropId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingReviewError) throw existingReviewError;
    if (existingReview) return handleError(res, 409, 'You have already reviewed this product');

    const record = {
      crop_id: cropId,
      user_id: user.id || null,
      user_name: user.name || null,
      rating: Number(rating),
      comment: comment || null
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert([record])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    handleError(res, 500, 'Failed to create review', err.message);
  }
};

export const getReviewsForCrop = async (req, res) => {
  try {
    const cropId = Number(req.params.id);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('crop_id', cropId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch reviews', err.message);
  }
};
