import fs from 'fs';
import path from 'path';
import { notifyVerificationSubmitted } from '../services/notificationService.js';
import {
  verifyFaceMatch,
  updateVerificationStatus,
  getUnverifiedOperationsStaff,
  getUnverifiedFarmers,
  getVerificationStats,
  rejectVerification,
  hasRequiredDocuments,
  getUserVerificationInfo,
} from '../services/faceVerification.js';
import { supabase } from '../app.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

const normalizeGhanaPhone = (value) => String(value || '').replace(/\s+/g, '');

const isValidGhanaPhone = (value) => {
  const phone = normalizeGhanaPhone(value);
  return /^(?:\+233|233|0)(?:20|24|26|27|50|54|55|59)\d{7,8}$/.test(phone);
};

const createStorageEntry = async (supabaseClient, bucketName, file) => {
  const buffer = fs.readFileSync(file.path);
  const key = `verifications/${file.userId}/${Date.now()}_${file.originalname}`;
  const { data, error } = await supabaseClient.storage.from(bucketName).upload(key, buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const storedPath = data?.path || key;
  const { data: signed, error: signedError } = await supabaseClient.storage
    .from(bucketName)
    .createSignedUrl(storedPath, 60 * 60 * 24 * 7);

  if (signedError) {
    throw signedError;
  }

  return {
    name: file.originalname,
    path: storedPath,
    url: signed?.signedUrl || null,
  };
};

export const requestVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return handleError(res, 400, 'Invalid user id');

    const sessionUserId = req.session?.user?.id ? Number(req.session.user.id) : null;
    const requestUserId = req.body.user_id ? Number(req.body.user_id) : null;

    if (sessionUserId !== null && sessionUserId !== userId) {
      return handleError(res, 403, 'You can only submit verification for your own account');
    }

    if (sessionUserId === null && requestUserId !== null && requestUserId !== userId) {
      return handleError(res, 403, 'You can only submit verification for your own account');
    }

    const { data: applicant, error: applicantError } = await supabase
      .from('users')
      .select('id, name, first_name, surname, other_names, phone, digital_address')
      .eq('id', userId)
      .single();
    if (applicantError) throw applicantError;

    let phone = req.body.phone || req.session?.user?.phone || applicant.phone || null;
    if (!phone) {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('phone')
        .eq('id', userId)
        .maybeSingle();

      if (!userError && userRecord?.phone) {
        phone = userRecord.phone;
      }
    }

    const farm_name = req.body.farm_name || null;
    const farmers_association_address = req.body.farmers_association_address || null;
    const fda_registration_number = String(req.body.fda_registration_number || '').trim();
    const years_farming = req.body.years_farming === undefined || req.body.years_farming === '' ? null : Number(req.body.years_farming);
    const crops_produced = String(req.body.crops_produced || '').trim();
    const location_text = req.body.location_text || req.body.exact_location || applicant.digital_address || null;
    const region = req.body.region || null;
    const district = req.body.district || null;
    const town_village = req.body.town_village || null;
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;

    const missingFields = [];
    if (!fda_registration_number) missingFields.push('FDA registration number');
    if (!Number.isInteger(years_farming) || years_farming < 0) missingFields.push('years farming');
    if (!crops_produced) missingFields.push('crops produced');
    if (missingFields.length) {
      return handleError(res, 400, `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required`);
    }

    if (phone && !isValidGhanaPhone(phone)) {
      return handleError(res, 400, 'Phone number must be a valid Ghana mobile number (e.g. 0241234567 or +233241234567)');
    }

    const trimmedAssociationAddress = String(farmers_association_address || '').trim();
    const normalizedAssociationAddress = trimmedAssociationAddress;

    const uploaded = [];
    let photoUpload = null;

    const photoFile = req.files?.photo?.[0] || null;
    const cardFrontFile = req.files?.ghana_card_front?.[0] || null;
    const cardBackFile = req.files?.ghana_card_back?.[0] || null;
    const fdaDocumentFile = req.files?.fda_document?.[0] || null;
    const documentFiles = req.files?.documents || [];
    const allFiles = [photoFile, cardFrontFile, cardBackFile, fdaDocumentFile, ...documentFiles].filter(Boolean);

    // Try uploading to Supabase Storage if available
    if (supabase && allFiles.length) {
      for (const f of allFiles) {
        try {
          const entry = await createStorageEntry(supabase, 'verifications', {
            ...f,
            userId,
          });
          if (photoFile && f.filename === photoFile.filename) {
            photoUpload = entry;
          } else {
            uploaded.push(entry);
          }
        } catch (err) {
          console.warn('Upload failed for file', f.originalname, err.message);
        }
      }
    }

    if (!photoUpload && photoFile) {
      photoUpload = {
        name: photoFile.originalname,
        path: photoFile.path,
        url: `/uploads/${path.basename(photoFile.path)}`
      };
    }

    if (!photoUpload) return handleError(res, 400, 'Farmer photo is required');
    if (!fdaDocumentFile) return handleError(res, 400, 'FDA certificate is required');

    const submission = {
      user_id: userId,
      phone,
      farm_name,
      farmers_association_address: normalizedAssociationAddress || null,
      location_text,
      region,
      district,
      town_village,
      latitude: latitude !== null && !Number.isNaN(latitude) ? latitude : null,
      longitude: longitude !== null && !Number.isNaN(longitude) ? longitude : null,
      photo_url: photoUpload.url,
      documents: uploaded,
      ghana_card_front_url: cardFrontFile ? uploaded.find((file) => file.name === cardFrontFile.originalname)?.url || `/uploads/${cardFrontFile.filename}` : null,
      ghana_card_back_url: cardBackFile ? uploaded.find((file) => file.name === cardBackFile.originalname)?.url || `/uploads/${cardBackFile.filename}` : null,
      years_farming,
      crops_produced,
      fda_registration_number,
      fda_document_url: uploaded.find((file) => file.name === fdaDocumentFile?.originalname)?.url || (fdaDocumentFile ? `/uploads/${fdaDocumentFile.filename}` : null),
      didit_request_id: null,
      didit_status: null,
      didit_result: null,
      status: 'pending',
      submitted_at: new Date().toISOString()
    };

    // Try inserting into user_verifications table; if table doesn't exist, fallback to filesystem
    try {
      const { data, error } = await supabase.from('user_verifications').insert([submission]).select().single();
      if (error) throw error;
      // mark session
      if (req.session && req.session.user && req.session.user.id === userId) {
        req.session.user.verificationRequested = true;
        req.session.user.verificationStatus = 'pending';
      }
      void notifyVerificationSubmitted(userId).catch((notificationError) => {
        console.error('[notifications] verification submission SMS failed:', notificationError.message);
      });
      return res.json({ success: true, id: data.id });
    } catch (err) {
      console.warn('Could not insert into user_verifications, falling back to local file', {
        message: err.message,
      });
      return res.status(500).json({ error: 'Failed to submit verification' });
    }
  } catch (err) {
    handleError(res, 500, 'Failed to request verification', err.message);
  }
};

