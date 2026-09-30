import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { AnalysisService } from "./analysis.service.js";

export const analysisRouter: Router = Router();

// 1. AI and Big Data Analytics: Trading opportunities screener
analysisRouter.get("/opportunities", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunities = AnalysisService.getOpportunities();
    res.json({ success: true, data: opportunities });
  } catch (err) {
    next(err);
  }
});

// 2. Risk Assessment Tools
analysisRouter.get("/risk", (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = typeof req.query["symbol"] === "string" ? req.query["symbol"] : undefined;
    const risk = AnalysisService.getRiskAssessment(symbol);
    res.json({ success: true, data: risk });
  } catch (err) {
    next(err);
  }
});

analysisRouter.get("/risk/:symbol", (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = String(req.params["symbol"]);
    const risk = AnalysisService.getRiskAssessment(symbol);
    res.json({ success: true, data: risk });
  } catch (err) {
    next(err);
  }
});

// 3. Interactive Charts and Option Chains
analysisRouter.get("/options/:symbol", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = String(req.params["symbol"] ?? "NIFTY");
    const expiry = typeof req.query["expiry"] === "string" ? req.query["expiry"] : undefined;
    const optionChain = await AnalysisService.getOptionChain(symbol, expiry);
    res.json({ success: true, data: optionChain });
  } catch (err) {
    next(err);
  }
});

// 4. Market News and Sentiment Analysis
analysisRouter.get("/news", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = typeof req.query["symbol"] === "string" ? req.query["symbol"] : undefined;
    const news = await AnalysisService.getNewsSentiment(symbol);
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
});

analysisRouter.get("/news/:symbol", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const symbol = String(req.params["symbol"]);
    const news = await AnalysisService.getNewsSentiment(symbol);
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
});

// 5. Educational Resources (SEBI & NSE)
analysisRouter.get("/education", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const resources = AnalysisService.getEducationalResources();
    res.json({ success: true, data: resources });
  } catch (err) {
    next(err);
  }
});
