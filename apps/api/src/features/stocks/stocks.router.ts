import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type { Quote } from "@stocklens/types";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { stockSearchSchema, ohlcvQuerySchema } from "@stocklens/validators";
import { getMarketDataProvider } from "../../market-data/index.js";
import { getLiveQuote, syncRealMarketPrices } from "../../market-data/websocket.server.js";
import { db } from "../../db/client.js";
import { stocks, ohlcvDaily } from "../../db/schema/index.js";
import { eq, ilike, or, and } from "drizzle-orm";
import { AppError } from "../../middleware/error.middleware.js";
import { env } from "../../config/env.js";

export const stocksRouter: Router = Router();

// All stock routes require authentication
stocksRouter.use(authMiddleware);
stocksRouter.use(requireRole("INVESTOR"));

// GET /api/stocks/search?q=...&exchange=...&limit=...&page=...
stocksRouter.get(
  "/search",
  validate(stockSearchSchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query as any;
      const provider = getMarketDataProvider();

      // Search universe
      const providerResults = await provider.searchStocks(q ?? "");

      // Also try DB for any additional user-added stocks
      const dbResults = await db
        .select({
          id: stocks.id,
          symbol: stocks.symbol,
          name: stocks.name,
          exchange: stocks.exchange,
          sector: stocks.sector,
          industry: stocks.industry,
          marketCap: stocks.marketCap,
        })
        .from(stocks)
        .where(and(
          or(
            ilike(stocks.symbol, `%${q ?? ""}%`),
            ilike(stocks.name, `%${q ?? ""}%`),
            ilike(stocks.sector, `%${q ?? ""}%`)
          ),
          eq(stocks.isActive, true),
        ))
        .limit(limit ?? 100);

      // Merge: provider results first, then any DB-only stocks
      const providerSymbols = new Set(providerResults.map((s) => s.symbol));
      const extraDbStocks = dbResults.filter((s) => !providerSymbols.has(s.symbol));
      const merged = [...providerResults, ...extraDbStocks].slice(0, limit ?? 100);

      // Attach live synchronized quote to each stock
      const resultsWithQuotes = await Promise.all(
        merged.map(async (s) => {
          if (!s.symbol) return { ...s, quote: null };
          let quote = getLiveQuote(s.symbol);
          if (!quote) {
            try {
              quote = await provider.getQuote(s.symbol);
            } catch {
              quote = null;
            }
          }
          return {
            ...s,
            quote,
          };
        })
      );

      res.json({ success: true, data: resultsWithQuotes });
    } catch (err) {
      next(err);
    }
  }
);


// GET /api/stocks/market-summary
stocksRouter.get(
  "/market-summary",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = getMarketDataProvider();
      const summary = await provider.getMarketSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/stocks/sectors/overview
// Returns stock metadata grouped by sector WITH live quotes for fast rendering
stocksRouter.get(
  "/sectors/overview",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = getMarketDataProvider();

      // Get the full stock universe from the provider
      const providerStocks = await provider.searchStocks("");

      // Also check DB for any extra seeded stocks
      const dbStocks = await db
        .select({
          id: stocks.id,
          symbol: stocks.symbol,
          name: stocks.name,
          exchange: stocks.exchange,
          sector: stocks.sector,
          industry: stocks.industry,
          marketCap: stocks.marketCap,
        })
        .from(stocks)
        .where(eq(stocks.isActive, true));

      // Merge: provider-first, then DB-only stocks
      const providerSymbols = new Set(providerStocks.map((s) => s.symbol));
      const extraDbStocks = dbStocks.filter((s) => !providerSymbols.has(s.symbol));
      const allStocks = [...providerStocks, ...extraDbStocks];

      // Group by sector with live quotes attached
      const sectorMap: Record<string, { sector: string; stocks: Array<any> }> = {};
      for (const st of allStocks) {
        const sec = (st.sector as string) || "Other";
        if (!sectorMap[sec]) sectorMap[sec] = { sector: sec, stocks: [] };
        const quote = st.symbol ? getLiveQuote(st.symbol) : null;
        sectorMap[sec]!.stocks.push({ ...st, quote: quote ?? null });
      }

      const sectors = Object.values(sectorMap).sort((a, b) => a.sector.localeCompare(b.sector));
      res.json({ success: true, data: sectors });
    } catch (err) {
      next(err);
    }
  }
);


// GET /api/stocks/:symbol
stocksRouter.get(
  "/:symbol",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = (req.params["symbol"] as string).toUpperCase();
      const provider = getMarketDataProvider();

      // Get stock details from DB
      const [dbStock] = await db
        .select()
        .from(stocks)
        .where(and(eq(stocks.symbol, symbol), eq(stocks.isActive, true)))
        .limit(1);

      // If not in DB, get metadata from provider universe
      let stock = dbStock ?? null;
      if (!stock) {
        const providerStocks = await provider.searchStocks(symbol);
        const found = providerStocks.find((s) => s.symbol === symbol);
        if (found) {
          stock = { id: "", isActive: true, ...found } as any;
        }
      }

      // Check synchronized live quote first, fallback to provider
      let quote = getLiveQuote(symbol);
      if (!quote) {
        quote = await provider.getQuote(symbol);
      }

      res.json({
        success: true,
        data: {
          stock,
          quote,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);


// GET /api/stocks/:symbol/ohlcv?period=1Y&interval=1d
stocksRouter.get(
  "/:symbol/ohlcv",
  validate(ohlcvQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = (req.params["symbol"] as string).toUpperCase();
      const { period, interval } = req.query as any;
      const provider = getMarketDataProvider();
      const candles = await provider.getOHLCV(symbol, period, interval);

      res.json({
        success: true,
        data: {
          symbol,
          period,
          interval,
          dataStatus: provider.dataStatus,
          candles,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/stocks/:symbol/quote
stocksRouter.get(
  "/:symbol/quote",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = (req.params["symbol"] as string).toUpperCase();
      const provider = getMarketDataProvider();
      let quote: Quote | null = null;
      if (env.MARKET_DATA_PROVIDER === "upstox") {
        quote = await provider.getQuote(symbol);
      } else {
        quote = getLiveQuote(symbol);
        if (!quote) {
          quote = await provider.getQuote(symbol);
        }
      }
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/stocks/sync-market — Refresh live prices across the system
stocksRouter.post(
  "/sync-market",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await syncRealMarketPrices();
      res.json({
        success: true,
        message: `Market prices updated (${result.updated} stocks synced)`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

