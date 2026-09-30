import { db } from "../../db/client.js";
import { orders, positions, holdings, portfolios, trades, stocks } from "../../db/schema/index.js";
import { eq, and, inArray, desc } from "drizzle-orm";
import { ChargesService } from "./charges.service.js";
import { getLiveQuote } from "../../market-data/websocket.server.js";
import { getMarketDataProvider } from "../../market-data/index.js";
import { AppError } from "../../middleware/error.middleware.js";

export interface PlaceOrderInput {
  userId: string;
  portfolioId: string;
  stockId: string;
  symbol: string;
  instrumentKey?: string | undefined;
  exchange?: string | undefined;
  side: "BUY" | "SELL";
  productType: "MIS" | "CNC";
  orderType: "MARKET" | "LIMIT" | "SL" | "SL-M";
  quantity: number;
  limitPrice?: number | undefined;
  triggerPrice?: number | undefined;
}

export class OrderEngineService {
  /**
   * Helper to fetch live price for a symbol
   */
  public static async getLivePrice(symbol: string): Promise<number> {
    const cached = getLiveQuote(symbol);
    if (cached && parseFloat(cached.currentPrice) > 0) {
      return parseFloat(cached.currentPrice);
    }
    const provider = getMarketDataProvider();
    const q = await provider.getQuote(symbol);
    return parseFloat(q.currentPrice);
  }

  /**
   * Place an order into the paper trading engine
   */
  public static async placeOrder(input: PlaceOrderInput) {
    const {
      userId,
      portfolioId,
      stockId,
      symbol,
      instrumentKey,
      exchange = "NSE",
      side,
      productType,
      orderType,
      quantity,
      limitPrice,
      triggerPrice,
    } = input;

    // 1. Validation
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw new AppError(400, "INVALID_QUANTITY", "Quantity must be a positive integer");
    }

    if ((orderType === "LIMIT" || orderType === "SL") && (!limitPrice || limitPrice <= 0)) {
      throw new AppError(400, "INVALID_PRICE", "Limit price is required for LIMIT and SL orders");
    }

    if ((orderType === "SL" || orderType === "SL-M") && (!triggerPrice || triggerPrice <= 0)) {
      throw new AppError(400, "INVALID_TRIGGER_PRICE", "Trigger price is required for Stop Loss orders");
    }

    const currentLtp = await this.getLivePrice(symbol);
    const refPrice = orderType === "LIMIT" ? limitPrice! : currentLtp;
    const grossValue = +(refPrice * quantity).toFixed(2);

    // Calculate simulated charges
    const chargesBreakdown = ChargesService.calculateCharges({
      side,
      productType,
      quantity,
      price: refPrice,
    });

    // Required cash/margin
    const requiredMargin = productType === "MIS"
      ? +(grossValue / 5).toFixed(2) // 5x leverage: 20% margin
      : grossValue; // CNC Delivery: 100% cash

    const totalCashNeeded = +(requiredMargin + chargesBreakdown.totalCharges).toFixed(2);

