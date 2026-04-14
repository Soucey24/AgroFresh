import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../app.js';

const allowedRoles = new Set(['farmer', 'buyer', 'vendor', 'admin']);

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
	status: user.status,
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
			.select('id, name, email, role, location, phone, bio, avatar, status, created_at')
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
		const { name, email, password, role, location, phone, bio } = req.body;
		if (!name || !email || !password || !role) {
			return handleError(res, 400, 'name, email, password and role are required');
		}
		if (!allowedRoles.has(role)) {
			return handleError(res, 400, 'Invalid role');
		}

		const { data: existing, error: existingError } = await supabase
			.from('users')
			.select('id')
			.eq('email', email)
			.eq('role', role)
			.maybeSingle();
		if (existingError && existingError.code !== 'PGRST116') throw existingError;
		if (existing) {
			return handleError(res, 409, 'Email already exists for this role');
		}

		const password_hash = await bcrypt.hash(password, 12);
		const { data: created, error } = await supabase
			.from('users')
			.insert([
				{
					name,
					email,
					role,
					password_hash,
					location: location || null,
					phone: phone || null,
					bio: bio || null,
					status: 'Active'
				}
			])
			.select('*')
			.single();
		if (error) throw error;

		res.status(201).json(sanitizeUser(created));
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

		const { name, location, phone, bio, status, role } = req.body;
		const updatePayload = {};
		if (name !== undefined) updatePayload.name = name;
		if (location !== undefined) updatePayload.location = location;
		if (phone !== undefined) updatePayload.phone = phone;
		if (bio !== undefined) updatePayload.bio = bio;
		if (req.file) updatePayload.avatar = `/uploads/${req.file.filename}`;

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

		const avatarPath = `/uploads/${req.file.filename}`;
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

export const changePassword = async (req, res) => {
	try {
		if (!req.session.user) return handleError(res, 401, 'Not authenticated');

		const { currentPassword, newPassword } = req.body;
		if (!currentPassword || !newPassword) {
			return handleError(res, 400, 'currentPassword and newPassword are required');
		}
		if (newPassword.length < 8) {
			return handleError(res, 400, 'New password must be at least 8 characters long');
		}

		const { data: user, error: userError } = await supabase
			.from('users')
			.select('password_hash')
			.eq('id', req.session.user.id)
			.single();

		if (userError) throw userError;

		const isValid = await bcrypt.compare(currentPassword, user.password_hash);
		if (!isValid) {
			return handleError(res, 401, 'Current password is incorrect');
		}

		const password_hash = await bcrypt.hash(newPassword, 12);
		const { error } = await supabase
			.from('users')
			.update({ password_hash })
			.eq('id', req.session.user.id);

		if (error) throw error;

		res.json({ message: 'Password changed successfully' });
	} catch (err) {
		handleError(res, 500, 'Failed to change password', err.message);
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
		res.json(data);
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