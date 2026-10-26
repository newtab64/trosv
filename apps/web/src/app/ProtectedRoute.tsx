import type React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/api";
import { ROUTES } from "@/constants/routes";
import { PageFallback } from "@/app/PageFallback";

/** Route guard: guests -> login (with redirect back), wrong role -> home. */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles: readonly UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!user) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from: window.location.pathname + window.location.search }}
      />
    );
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }
  return <>{children}</>;
}
