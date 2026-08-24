import bcrypt from 'bcryptjs';
import { supabase } from '../app.js';
import { notifyRegistration, sendSms } from '../services/notificationService.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

const allowedRoles = ['farmer', 'buyer', 'admin', 'vendor'];
const normalizeLoginPhone = (value) => {
  const raw = String(value || '').replace(/\s+/g, '');
  if (raw.startsWith('+233')) return raw;
  if (raw.startsWith('233')) return `+${raw}`;
  if (raw.startsWith('0')) return `+233${raw.slice(1)}`;
  return `+233${raw}`;
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return handleError(res, 400, 'All fields are required');
    }

    if (role === 'admin') {
      return handleError(res, 403, 'Admin accounts are created by the platform team. Please sign in with the seeded admin account.');
    }

    if (!['farmer', 'buyer', 'vendor'].includes(role)) {
      return handleError(res, 400, 'Invalid role');
    }

    // Check if user exists with same email and role
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role', role)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      return handleError(res, 409, 'Email already registered for this role');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash,
        role,
        location: location || null,
        phone: phone || null,
        status: 'Active'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    const normalizedPhone = normalizeLoginPhone(phone);
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const { error: otpError } = await supabase.from('phone_verifications').insert([{
      user_id: user.id,
      phone: normalizedPhone,
      otp_code: otpCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'pending'
    }]);
    if (otpError) throw otpError;
    await sendSms({ recipient: { phone: normalizedPhone }, message: `Your AgroFresh signup code is ${otpCode}. It expires in 5 minutes.` });

    void notifyRegistration(user).catch((notificationError) => {
      console.error('[notifications] registration SMS failed:', notificationError.message);
    });

    req.session.pendingRegistration = { userId: user.id, phone: normalizedPhone };
    res.status(201).json({ requiresPhoneOtp: true, userId: user.id, phone: `${normalizedPhone.slice(0, 7)}****${normalizedPhone.slice(-2)}` });
  } catch (err) {
    handleError(res, 500, 'Registration failed', err.message);
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  try {
    const pending = req.session.pendingRegistration;
    const otpCode = String(req.body.otpCode || '').trim();
    if (!pending || !otpCode) return handleError(res, 400, 'Signup OTP is required');

    const { data: verification, error } = await supabase.from('phone_verifications')
      .select('*').eq('user_id', pending.userId).eq('phone', pending.phone)
      .eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!verification) return handleError(res, 400, 'No active signup OTP found');
    if (new Date(verification.expires_at) < new Date()) return handleError(res, 400, 'Signup OTP has expired');
    if (String(verification.otp_code) !== otpCode) return handleError(res, 400, 'Invalid signup OTP');

    await supabase.from('phone_verifications').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', verification.id);
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', pending.userId).single();
    if (userError) throw userError;
    const verificationStatus = user.role === 'farmer' ? 'not_submitted' : 'not_required';
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, location: user.location, phone: user.phone, avatar: user.avatar, bio: user.bio, verificationStatus };
    delete req.session.pendingRegistration;
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, location: user.location, phone: user.phone, verificationStatus });
  } catch (err) {
    handleError(res, 500, 'Signup OTP verification failed', err.message);
  }
};

const resendPendingOtp = async (req, res, sessionKey, message) => {
  try {
    const pending = req.session[sessionKey];
    if (!pending) return handleError(res, 400, 'There is no pending verification to resend');
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase.from('phone_verifications').insert([{
      user_id: pending.userId,
      phone: pending.phone,
      otp_code: otpCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'pending'
    }]);
    if (error) throw error;
    await sendSms({ recipient: { phone: pending.phone }, message: `${message} ${otpCode}. It expires in 5 minutes.` });
    res.json({ success: true, message: 'A new verification code was sent.' });
  } catch (err) {
    handleError(res, 500, 'Failed to resend OTP', err.message);
  }
};

export const resendRegistrationOtp = (req, res) => resendPendingOtp(req, res, 'pendingRegistration', 'Your AgroFresh signup code is');