// ============================================
// Face Verification Endpoints (New)
// ============================================

/**
 * Verify a user by comparing ghana card photo with face photo
 * POST /api/verification/verify/:userId
 */
export const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { manualApproval = false } = req.body;
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can verify users');
    }

    // Get user verification info
    const userInfo = await getUserVerificationInfo(Number(userId));
    if (!userInfo) {
      return handleError(res, 404, 'User not found');
    }

    // Check if user has all required documents
    const docCheck = await hasRequiredDocuments(Number(userId));
    if (!docCheck.complete) {
      return handleError(res, 400, 'User missing required documents', docCheck);
    }

    let verificationResult = { approved: false };

    // If manual approval is requested, skip face verification
    if (manualApproval) {
      verificationResult = {
        approved: true,
        method: 'manual_admin_approval',
        note: 'Approved by admin without automated verification',
      };
    } else {
      // Perform automated face match verification
      const faceMatch = await verifyFaceMatch(
        userInfo.ghana_card_photo,
        userInfo.face_photo
      );

      if (faceMatch.error) {
        // ML service not available - mark as pending manual review
        return res.status(202).json({
          status: 'pending_manual_review',
          message: 'ML service unavailable. Please manually review this user.',
          userId,
          error: faceMatch.error,
        });
      }

      verificationResult = {
        approved: faceMatch.match,
        confidence: faceMatch.confidence,
        liveness_detected: faceMatch.liveness_detected,
        method: 'automated_face_matching',
      };
    }

    // Update user verification status
    if (verificationResult.approved) {
      const updated = await updateVerificationStatus(
        Number(userId),
        'approved',
        `Verified on ${new Date().toISOString()} - ${verificationResult.method}`
      );

      return res.json({
        status: 'approved',
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          verification_status: updated.verification_status,
        },
        verification: verificationResult,
      });
    } else {
      return res.status(400).json({
        status: 'verification_failed',
        message: 'Face verification failed. Photos do not match or liveness not detected.',
        verification: verificationResult,
        userId,
      });
    }
  } catch (err) {
    handleError(res, 500, 'Failed to verify user', err.message);
  }
};

