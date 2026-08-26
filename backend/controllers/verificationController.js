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

const normalizeIdentityName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
    const fda_registration_number = req.body.fda_registration_number || null;
    const ghana_card_number = req.body.ghana_card_number || null;
    const identity_name = String(req.body.identity_name || '').trim();
    const years_farming = req.body.years_farming ? Number(req.body.years_farming) : null;
    const crops_produced = req.body.crops_produced || null;
    const location_text = req.body.location_text || req.body.exact_location || applicant.digital_address || null;
    const region = req.body.region || null;
    const district = req.body.district || null;
    const town_village = req.body.town_village || null;
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;

    if (!identity_name || !ghana_card_number || !isValidGhanaCardNumber(ghana_card_number) || !fda_registration_number || !Number.isInteger(years_farming) || years_farming < 0 || !crops_produced) {
      return handleError(res, 400, 'Full name, Ghana Card number, FDA registration number, years farming, and crops produced are required');
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

    const accountName = normalizeIdentityName([applicant.first_name, applicant.other_names, applicant.surname].filter(Boolean).join(' ') || applicant.name);
    const submittedIdentityName = normalizeIdentityName(identity_name);
    const nameMatchStatus = accountName && submittedIdentityName && (accountName === submittedIdentityName || accountName.includes(submittedIdentityName) || submittedIdentityName.includes(accountName)) ? 'matched' : 'mismatch';

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
      ghana_card_number,
      identity_name,
      name_match_status: nameMatchStatus,
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
