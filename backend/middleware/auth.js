import { supabase } from '../app.js';

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.session.user?.role;
    if (!userRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (Array.isArray(role)) {
      if (!role.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      if (userRole !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    next();
  };
}

export const getFarmerVerificationStatus = async (userId) => {
  if (!userId) return 'not_submitted';

  const { data, error } = await supabase
    .from('user_verifications')
    .select('status')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn('Unable to load verification status:', error.message);
    return 'not_submitted';
  }

  return data?.status || 'not_submitted';
};

export const isFarmerApproved = async (userId) => {
  const status = await getFarmerVerificationStatus(userId);
  return status === 'approved';
};

/**
 * Middleware to check if user needs to change password on first login
 * Returns 403 with specific error if password hasn't been changed
 */
export function checkPasswordChangeRequired(req, res, next) {
  const user = req.session.user;
  
  // Skip check for change-password endpoint itself and login/logout
  const allowedPaths = ['/api/users/change-password', '/logout', '/login'];
  if (allowedPaths.includes(req.path)) {
    return next();
  }

  if (user && user.password_changed === false) {
    return res.status(403).json({
      error: 'Password change required',
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'You must change your password before accessing this resource'
    });
  }

  next();
}
};

export const requireFarmerApproved = async (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.session.user.role !== 'farmer') {
    return next();
  }

  const approved = await isFarmerApproved(req.session.user.id);
  if (!approved) {
    return res.status(403).json({
      error: 'Your farmer profile is not approved yet. Please wait for admin verification before listing products or receiving orders.'
    });
  }

  return next();
};