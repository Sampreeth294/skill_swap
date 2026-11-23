import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ admin = false }) {
  const { isAuthenticated, isAdmin, loading, serverError, user } = useAuth();
  const location = useLocation();
  if (loading) return <Loader full label="Preparing your workspace…" />;
  if (serverError && !user) {
    return (
      <div className="center-screen">
        <div className="card card-pad narrow">
          <h3>Can't reach SkillSwap</h3>
          <p className="muted">The GraphQL server isn't responding. Start it with <code>npm run dev</code> in the server folder, then refresh.</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
