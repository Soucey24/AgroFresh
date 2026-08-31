import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../app.js';
import { uploadToSupabaseStorage, getStorageFallbackUrl } from '../services/storageService.js';
import { sendOperationsCredentials } from '../services/smsService.js';

const allowedRoles = new Set(['farmer', 'buyer', 'vendor', 'admin', 'operations']);

const handleError = (res, status, message, details) => {
	if (details) {
		console.error(message, details);
	}
	res.status(status).json({ error: message });
};

const sanitizeUser = (user) => ({
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	location: user.location,
	phone: user.phone,
	bio: user.bio,
	avatar: user.avatar,
	payout_method: user.payout_method,
	payout_provider: user.payout_provider,
	payout_account_name: user.payout_account_name,
	payout_account_number: user.payout_account_number,
	status: user.status,
	verification_status: user.verification_status,
	created_at: user.created_at
});

export const listUsers = async (req, res) => {
	try {
		const current = req.session.user;
		if (!current || !['admin', 'vendor'].includes(current.role)) {
			return handleError(res, 403, 'Only admin users can list users');
		}

		const { role, limit = 50, offset = 0 } = req.query;
		const size = Math.min(Math.max(Number(limit), 1), 200);
		const start = Math.max(Number(offset), 0);

		let query = supabase
			.from('users')
			.select('id, name, email, role, location, phone, bio, avatar, status, verification_status, created_at')
			.order('created_at', { ascending: false })
			.range(start, start + size - 1);

		if (role) {
			query = query.eq('role', role);
		}

		const { data, error } = await query;
		if (error) throw error;

		res.json(data || []);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch users', err.message);
	}
};

export const createUser = async (req, res) => {
	try {
		console.log('📝 CREATE USER REQUEST - Full body:', JSON.stringify(req.body, null, 2));
		
		const { name, email, password, role, location, phone, bio, ghana_card_photo, face_photo } = req.body;
		console.log('🔍 Extracted fields:', { name, email, role, phone, location, has_password: !!password });
		
		const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
		console.log('✏️ Normalized role:', normalizedRole);
		console.log('✅ Allowed roles:', Array.from(allowedRoles));
		console.log('🎯 Role match:', allowedRoles.has(normalizedRole));
		
		if (!name || !email || !password || !normalizedRole) {
			console.log('❌ Missing required fields');
			return handleError(res, 400, 'name, email, password and role are required');
		}
		if (!allowedRoles.has(normalizedRole)) {
			console.log(`❌ Role "${normalizedRole}" NOT in allowed roles:`, Array.from(allowedRoles));
			return handleError(res, 400, 'Invalid role');
		}

		// For operations role, require phone number
		if (normalizedRole === 'operations') {
			if (!phone) {
				return handleError(res, 400, 'Phone number is required for operations staff');
			}
		}

		const { data: existing, error: existingError } = await supabase
			.from('users')
			.select('id')
			.eq('email', email)
			.eq('role', normalizedRole)
			.maybeSingle();
		if (existingError && existingError.code !== 'PGRST116') throw existingError;
		if (existing) {
			return handleError(res, 409, 'Email already exists for this role');
		}

		const password_hash = await bcrypt.hash(password, 12);
		
		// Build insert object
		const insertData = {
			name,
			email,
			role: normalizedRole,
			password_hash,
			location: location || null,
			phone: phone || null,
			bio: bio || null,
			status: 'Active',
			// Operations staff must upload photos after login
			verification_status: normalizedRole === 'operations' ? 'pending' : 'approved'
		};

		// Only include photos if provided
		if (ghana_card_photo) {
			insertData.ghana_card_photo = ghana_card_photo;
		}
		if (face_photo) {
			insertData.face_photo = face_photo;
		}

		const { data: created, error } = await supabase
			.from('users')
			.insert([insertData])
			.select('*')
			.single();
		if (error) throw error;

		let smsResult = { success: false, error: 'Not attempted' };
		if (normalizedRole === 'operations' && phone) {
			try {
				smsResult = await sendOperationsCredentials(phone, email, password);
				console.log('SMS sent to operations staff:', smsResult);
			} catch (smsError) {
				smsResult = { success: false, error: smsError.message || 'Unknown SMS error' };
				console.error('Operations SMS send failed:', smsResult.error);
			}
		}

		res.status(201).json({
			...sanitizeUser(created),
			sms_sent: Boolean(smsResult.success),
			sms_error: smsResult.success ? null : smsResult.error,
		});
	} catch (err) {
		handleError(res, 500, 'Failed to create user', err.message);
	}
};

