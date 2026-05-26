import fs from 'fs';
import path from 'path';
import { supabase } from '../app.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

export const requestVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return handleError(res, 400, 'Invalid user id');
    if (!req.session?.user || req.session.user.id !== userId) {
      return handleError(res, 403, 'You can only submit verification for your own account');
    }

    const phone = req.body.phone || null;
    const farm_name = req.body.farm_name || null;
    const farmers_association_address = req.body.farmers_association_address || null;
    const ghana_card_number = req.body.ghana_card_number || null;
    const location_text = req.body.location_text || null;
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;

    if (!phone || !farmers_association_address || !ghana_card_number) {
      return handleError(res, 400, 'Phone, association address, and Ghana card number are required');
    }

    const uploaded = [];
    let photoUpload = null;

    const photoFile = req.files?.photo?.[0] || null;
    const documentFiles = req.files?.documents || [];
    const allFiles = [photoFile, ...documentFiles].filter(Boolean);

    // Try uploading to Supabase Storage if available
    if (supabase && allFiles.length) {
      for (const f of allFiles) {
        try {
          const buffer = fs.readFileSync(f.path);
          const key = `verifications/${userId}/${Date.now()}_${f.originalname}`;
          const { data, error } = await supabase.storage.from('verifications').upload(key, buffer, {
            contentType: f.mimetype,
            upsert: false,
          });
          if (error) {
            console.warn('Supabase storage upload error', error.message);
            continue;
          }
          const { publicURL } = supabase.storage.from('verifications').getPublicUrl(data.path || key);
          const entry = { name: f.originalname, path: key, url: publicURL };
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
      farmers_association_address,
      ghana_card_number,
      location_text,
      latitude,
      longitude,
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
      return res.json({ success: true, fallback: true, path: outPath });
    }
  } catch (err) {
    handleError(res, 500, 'Verification submission failed', err.message);
  }
};
