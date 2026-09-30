import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { env } from "../config/env.js";
import type { AuthTokenPayload, UserRole } from "@stocklens/types";

// ─── Access Tokens ────────────────────────────────────────────────────────────

export function signAccessToken(payload: {
  sub: string;
  email: string;
  role: UserRole;
}): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export function generateRefreshToken(): string {
  return randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN * 1000);
}

// ─── Cookie Settings ──────────────────────────────────────────────────────────

export const REFRESH_COOKIE_NAME = "slens_refresh";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: env.REFRESH_TOKEN_EXPIRES_IN * 1000,
  path: "/api/auth",
};