export const getUser = async (req, res) => {
	try {
		const targetId = Number(req.params.id);
		const current = req.session.user;

		if (!current) {
			return handleError(res, 401, 'Not authenticated');
		}
		if (current.role !== 'admin' && current.role !== 'vendor' && current.id !== targetId) {
			return handleError(res, 403, 'Not authorized to view this user');
		}

		const { data, error } = await supabase
			.from('users')
			.select('id, name, email, role, location, phone, bio, avatar, status, created_at')
			.eq('id', targetId)
			.single();

		if (error?.code === 'PGRST116') {
			return handleError(res, 404, 'User not found');
		}
		if (error) throw error;

		res.json(data);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch user', err.message);
	}
};

export const updateUser = async (req, res) => {
	try {
		const targetId = Number(req.params.id);
		const current = req.session.user;

		if (!current) return handleError(res, 401, 'Not authenticated');
		if (current.role !== 'admin' && current.role !== 'vendor' && current.id !== targetId) {
			return handleError(res, 403, 'Not authorized to update this user');
		}

		const { name, location, phone, bio, status, role, payout_method, payout_provider, payout_account_name, payout_account_number } = req.body;
		const updatePayload = {};
		if (name !== undefined) updatePayload.name = name;
		if (location !== undefined) updatePayload.location = location;
		if (phone !== undefined) updatePayload.phone = phone;
		if (bio !== undefined) updatePayload.bio = bio;
		if (current.role === 'farmer' && payout_method !== undefined) updatePayload.payout_method = payout_method;
		if (current.role === 'farmer' && payout_provider !== undefined) updatePayload.payout_provider = payout_provider;
		if (current.role === 'farmer' && payout_account_name !== undefined) updatePayload.payout_account_name = payout_account_name;
		if (current.role === 'farmer' && payout_account_number !== undefined) updatePayload.payout_account_number = payout_account_number;
		if (req.file) {
			const storageResult = await uploadToSupabaseStorage(req.file, 'avatars');
			updatePayload.avatar = storageResult?.url || getStorageFallbackUrl(req.file);
		}

		if (['admin', 'vendor'].includes(current.role)) {
			if (status !== undefined) updatePayload.status = status;
			if (role !== undefined) {
				if (!allowedRoles.has(role)) return handleError(res, 400, 'Invalid role');
				updatePayload.role = role;
			}
		}

		if (Object.keys(updatePayload).length === 0) {
			return handleError(res, 400, 'No fields provided to update');
		}

		const { data, error } = await supabase
			.from('users')
			.update(updatePayload)
			.eq('id', targetId)
			.select('*')
			.single();

		if (error) throw error;

		if (current.id === targetId) {
			req.session.user = {
				...current,
				name: data.name,
				email: data.email,
				role: data.role,
				location: data.location
			};
		}

		res.json(sanitizeUser(data));
	} catch (err) {
		handleError(res, 500, 'Failed to update user', err.message);
	}
};

export const deleteUser = async (req, res) => {
	try {
		const targetId = Number(req.params.id);
		const current = req.session.user;

		if (!current || !['admin', 'vendor'].includes(current.role)) {
			return handleError(res, 403, 'Only admin users can delete users');
		}
		if (current.id === targetId) {
			return handleError(res, 400, 'Cannot delete your own account');
		}

		const { error } = await supabase.from('users').delete().eq('id', targetId);
		if (error) throw error;

		res.json({ message: 'User deleted successfully' });
	} catch (err) {
		handleError(res, 500, 'Failed to delete user', err.message);
	}
};

