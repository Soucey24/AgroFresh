import bcrypt from 'bcryptjs';
import { supabase } from '../app.js';

const handleError = (res, status, message, details) => {
  console.error(`[${status}] ${message}`, details);
  res.status(status).json({ error: message });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return handleError(res, 400, 'All fields are required');
    }

    if (!['farmer', 'buyer', 'vendor', 'admin'].includes(role)) {
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
        status: 'Active'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    };

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    });
  } catch (err) {
    handleError(res, 500, 'Registration failed', err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return handleError(res, 400, 'Email, password, and role are required');
    }

    // Get user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
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

    // Update status and last login
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 'Active',
        last_login: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    };

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    });
  } catch (err) {
    handleError(res, 500, 'Login failed', err.message);
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