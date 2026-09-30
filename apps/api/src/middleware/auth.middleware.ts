import type { Request, Response, NextFunction } from "express";
import type { AuthTokenPayload } from "@stocklens/types";
import { verifyAccessToken } from "../lib/jwt.js";

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "MISSING_TOKEN", message: "Authentication token required" },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    const isExpired =
      err instanceof Error && err.name === "TokenExpiredError";

    res.status(401).json({
      success: false,
      error: {
        code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        message: isExpired
          ? "Access token has expired"
          : "Invalid authentication token",
      },
    });
  }
}
