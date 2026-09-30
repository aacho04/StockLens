import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // may come from cookie or body
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─── Stock Schemas ────────────────────────────────────────────────────────────

export const stockSearchSchema = z.object({
  q: z.string().max(100).default("").optional(),
  exchange: z.enum(["NSE", "BSE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  page: z.coerce.number().int().min(1).default(1),
});
export type StockSearchInput = z.infer<typeof stockSearchSchema>;

export const ohlcvQuerySchema = z.object({
  period: z
    .enum(["1D", "1W", "1M", "3M", "6M", "1Y", "2Y", "5Y", "INTRADAY"])
    .default("1Y"),
  interval: z
    .enum(["1m", "5m", "15m", "30m", "1h", "1H", "1d", "1D", "1w", "1mo"])
    .default("1d"),
});
export type OHLCVQueryInput = z.infer<typeof ohlcvQuerySchema>;

// ─── Admin Schemas ────────────────────────────────────────────────────────────

export const bootstrapAdminSchema = z.object({
  bootstrapToken: z.string().min(1, "Bootstrap token is required"),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  displayName: z.string().min(2).max(50).trim(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});
export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["INVESTOR", "ANALYST", "ADMIN"]),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const suspendUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z.string().max(500).optional(),
});
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

// ─── Paper Trading Schemas (Phase 3 stub) ────────────────────────────────────

export const placeOrderSchema = z.object({
  stockId: z.string().uuid(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.number().int().positive().max(100000),
  limitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  idempotencyKey: z.string().uuid("Idempotency key must be a UUID"),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

// ─── Watchlist Schemas ────────────────────────────────────────────────────────

export const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});
export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;

export const addToWatchlistSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase().trim(),
});
export type AddToWatchlistInput = z.infer<typeof addToWatchlistSchema>;
