import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { db } from "../../db/client.js";
import { portfolios, holdings, orders, stocks, positions } from "../../db/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { AppError } from "../../middleware/error.middleware.js";
import { getLiveQuote } from "../../market-data/websocket.server.js";
import { getMarketDataProvider } from "../../market-data/index.js";

export const portfolioRouter: Router = Router();

portfolioRouter.use(authMiddleware);
portfolioRouter.use(requireRole("INVESTOR"));

// Helper to get or create portfolio for user
async function getOrCreatePortfolio(userId: string) {
  const existing = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

  // Create initial portfolio with ₹10,00,000 cash balance
  const [created] = await db
    .insert(portfolios)
    .values({
      userId,
      cashBalance: "1000000.00",
    })
    .returning();

  return created!;
}

// GET /api/portfolio — Get portfolio summary with live holdings, intraday MIS positions & P&L
portfolioRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);
    const provider = getMarketDataProvider();

    // 1. Fetch CNC Delivery Holdings
    const userHoldings = await db
      .select({
        id: holdings.id,
        stockId: holdings.stockId,
        symbol: holdings.symbol,
        quantity: holdings.quantity,
        averageBuyPrice: holdings.averageBuyPrice,
        name: stocks.name,
        exchange: stocks.exchange,
        sector: stocks.sector,
      })
      .from(holdings)
      .innerJoin(stocks, eq(holdings.stockId, stocks.id))
      .where(eq(holdings.portfolioId, portfolio.id));

    let totalInvested = 0;
    let currentHoldingsValue = 0;

    const holdingsWithLiveQuotes = await Promise.all(
      userHoldings.map(async (h) => {
        let quote = getLiveQuote(h.symbol);
        if (!quote) {
          try {
            quote = await provider.getQuote(h.symbol);
          } catch {
            quote = null;
          }
        }

        const avgPrice = parseFloat(h.averageBuyPrice);
        const currentPrice = quote ? parseFloat(quote.currentPrice) : avgPrice;
        const investedVal = avgPrice * h.quantity;
        const currentVal = currentPrice * h.quantity;
        const pnl = currentVal - investedVal;
        const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

        totalInvested += investedVal;
        currentHoldingsValue += currentVal;

        return {
          ...h,
          currentPrice: currentPrice.toFixed(2),
          investedValue: investedVal.toFixed(2),
          currentValue: currentVal.toFixed(2),
          pnl: pnl.toFixed(2),
          pnlPercentage: pnlPct.toFixed(2),
          quote,
        };
      })
    );

    // 2. Fetch Open Intraday (MIS) Positions
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
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, "OPEN")));

    let totalMarginBlocked = 0;
    let totalIntradayPnl = 0;

    const positionsWithLiveQuotes = await Promise.all(
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

        // P&L calculation: LONG vs SHORT
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

    const cash = parseFloat(portfolio.cashBalance);
    // Effective Buying Power for MIS 5x leverage = Cash * 5
    const effectiveBuyingPower = +(cash * 5).toFixed(2);
    // Total Net Worth = Available Cash + Margin Blocked + CNC Value + Intraday PnL
    const totalNetWorth = +(cash + totalMarginBlocked + currentHoldingsValue + totalIntradayPnl).toFixed(2);
    const totalPnl = +(currentHoldingsValue - totalInvested + totalIntradayPnl).toFixed(2);
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    res.json({
      success: true,
      data: {
        portfolioId: portfolio.id,
        cashBalance: cash.toFixed(2),
        totalMarginBlocked: totalMarginBlocked.toFixed(2),
        effectiveBuyingPower: effectiveBuyingPower.toFixed(2),
        totalInvested: totalInvested.toFixed(2),
        currentHoldingsValue: currentHoldingsValue.toFixed(2),
        totalIntradayPnl: totalIntradayPnl.toFixed(2),
        totalNetWorth: totalNetWorth.toFixed(2),
        totalPnl: totalPnl.toFixed(2),
        totalPnlPercentage: totalPnlPct.toFixed(2),
        holdings: holdingsWithLiveQuotes,
        positions: positionsWithLiveQuotes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/portfolio/trade — Execute Buy or Sell Paper Trade (CNC Delivery or MIS 5x Margin)
portfolioRouter.post("/trade", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { symbol, type, quantity, product = "CNC", orderType = "MARKET" } = req.body;

    if (!symbol || typeof symbol !== "string") {
      throw new AppError(400, "INVALID_INPUT", "Stock symbol is required");
    }

    const tradeType = (type ?? "").toUpperCase();
    if (tradeType !== "BUY" && tradeType !== "SELL") {
      throw new AppError(400, "INVALID_INPUT", "Trade type must be BUY or SELL");
    }

    const tradeProduct = (product ?? "CNC").toUpperCase();
    if (tradeProduct !== "CNC" && tradeProduct !== "MIS") {
      throw new AppError(400, "INVALID_INPUT", "Product must be CNC (Delivery) or MIS (Intraday)");
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError(400, "INVALID_INPUT", "Quantity must be a positive integer");
    }

    // Lookup stock in DB
    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, symbol.toUpperCase()))
      .limit(1);

    if (!stock) {
      throw new AppError(404, "NOT_FOUND", `Stock ${symbol} not found`);
    }

    // Get live price
    let quote = getLiveQuote(stock.symbol);
    if (!quote) {
      const provider = getMarketDataProvider();
      quote = await provider.getQuote(stock.symbol);
    }

    const execPrice = parseFloat(quote.currentPrice);
    const totalCost = +(execPrice * qty).toFixed(2);

    const portfolio = await getOrCreatePortfolio(userId);
    const currentCash = parseFloat(portfolio.cashBalance);

    // =========================================================================
    // CASE A: DELIVERY (CNC) - 1x Margin (Full cash required)
    // =========================================================================
    if (tradeProduct === "CNC") {
      if (tradeType === "BUY") {
        if (currentCash < totalCost) {
          throw new AppError(
            400,
            "INSUFFICIENT_FUNDS",
            `Insufficient funds for CNC Delivery. Required ₹${totalCost.toLocaleString("en-IN")}, available ₹${currentCash.toLocaleString("en-IN")}. Consider using MIS for 5x margin!`
          );
        }

        // Deduct cash
        const newCash = +(currentCash - totalCost).toFixed(2);
        await db
          .update(portfolios)
          .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
          .where(eq(portfolios.id, portfolio.id));

        // Update or create holding
        const existingHolding = await db
          .select()
          .from(holdings)
          .where(
            and(
              eq(holdings.portfolioId, portfolio.id),
              eq(holdings.stockId, stock.id)
            )
          )
          .limit(1);

        if (existingHolding.length > 0) {
          const h = existingHolding[0]!;
          const prevQty = h.quantity;
          const prevAvg = parseFloat(h.averageBuyPrice);
          const newQty = prevQty + qty;
          const newAvg = +((prevQty * prevAvg + qty * execPrice) / newQty).toFixed(2);

          await db
            .update(holdings)
            .set({
              quantity: newQty,
              averageBuyPrice: newAvg.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(holdings.id, h.id));
        } else {
          await db.insert(holdings).values({
            portfolioId: portfolio.id,
            userId,
            stockId: stock.id,
            symbol: stock.symbol,
            quantity: qty,
            averageBuyPrice: execPrice.toFixed(2),
          });
        }

        // Record order
        const [order] = await db
          .insert(orders)
          .values({
            portfolioId: portfolio.id,
            userId,
            stockId: stock.id,
            symbol: stock.symbol,
            type: "BUY",
            orderType: "CNC",
            quantity: qty,
            price: execPrice.toFixed(2),
            totalAmount: totalCost.toFixed(2),
            status: "FILLED",
          })
          .returning();

        return res.status(201).json({
          success: true,
          data: {
            message: `Successfully bought ${qty} shares of ${stock.symbol} (CNC Delivery) @ ₹${execPrice.toFixed(2)}`,
            order,
            newCashBalance: newCash.toFixed(2),
          },
        });
      } else {
        // Trade type is SELL for CNC
        const existingHolding = await db
          .select()
          .from(holdings)
          .where(
            and(
              eq(holdings.portfolioId, portfolio.id),
              eq(holdings.stockId, stock.id)
            )
          )
          .limit(1);

        if (existingHolding.length === 0 || existingHolding[0]!.quantity < qty) {
          const available = existingHolding[0]?.quantity ?? 0;
          throw new AppError(
            400,
            "INSUFFICIENT_HOLDINGS",
            `Insufficient shares to sell in CNC. Available: ${available}, requested: ${qty}. Use MIS if you wish to Short Sell!`
          );
        }

        const h = existingHolding[0]!;
        const remainingQty = h.quantity - qty;

        if (remainingQty === 0) {
          await db.delete(holdings).where(eq(holdings.id, h.id));
        } else {
          await db
            .update(holdings)
            .set({
              quantity: remainingQty,
              updatedAt: new Date(),
            })
            .where(eq(holdings.id, h.id));
        }

        // Add cash proceeds
        const newCash = +(currentCash + totalCost).toFixed(2);
        await db
          .update(portfolios)
          .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
          .where(eq(portfolios.id, portfolio.id));

        // Record order
        const [order] = await db
          .insert(orders)
          .values({
            portfolioId: portfolio.id,
            userId,
            stockId: stock.id,
            symbol: stock.symbol,
            type: "SELL",
            orderType: "CNC",
            quantity: qty,
            price: execPrice.toFixed(2),
            totalAmount: totalCost.toFixed(2),
            status: "FILLED",
          })
          .returning();

        return res.status(201).json({
          success: true,
          data: {
            message: `Successfully sold ${qty} shares of ${stock.symbol} (CNC Delivery) @ ₹${execPrice.toFixed(2)}`,
            order,
            newCashBalance: newCash.toFixed(2),
          },
        });
      }
    }

    // =========================================================================
    // CASE B: INTRADAY (MIS) - 5x Leverage (20% margin blocked)
    // =========================================================================
    const marginRequired = +(totalCost / 5).toFixed(2); // 20% margin for 5x leverage

    // Check if user already has an OPEN position for this stock in MIS
    const existingOpenPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.portfolioId, portfolio.id),
          eq(positions.stockId, stock.id),
          eq(positions.status, "OPEN")
        )
      )
      .limit(1);

    const openPos = existingOpenPositions[0];

    // If user has an open position on the OPPOSITE side, this is a square-off/reduction!
    if (openPos && ((openPos.side === "LONG" && tradeType === "SELL") || (openPos.side === "SHORT" && tradeType === "BUY"))) {
      const quantityToClose = Math.min(openPos.quantity, qty);
      const isLong = openPos.side === "LONG";
      const entryPrice = parseFloat(openPos.averagePrice);

      // Realized P&L
      const realizedPnl = isLong
        ? +((execPrice - entryPrice) * quantityToClose).toFixed(2)
        : +((entryPrice - execPrice) * quantityToClose).toFixed(2);

      // Proportionate margin to release
      const marginToRelease = +((parseFloat(openPos.marginBlocked) * quantityToClose) / openPos.quantity).toFixed(2);
      const cashRefund = +(marginToRelease + realizedPnl).toFixed(2);
      const newCash = +(currentCash + cashRefund).toFixed(2);

      // Update cash
      await db
        .update(portfolios)
        .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
        .where(eq(portfolios.id, portfolio.id));

      if (quantityToClose === openPos.quantity) {
        // Fully closed position
        await db
          .update(positions)
          .set({
            status: "CLOSED",
            exitPrice: execPrice.toFixed(2),
            realizedPnl: realizedPnl.toFixed(2),
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(positions.id, openPos.id));
      } else {
        // Partially reduced position
        const remainingQty = openPos.quantity - quantityToClose;
        const remainingMargin = +(parseFloat(openPos.marginBlocked) - marginToRelease).toFixed(2);
        await db
          .update(positions)
          .set({
            quantity: remainingQty,
            marginBlocked: remainingMargin.toFixed(2),
            realizedPnl: (+parseFloat(openPos.realizedPnl) + realizedPnl).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(positions.id, openPos.id));
      }

      // Record square-off order
      const [order] = await db
        .insert(orders)
        .values({
          portfolioId: portfolio.id,
          userId,
          stockId: stock.id,
          symbol: stock.symbol,
          type: tradeType,
          orderType: "MIS",
          quantity: quantityToClose,
          price: execPrice.toFixed(2),
          totalAmount: (execPrice * quantityToClose).toFixed(2),
          status: "FILLED",
        })
        .returning();

      return res.status(201).json({
        success: true,
        data: {
          message: `Squared off ${quantityToClose} MIS ${openPos.side} shares of ${stock.symbol} @ ₹${execPrice.toFixed(2)} · Realized P&L: ₹${realizedPnl.toFixed(2)}`,
          order,
          realizedPnl: realizedPnl.toFixed(2),
          newCashBalance: newCash.toFixed(2),
        },
      });
    }

    // Opening a new MIS position or adding to the same side (Long or Short Selling!)
    if (currentCash < marginRequired) {
      throw new AppError(
        400,
        "INSUFFICIENT_FUNDS",
        `Insufficient margin for MIS 5x order. Required margin: ₹${marginRequired.toLocaleString("en-IN")} (20% of ₹${totalCost.toLocaleString("en-IN")}), available cash: ₹${currentCash.toLocaleString("en-IN")}`
      );
    }

    // Deduct margin from cash
    const newCash = +(currentCash - marginRequired).toFixed(2);
    await db
      .update(portfolios)
      .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
      .where(eq(portfolios.id, portfolio.id));

    const positionSide = tradeType === "BUY" ? "LONG" : "SHORT";

    if (openPos && openPos.side === positionSide) {
      // Adding to existing open position on the same side
      const prevQty = openPos.quantity;
      const prevAvg = parseFloat(openPos.averagePrice);
      const prevMargin = parseFloat(openPos.marginBlocked);
      const newQty = prevQty + qty;
      const newAvg = +((prevQty * prevAvg + qty * execPrice) / newQty).toFixed(2);
      const newMargin = +(prevMargin + marginRequired).toFixed(2);

      await db
        .update(positions)
        .set({
          quantity: newQty,
          averagePrice: newAvg.toFixed(2),
          marginBlocked: newMargin.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, openPos.id));
    } else {
      // Create new open position
      await db.insert(positions).values({
        portfolioId: portfolio.id,
        userId,
        stockId: stock.id,
        symbol: stock.symbol,
        product: "MIS",
        side: positionSide,
        quantity: qty,
        averagePrice: execPrice.toFixed(2),
        marginBlocked: marginRequired.toFixed(2),
        status: "OPEN",
      });
    }

    // Record order in execution history
    const [order] = await db
      .insert(orders)
      .values({
        portfolioId: portfolio.id,
        userId,
        stockId: stock.id,
        symbol: stock.symbol,
        type: tradeType,
        orderType: "MIS",
        quantity: qty,
        price: execPrice.toFixed(2),
        totalAmount: totalCost.toFixed(2),
        status: "FILLED",
      })
      .returning();

    const actionText = positionSide === "LONG" ? "Bought Long" : "Short Sold";
    return res.status(201).json({
      success: true,
      data: {
        message: `Successfully executed MIS 5x (${actionText}) ${qty} shares of ${stock.symbol} @ ₹${execPrice.toFixed(2)}. Margin blocked: ₹${marginRequired.toLocaleString("en-IN")}`,
        order,
        marginBlocked: marginRequired.toFixed(2),
        newCashBalance: newCash.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/portfolio/square-off/:positionId — Instant 1-click square off of an open MIS position
portfolioRouter.post("/square-off/:positionId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const positionId = req.params["positionId"] as string;

    const [pos] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId), eq(positions.status, "OPEN")))
      .limit(1);

    if (!pos) {
      throw new AppError(404, "NOT_FOUND", "Open MIS position not found or already squared off");
    }

    const portfolio = await getOrCreatePortfolio(userId);
    const currentCash = parseFloat(portfolio.cashBalance);

    let quote = getLiveQuote(pos.symbol);
    if (!quote) {
      const provider = getMarketDataProvider();
      quote = await provider.getQuote(pos.symbol);
    }

    const execPrice = parseFloat(quote.currentPrice);
    const avgPrice = parseFloat(pos.averagePrice);
    const marginBlocked = parseFloat(pos.marginBlocked);
    const isLong = pos.side === "LONG";

    // Calculate Realized P&L
    const realizedPnl = isLong
      ? +((execPrice - avgPrice) * pos.quantity).toFixed(2)
      : +((avgPrice - execPrice) * pos.quantity).toFixed(2);

    // Release margin and add realized P&L
    const cashRefund = +(marginBlocked + realizedPnl).toFixed(2);
    const newCash = +(currentCash + cashRefund).toFixed(2);

    await db
      .update(portfolios)
      .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
      .where(eq(portfolios.id, portfolio.id));

    // Mark position CLOSED
    await db
      .update(positions)
      .set({
        status: "CLOSED",
        exitPrice: execPrice.toFixed(2),
        realizedPnl: realizedPnl.toFixed(2),
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(positions.id, pos.id));

    // Record order in execution history
    const closeTradeType = isLong ? "SELL" : "BUY";
    await db.insert(orders).values({
      portfolioId: portfolio.id,
      userId,
      stockId: pos.stockId,
      symbol: pos.symbol,
      type: closeTradeType,
      orderType: "MIS",
      quantity: pos.quantity,
      price: execPrice.toFixed(2),
      totalAmount: (execPrice * pos.quantity).toFixed(2),
      status: "FILLED",
    });

    res.json({
      success: true,
      data: {
        message: `Successfully squared off MIS ${pos.side} position on ${pos.symbol} @ ₹${execPrice.toFixed(2)}. Realized P&L: ₹${realizedPnl.toFixed(2)}`,
        realizedPnl: realizedPnl.toFixed(2),
        newCashBalance: newCash.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/portfolio/square-off-all — 03:15 PM EOD or panic exit: square off all open MIS positions
portfolioRouter.post("/square-off-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);

    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, "OPEN")));

    if (openPositions.length === 0) {
      return res.json({
        success: true,
        data: { message: "No active MIS intraday positions to square off.", squaredOffCount: 0 },
      });
    }

    const provider = getMarketDataProvider();
    let totalRealizedPnl = 0;
    let totalCashRefund = 0;

    for (const pos of openPositions) {
      let quote = getLiveQuote(pos.symbol);
      if (!quote) {
        try {
          quote = await provider.getQuote(pos.symbol);
        } catch {
          quote = null;
        }
      }

      const avgPrice = parseFloat(pos.averagePrice);
      const execPrice = quote ? parseFloat(quote.currentPrice) : avgPrice;
      const marginBlocked = parseFloat(pos.marginBlocked);
      const isLong = pos.side === "LONG";

      const realizedPnl = isLong
        ? +((execPrice - avgPrice) * pos.quantity).toFixed(2)
        : +((avgPrice - execPrice) * pos.quantity).toFixed(2);

      const cashRefund = +(marginBlocked + realizedPnl).toFixed(2);
      totalRealizedPnl += realizedPnl;
      totalCashRefund += cashRefund;

      await db
        .update(positions)
        .set({
          status: "CLOSED",
          exitPrice: execPrice.toFixed(2),
          realizedPnl: realizedPnl.toFixed(2),
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, pos.id));

      const closeTradeType = isLong ? "SELL" : "BUY";
      await db.insert(orders).values({
        portfolioId: portfolio.id,
        userId,
        stockId: pos.stockId,
        symbol: pos.symbol,
        type: closeTradeType,
        orderType: "MIS",
        quantity: pos.quantity,
        price: execPrice.toFixed(2),
        totalAmount: (execPrice * pos.quantity).toFixed(2),
        status: "FILLED",
      });
    }

    const currentCash = parseFloat(portfolio.cashBalance);
    const newCash = +(currentCash + totalCashRefund).toFixed(2);

    await db
      .update(portfolios)
      .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
      .where(eq(portfolios.id, portfolio.id));

    res.json({
      success: true,
      data: {
        message: `Squared off ${openPositions.length} MIS positions. Total Realized P&L: ₹${totalRealizedPnl.toFixed(2)}`,
        squaredOffCount: openPositions.length,
        totalRealizedPnl: totalRealizedPnl.toFixed(2),
        newCashBalance: newCash.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/portfolio/orders — Get user's order execution history
portfolioRouter.get("/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const history = await db
      .select({
        id: orders.id,
        symbol: orders.symbol,
        type: orders.type,
        orderType: orders.orderType,
        quantity: orders.quantity,
        price: orders.price,
        totalAmount: orders.totalAmount,
        status: orders.status,
        executedAt: orders.executedAt,
        name: stocks.name,
      })
      .from(orders)
      .innerJoin(stocks, eq(orders.stockId, stocks.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/portfolio/reset — Reset virtual balance back to ₹10,00,000
portfolioRouter.post("/reset", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const portfolio = await getOrCreatePortfolio(userId);

    // Delete all CNC holdings & open MIS positions
    await db.delete(holdings).where(eq(holdings.portfolioId, portfolio.id));
    await db.delete(positions).where(eq(positions.portfolioId, portfolio.id));

    // Reset cash to ₹10,00,000
    await db
      .update(portfolios)
      .set({
        cashBalance: "1000000.00",
        updatedAt: new Date(),
      })
      .where(eq(portfolios.id, portfolio.id));

    res.json({
      success: true,
      data: { message: "Portfolio reset successfully to ₹10,00,000 virtual cash (holdings & positions cleared)" },
    });
  } catch (err) {
    next(err);
  }
});
