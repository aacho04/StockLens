import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@stocklens/types";

// Role hierarchy: INVESTOR < ANALYST < ADMIN < SUPER_ADMIN
const ROLE_HIERARCHY: Record<UserRole, number> = {
  INVESTOR: 1,
  ANALYST: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Role guard middleware factory.
 * @param minimumRole - The minimum role required to access the route.
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required" },
      });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 99;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: `This action requires ${minimumRole} role or higher`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Exact role guard — user must have exactly one of the specified roles.
 */
export function requireExactRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Authentication required" },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Access denied",
        },
      });
      return;
    }

    next();
  };
}
