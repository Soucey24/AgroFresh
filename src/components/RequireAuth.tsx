import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getProfile } from '@/api';

type Props = { children: React.ReactElement };

export default function RequireAuth({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((res) => {
        if (!mounted) return;
        if (res && !res.error) setAuthed(true);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Checking authentication...</div>;
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}
