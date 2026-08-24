import fs from 'fs';
import path from 'path';
import { notifyVerificationSubmitted } from '../services/notificationService.js';
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

const isValidGhanaCardNumber = (value) => {
  const card = String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');
  return /^GHA\d{10}$/.test(card) || /^\d{9,13}$/.test(card);
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

    let phone = req.body.phone || req.session?.user?.phone || null;
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
    const ghana_card_number = req.body.ghana_card_number || null;
    const location_text = req.body.location_text || req.body.exact_location || null;
    const region = req.body.region || null;
    const district = req.body.district || null;
    const town_village = req.body.town_village || null;
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;

    if (!farmers_association_address || !ghana_card_number || !location_text) {
      return handleError(res, 400, 'Exact farm location, association address, and Ghana card number are required');
    }

    if (phone && !isValidGhanaPhone(phone)) {
      return handleError(res, 400, 'Phone number must be a valid Ghana mobile number (e.g. 0241234567 or +233241234567)');
    }

    if (!isValidGhanaCardNumber(ghana_card_number)) {
      return handleError(res, 400, 'Ghana card number must look like a valid card number');
    }

    const trimmedAssociationAddress = String(farmers_association_address || '').trim();
    if (!trimmedAssociationAddress) {
      return handleError(res, 400, 'Please provide a valid association name or association address');
    }

    // Accept realistic addresses and names without forcing an arbitrary 6-character minimum.
    const normalizedAssociationAddress = trimmedAssociationAddress;

    const uploaded = [];
    let photoUpload = null;

    const photoFile = req.files?.photo?.[0] || null;
    const documentFiles = req.files?.documents || [];
    const allFiles = [photoFile, ...documentFiles].filter(Boolean);

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

    if (!photoUpload) {
      return handleError(res, 400, 'Farmer photo is required');
    }

    const submission = {
      user_id: userId,
      phone,
      farm_name,
      farmers_association_address: normalizedAssociationAddress,
      ghana_card_number,
      location_text,
      region,
      district,
      town_village,
      latitude: latitude !== null && !Number.isNaN(latitude) ? latitude : null,
      longitude: longitude !== null && !Number.isNaN(longitude) ? longitude : null,
      photo_url: photoUpload.url,
      documents: uploaded,
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
      console.warn('Could not insert into user_verifications, falling back to local file', err.message);
      // ensure data dir
      const dataDir = path.resolve(process.cwd(), 'backend', 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const outPath = path.join(dataDir, `verification_${userId}_${Date.now()}.json`);
      fs.writeFileSync(outPath, JSON.stringify(submission, null, 2));
      if (req.session && req.session.user && req.session.user.id === userId) {
        req.session.user.verificationRequested = true;
        req.session.user.verificationStatus = 'pending';
      }
      void notifyVerificationSubmitted(userId).catch((notificationError) => {
        console.error('[notifications] verification submission SMS failed:', notificationError.message);
      });
      return res.json({ success: true, fallback: true, path: outPath });
    }
  } catch (err) {
    handleError(res, 500, 'Verification submission failed', err.message);
  }
};
