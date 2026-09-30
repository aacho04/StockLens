import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { ChatService } from "./chat.service.js";

export const chatRouter: Router = Router();

// POST /api/chat - Query the financial AI Copilot
chatRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, symbol } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ success: false, error: "A message string is required." });
      return;
    }

    const response = await ChatService.answerQuery(message, symbol);
    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/trades - Return analysis for every trade given
chatRouter.get("/trades", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const response = ChatService.analyzeAllGivenTrades();
    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/trade/:symbol - Return trade analysis for a specific symbol
chatRouter.get("/trade/:symbol", (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = String(req.params["symbol"]);
    const response = ChatService.analyzeSpecificTrade(symbol);
    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
});
