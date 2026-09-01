import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SpinnerBlock } from './Spinner';

export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <SpinnerBlock />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, initializing } = useAuth();

  if (initializing) return <SpinnerBlock />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/catalog" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, initializing } = useAuth();

  if (initializing) return <SpinnerBlock />;
  if (user) return <Navigate to="/catalog" replace />;
  return <Outlet />;
}
