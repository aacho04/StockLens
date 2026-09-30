import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  registerSchema,
  loginSchema,
} from "@stocklens/validators";
import { validate } from "../../middleware/validate.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  registerUser,
  loginUser,
  rotateRefreshToken,
  revokeRefreshToken,
  getCurrentUser,
} from "./auth.service.js";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../../lib/jwt.js";

export const authRouter: Router = Router();

// POST /api/auth/register
authRouter.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const { auth, refreshToken } = await registerUser(req.body, ip);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      res.status(201).json({ success: true, data: auth });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const { auth, refreshToken } = await loginUser(req.body, ip);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: auth });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh
authRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
      if (!token) {
        res.status(401).json({
          success: false,
          error: { code: "MISSING_REFRESH_TOKEN", message: "Refresh token not provided" },
        });
        return;
      }
      const { auth, refreshToken } = await rotateRefreshToken(token);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: auth });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
authRouter.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
      if (token) {
        await revokeRefreshToken(token);
      }
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      res.status(200).json({ success: true, data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
authRouter.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getCurrentUser(req.user!.sub);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);
