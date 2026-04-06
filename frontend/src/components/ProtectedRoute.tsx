import { Navigate } from "react-router-dom";
import { getAuthState } from "../services/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // DEV BYPASS: skip auth check for local preview
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const { isAuthenticated } = getAuthState();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
