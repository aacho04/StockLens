import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { db } from "../../db/client.js";
import { watchlists, watchlistStocks, stocks } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { AppError } from "../../middleware/error.middleware.js";
import { getMarketDataProvider } from "../../market-data/index.js";
import { getLiveQuote } from "../../market-data/websocket.server.js";

export const watchlistRouter: Router = Router();

// Require auth
watchlistRouter.use(authMiddleware);
watchlistRouter.use(requireRole("INVESTOR"));

// GET /api/watchlist — Get all watchlists with stock quotes
watchlistRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const userWatchlists = await db
      .select()
      .from(watchlists)
      .where(eq(watchlists.userId, userId));

    const provider = getMarketDataProvider();
    const result = [];

    for (const wl of userWatchlists) {
      const items = await db
        .select({
          id: watchlistStocks.id,
          stockId: stocks.id,
          symbol: stocks.symbol,
          name: stocks.name,
          exchange: stocks.exchange,
          sector: stocks.sector,
        })
        .from(watchlistStocks)
        .innerJoin(stocks, eq(watchlistStocks.stockId, stocks.id))
        .where(eq(watchlistStocks.watchlistId, wl.id));

      // Fetch live quotes for watchlist stocks
      const stocksWithQuotes = await Promise.all(
        items.map(async (st) => {
          let quote = getLiveQuote(st.symbol);
          if (!quote) {
            try {
              quote = await provider.getQuote(st.symbol);
            } catch {
              quote = null;
            }
          }
          return { ...st, quote };
        })
      );

      result.push({
        id: wl.id,
        name: wl.name,
        createdAt: wl.createdAt,
        stocks: stocksWithQuotes,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist — Create new watchlist
watchlistRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError(400, "INVALID_INPUT", "Watchlist name is required");
    }

    const [created] = await db
      .insert(watchlists)
      .values({
        userId,
        name: name.trim(),
      })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist/:id/stocks — Add stock to watchlist
watchlistRouter.post("/:id/stocks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const watchlistId = req.params["id"] as string;
    const { symbol } = req.body;

    if (!symbol || typeof symbol !== "string") {
      throw new AppError(400, "INVALID_INPUT", "Stock symbol is required");
    }

    // Verify watchlist ownership
    const [wl] = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (!wl) {
      throw new AppError(404, "WATCHLIST_NOT_FOUND", "Watchlist not found");
    }

    // Find stock
    const [st] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, symbol.toUpperCase()))
      .limit(1);

    if (!st) {
      throw new AppError(404, "STOCK_NOT_FOUND", "Stock symbol not found");
    }

    // Add stock if not already in watchlist
    const existing = await db
      .select()
      .from(watchlistStocks)
      .where(
        and(
          eq(watchlistStocks.watchlistId, watchlistId),
          eq(watchlistStocks.stockId, st.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(watchlistStocks).values({
        watchlistId,
        stockId: st.id,
      });
    }

    res.json({ success: true, message: `${st.symbol} added to watchlist` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:id/stocks/:stockId — Remove stock from watchlist
watchlistRouter.delete("/:id/stocks/:stockId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const watchlistId = req.params["id"] as string;
    const stockId = req.params["stockId"] as string;

    // Verify watchlist ownership
    const [wl] = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (!wl) {
      throw new AppError(404, "WATCHLIST_NOT_FOUND", "Watchlist not found");
    }

    await db
      .delete(watchlistStocks)
      .where(
        and(
          eq(watchlistStocks.watchlistId, watchlistId),
          eq(watchlistStocks.stockId, stockId)
        )
      );

    res.json({ success: true, message: "Stock removed from watchlist" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:id — Delete watchlist
watchlistRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const watchlistId = req.params["id"] as string;

    await db
      .delete(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)));

    res.json({ success: true, message: "Watchlist deleted" });
  } catch (err) {
    next(err);
  }
});
