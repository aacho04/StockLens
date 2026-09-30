import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  users,
  bootstrapState,
  auditLogs,
} from "../../db/schema/index.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { bootstrapAdminSchema, updateUserRoleSchema, suspendUserSchema } from "@stocklens/validators";
import { AppError } from "../../middleware/error.middleware.js";
import { env } from "../../config/env.js";
import { signAccessToken } from "../../lib/jwt.js";

export const adminRouter: Router = Router();

// ─── Bootstrap (public — gated by token) ─────────────────────────────────────

adminRouter.post(
  "/bootstrap",
  validate(bootstrapAdminSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify bootstrap token
      if (!env.FIRST_ADMIN_BOOTSTRAP_TOKEN) {
        throw new AppError(503, "BOOTSTRAP_DISABLED", "Admin bootstrap is not configured");
      }
      if (req.body.bootstrapToken !== env.FIRST_ADMIN_BOOTSTRAP_TOKEN) {
        throw new AppError(401, "INVALID_BOOTSTRAP_TOKEN", "Invalid bootstrap token");
      }

      // Check if already bootstrapped
      const [state] = await db
        .select()
        .from(bootstrapState)
        .where(eq(bootstrapState.key, "admin_bootstrapped"))
        .limit(1);

      if (state?.value === "true") {
        throw new AppError(409, "ALREADY_BOOTSTRAPPED", "Admin account has already been created");
      }

      // Check no admins exist
      const existingAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "ADMIN"))
        .limit(1);

      if (existingAdmins.length > 0) {
        throw new AppError(409, "ADMIN_EXISTS", "An admin account already exists");
      }

      const passwordHash = await argon2.hash(req.body.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const [admin] = await db
        .insert(users)
        .values({
          email: req.body.email,
          displayName: req.body.displayName,
          passwordHash,
          role: "ADMIN",
        })
        .returning();

      if (!admin) throw new AppError(500, "BOOTSTRAP_FAILED", "Failed to create admin");

      // Mark as bootstrapped
      await db
        .insert(bootstrapState)
        .values({ key: "admin_bootstrapped", value: "true" })
        .onConflictDoUpdate({
          target: bootstrapState.key,
          set: { value: "true", updatedAt: new Date() },
        });

      // Audit log
      await db.insert(auditLogs).values({
        userId: admin.id,
        action: "ADMIN_BOOTSTRAP",
        ipAddress: req.ip,
        metadata: { email: admin.email },
      });

      res.status(201).json({
        success: true,
        data: {
          message: "Admin account created successfully",
          userId: admin.id,
          email: admin.email,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Protected Admin Routes ───────────────────────────────────────────────────

adminRouter.use(authMiddleware);
adminRouter.use(requireRole("ADMIN"));

// GET /api/admin/users
adminRouter.get(
  "/users",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);

      res.json({ success: true, data: allUsers });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/users/role
adminRouter.patch(
  "/users/role",
  validate(updateUserRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.body;
      const adminId = req.user!.sub;

      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({ id: users.id, email: users.email, role: users.role });

      if (!updated) throw new AppError(404, "USER_NOT_FOUND", "User not found");

      await db.insert(auditLogs).values({
        userId: adminId,
        action: "ROLE_CHANGED",
        targetType: "user",
        targetId: userId,
        ipAddress: req.ip,
        metadata: { newRole: role },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/users/suspend
adminRouter.patch(
  "/users/suspend",
  validate(suspendUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, reason } = req.body;
      const adminId = req.user!.sub;

      const [updated] = await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({ id: users.id, email: users.email });

      if (!updated) throw new AppError(404, "USER_NOT_FOUND", "User not found");

      await db.insert(auditLogs).values({
        userId: adminId,
        action: "USER_SUSPENDED",
        targetType: "user",
        targetId: userId,
        ipAddress: req.ip,
        metadata: { reason },
      });

      res.json({ success: true, data: { message: "User suspended", userId } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/audit-logs
adminRouter.get(
  "/audit-logs",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(auditLogs.createdAt)
        .limit(200);

      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/health
adminRouter.get(
  "/health",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Quick DB ping
      await db.select({ key: bootstrapState.key }).from(bootstrapState).limit(1);
      res.json({
        success: true,
        data: {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
