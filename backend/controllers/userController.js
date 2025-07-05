import { db } from '../app.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow if admin or requesting own user info
    if (
      !req.session.user ||
      (req.session.user.role !== 'vendor' && req.session.user.id != id)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [users] = await db.query('SELECT id, name, email, role, location, phone, bio, avatar FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, location, avatar FROM users WHERE id = ?', [req.session.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  const { name, location, phone, bio, email } = req.body;
  try {
    if (email && req.session.user.email !== email) {
      // Email is being changed, require verification
      const token = crypto.randomBytes(32).toString('hex');
      const updateFields = [name, location, phone, bio, email, token, req.session.user.id];
      
      // Handle avatar upload if present
      if (req.file) {
        const avatar = `/uploads/${req.file.filename}`;
        await db.query('UPDATE users SET name=?, location=?, phone=?, bio=?, pending_email=?, email_verification_token=?, avatar=? WHERE id=?', 
          [...updateFields.slice(0, -1), avatar, req.session.user.id]);
        // In production, send an email. For now, log the link:
        console.log(`Verify your new email: http://localhost:4000/api/users/verify-email?token=${token}`);
        return res.json({ message: 'Verification link sent to new email. Please verify to complete the change.', avatar });
      } else {
        await db.query('UPDATE users SET name=?, location=?, phone=?, bio=?, pending_email=?, email_verification_token=? WHERE id=?', updateFields);
        // In production, send an email. For now, log the link:
        console.log(`Verify your new email: http://localhost:4000/api/users/verify-email?token=${token}`);
        return res.json({ message: 'Verification link sent to new email. Please verify to complete the change.' });
      }
    } else {
      const updateFields = [name, location, phone, bio, req.session.user.id];
      
      // Handle avatar upload if present
      if (req.file) {
        const avatar = `/uploads/${req.file.filename}`;
        await db.query('UPDATE users SET name=?, location=?, phone=?, bio=?, avatar=? WHERE id=?', 
          [...updateFields.slice(0, -1), avatar, req.session.user.id]);
        return res.json({ message: 'Profile updated', avatar });
      } else {
        await db.query('UPDATE users SET name=?, location=?, phone=?, bio=? WHERE id=?', updateFields);
        return res.json({ message: 'Profile updated' });
      }
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const verifyEmailChange = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const [users] = await db.query('SELECT id, pending_email FROM users WHERE email_verification_token=?', [token]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
    const user = users[0];
    await db.query('UPDATE users SET email=?, pending_email=NULL, email_verification_token=NULL WHERE id=?', [user.pending_email, user.id]);
    res.json({ message: 'Email verified and updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify email.' });
  }
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatar = `/uploads/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET avatar=? WHERE id=?', [avatar, req.session.user.id]);
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};

// --- ADMIN USER MANAGEMENT ---
export const listUsers = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
  try {
    const [users] = await db.query('SELECT id, name, email, role, location, status, created_at, last_login FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
  const { name, email, password, role, location } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required.' });
  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered for this role.' });
    const bcrypt = (await import('bcryptjs')).default;
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, location, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password_hash, role, location, 'Active']
    );
    res.status(201).json({ id: result.insertId, name, email, role, location, status: 'Active' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.user.role === 'vendor';
  console.log('Updating user:', { isAdmin, body: req.body, file: req.file });
  
  if (!req.session.user || (!isAdmin && req.session.user.id != id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    if (isAdmin) {
      const { name, email, role, location, status, phone, bio } = req.body;
      const updateFields = [name, email, role, location, status, phone, bio, id];
      await db.query(
        'UPDATE users SET name=?, email=?, role=?, location=?, status=?, phone=?, bio=? WHERE id=?',
        updateFields
      );
    } else {
      const { name, email, location, phone, bio } = req.body;
      const updateFields = [name, email, location, phone, bio, id];
      
      // Handle avatar upload if present
      if (req.file) {
        const avatar = `/uploads/${req.file.filename}`;
        await db.query(
          'UPDATE users SET name=?, email=?, location=?, phone=?, bio=?, avatar=? WHERE id=?',
          [...updateFields.slice(0, -1), avatar, id]
        );
        return res.json({ message: 'User updated', avatar });
      } else {
        await db.query(
          'UPDATE users SET name=?, email=?, location=?, phone=?, bio=? WHERE id=?',
          updateFields
        );
      }
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash=? WHERE id=?', [password_hash, req.session.user.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
}; 