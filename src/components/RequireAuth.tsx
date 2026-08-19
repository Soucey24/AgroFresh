import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getProfile } from '@/api';

type Props = { children: React.ReactElement };

export default function RequireAuth({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    console.log('[guard] checking auth for protected route');

    getProfile()
      .then((res) => {
        console.log('[guard] auth result', res);
        if (!mounted) return;
        if (res && !res.error) setAuthed(true);
      })
      .catch((error) => {
        console.error('[guard] auth check failed', error);
      })
      .finally(() => {
        if (mounted) {
          console.log('[guard] auth check complete');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Checking authentication...</div>;
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}