/**
 * Reject a user's verification
 * POST /api/verification/reject/:userId
 */
export const rejectUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can reject verifications');
    }

    const rejectionReason = reason || 'Rejected by admin';
    const updated = await rejectVerification(Number(userId), rejectionReason);

    res.json({
      status: 'rejected',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        verification_status: updated.verification_status,
      },
      rejection_reason: rejectionReason,
    });
  } catch (err) {
    handleError(res, 500, 'Failed to reject verification', err.message);
  }
};

/**
 * Get unverified operations staff or farmers
 * GET /api/verification/unverified?role=operations
 */
export const getUnverifiedUsers = async (req, res) => {
  try {
    const { role = 'operations' } = req.query;
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can view unverified users');
    }

    let users = [];
    if (role === 'operations') {
      users = await getUnverifiedOperationsStaff();
    } else if (role === 'farmer') {
      users = await getUnverifiedFarmers();
    } else {
      return handleError(res, 400, 'Invalid role. Must be operations or farmer');
    }

    res.json({ role, count: users.length, users });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch unverified users', err.message);
  }
};

/**
 * Get verification stats
 * GET /api/verification/stats
 */
export const getVerificationStatusStats = async (req, res) => {
  try {
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can view verification stats');
    }

    const stats = await getVerificationStats();
    res.json(stats);
  } catch (err) {
    handleError(res, 500, 'Failed to get verification stats', err.message);
  }
};

/**
 * Get verification info for a specific user
 * GET /api/verification/user/:userId
 */
export const getUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can view verification details');
    }

    const userInfo = await getUserVerificationInfo(Number(userId));
    if (!userInfo) {
      return handleError(res, 404, 'User not found');
    }

    res.json({
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,
      role: userInfo.role,
      verification_status: userInfo.verification_status,
      verification_notes: userInfo.verification_notes,
      verified_at: userInfo.verified_at,
      has_ghana_card: !!userInfo.ghana_card_photo,
      has_face_photo: !!userInfo.face_photo,
      ghana_card_preview: userInfo.ghana_card_photo ? 'Available' : 'Not uploaded',
      face_photo_preview: userInfo.face_photo ? 'Available' : 'Not uploaded',
    });
  } catch (err) {
    handleError(res, 500, 'Failed to get user verification info', err.message);
  }
};

/**
 * Bulk verify unverified operations staff or farmers
 * POST /api/verification/bulk-verify
 */
export const bulkApproveVerification = async (req, res) => {
  try {
    const { userIds = [] } = req.body;
    const admin = req.session.user;

    if (!admin || admin.role !== 'admin') {
      return handleError(res, 403, 'Only admin can bulk approve verifications');
    }

    if (!userIds.length) {
      return handleError(res, 400, 'No user IDs provided');
    }

    const results = {
      approved: [],
      failed: [],
    };

    for (const userId of userIds) {
      try {
        const updated = await updateVerificationStatus(
          Number(userId),
          'approved',
          `Bulk approved by admin on ${new Date().toISOString()}`
        );
        results.approved.push({
          id: updated.id,
          name: updated.name,
          email: updated.email,
        });
      } catch (err) {
        results.failed.push({
          userId,
          error: err.message,
        });
      }
    }

    res.json({
      total_processed: userIds.length,
      approved_count: results.approved.length,
      failed_count: results.failed.length,
      results,
    });
  } catch (err) {
    handleError(res, 500, 'Failed to bulk approve verifications', err.message);
  }
};

