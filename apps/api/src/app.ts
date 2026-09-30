import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./features/auth/auth.router.js";
import { stocksRouter } from "./features/stocks/stocks.router.js";
import { watchlistRouter } from "./features/watchlist/watchlist.router.js";
import { portfolioRouter } from "./features/portfolio/portfolio.router.js";
import { walletRouter } from "./features/wallet/wallet.router.js";
import { adminRouter } from "./features/admin/admin.router.js";
import { predictionRouter } from "./features/prediction/prediction.router.js";
import { analysisRouter } from "./features/analysis/analysis.router.js";
import { chatRouter } from "./features/chat/chat.router.js";
import { tradingRouter } from "./features/trading/trading.router.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";

export const app: express.Express = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later" },
  },
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "AUTH_RATE_LIMIT", message: "Too many auth attempts, please wait 15 minutes" },
  },
});

app.use(globalRateLimit);

// ─── Parsing Middleware ───────────────────────────────────────────────────────

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
}

// ─── Health Check (public) ───────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRateLimit, authRouter);
app.use("/api/stocks", stocksRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/trading", tradingRouter);
app.use("/api", tradingRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/admin", adminRouter);
app.use("/api/predict", predictionRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/chat", chatRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);
