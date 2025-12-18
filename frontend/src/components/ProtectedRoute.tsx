import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../state/session';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const location = useLocation();

  if (!session.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
