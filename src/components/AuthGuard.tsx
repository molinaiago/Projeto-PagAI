import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav('/login');
  }, [loading, user, nav]);

  if (loading) return <div className="p-6 text-center">Carregando...</div>;
  if (!user) return null;
  return <>{children}</>;
}
