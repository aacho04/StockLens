import { db } from "../../db/client.js";
import { positions, portfolios, orders, trades, stocks } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { ChargesService } from "./charges.service.js";
import { getLiveQuote } from "../../market-data/websocket.server.js";
import { getMarketDataProvider } from "../../market-data/index.js";
import { AppError } from "../../middleware/error.middleware.js";

export interface MarketHoursConfig {
  openTime: string; // "09:15"
  closeTime: string; // "15:30"
  autoSquareOffTime: string; // "15:15"
  timeZone: string; // "Asia/Kolkata"
}

export class SquareOffService {
  // Configurable market session hours
  public static config: MarketHoursConfig = {
    openTime: process.env["MARKET_OPEN_TIME"] || "09:15",
    closeTime: process.env["MARKET_CLOSE_TIME"] || "15:30",
    autoSquareOffTime: process.env["AUTO_SQUAREOFF_TIME"] || "15:15",
    timeZone: "Asia/Kolkata",
  };

  /**
   * Check if current time in IST is within active market hours
   */
  public static isMarketOpen(): boolean {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-GB", { timeZone: this.config.timeZone });
    const currentHM = istTimeStr.slice(0, 5); // "HH:MM"
    const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: this.config.timeZone }).format(now);

    // Weekends closed
    if (day === "Sat" || day === "Sun") return false;

    return currentHM >= this.config.openTime && currentHM <= this.config.closeTime;
  }

  /**
   * Check if time has passed the configured 15:15 auto square-off threshold
   */
  public static isAutoSquareOffDue(): boolean {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-GB", { timeZone: this.config.timeZone });
    const currentHM = istTimeStr.slice(0, 5);
    return currentHM >= this.config.autoSquareOffTime;
  }

  /**
   * Helper to get live price for a symbol
   */
  private static async getLivePrice(symbol: string): Promise<number> {
    const cached = getLiveQuote(symbol);
    if (cached && parseFloat(cached.currentPrice) > 0) {
      return parseFloat(cached.currentPrice);
    }
    const provider = getMarketDataProvider();
    const q = await provider.getQuote(symbol);
    return parseFloat(q.currentPrice);
  }

  /**
   * Square off a single open MIS position
   */
  public static async squareOffPosition(positionId: string, userId: string) {
    const [pos] = await db
      .select()
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId), eq(positions.status, "OPEN")))
      .limit(1);

    if (!pos) {
      throw new AppError(404, "POSITION_NOT_FOUND", "Open intraday position not found or already squared off");
    }

    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.id, pos.portfolioId))
      .limit(1);

    if (!portfolio) {
      throw new AppError(404, "PORTFOLIO_NOT_FOUND", "Portfolio not found");
    }

    const currentLtp = await this.getLivePrice(pos.symbol);
    const entryPrice = parseFloat(pos.averagePrice);
    const marginBlocked = parseFloat(pos.marginBlocked);
    const isLong = pos.side === "LONG";
    const qty = pos.quantity;

    // Opposite action to square off
    const closeSide = isLong ? "SELL" : "BUY";

    // Gross P&L
    const grossPnl = isLong
      ? +((currentLtp - entryPrice) * qty).toFixed(2)
      : +((entryPrice - currentLtp) * qty).toFixed(2);

    // Calculate simulated charges for the closing leg
    const chargesBreakdown = ChargesService.calculateCharges({
      side: closeSide,
      productType: "MIS",
      quantity: qty,
      price: currentLtp,
    });

    const netPnl = +(grossPnl - chargesBreakdown.totalCharges).toFixed(2);

    // Release margin and credit/debit net P&L
    const cashRefund = +(marginBlocked + netPnl).toFixed(2);
    const newCash = +(parseFloat(portfolio.cashBalance) + cashRefund).toFixed(2);

    await db
      .update(portfolios)
      .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
      .where(eq(portfolios.id, portfolio.id));

    // Mark position CLOSED
    await db
      .update(positions)
      .set({
        status: "CLOSED",
        exitPrice: currentLtp.toFixed(2),
        realizedPnl: netPnl.toFixed(2),
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(positions.id, pos.id));

    // Record square off order in orders table
    const [closeOrder] = await db
      .insert(orders)
      .values({
        portfolioId: portfolio.id,
        userId,
        stockId: pos.stockId,
        symbol: pos.symbol,
        exchange: "NSE",
        side: closeSide,
        type: closeSide,
        productType: "MIS",
        orderType: "MARKET",
        quantity: qty,
        price: currentLtp.toFixed(2),
        averagePrice: currentLtp.toFixed(2),
        totalAmount: (currentLtp * qty).toFixed(2),
        charges: chargesBreakdown.totalCharges.toFixed(2),
        realizedPnl: netPnl.toFixed(2),
        status: "EXECUTED",
        executedAt: new Date(),
      })
      .returning();

    // Record trade in trade book
    const [createdTrade] = await db
      .insert(trades)
      .values({
        portfolioId: portfolio.id,
        userId,
        stockId: pos.stockId,
        orderId: closeOrder!.id,
        symbol: pos.symbol,
        exchange: "NSE",
        side: closeSide,
        productType: "MIS",
        quantity: qty,
        entryPrice: entryPrice.toFixed(2),
        exitPrice: currentLtp.toFixed(2),
        grossPnl: grossPnl.toFixed(2),
        charges: chargesBreakdown.totalCharges.toFixed(2),
        netPnl: netPnl.toFixed(2),
        executedAt: new Date(),
      })
      .returning();

    return {
      position: pos,
      exitPrice: currentLtp,
      grossPnl,
      charges: chargesBreakdown,
      netPnl,
      newCashBalance: newCash,
      trade: createdTrade!,
    };
  }

  /**
   * Square off all open positions for a user
   */
  public static async squareOffAllUserPositions(userId: string) {
    const openPositions = await db
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.userId, userId), eq(positions.status, "OPEN")));

    const results = [];
    for (const p of openPositions) {
      try {
        const res = await this.squareOffPosition(p.id, userId);
        results.push(res);
      } catch (err) {
        console.warn(`[SquareOff] Failed to close position ${p.id}:`, (err as Error).message);
      }
    }
    return results;
  }

  /**
   * System-wide auto square off run at 03:15 PM IST
   */
  public static async runSystemAutoSquareOff() {
    const openPositions = await db
      .select({ id: positions.id, userId: positions.userId, symbol: positions.symbol })
      .from(positions)
      .where(eq(positions.status, "OPEN"));

    console.log(`[AutoSquareOff] Running square off for ${openPositions.length} open intraday positions...`);
    let closedCount = 0;
    let totalPnl = 0;

    for (const p of openPositions) {
      try {
        const res = await this.squareOffPosition(p.id, p.userId);
        closedCount++;
        totalPnl += res.netPnl;
      } catch (err) {
        console.warn(`[AutoSquareOff] Failed to auto square off position ${p.id}:`, (err as Error).message);
      }
    }

    return { closedCount, totalPnl: +totalPnl.toFixed(2) };
  }
}
