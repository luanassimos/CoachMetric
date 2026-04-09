import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminFeatures, canAccessDevTools } from "@/lib/devAccess";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireDeveloper?: boolean;
};

export default function ProtectedRoute({
  children,
  requireAdmin,
  requireDeveloper,
}: Props) {
  const { user, loading, globalRole } = useAuth();

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireDeveloper && !canAccessDevTools(globalRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && !canAccessAdminFeatures(globalRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
