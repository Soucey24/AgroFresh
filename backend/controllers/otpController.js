import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../app.js';
import { sendSms } from '../services/notificationService.js';

const normalizeE164 = (value) => {
  if (!value) return '';
  const cleaned = String(value).replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('233')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+233${cleaned.slice(1)}`;
  return `+${cleaned}`;
};

const normalizePhone = (value) => {
  const raw = String(value || '').replace(/\s+/g, '');
  if (!raw) return '';

  if (raw.startsWith('+233')) return raw;
  if (raw.startsWith('233')) return `+${raw}`;
  if (raw.startsWith('0')) return `+233${raw.slice(1)}`;
  return `+233${raw}`;
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const sendOtp = async (req, res) => {
  try {
    const { phone, userId } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert([
        {
          user_id: userId || req.session?.user?.id || null,
          phone: normalizedPhone,
          otp_code: otpCode,
          expires_at: expiresAt,
          status: 'pending'
        }
      ]);

    if (insertError) throw insertError;

    const message = `Your Agrofresh OTP is ${otpCode}. It expires in 5 minutes.`;
    await sendSms({ recipient: { phone: normalizedPhone }, message });

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      phone: normalizedPhone
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    return res.status(500).json({
      error: 'Failed to send OTP',
      details: error.message
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { phone, userId } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    const normalizedPhone = normalizePhone(phone);

    const { data: latestVerification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (latestVerification?.id) {
      const { error: updateError } = await supabase
        .from('phone_verifications')
        .update({
          otp_code: otpCode,
          expires_at: expiresAt,
          status: 'pending',
          verified_at: null,
          user_id: userId || latestVerification.user_id || req.session?.user?.id || null
        })
        .eq('id', latestVerification.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('phone_verifications')
        .insert([
          {
            user_id: userId || req.session?.user?.id || null,
            phone: normalizedPhone,
            otp_code: otpCode,
            expires_at: expiresAt,
            status: 'pending'
          }
        ]);

      if (insertError) throw insertError;
    }

    const message = `Your Agrofresh OTP is ${otpCode}. It expires in 5 minutes.`;
    await sendSms({ recipient: { phone: normalizedPhone }, message });

    return res.json({
      success: true,
      message: 'OTP resent successfully',
      phone: normalizedPhone
    });
  } catch (error) {
    console.error('resendOtp error:', error);
    return res.status(500).json({
      error: 'Failed to resend OTP',
      details: error.message
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otpCode } = req.body;

    if (!phone || !otpCode) {
      return res.status(400).json({ error: 'Phone and OTP code are required' });
    }

    const normalizedPhone = normalizePhone(phone);

    const { data: verification, error } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (!verification) {
      return res.status(400).json({ error: 'No OTP record found for this phone number' });
    }

    if (verification.status === 'verified') {
      return res.json({ success: true, message: 'Phone already verified' });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (verification.otp_code !== String(otpCode).trim()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateError) throw updateError;

    return res.json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    return res.status(500).json({
      error: 'Failed to verify OTP',
      details: error.message
    });
  }
};
