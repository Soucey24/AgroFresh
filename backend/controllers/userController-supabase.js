import { supabase } from '../app.js';
import bcrypt from 'bcryptjs';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    // Authorization: only admin or own user info
    if (user.role !== 'admin' && user.id != id) {
      return handleError(res, 403, 'Not authorized to view this user');
    }

    const { data: targetUser, error } = await supabase
      .from('users')
      .select('id, name, email, role, location, avatar, status')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      return handleError(res, 404, 'User not found');
    }

    if (error) throw error;

    res.json(targetUser);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch user', err.message);
  }
};

export const getProfile = async (req, res) => {
  try {
    const { id } = req.session.user;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, location, avatar, status')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(user);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch profile', err.message);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.session.user;
    const { name, location, email } = req.body;

    let image = null;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (image) updateData.avatar = image;

    // Handle email change
    if (email && email !== req.session.user.email) {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('role', req.session.user.role)
        .maybeSingle();

      if (existing) {
        return handleError(res, 409, 'Email already in use');
      }

      updateData.email = email;
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update session
    req.session.user = {
      ...req.session.user,
      ...updateData
    };

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    handleError(res, 500, 'Failed to update profile', err.message);
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return handleError(res, 400, 'No file uploaded');
    }

    const avatar = `/uploads/${req.file.filename}`;
    const { id } = req.session.user;

    const { error } = await supabase
      .from('users')
      .update({ avatar })
      .eq('id', id);

    if (error) throw error;

    res.json({ avatar, message: 'Avatar uploaded successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to upload avatar', err.message);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.session.user;

    if (!currentPassword || !newPassword) {
      return handleError(res, 400, 'Current password and new password are required');
    }

    // Get user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return handleError(res, 401, 'Current password is incorrect');
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to change password', err.message);
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const user = req.session.user;

    // Only admin can view all users
    if (user.role !== 'admin') {
      return handleError(res, 403, 'Only admins can view all users');
    }

    const { limit = 50, offset = 0, role } = req.query;

    let query = supabase
      .from('users')
      .select('id, name, email, role, location, status, created_at');

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({ users: users || [], count: users?.length || 0 });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch users', err.message);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    // Only admin can delete users
    if (user.role !== 'admin') {
      return handleError(res, 403, 'Only admins can delete users');
    }

    // Prevent deleting self
    if (user.id == id) {
      return handleError(res, 400, 'Cannot delete your own account');
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to delete user', err.message);
  }
};