    // Resolve portfolio cash balance
    let portfolio: any;
    if (portfolioId) {
      const [found] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.id, portfolioId))
        .limit(1);
      portfolio = found;
    }
    if (!portfolio) {
      const [found] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.userId, userId))
        .limit(1);
      portfolio = found;
    }
    if (!portfolio) {
      const [created] = await db
        .insert(portfolios)
        .values({
          userId,
          cashBalance: "1000000.00",
        })
        .returning();
      portfolio = created!;
    }

    const effectivePortfolioId = portfolio.id;
    const currentCash = parseFloat(portfolio.cashBalance);

    // Resolve stockId
    let resolvedStockId = stockId;
    if (!resolvedStockId) {
      const upperSymbol = symbol.toUpperCase();
      const [s] = await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, upperSymbol))
        .limit(1);
      if (s) {
        resolvedStockId = s.id;
      } else {
        const [newStock] = await db
          .insert(stocks)
          .values({
            symbol: upperSymbol,
            name: upperSymbol,
            exchange: (exchange === "BSE" ? "BSE" : "NSE") as "NSE" | "BSE",
            sector: "Index/Equity",
            industry: "Trading",
            isActive: true,
          })
          .returning();
        resolvedStockId = newStock!.id;
      }
    }

    // If CNC Sell, verify user owns enough shares in Demat
    if (productType === "CNC" && side === "SELL") {
      const [existingHolding] = await db
        .select()
        .from(holdings)
        .where(and(eq(holdings.portfolioId, effectivePortfolioId), eq(holdings.stockId, resolvedStockId)))
        .limit(1);

      if (!existingHolding || existingHolding.quantity < quantity) {
        throw new AppError(
          400,
          "INSUFFICIENT_HOLDINGS",
          `Insufficient delivery shares to sell. Available: ${existingHolding?.quantity ?? 0}, Requested: ${quantity}`
        );
      }
    } else {
      // Check cash balance for Buy or MIS orders
      if (currentCash < totalCashNeeded) {
        throw new AppError(
          400,
          "INSUFFICIENT_FUNDS",
          `Insufficient virtual funds. Required: ₹${totalCashNeeded.toLocaleString("en-IN")}, Available: ₹${currentCash.toLocaleString("en-IN")}`
        );
      }
    }

    // Determine initial status:
    // If MARKET order -> execute immediately!
    // If LIMIT or SL or SL-M -> create with status "OPEN" and evaluate conditions.
    const initialStatus = orderType === "MARKET" ? "EXECUTED" : "OPEN";

    // Insert order in DB
    const [createdOrder] = await db
      .insert(orders)
      .values({
        portfolioId: effectivePortfolioId,
        userId,
        stockId: resolvedStockId,
        symbol: symbol.toUpperCase(),
        instrumentKey,
        exchange,
        side,
        type: side,
        productType,
        orderType,
        quantity,
        price: refPrice.toFixed(2),
        limitPrice: limitPrice ? limitPrice.toFixed(2) : null,
        triggerPrice: triggerPrice ? triggerPrice.toFixed(2) : null,
        averagePrice: orderType === "MARKET" ? currentLtp.toFixed(2) : null,
        totalAmount: grossValue.toFixed(2),
        charges: chargesBreakdown.totalCharges.toFixed(2),
        status: initialStatus,
        executedAt: orderType === "MARKET" ? new Date() : null,
      })
      .returning();

    // If MARKET order, execute state transition
    if (orderType === "MARKET") {
      await this.executeOrderInternal(createdOrder!, currentLtp, portfolio, chargesBreakdown.totalCharges);
    } else {
      // For LIMIT or SL orders, block the required margin from cash
      const newCash = +(currentCash - totalCashNeeded).toFixed(2);
      await db
        .update(portfolios)
        .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
        .where(eq(portfolios.id, effectivePortfolioId));

      // Attempt immediate evaluation in case current LTP already satisfies limit/trigger condition!
      await this.evaluateOrder(createdOrder!.id);
    }

    // Return the latest order status
    const [finalOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, createdOrder!.id))
      .limit(1);

    return {
      order: finalOrder!,
      charges: chargesBreakdown,
      requiredMargin,
    };
  }

  /**
   * Cancel an OPEN or TRIGGERED order and release blocked margin back to cash
   */
  public static async cancelOrder(orderId: string, userId: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    if (order.status !== "OPEN" && order.status !== "TRIGGERED") {
      throw new AppError(400, "CANNOT_CANCEL", `Order is in status ${order.status} and cannot be cancelled`);
    }

    // Release blocked funds
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.id, order.portfolioId))
      .limit(1);

    if (portfolio && (order.productType !== "CNC" || order.side !== "SELL")) {
      const orderPrice = order.limitPrice ? parseFloat(order.limitPrice) : parseFloat(order.price);
      const gross = orderPrice * order.quantity;
      const margin = order.productType === "MIS" ? gross / 5 : gross;
      const charges = parseFloat(order.charges);
      const refund = +(margin + charges).toFixed(2);

      const newCash = +(parseFloat(portfolio.cashBalance) + refund).toFixed(2);
      await db
        .update(portfolios)
        .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
        .where(eq(portfolios.id, portfolio.id));
    }

    // Update order status to CANCELLED
    const [cancelled] = await db
      .update(orders)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    return cancelled!;
  }

  /**
   * Evaluate a single pending order against current market price
   */
  public static async evaluateOrder(orderId: string): Promise<boolean> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || (order.status !== "OPEN" && order.status !== "TRIGGERED")) {
      return false;
    }

    const currentLtp = await this.getLivePrice(order.symbol);
    const side = order.side as "BUY" | "SELL";
    const orderType = order.orderType as "MARKET" | "LIMIT" | "SL" | "SL-M";
    const limitPrice = order.limitPrice ? parseFloat(order.limitPrice) : 0;
    const triggerPrice = order.triggerPrice ? parseFloat(order.triggerPrice) : 0;

    let shouldTrigger = false;
    let shouldExecute = false;
    let execPrice = currentLtp;

    // 1. LIMIT ORDER
    if (orderType === "LIMIT") {
      if (side === "BUY" && currentLtp <= limitPrice) {
        shouldExecute = true;
        execPrice = limitPrice; // executed at limit or better
      } else if (side === "SELL" && currentLtp >= limitPrice) {
        shouldExecute = true;
        execPrice = limitPrice;
      }
    }

    // 2. STOP LOSS (SL)
    else if (orderType === "SL") {
      if (order.status === "OPEN") {
        const triggerCondition = side === "BUY" ? currentLtp >= triggerPrice : currentLtp <= triggerPrice;
        if (triggerCondition) {
          shouldTrigger = true;
          // After trigger, check limit condition
          const limitCondition = side === "BUY" ? currentLtp <= limitPrice : currentLtp >= limitPrice;
          if (limitCondition) {
            shouldExecute = true;
            execPrice = limitPrice;
          }
        }
      } else if (order.status === "TRIGGERED") {
        const limitCondition = side === "BUY" ? currentLtp <= limitPrice : currentLtp >= limitPrice;
        if (limitCondition) {
          shouldExecute = true;
          execPrice = limitPrice;
        }
      }
    }

    // 3. STOP LOSS MARKET (SL-M)
    else if (orderType === "SL-M") {
      const triggerCondition = side === "BUY" ? currentLtp >= triggerPrice : currentLtp <= triggerPrice;
      if (triggerCondition) {
        shouldExecute = true;
        execPrice = currentLtp;
      }
    }

    if (shouldExecute) {
      const [portfolio] = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.id, order.portfolioId))
        .limit(1);

      if (portfolio) {
        await this.executeOrderInternal(order, execPrice, portfolio, parseFloat(order.charges));
      }
      return true;
    } else if (shouldTrigger && order.status !== "TRIGGERED") {
      await db
        .update(orders)
        .set({ status: "TRIGGERED", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      return true;
    }

    return false;
  }

  /**
   * Internal execution handler that transitions order to EXECUTED,
   * updates holdings/positions, records trades, and balances.
   */
  private static async executeOrderInternal(
    order: typeof orders.$inferSelect,
    execPrice: number,
    portfolio: typeof portfolios.$inferSelect,
    charges: number
  ) {
    const isBuy = order.side === "BUY";
    const isMis = order.productType === "MIS";
    const qty = order.quantity;
    const grossValue = +(execPrice * qty).toFixed(2);
    let currentCash = parseFloat(portfolio.cashBalance);

    // =========================================================================
    // CASE A: DELIVERY (CNC)
    // =========================================================================
    if (!isMis) {
      if (isBuy) {
        // If it was a MARKET order, cash wasn't deducted upfront yet:
        if (order.orderType === "MARKET") {
          currentCash = +(currentCash - grossValue - charges).toFixed(2);
          await db
            .update(portfolios)
            .set({ cashBalance: currentCash.toFixed(2), updatedAt: new Date() })
            .where(eq(portfolios.id, portfolio.id));
        }

        // Upsert holding
        const [existing] = await db
          .select()
          .from(holdings)
          .where(and(eq(holdings.portfolioId, portfolio.id), eq(holdings.stockId, order.stockId)))
          .limit(1);

        if (existing) {
          const newQty = existing.quantity + qty;
          const prevAvg = parseFloat(existing.averageBuyPrice);
          const newAvg = +((existing.quantity * prevAvg + qty * execPrice) / newQty).toFixed(2);
          await db
            .update(holdings)
            .set({ quantity: newQty, averageBuyPrice: newAvg.toFixed(2), updatedAt: new Date() })
            .where(eq(holdings.id, existing.id));
        } else {
          await db.insert(holdings).values({
            portfolioId: portfolio.id,
            userId: order.userId,
            stockId: order.stockId,
            symbol: order.symbol,
            quantity: qty,
            averageBuyPrice: execPrice.toFixed(2),
          });
        }

        // Record trade
        await db.insert(trades).values({
          portfolioId: portfolio.id,
          userId: order.userId,
          stockId: order.stockId,
          orderId: order.id,
          symbol: order.symbol,
          exchange: order.exchange,
          side: "BUY",
          productType: "CNC",
          quantity: qty,
          entryPrice: execPrice.toFixed(2),
          exitPrice: execPrice.toFixed(2),
          grossPnl: "0.00",
          charges: charges.toFixed(2),
          netPnl: (-charges).toFixed(2),
        });
      } else {
        // CNC SELL
        const [existing] = await db
          .select()
          .from(holdings)
          .where(and(eq(holdings.portfolioId, portfolio.id), eq(holdings.stockId, order.stockId)))
          .limit(1);

        const buyAvg = existing ? parseFloat(existing.averageBuyPrice) : execPrice;
        const grossPnl = +((execPrice - buyAvg) * qty).toFixed(2);
        const netPnl = +(grossPnl - charges).toFixed(2);

        // Credit proceeds (gross - charges)
        const newCash = +(currentCash + grossValue - charges).toFixed(2);
        await db
          .update(portfolios)
          .set({ cashBalance: newCash.toFixed(2), updatedAt: new Date() })
          .where(eq(portfolios.id, portfolio.id));

        if (existing) {
          const rem = existing.quantity - qty;
          if (rem <= 0) {
            await db.delete(holdings).where(eq(holdings.id, existing.id));
          } else {
            await db
              .update(holdings)
              .set({ quantity: rem, updatedAt: new Date() })
              .where(eq(holdings.id, existing.id));
          }
        }

        // Record trade
        await db.insert(trades).values({
          portfolioId: portfolio.id,
          userId: order.userId,
          stockId: order.stockId,
          orderId: order.id,
          symbol: order.symbol,
          exchange: order.exchange,
          side: "SELL",
          productType: "CNC",
          quantity: qty,
          entryPrice: buyAvg.toFixed(2),
          exitPrice: execPrice.toFixed(2),
          grossPnl: grossPnl.toFixed(2),
          charges: charges.toFixed(2),
          netPnl: netPnl.toFixed(2),
        });
      }
    }

    // =========================================================================
    // CASE B: INTRADAY (MIS) - 5x Leverage
    // =========================================================================
    else {
      const marginNeeded = +(grossValue / 5).toFixed(2);

      // Check if user has an OPEN opposite position (Square off!)
      const [oppositePos] = await db
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.portfolioId, portfolio.id),
            eq(positions.stockId, order.stockId),
            eq(positions.status, "OPEN")
          )
        )
        .limit(1);

      const isOpposite = oppositePos && ((oppositePos.side === "LONG" && !isBuy) || (oppositePos.side === "SHORT" && isBuy));

      if (isOpposite) {
        // Squaring off existing position
        const closeQty = Math.min(oppositePos.quantity, qty);
        const isPosLong = oppositePos.side === "LONG";
        const entryPrice = parseFloat(oppositePos.averagePrice);

        const grossPnl = isPosLong
          ? +((execPrice - entryPrice) * closeQty).toFixed(2)
          : +((entryPrice - execPrice) * closeQty).toFixed(2);

        const netPnl = +(grossPnl - charges).toFixed(2);

        // Proportionate margin released
        const marginRefund = +((parseFloat(oppositePos.marginBlocked) * closeQty) / oppositePos.quantity).toFixed(2);
        const totalRefund = +(marginRefund + netPnl).toFixed(2);

        // Update cash
        currentCash = +(currentCash + totalRefund).toFixed(2);
        await db
          .update(portfolios)
          .set({ cashBalance: currentCash.toFixed(2), updatedAt: new Date() })
          .where(eq(portfolios.id, portfolio.id));

        // Update or close position
        if (closeQty === oppositePos.quantity) {
          await db
            .update(positions)
            .set({
              status: "CLOSED",
              exitPrice: execPrice.toFixed(2),
              realizedPnl: netPnl.toFixed(2),
              closedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(positions.id, oppositePos.id));
        } else {
          const remQty = oppositePos.quantity - closeQty;
          const remMargin = +(parseFloat(oppositePos.marginBlocked) - marginRefund).toFixed(2);
          await db
            .update(positions)
            .set({
              quantity: remQty,
              marginBlocked: remMargin.toFixed(2),
              realizedPnl: (+parseFloat(oppositePos.realizedPnl) + netPnl).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(positions.id, oppositePos.id));
        }

        // Record completed trade
        await db.insert(trades).values({
          portfolioId: portfolio.id,
          userId: order.userId,
          stockId: order.stockId,
          orderId: order.id,
          symbol: order.symbol,
          exchange: order.exchange,
          side: order.side,
          productType: "MIS",
          quantity: closeQty,
          entryPrice: entryPrice.toFixed(2),
          exitPrice: execPrice.toFixed(2),
          grossPnl: grossPnl.toFixed(2),
          charges: charges.toFixed(2),
          netPnl: netPnl.toFixed(2),
        });
      } else {
        // Opening a new position or adding to the same side
        if (order.orderType === "MARKET") {
          currentCash = +(currentCash - marginNeeded - charges).toFixed(2);
          await db
            .update(portfolios)
            .set({ cashBalance: currentCash.toFixed(2), updatedAt: new Date() })
            .where(eq(portfolios.id, portfolio.id));
        }

        const newSide = isBuy ? "LONG" : "SHORT";

        if (oppositePos && oppositePos.side === newSide) {
          // Average up/down
          const newQty = oppositePos.quantity + qty;
          const prevAvg = parseFloat(oppositePos.averagePrice);
          const newAvg = +((oppositePos.quantity * prevAvg + qty * execPrice) / newQty).toFixed(2);
          const newMargin = +(parseFloat(oppositePos.marginBlocked) + marginNeeded).toFixed(2);

          await db
            .update(positions)
            .set({
              quantity: newQty,
              averagePrice: newAvg.toFixed(2),
              marginBlocked: newMargin.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(positions.id, oppositePos.id));
        } else {
          // Insert new open position
          await db.insert(positions).values({
            portfolioId: portfolio.id,
            userId: order.userId,
            stockId: order.stockId,
            symbol: order.symbol,
            product: "MIS",
            side: newSide,
            quantity: qty,
            averagePrice: execPrice.toFixed(2),
            marginBlocked: marginNeeded.toFixed(2),
            status: "OPEN",
          });
        }

        // Record initial trade entry
        await db.insert(trades).values({
          portfolioId: portfolio.id,
          userId: order.userId,
          stockId: order.stockId,
          orderId: order.id,
          symbol: order.symbol,
          exchange: order.exchange,
          side: order.side,
          productType: "MIS",
          quantity: qty,
          entryPrice: execPrice.toFixed(2),
          exitPrice: execPrice.toFixed(2),
          grossPnl: "0.00",
          charges: charges.toFixed(2),
          netPnl: (-charges).toFixed(2),
        });
      }
    }

    // Finalize order record
    await db
      .update(orders)
      .set({
        status: "EXECUTED",
        averagePrice: execPrice.toFixed(2),
        totalAmount: grossValue.toFixed(2),
        executedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  }

  /**
   * Periodic evaluator for all pending OPEN & TRIGGERED orders across all users
   */
  public static async evaluateAllPendingOrders() {
    const pending = await db
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.status, ["OPEN", "TRIGGERED"]))
      .limit(50);

    for (const ord of pending) {
      try {
        await this.evaluateOrder(ord.id);
      } catch (err) {
        console.warn(`[OrderEngine] Evaluation failed for order ${ord.id}:`, (err as Error).message);
      }
    }
  }
}