export const resendLoginOtp = async (req, res) => {
  try {
    const pending = req.session.pendingLogin;
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    let userId = pending?.userId;
    let phone = pending?.phone;

    if (!userId) {
      if (!email || !password) return handleError(res, 400, 'Enter your email and password again to resend the code');
      const { data: user, error } = await supabase.from('users').select('id, password_hash, phone').eq('email', email).maybeSingle();
      if (error) throw error;
      if (!user || !(await bcrypt.compare(password, user.password_hash))) return handleError(res, 401, 'Invalid credentials');
      if (!user.phone) return handleError(res, 400, 'A phone number is required for login verification');
      userId = user.id;
      phone = normalizeLoginPhone(user.phone);
    }

    req.session.pendingLogin = { userId, phone };
    return resendPendingOtp(req, res, 'pendingLogin', 'Your AgroFresh login code is');
  } catch (err) {
    handleError(res, 500, 'Failed to resend login OTP', err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return handleError(res, 400, 'Email and password are required');
    }

    // Get user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!user) {
      return handleError(res, 401, 'Invalid credentials');
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return handleError(res, 401, 'Invalid credentials');
    }

    if (!user.phone) {
      return handleError(res, 400, 'A phone number is required for login verification. Add it in your profile first.');
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const normalizedPhone = normalizeLoginPhone(user.phone);
    const { error: otpError } = await supabase.from('phone_verifications').insert([{
      user_id: user.id,
      phone: normalizedPhone,
      otp_code: otpCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'pending'
    }]);
    if (otpError) throw otpError;
    await sendSms({ recipient: { phone: normalizedPhone }, message: `Your AgroFresh login code is ${otpCode}. It expires in 5 minutes.` });
    req.session.pendingLogin = { userId: user.id, phone: normalizedPhone };
    return res.json({ requiresOtp: true, phone: `${normalizedPhone.slice(0, 7)}****${normalizedPhone.slice(-2)}` });

  } catch (err) {
    if (err.message?.includes('Arkesel SMS credit')) {
      return handleError(res, 402, 'Login verification is temporarily unavailable', err.message);
    }
    handleError(res, 500, 'Login failed', err.message);
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const pending = req.session.pendingLogin;
    const otpCode = String(req.body.otpCode || '').trim();
    if (!pending || !otpCode) return handleError(res, 400, 'Login OTP is required');

    const { data: verification, error } = await supabase.from('phone_verifications')
      .select('*')
      .eq('user_id', pending.userId)
      .eq('phone', pending.phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!verification) return handleError(res, 400, 'No active login OTP found');
    if (new Date(verification.expires_at) < new Date()) return handleError(res, 400, 'OTP has expired');
    if (String(verification.otp_code) !== otpCode) return handleError(res, 400, 'Invalid OTP');

    await supabase.from('phone_verifications').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', verification.id);
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', pending.userId).single();
    if (userError) throw userError;

    let verificationStatus = 'not_required';
    if (user.role === 'farmer') {
      const farmerVerification = await supabase.from('user_verifications').select('status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
      verificationStatus = farmerVerification.data?.status || 'not_submitted';
    }
    await supabase.from('users').update({ status: 'Active', last_login: new Date().toISOString() }).eq('id', user.id);
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, location: user.location, phone: user.phone, avatar: user.avatar, bio: user.bio, verificationStatus };
    delete req.session.pendingLogin;
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, location: user.location, phone: user.phone, avatar: user.avatar, bio: user.bio, verificationStatus });
  } catch (err) {
    handleError(res, 500, 'Login OTP verification failed', err.message);
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return handleError(res, 400, 'Email is required');
    const { data: user, error } = await supabase.from('users').select('id, phone').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!user || !user.phone) return handleError(res, 400, 'No account with a phone number was found for this email');

    const phone = normalizeLoginPhone(user.phone);
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const { error: otpError } = await supabase.from('phone_verifications').insert([{
      user_id: user.id,
      phone,
      otp_code: otpCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      status: 'pending'
    }]);
    if (otpError) throw otpError;
    await sendSms({ recipient: { phone }, message: `Your AgroFresh password reset code is ${otpCode}. It expires in 5 minutes.` });
    req.session.pendingPasswordReset = { userId: user.id, phone };
    res.json({ requiresOtp: true, phone: `${phone.slice(0, 7)}****${phone.slice(-2)}` });
  } catch (err) {
    if (err.message?.includes('Arkesel SMS credit')) return handleError(res, 402, 'Password reset SMS is temporarily unavailable', err.message);
    if (err.message?.includes('Arkesel rejected') || err.message?.includes('Arkesel SMS delivery')) return handleError(res, 502, 'Password reset SMS could not be sent', err.message);
    if (err.code === '42P01' || err.code === 'PGRST205' || err.message?.includes('phone_verifications')) return handleError(res, 500, 'Password reset is not configured. Run the OTP database migration in Supabase.', err.message);
    handleError(res, 500, 'Failed to start password reset', err.message);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const pending = req.session.pendingPasswordReset;
    const otpCode = String(req.body.otpCode || '').trim();
    const newPassword = String(req.body.newPassword || '');
    if (!pending || !otpCode || !newPassword) return handleError(res, 400, 'OTP and new password are required');
    if (newPassword.length < 8) return handleError(res, 400, 'New password must be at least 8 characters long');
    const { data: verification, error } = await supabase.from('phone_verifications').select('*')
      .eq('user_id', pending.userId).eq('phone', pending.phone).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!verification) return handleError(res, 400, 'No active password reset code found');
    if (new Date(verification.expires_at) < new Date()) return handleError(res, 400, 'Password reset code has expired');
    if (String(verification.otp_code) !== otpCode) return handleError(res, 400, 'Invalid password reset code');
    const password_hash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase.from('users').update({ password_hash }).eq('id', pending.userId);
    if (updateError) throw updateError;
    await supabase.from('phone_verifications').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', verification.id);
    delete req.session.pendingPasswordReset;
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to reset password', err.message);
  }
};

export const logout = async (req, res) => {
  try {
    if (req.session.user) {
      // Update user status to Inactive
      const { error } = await supabase
        .from('users')
        .update({ status: 'Inactive' })
        .eq('id', req.session.user.id);

      if (error) throw error;
    }

    req.session.destroy((err) => {
      if (err) {
        return handleError(res, 500, 'Logout failed', err.message);
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  } catch (err) {
    handleError(res, 500, 'Logout failed', err.message);
  }
};

export const getProfile = (req, res) => {
  try {
    if (!req.session.user) {
      return handleError(res, 401, 'Not authenticated');
    }
    res.json(req.session.user);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch profile', err.message);
  }
}; 