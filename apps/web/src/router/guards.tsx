import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@stocklens/types";

interface AuthGuardProps {
  minimumRole?: UserRole;
}

const ROLE_LEVEL: Record<UserRole, number> = {
  INVESTOR: 1,
  ANALYST: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ minimumRole = "INVESTOR" }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  const userLevel = ROLE_LEVEL[user.role] ?? 0;
  const requiredLevel = ROLE_LEVEL[minimumRole] ?? 99;

  if (userLevel < requiredLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Redirect authenticated users away from auth pages
export const GuestGuard: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
