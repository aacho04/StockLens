import dotenv from "dotenv";
import path from "path";

// Ensure fresh .env variables are loaded with override: true
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env"), override: true });
import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((o) => o.trim())),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(604800),

  // Market Data
  MARKET_DATA_PROVIDER: z.enum(["mock", "finnhub", "yahoo", "groww", "upstox"]).default("mock"),
  FINNHUB_API_KEY: z.string().optional(),
  GROWW_API_KEY: z.string().optional(),
  GROWW_API_SECRET: z.string().optional(),
  UPSTOX_API_KEY: z.string().optional(),
  UPSTOX_ACCESS_TOKEN: z.string().optional(),

  // Wallet & Payment Gateway
  WALLET_WEBHOOK_SECRET: z
    .string()
    .default("super_secure_clone_webhook_secret_123"),

  // Admin Bootstrap
  FIRST_ADMIN_BOOTSTRAP_TOKEN: z.string().optional(),

  // Machine Learning Microservice
  PREDICTION_SERVICE_URL: z.string().default("http://127.0.0.1:8000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:\n");
  const errors = parsed.error.flatten().fieldErrors;
  for (const [key, messages] of Object.entries(errors)) {
    console.error(`  ${key}: ${messages?.join(", ")}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
