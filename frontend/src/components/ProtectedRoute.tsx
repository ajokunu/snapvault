import { Navigate } from "react-router-dom";
import { getAuthState } from "../services/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = getAuthState();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