export const uploadAvatar = async (req, res) => {
	try {
		if (!req.session.user) return handleError(res, 401, 'Not authenticated');
		if (!req.file) return handleError(res, 400, 'No file uploaded');

		const storageResult = await uploadToSupabaseStorage(req.file, 'avatars');
		const avatarPath = storageResult?.url || getStorageFallbackUrl(req.file);
		const { error } = await supabase
			.from('users')
			.update({ avatar: avatarPath })
			.eq('id', req.session.user.id);

		if (error) throw error;

		req.session.user.avatar = avatarPath;
		res.json({ message: 'Avatar uploaded successfully', avatar: avatarPath });
	} catch (err) {
		handleError(res, 500, 'Failed to upload avatar', err.message);
	}
};

/**
 * Verify photos for operations staff or farmers
 * POST /api/users/verify-photos
 * Expects: ghana_card_photo, face_photo (base64)
 */
export const verifyPhotos = async (req, res) => {
	try {
		const user = req.session.user;
		if (!user) {
			return handleError(res, 401, 'Not authenticated');
		}

		const { ghana_card_photo, face_photo } = req.body;

		if (!ghana_card_photo || !face_photo) {
			return handleError(res, 400, 'Both ghana_card_photo and face_photo are required');
		}

		// Only operations and farmers can submit verification
		if (!['operations', 'farmer'].includes(user.role)) {
			return handleError(res, 403, 'Only operations staff and farmers can submit verification');
		}

		// Store photos in database
		const updateData = {
			ghana_card_photo,
			face_photo,
			verification_status: 'pending',
		};

		// Import face verification service
		const { verifyFaceMatch, updateVerificationStatus } = await import(
			'../services/faceVerification.js'
		).then((m) => m.default || m);

		// Attempt automatic face verification
		let verificationResult = {
			match: false,
			confidence: 0,
			liveness_detected: false,
		};

		try {
			verificationResult = await verifyFaceMatch(ghana_card_photo, face_photo);
		} catch (verifyErr) {
			console.warn('Face verification failed, marking for manual review:', verifyErr.message);
			// Continue with pending status for manual review
		}

		// If match is confident enough, auto-approve
		if (verificationResult.match && verificationResult.confidence >= 0.75) {
			updateData.verification_status = 'approved';
			updateData.verification_notes = `Auto-verified: ${(verificationResult.confidence * 100).toFixed(1)}% confidence`;
		} else if (verificationResult.match === null || verificationResult.status === 'pending_manual_review') {
			updateData.verification_status = 'pending';
			updateData.verification_notes = 'Pending manual review by admin';
		}

		// Update user in database
		const { data: updatedUser, error } = await supabase
			.from('users')
			.update(updateData)
			.eq('id', user.id)
			.select('*')
			.single();

		if (error) throw error;

		// If approved, send SMS notification
		if (updateData.verification_status === 'approved') {
			const { sendVerificationStatus } = await import('../services/smsService.js').then(
				(m) => m.default || m
			);
			try {
				await sendVerificationStatus(
					user.phone,
					'approved',
					'Your verification has been approved. You now have full access.'
				);
			} catch (smsErr) {
				console.warn('Failed to send approval SMS:', smsErr.message);
			}
		}

		res.json({
			message: 'Photos submitted for verification',
			verification_status: updateData.verification_status,
			verification_notes: updateData.verification_notes,
			confidence: verificationResult.confidence,
			user: sanitizeUser(updatedUser),
		});
	} catch (err) {
		handleError(res, 500, 'Failed to verify photos', err.message);
	}
};

export const verifyEmailChange = async (req, res) => {
	try {
		const { token } = req.query;
		if (!token) {
			return handleError(res, 400, 'Missing token');
		}

		const { data: user, error: userError } = await supabase
			.from('users')
			.select('id, pending_email, email_verification_token')
			.eq('email_verification_token', token)
			.single();

		if (userError?.code === 'PGRST116') {
			return handleError(res, 400, 'Invalid or expired token');
		}
		if (userError) throw userError;
		if (!user.pending_email) {
			return handleError(res, 400, 'No pending email to verify');
		}

		const { error } = await supabase
			.from('users')
			.update({
				email: user.pending_email,
				pending_email: null,
				email_verification_token: null
			})
			.eq('id', user.id);

		if (error) throw error;

		res.json({ message: 'Email verified successfully' });
	} catch (err) {
		handleError(res, 500, 'Failed to verify email change', err.message);
	}
};

