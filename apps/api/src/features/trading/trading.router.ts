import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { db } from "../../db/client.js";
import { orders, positions, holdings, portfolios, trades, stocks } from "../../db/schema/index.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import { OrderEngineService } from "./order-engine.service.js";
import { SquareOffService } from "./squareoff.service.js";
import { ChargesService } from "./charges.service.js";
import { getLiveQuote } from "../../market-data/websocket.server.js";
import { getMarketDataProvider } from "../../market-data/index.js";
import { AppError } from "../../middleware/error.middleware.js";

export const tradingRouter: Router = Router();

tradingRouter.use(authMiddleware);
tradingRouter.use(requireRole("INVESTOR"));

// Helper to get or create portfolio
async function getOrCreatePortfolio(userId: string) {
  const existing = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

  const [created] = await db
    .insert(portfolios)
    .values({
      userId,
      cashBalance: "1000000.00",
    })
    .returning();

  return created!;
}

// ─── 1. ORDER BOOK ENDPOINTS ──────────────────────────────────────────────────

// GET /api/orders — Get user's order book (Tabs: all, open, executed, cancelled, rejected)
tradingRouter.get("/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const statusQuery = (req.query["status"] as string)?.toUpperCase();

    // Trigger evaluation of pending orders first so user sees fresh execution
    await OrderEngineService.evaluateAllPendingOrders();

    let whereClause = eq(orders.userId, userId);

    if (statusQuery && statusQuery !== "ALL") {
      if (statusQuery === "OPEN") {
        whereClause = and(eq(orders.userId, userId), inArray(orders.status, ["OPEN", "TRIGGERED"])) as any;
      } else {
        whereClause = and(eq(orders.userId, userId), eq(orders.status, statusQuery)) as any;
      }
    }

    const orderList = await db
      .select({
        id: orders.id,
        symbol: orders.symbol,
        exchange: orders.exchange,
        side: orders.side,
        productType: orders.productType,
        orderType: orders.orderType,
        quantity: orders.quantity,
        price: orders.price,
        limitPrice: orders.limitPrice,
        triggerPrice: orders.triggerPrice,
        averagePrice: orders.averagePrice,
        totalAmount: orders.totalAmount,
        charges: orders.charges,
        status: orders.status,
        createdAt: orders.createdAt,
        executedAt: orders.executedAt,
        name: stocks.name,
      })
      .from(orders)
      .innerJoin(stocks, eq(orders.stockId, stocks.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    res.json({ success: true, data: orderList });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders — Place a paper trading order (Market, Limit, SL, SL-M)
tradingRouter.post("/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);

    const {
      symbol,
      instrumentKey,
      exchange = "NSE",
      side,
      productType = "MIS",
      orderType = "MARKET",
      quantity,
      limitPrice,
      triggerPrice,
    } = req.body;

    if (!symbol || typeof symbol !== "string") {
      throw new AppError(400, "INVALID_INPUT", "Stock symbol is required");
    }

    const upperSym = symbol.toUpperCase();
    const tradeSide = (side ?? "").toUpperCase();
    if (tradeSide !== "BUY" && tradeSide !== "SELL") {
      throw new AppError(400, "INVALID_INPUT", "Order side must be BUY or SELL");
    }

    const tradeProduct = (productType ?? "MIS").toUpperCase();
    if (tradeProduct !== "MIS" && tradeProduct !== "CNC") {
      throw new AppError(400, "INVALID_INPUT", "Product must be MIS (Intraday 5x) or CNC (Delivery)");
    }

    const tradeOrderType = (orderType ?? "MARKET").toUpperCase();
    if (!["MARKET", "LIMIT", "SL", "SL-M"].includes(tradeOrderType)) {
      throw new AppError(400, "INVALID_INPUT", "Order type must be MARKET, LIMIT, SL, or SL-M");
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError(400, "INVALID_INPUT", "Quantity must be a positive integer");
    }

    // Lookup stock
    let [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, upperSym))
      .limit(1);

    if (!stock) {
      // Auto-register stock from provider if found
      const provider = getMarketDataProvider();
      const searchRes = await provider.searchStocks(upperSym);
      const found = searchRes.find((s) => s.symbol === upperSym);
      if (found && found.symbol && found.name) {
        const [createdStock] = await db
          .insert(stocks)
          .values({
            symbol: found.symbol,
            name: found.name,
            exchange: (found.exchange === "BSE" ? "BSE" : "NSE") as "NSE" | "BSE",
            sector: found.sector || "General",
            industry: found.industry || "General",
            isActive: true,
          })
          .returning();
        stock = createdStock!;
      } else {
        throw new AppError(404, "NOT_FOUND", `Stock ${upperSym} not found in NSE universe`);
      }
    }

    // Place order via engine
    const result = await OrderEngineService.placeOrder({
      userId,
      portfolioId: portfolio.id,
      stockId: stock.id,
      symbol: stock.symbol,
      instrumentKey: typeof instrumentKey === "string" ? instrumentKey : undefined,
      exchange: typeof exchange === "string" ? exchange : "NSE",
      side: tradeSide as "BUY" | "SELL",
      productType: tradeProduct as "MIS" | "CNC",
      orderType: tradeOrderType as "MARKET" | "LIMIT" | "SL" | "SL-M",
      quantity: qty,
      limitPrice: limitPrice != null ? parseFloat(limitPrice) : undefined,
      triggerPrice: triggerPrice != null ? parseFloat(triggerPrice) : undefined,
    });

    res.status(201).json({
      success: true,
      data: {
        message: result.order.status === "EXECUTED"
          ? `Executed ${tradeSide} ${qty} shares of ${stock.symbol} @ ₹${result.order.averagePrice}`
          : `Order placed successfully (${result.order.status})`,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id — Cancel an OPEN or TRIGGERED order
tradingRouter.delete("/orders/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const orderId = req.params["id"] as string;

    const cancelled = await OrderEngineService.cancelOrder(orderId, userId);

    res.json({
      success: true,
      data: {
        message: "Order cancelled successfully",
        order: cancelled,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 2. POSITIONS ENDPOINTS ──────────────────────────────────────────────────

// GET /api/positions — Get user's active & closed intraday positions with live P&L
tradingRouter.get("/positions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);
    const provider = getMarketDataProvider();

    const openPositions = await db
      .select({
        id: positions.id,
        stockId: positions.stockId,
        symbol: positions.symbol,
        product: positions.product,
        side: positions.side,
        quantity: positions.quantity,
        averagePrice: positions.averagePrice,
        marginBlocked: positions.marginBlocked,
        status: positions.status,
        name: stocks.name,
        exchange: stocks.exchange,
        sector: stocks.sector,
        createdAt: positions.createdAt,
      })
      .from(positions)
      .innerJoin(stocks, eq(positions.stockId, stocks.id))
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, "OPEN")))
      .orderBy(desc(positions.createdAt));

    let totalMarginBlocked = 0;
    let totalIntradayPnl = 0;

    const positionsWithLive = await Promise.all(
      openPositions.map(async (pos) => {
        let quote = getLiveQuote(pos.symbol);
        if (!quote) {
          try {
            quote = await provider.getQuote(pos.symbol);
          } catch {
            quote = null;
          }
        }

        const avgPrice = parseFloat(pos.averagePrice);
        const currentPrice = quote ? parseFloat(quote.currentPrice) : avgPrice;
        const margin = parseFloat(pos.marginBlocked);
        totalMarginBlocked += margin;

        const isLong = pos.side === "LONG";
        const pnl = isLong
          ? (currentPrice - avgPrice) * pos.quantity
          : (avgPrice - currentPrice) * pos.quantity;

        const exposure = avgPrice * pos.quantity;
        const pnlPct = exposure > 0 ? (pnl / exposure) * 100 : 0;
        totalIntradayPnl += pnl;

        return {
          ...pos,
          currentPrice: currentPrice.toFixed(2),
          exposure: exposure.toFixed(2),
          marginBlocked: margin.toFixed(2),
          unrealizedPnl: pnl.toFixed(2),
          unrealizedPnlPercentage: pnlPct.toFixed(2),
          leverage: 5,
          quote,
        };
      })
    );

    res.json({
      success: true,
      data: {
        positions: positionsWithLive,
        totalMarginBlocked: totalMarginBlocked.toFixed(2),
        totalIntradayPnl: totalIntradayPnl.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/positions/:id/close — Close an individual open position
tradingRouter.post("/positions/:id/close", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const positionId = req.params["id"] as string;

    const result = await SquareOffService.squareOffPosition(positionId, userId);

    res.json({
      success: true,
      data: {
        message: `Position closed successfully @ ₹${result.exitPrice.toFixed(2)} · Net P&L: ₹${result.netPnl.toFixed(2)}`,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/positions/close-all — Close all open intraday positions for user
tradingRouter.post("/positions/close-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const results = await SquareOffService.squareOffAllUserPositions(userId);

    const totalPnl = results.reduce((acc, r) => acc + (r.netPnl || 0), 0);

    res.json({
      success: true,
      data: {
        message: `Closed ${results.length} intraday positions · Total Net P&L: ₹${totalPnl.toFixed(2)}`,
        closedCount: results.length,
        totalPnl: +totalPnl.toFixed(2),
        results,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 3. TRADE BOOK ENDPOINTS ──────────────────────────────────────────────────

// GET /api/trades — Completed trade executions
tradingRouter.get("/trades", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;

    const tradeList = await db
      .select({
        id: trades.id,
        symbol: trades.symbol,
        exchange: trades.exchange,
        side: trades.side,
        productType: trades.productType,
        quantity: trades.quantity,
        entryPrice: trades.entryPrice,
        exitPrice: trades.exitPrice,
        grossPnl: trades.grossPnl,
        charges: trades.charges,
        netPnl: trades.netPnl,
        executedAt: trades.executedAt,
        name: stocks.name,
      })
      .from(trades)
      .innerJoin(stocks, eq(trades.stockId, stocks.id))
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.executedAt))
      .limit(100);

    res.json({ success: true, data: tradeList });
  } catch (err) {
    next(err);
  }
});

// ─── 4. FUNDS & MARGIN ENDPOINT ───────────────────────────────────────────────

// GET /api/funds — Virtual wallet balance, margin utilization, and buying power
tradingRouter.get("/funds", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);

    const openPositions = await db
      .select({
        marginBlocked: positions.marginBlocked,
        averagePrice: positions.averagePrice,
        quantity: positions.quantity,
        side: positions.side,
        symbol: positions.symbol,
      })
      .from(positions)
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, "OPEN")));

    let usedMargin = 0;
    let unrealizedPnl = 0;

    for (const p of openPositions) {
      usedMargin += parseFloat(p.marginBlocked);
      const ltp = await OrderEngineService.getLivePrice(p.symbol);
      const avg = parseFloat(p.averagePrice);
      const diff = p.side === "LONG" ? (ltp - avg) * p.quantity : (avg - ltp) * p.quantity;
      unrealizedPnl += diff;
    }

    const availableCash = parseFloat(portfolio.cashBalance);
    const buyingPower = +(availableCash * 5).toFixed(2); // 5x leverage for MIS

    // Delivery holdings value
    const userHoldings = await db
      .select({
        quantity: holdings.quantity,
        averageBuyPrice: holdings.averageBuyPrice,
        symbol: holdings.symbol,
      })
      .from(holdings)
      .where(eq(holdings.portfolioId, portfolio.id));

    let holdingsValue = 0;
    for (const h of userHoldings) {
      const ltp = await OrderEngineService.getLivePrice(h.symbol);
      holdingsValue += ltp * h.quantity;
    }

    const totalPortfolioValue = +(availableCash + usedMargin + holdingsValue + unrealizedPnl).toFixed(2);

    res.json({
      success: true,
      data: {
        availableCash: availableCash.toFixed(2),
        usedMargin: usedMargin.toFixed(2),
        availableMargin: availableCash.toFixed(2),
        buyingPower: buyingPower.toFixed(2),
        unrealizedPnl: unrealizedPnl.toFixed(2),
        holdingsValue: holdingsValue.toFixed(2),
        totalPortfolioValue: totalPortfolioValue.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 5. CHARGES CALCULATOR ENDPOINT ───────────────────────────────────────────

// POST /api/trading/calculate-charges — Calculate simulated brokerage & statutory taxes
tradingRouter.post("/calculate-charges", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { side = "BUY", productType = "MIS", quantity = 1, price = 100 } = req.body;

    const breakdown = ChargesService.calculateCharges({
      side: side.toUpperCase() as "BUY" | "SELL",
      productType: productType.toUpperCase() as "MIS" | "CNC",
      quantity: parseInt(quantity, 10) || 1,
      price: parseFloat(price) || 100,
    });

    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
});

// ─── 6. MARKET STATUS & HOURS ─────────────────────────────────────────────────

// GET /api/trading/market-status — Real-time market status and auto square-off timer
tradingRouter.get("/market-status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const isOpen = SquareOffService.isMarketOpen();
    const isSquareOffDue = SquareOffService.isAutoSquareOffDue();

    res.json({
      success: true,
      data: {
        isMarketOpen: isOpen,
        isAutoSquareOffDue: isSquareOffDue,
        config: SquareOffService.config,
      },
    });
  } catch (err) {
    next(err);
  }
});
