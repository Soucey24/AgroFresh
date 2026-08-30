import { supabase } from '../app.js';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const handleError = (res, status, message, details) => {
	if (details) {
		console.error(message, details);
	}
	res.status(status).json({ error: message });
};

/**
 * Analyze produce quality using ML model
 * POST /api/quality-checks/analyze
 */
export const analyzeQuality = async (req, res) => {
	try {
		const { order_id, crop_id, image_url, file_base64 } = req.body;

		if (!order_id || !crop_id || (!image_url && !file_base64)) {
			return handleError(res, 400, 'Missing required fields: order_id, crop_id, and image data');
		}

		// Call ML service for quality analysis
		const mlPayload = new FormData();
		mlPayload.append('crop_id', crop_id);

		if (file_base64) {
			// Convert base64 to blob
			const byteString = atob(file_base64.split(',')[1]);
			const ab = new ArrayBuffer(byteString.length);
			const view = new Uint8Array(ab);
			for (let i = 0; i < byteString.length; i++) {
				view[i] = byteString.charCodeAt(i);
			}
			const blob = new Blob([ab], { type: 'image/jpeg' });
			mlPayload.append('image', blob, `quality-check-${order_id}.jpg`);
		} else if (image_url) {
			mlPayload.append('image_url', image_url);
		}

		// Call ML analyze-quality endpoint
		let qualityResult = { quality_score: 0, defects: [], color_analysis: {} };
		try {
			const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/ml/analyze-quality`, mlPayload, {
				headers: { 'Content-Type': 'multipart/form-data', timeout: 30000 }
			});
			if (mlResponse.data?.data) {
				qualityResult = mlResponse.data.data;
			}
		} catch (mlError) {
			console.warn('[ML] Quality analysis failed, using default scores:', mlError.message);
		}

		// Store quality check record
		const { data: check, error: insertError } = await supabase
			.from('quality_checks')
			.insert([
				{
					order_id,
					crop_id,
					analyzed_by: req.session.user?.id,
					quality_score: qualityResult.quality_score || 0,
					defects: qualityResult.defects || [],
					color_analysis: qualityResult.color_analysis || {},
					image_url,
					status: 'pending_review'
				}
			])
			.select()
			.single();

		if (insertError) throw insertError;

		res.json({
			quality_check_id: check.id,
			...qualityResult,
			recommendation: getQualityRecommendation(qualityResult.quality_score)
		});
	} catch (err) {
		handleError(res, 500, 'Failed to analyze quality', err.message);
	}
};

/**
 * Complete quality check and transition order
 * POST /api/quality-checks/:id/complete
 */
export const completeQualityCheck = async (req, res) => {
	try {
		const checkId = Number(req.params.id);
		const { order_id, decision, notes, quantity_accepted, quantity_rejected, reason } = req.body;

		if (!['approved', 'rejected', 'partial'].includes(decision)) {
			return handleError(res, 400, 'Invalid decision: must be approved, rejected, or partial');
		}

		if (!order_id) {
			return handleError(res, 400, 'Missing order_id');
		}

		// Verify user is operations staff
		if (!['operations', 'admin'].includes(req.session.user?.role)) {
			return handleError(res, 403, 'Only operations staff can complete quality checks');
		}

		// Get order and crop details
		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select('*, crop:crops(id, farmer_id)')
			.eq('id', order_id)
			.single();

		if (orderError?.code === 'PGRST116') {
			return handleError(res, 404, 'Order not found');
		}
		if (orderError) throw orderError;

		// Update quality check record
		const { error: updateCheckError } = await supabase
			.from('quality_checks')
			.update({
				status: decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'partial_approved',
				decision,
				notes,
				quantity_accepted: quantity_accepted || order.quantity,
				quantity_rejected: quantity_rejected || 0,
				rejection_reason: reason || null,
				completed_at: new Date().toISOString(),
				completed_by: req.session.user?.id
			})
			.eq('id', checkId);

		if (updateCheckError) throw updateCheckError;

		let nextOrderStatus = order.status;
		let refundAmount = 0;

		// Handle decision outcomes
		if (decision === 'approved') {
			// Move to ready for dispatch
			nextOrderStatus = 'ready';
		} else if (decision === 'rejected') {
			// Cancel order and restore crop quantity
			nextOrderStatus = 'cancelled';
			const { data: payment } = await supabase
				.from('payments')
				.select('amount')
				.eq('order_id', order_id)
				.eq('status', 'completed')
				.maybeSingle();

			refundAmount = payment?.amount || 0;

			// Restore crop quantity
			const { data: crop } = await supabase
				.from('crops')
				.select('quantity')
				.eq('id', order.crop_id)
				.single();

			if (crop) {
				await supabase
					.from('crops')
					.update({ quantity: Number(crop.quantity) + Number(order.quantity), available: true })
					.eq('id', order.crop_id);
			}

			// Create refund if payment exists
			if (refundAmount > 0) {
				const { data: payment } = await supabase
					.from('payments')
					.select('id')
					.eq('order_id', order_id)
					.single();

				if (payment) {
					await supabase
						.from('payments')
						.update({ status: 'refunded' })
						.eq('id', payment.id);
				}
			}
		} else if (decision === 'partial') {
			// Adjust order quantity and refund difference
			if (quantity_accepted && quantity_accepted < order.quantity) {
				nextOrderStatus = 'ready'; // Proceed with reduced quantity

				const { data: payment } = await supabase
					.from('payments')
					.select('amount')
					.eq('order_id', order_id)
					.eq('status', 'completed')
					.maybeSingle();

				if (payment) {
					const pricePerUnit = Number(payment.amount) / Number(order.quantity);
					refundAmount = (Number(order.quantity) - Number(quantity_accepted)) * pricePerUnit;

					// Update payment to reflect new amount
					const newAmount = Number(payment.amount) - refundAmount;
					await supabase
						.from('payments')
						.update({ amount: newAmount })
						.eq('id', payment.id);
				}

				// Update order quantity
				await supabase
					.from('orders')
					.update({ quantity: quantity_accepted })
					.eq('id', order_id);

				// Restore rejected quantity to crop
				const { data: crop } = await supabase
					.from('crops')
					.select('quantity')
					.eq('id', order.crop_id)
					.single();

				if (crop) {
					await supabase
						.from('crops')
						.update({ quantity: Number(crop.quantity) + quantity_rejected })
						.eq('id', order.crop_id);
				}
			}
		}

		// Update order status
		const { data: updatedOrder, error: updateOrderError } = await supabase
			.from('orders')
			.update({
				status: nextOrderStatus,
				updated_at: new Date().toISOString()
			})
			.eq('id', order_id)
			.select()
			.single();

		if (updateOrderError) throw updateOrderError;

		res.json({
			message: `Quality check completed with decision: ${decision}`,
			order: updatedOrder,
			refund_amount: refundAmount,
			next_status: nextOrderStatus
		});
	} catch (err) {
		handleError(res, 500, 'Failed to complete quality check', err.message);
	}
};

/**
 * Get quality check details
 * GET /api/quality-checks/:id
 */
export const getQualityCheck = async (req, res) => {
	try {
		const checkId = Number(req.params.id);

		const { data: check, error } = await supabase
			.from('quality_checks')
			.select('*')
			.eq('id', checkId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'Quality check not found');
		}
		if (error) throw error;

		res.json(check);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch quality check', err.message);
	}
};

/**
 * List quality checks for an order
 * GET /api/quality-checks?order_id=:order_id
 */
export const listQualityChecks = async (req, res) => {
	try {
		const { order_id } = req.query;

		let query = supabase.from('quality_checks').select('*');

		if (order_id) {
			query = query.eq('order_id', order_id);
		}

		const { data, error } = await query.order('created_at', { ascending: false });

		if (error) throw error;

		res.json(data || []);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch quality checks', err.message);
	}
};

/**
 * Helper function to get recommendation based on quality score
 */
function getQualityRecommendation(score) {
	if (score >= 85) return 'APPROVED - Excellent quality';
	if (score >= 70) return 'APPROVED - Good quality';
	if (score >= 50) return 'REVIEW - Fair quality, recommend partial approval';
	return 'REJECTED - Poor quality';
}