export const getProfile = async (req, res) => {
	try {
		if (!req.session.user) return handleError(res, 401, 'Not authenticated');

		const { data, error } = await supabase
			.from('users')
			.select('id, name, email, role, location, phone, bio, avatar, status, created_at')
			.eq('id', req.session.user.id)
			.single();

		if (error) throw error;

		let verificationStatus = 'not_required';
		if (data.role === 'farmer') {
			const { data: verification, error: verificationError } = await supabase
				.from('user_verifications')
				.select('status')
				.eq('user_id', data.id)
				.order('submitted_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (verificationError && verificationError.code !== 'PGRST116') {
				throw verificationError;
			}

			verificationStatus = verification?.status || 'not_submitted';
		}

		const profile = {
			...data,
			verificationStatus,
		};

		if (req.session.user) {
			req.session.user.verificationStatus = verificationStatus;
		}

		res.json(profile);
	} catch (err) {
		handleError(res, 500, 'Failed to fetch profile', err.message);
	}
};

export const updateProfile = async (req, res) => {
	try {
		if (!req.session.user) return handleError(res, 401, 'Not authenticated');

		const { name, location, phone, bio, email } = req.body;
		const updatePayload = {};

		if (name !== undefined) updatePayload.name = name;
		if (location !== undefined) updatePayload.location = location;
		if (phone !== undefined) updatePayload.phone = phone;
		if (bio !== undefined) updatePayload.bio = bio;
		if (req.file) updatePayload.avatar = `/uploads/${req.file.filename}`;

		if (email && email !== req.session.user.email) {
			const { data: existing, error: existingError } = await supabase
				.from('users')
				.select('id')
				.eq('email', email)
				.eq('role', req.session.user.role)
				.maybeSingle();

			if (existingError && existingError.code !== 'PGRST116') throw existingError;
			if (existing) {
				return handleError(res, 409, 'Email already in use');
			}

			updatePayload.pending_email = email;
			updatePayload.email_verification_token = crypto.randomBytes(24).toString('hex');
		}

		if (Object.keys(updatePayload).length === 0) {
			return handleError(res, 400, 'No fields provided to update');
		}

		const { data, error } = await supabase
			.from('users')
			.update(updatePayload)
			.eq('id', req.session.user.id)
			.select('*')
			.single();

		if (error) throw error;

		req.session.user = {
			...req.session.user,
			name: data.name,
			location: data.location,
			avatar: data.avatar
		};

		res.json({
			message: 'Profile updated successfully',
			verificationRequired: Boolean(updatePayload.pending_email),
			user: sanitizeUser(data)
		});
	} catch (err) {
		handleError(res, 500, 'Failed to update profile', err.message);
	}
};
/**
 * Change password - for first login or general password update
 * POST /api/users/change-password
 */
export const changePassword = async (req, res) => {
try {
const user = req.session.user;
if (!user) {
return handleError(res, 401, 'Not authenticated');
}

const { currentPassword, newPassword, confirmPassword } = req.body;

if (!currentPassword || !newPassword || !confirmPassword) {
return handleError(res, 400, 'Current password, new password, and confirm password are required');
}

if (newPassword !== confirmPassword) {
return handleError(res, 400, 'New passwords do not match');
}

if (newPassword.length < 8) {
return handleError(res, 400, 'New password must be at least 8 characters');
}

// Get user with password hash
const { data: userData, error: userError } = await supabase
.from('users')
.select('id, password_hash, password_changed')
.eq('id', user.id)
.single();

if (userError) throw userError;
if (!userData) {
return handleError(res, 404, 'User not found');
}

// Verify current password
const isPasswordValid = await bcrypt.compare(currentPassword, userData.password_hash);
if (!isPasswordValid) {
return handleError(res, 401, 'Current password is incorrect');
}

// Hash new password
const newPasswordHash = await bcrypt.hash(newPassword, 12);

// Update password and set password_changed flag
const { data: updated, error } = await supabase
.from('users')
.update({
password_hash: newPasswordHash,
password_changed: true,
last_login: new Date().toISOString(),
})
.eq('id', user.id)
.select('*')
.single();

if (error) throw error;

// Update session
req.session.user.password_changed = true;

res.json({
message: 'Password changed successfully',
user: sanitizeUser(updated),
});
} catch (err) {
handleError(res, 500, 'Failed to change password', err.message);
}
};
