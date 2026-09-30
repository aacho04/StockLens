import { eq, and, gt } from "drizzle-orm";
import * as argon2 from "argon2";
import { db } from "../../db/client.js";
import {
  users,
  refreshTokens,
  auditLogs,
} from "../../db/schema/index.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "../../lib/jwt.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { RegisterInput, LoginInput } from "@stocklens/validators";
import type { AuthResponse, PublicUser } from "@stocklens/types";

// ─── Auth Service ─────────────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
  ipAddress?: string
): Promise<{ auth: AuthResponse; refreshToken: string }> {
  // Check for existing user
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  // Hash password with Argon2id
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: "INVESTOR",
    })
    .returning();

  if (!user) throw new AppError(500, "USER_CREATE_FAILED", "Failed to create user");

  // Write audit log
  await db.insert(auditLogs).values({
    userId: user.id,
    action: "USER_REGISTERED",
    ipAddress,
  });

  // Generate tokens
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: getRefreshTokenExpiry(),
  });

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };

  return {
    auth: { user: publicUser, accessToken },
    refreshToken,
  };
}

export async function loginUser(
  input: LoginInput,
  ipAddress?: string
): Promise<{ auth: AuthResponse; refreshToken: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // Audit
  await db.insert(auditLogs).values({
    userId: user.id,
    action: "USER_LOGIN",
    ipAddress,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };

  return {
    auth: { user: publicUser, accessToken },
    refreshToken,
  };
}

export async function rotateRefreshToken(
  token: string
): Promise<{ auth: AuthResponse; refreshToken: string }> {
  const tokenHash = hashToken(token);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!existing) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  // Revoke old token (rotation)
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, existing.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, existing.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Account is inactive");
  }

  const newRefreshToken = generateRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };

  return {
    auth: { user: publicUser, accessToken },
    refreshToken: newRefreshToken,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
