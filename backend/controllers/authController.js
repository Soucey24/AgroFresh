import bcrypt from 'bcryptjs';
import { db } from '../app.js';

export const register = async (req, res) => {
  const { name, email, password, role, location } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    // Check if user exists with same email and role
    const [existing] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered for this role.' });
    }
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, location) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, location]
    );
    // Set session
    req.session.user = { id: result.insertId, name, email, role, location };
    res.status(201).json({ id: result.insertId, name, email, role, location });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
};

export const login = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, location: user.location };
    // Set user status to Active and update last_login
    await db.query('UPDATE users SET status = ?, last_login = NOW() WHERE id = ?', ['Active', user.id]);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, location: user.location });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
};

export const logout = (req, res) => {
  if (req.session.user) {
    db.query('UPDATE users SET status = ? WHERE id = ?', ['Inactive', req.session.user.id]);
  }
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
};

export const getProfile = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.session.user);
}; 