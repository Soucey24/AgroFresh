import axios from 'axios';
import { supabase } from '../app.js';

// Use ML service for face verification
const FACE_API_URL = process.env.FACE_API_URL || 'http://localhost:8001';

/**
 * Verify that two photos are of the same person
 * Compares ghana card photo with face photo
 */
export const verifyFaceMatch = async (ghanaCardPhotoBase64, facePhotoBase64) => {
  try {
    // Call ML service to verify face match
    const response = await axios.post(`${FACE_API_URL}/verify-face-match`, {
      image1: ghanaCardPhotoBase64,
      image2: facePhotoBase64,
    }, { timeout: 30000 });

    return {
      match: response.data.match_score >= 0.75,
      confidence: response.data.match_score,
      liveness_detected: response.data.liveness_score >= 0.7,
      similarity_score: response.data.match_score,
    };
  } catch (error) {
    console.error('Face verification failed:', error.message);
    // If ML service is not available, return pending status to allow manual review
    return {
      match: null,
      error: error.message,
      status: 'pending_manual_review',
    };
  }
};

/**
 * Extract face embeddings for biometric verification
 */
export const getFaceEmbedding = async (facePhotoBase64) => {
  try {
    const response = await axios.post(`${FACE_API_URL}/extract-embedding`, {
      image: facePhotoBase64,
    }, { timeout: 30000 });

    return {
      embedding: response.data.embedding,
      confidence: response.data.confidence,
    };
  } catch (error) {
    console.error('Embedding extraction failed:', error.message);
    return { error: error.message };
  }
};

/**
 * Update user verification status
 */
export const updateVerificationStatus = async (userId, status, verificationNotes = '') => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        verification_status: status,
        verified_at: new Date().toISOString(),
        verification_notes: verificationNotes,
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update verification status:', error.message);
    throw error;
  }
};

/**
 * Get all unverified operations staff
 */
export const getUnverifiedOperationsStaff = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, verification_status, created_at')
      .eq('role', 'operations')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch unverified operations staff:', error.message);
    throw error;
  }
};

/**
 * Get all unverified farmers
 */
export const getUnverifiedFarmers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, verification_status, created_at')
      .eq('role', 'farmer')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch unverified farmers:', error.message);
    throw error;
  }
};

/**
 * Get verification stats
 */
export const getVerificationStats = async () => {
  try {
    const { data: operationsStats } = await supabase
      .from('users')
      .select('verification_status')
      .eq('role', 'operations');

    const { data: farmerStats } = await supabase
      .from('users')
      .select('verification_status')
      .eq('role', 'farmer');

    const countByStatus = (data) => ({
      pending: data.filter((u) => u.verification_status === 'pending').length,
      approved: data.filter((u) => u.verification_status === 'approved').length,
      rejected: data.filter((u) => u.verification_status === 'rejected').length,
      total: data.length,
    });

    return {
      operations: countByStatus(operationsStats || []),
      farmers: countByStatus(farmerStats || []),
    };
  } catch (error) {
    console.error('Failed to get verification stats:', error.message);
    throw error;
  }
};

/**
 * Reject a user's verification with notes
 */
export const rejectVerification = async (userId, rejectionReason) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        verification_status: 'rejected',
        verification_notes: rejectionReason,
        verified_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to reject verification:', error.message);
    throw error;
  }
};

/**
 * Check if user has all required verification documents
 */
export const hasRequiredDocuments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, ghana_card_photo, face_photo, phone')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      hasGhanaCard: !!data.ghana_card_photo,
      hasFacePhoto: !!data.face_photo,
      hasPhone: !!data.phone,
      complete: !!data.ghana_card_photo && !!data.face_photo && !!data.phone,
    };
  } catch (error) {
    console.error('Failed to check documents:', error.message);
    throw error;
  }
};

/**
 * Get user verification info
 */
export const getUserVerificationInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, name, email, phone, role, verification_status, verification_notes, verified_at, ghana_card_photo, face_photo'
      )
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get user verification info:', error.message);
    throw error;
  }
};
