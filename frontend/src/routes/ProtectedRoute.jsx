import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "../components/common/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false, redirectTo = "/auth", message = "" }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: `${location.pathname}${location.search}`, message }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ message: "Admin access only." }} />;
  }

  return children;
}
