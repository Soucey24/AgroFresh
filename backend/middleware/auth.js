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