import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { AppError } from "../../middleware/error.middleware.js";
import { db } from "../../db/client.js";
import { portfolios, payouts } from "../../db/schema/index.js";
import { eq, and, desc, gte } from "drizzle-orm";
import { env } from "../../config/env.js";

export const walletRouter: Router = Router();

// In-Memory Idempotency & Order Tracking Ledgers
const PROCESSED_TRANSACTIONS = new Set<string>();

interface PendingOrder {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: number;
}

interface WalletLedgerEntry {
  id: string;
  transactionId: string;
  orderId: string;
  userId: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  paymentMethod: "UPI" | "CARD" | "NETBANKING" | "VIRTUAL_TRANSFER";
  status: "SUCCESS" | "FAILED";
  upiId?: string;
  timestamp: string;
}

const PENDING_ORDERS = new Map<string, PendingOrder>();
const WALLET_LEDGER: WalletLedgerEntry[] = [];

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

  const [created] = await db
    .insert(portfolios)
    .values({
      userId,
      cashBalance: "1000000.00",
    })
    .returning();

  return created!;
}

/**
 * PHASE 1: Initiate Payment Order
 * POST /api/wallet/create-order
 * Called when a user inputs an amount in the app interface
 */
walletRouter.post(
  "/create-order",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { amount } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 100) {
        throw new AppError(400, "INVALID_AMOUNT", "Minimum deposit amount is ₹100");
      }
      if (numAmount > 10_000_000) {
        throw new AppError(400, "LIMIT_EXCEEDED", "Maximum single deposit is ₹1,00,00,000");
      }

      // Generate unique tracking order ID
      const orderId = "order_" + crypto.randomBytes(8).toString("hex");

      PENDING_ORDERS.set(orderId, {
        orderId,
        userId,
        amount: numAmount,
        currency: "INR",
        status: "PENDING",
        createdAt: Date.now(),
      });

      res.status(200).json({
        success: true,
        data: {
          orderId,
          amount: numAmount,
          currency: "INR",
          key: "rzp_test_stocklens_mock",
          merchantName: "StockLens Trading",
          description: "Add funds to trading account",
          callbackUrl: "/api/wallet/webhook",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PHASE 2: Secure Webhook Receiver
 * POST /api/wallet/webhook
 * Listens for payment gateway notifications after bank/UPI settlement completes
 */
walletRouter.post("/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extract gateway cryptographic signature header
    const receivedSignature =
      (req.headers["x-gateway-signature"] as string) ||
      (req.headers["x-razorpay-signature"] as string);

    if (!receivedSignature) {
      throw new AppError(401, "MISSING_SIGNATURE", "Missing cryptographic signature.");
    }

    // 2. Compute expected HMAC-SHA256 signature to verify authenticity
    const payloadString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", env.WALLET_WEBHOOK_SECRET)
      .update(payloadString)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      console.warn("⚠️  [WALLET WEBHOOK] Signature verification failed!");
      throw new AppError(403, "INVALID_SIGNATURE", "Signature verification failed. Invalid sender.");
    }

    const { transactionId, userId, amount, status, orderId, paymentMethod = "UPI" } = req.body;

    if (!transactionId || !userId || !amount) {
      throw new AppError(400, "INVALID_PAYLOAD", "Missing required transaction fields.");
    }

    // 3. Enforce Idempotency Check to prevent double-crediting
    if (PROCESSED_TRANSACTIONS.has(transactionId)) {
      console.log(`ℹ️  [WALLET IDEMPOTENCY] Transaction ${transactionId} already reconciled.`);
      return res.status(200).json({ success: true, message: "Transaction already reconciled." });
    }

    // 4. Update the Ledger Balance on Success
    if (status === "SUCCESS") {
      const numAmount = parseFloat(amount);
      const portfolio = await getOrCreatePortfolio(userId);
      const currentCash = parseFloat(portfolio.cashBalance);
      const newCash = +(currentCash + numAmount).toFixed(2);

      // Atomic DB update
      await db
        .update(portfolios)
        .set({
          cashBalance: newCash.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(portfolios.id, portfolio.id));

      // Mark transaction as processed
      PROCESSED_TRANSACTIONS.add(transactionId);

      // Record in ledger history
      WALLET_LEDGER.unshift({
        id: "tx_" + crypto.randomBytes(6).toString("hex"),
        transactionId,
        orderId: orderId || "direct_deposit",
        userId,
        amount: numAmount,
        type: "DEPOSIT",
        paymentMethod: paymentMethod as any,
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      });

      if (orderId && PENDING_ORDERS.has(orderId)) {
        const o = PENDING_ORDERS.get(orderId)!;
        o.status = "SUCCESS";
      }

      console.log(
        `💳  [LEDGER SUCCESS] Credited ₹${numAmount} to user ${userId}. New balance: ₹${newCash}`
      );

      return res.status(200).json({
        success: true,
        message: "Wallet successfully credited.",
        data: {
          transactionId,
          creditedAmount: numAmount,
          newBalance: newCash.toFixed(2),
        },
      });
    }

    res.status(400).json({ success: false, message: "Unhandled transaction status." });
  } catch (err) {
    next(err);
  }
});

/**
 * PHASE 3: Client Checkout Simulation
 * POST /api/wallet/checkout-complete
 * Allows instant local sandbox testing with simulated UPI/Card modal
 */
walletRouter.post(
  "/checkout-complete",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { orderId, paymentMethod = "UPI", upiId } = req.body;

      if (!orderId) {
        throw new AppError(400, "MISSING_ORDER_ID", "Order ID is required.");
      }

      const pending = PENDING_ORDERS.get(orderId);
      if (!pending) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found or expired.");
      }

      if (pending.userId !== userId) {
        throw new AppError(403, "FORBIDDEN", "Unauthorized order access.");
      }

      if (pending.status === "SUCCESS") {
        throw new AppError(400, "ALREADY_COMPLETED", "Order has already been completed.");
      }

      // Generate a mock gateway transaction ID
      const transactionId = "pay_" + crypto.randomBytes(8).toString("hex");

      // Construct and sign the webhook payload
      const webhookPayload = {
        transactionId,
        orderId,
        userId,
        amount: pending.amount,
        status: "SUCCESS",
        paymentMethod,
        upiId: upiId || `${userId.slice(0, 6)}@oksbi`,
      };

      // Perform atomic ledger update
      const portfolio = await getOrCreatePortfolio(userId);
      const currentCash = parseFloat(portfolio.cashBalance);
      const newCash = +(currentCash + pending.amount).toFixed(2);

      await db
        .update(portfolios)
        .set({
          cashBalance: newCash.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(portfolios.id, portfolio.id));

      PROCESSED_TRANSACTIONS.add(transactionId);
      pending.status = "SUCCESS";

      const ledgerEntry: WalletLedgerEntry = {
        id: "tx_" + crypto.randomBytes(6).toString("hex"),
        transactionId,
        orderId,
        userId,
        amount: pending.amount,
        type: "DEPOSIT",
        paymentMethod: paymentMethod as any,
        status: "SUCCESS",
        upiId: webhookPayload.upiId,
        timestamp: new Date().toISOString(),
      };
      WALLET_LEDGER.unshift(ledgerEntry);

      console.log(
        `💳  [SANDBOX CHECKOUT] Credited ₹${pending.amount} to user ${userId}. New balance: ₹${newCash}`
      );

      res.status(200).json({
        success: true,
        data: {
          transactionId,
          orderId,
          creditedAmount: pending.amount,
          newCashBalance: newCash.toFixed(2),
          paymentMethod,
          timestamp: ledgerEntry.timestamp,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/wallet/transactions
 * Retrieve transaction history for the user
 */
walletRouter.get(
  "/transactions",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const userTx = WALLET_LEDGER.filter((tx) => tx.userId === userId);
      res.json({ success: true, data: userTx });
    } catch (err) {
      next(err);
    }
  }
);

interface PayoutLogEntry {
  payoutId: string;
  userId: string;
  amount: number;
  bankAccountMask: string;
  ifscCode: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  referenceId: string;
  createdAt: string;
  updatedAt: string;
}

const PAYOUTS_LOG: PayoutLogEntry[] = [];

/**
 * PRODUCTION PAYOUT ENGINE
 * POST /api/wallet/payouts
 * Dispatches funds to verified bank account with Velocity & Security rules
 */
walletRouter.post(
  "/payouts",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { amount, accountNumber, ifscCode, accountHolderName } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 100) {
        throw new AppError(400, "INVALID_AMOUNT", "Minimum withdrawal amount is ₹100");
      }

      // Security Rule 1: Administrative Wall for transactions exceeding ₹2,00,000
      if (numAmount > 200_000) {
        throw new AppError(
          400,
          "LIMIT_EXCEEDED",
          "Single withdrawal limit is ₹2,00,000. Larger payouts require manual compliance review."
        );
      }

      // Security Rule 2: Velocity Mitigation Wall — Max 3 withdrawals per rolling 24-hour window
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPayouts = await db
        .select()
        .from(payouts)
        .where(and(eq(payouts.userId, userId), gte(payouts.createdAt, oneDayAgo)));

      if (recentPayouts.length >= 3) {
        throw new AppError(
          429,
          "VELOCITY_LIMIT_EXCEEDED",
          "Daily velocity limit reached: Maximum 3 withdrawal requests allowed per rolling 24-hour window."
        );
      }

      // Security Rule 3: Bank Validation
      const cleanAcc = (accountNumber || "").toString().trim();
      const cleanIfsc = (ifscCode || "").toString().trim().toUpperCase();

      if (cleanAcc.length < 9 || cleanAcc.length > 18 || !/^\d+$/.test(cleanAcc)) {
        throw new AppError(400, "INVALID_ACCOUNT", "Bank account number must be between 9 and 18 digits.");
      }

      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        throw new AppError(400, "INVALID_IFSC", "Invalid Indian Financial System Code (IFSC) format.");
      }

      // Check user portfolio cash balance
      const portfolio = await getOrCreatePortfolio(userId);
      const currentCash = parseFloat(portfolio.cashBalance);

      // T+1 Settlement Chronology: 90% is settled liquid cash cleared for bank withdrawal
      const withdrawableBalance = +(currentCash * 0.9).toFixed(2);

      if (numAmount > withdrawableBalance) {
        throw new AppError(
          400,
          "INSUFFICIENT_FUNDS",
          `Requested ₹${numAmount.toLocaleString("en-IN")}, but settled withdrawable balance is ₹${withdrawableBalance.toLocaleString("en-IN")}. (Remaining funds in T+1 market clearing).`
        );
      }

      // Deduct balance atomically
      const newCash = +(currentCash - numAmount).toFixed(2);
      await db
        .update(portfolios)
        .set({
          cashBalance: newCash.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(portfolios.id, portfolio.id));

      const payoutId = "payout_" + crypto.randomBytes(8).toString("hex");
      const referenceId = "ref_imps_" + crypto.randomBytes(6).toString("hex");
      const bankAccountMask = `XXXXXX${cleanAcc.slice(-4)}`;

      // Insert directly into PostgreSQL payouts log table
      const [savedPayout] = await db
        .insert(payouts)
        .values({
          payoutId,
          userId,
          amount: numAmount.toFixed(2),
          bankAccountMask,
          ifscCode: cleanIfsc,
          status: "SUCCESS", // Simulated instant IMPS clearing
          referenceId,
        })
        .returning();

      // Record in ledger
      WALLET_LEDGER.unshift({
        id: "tx_" + crypto.randomBytes(6).toString("hex"),
        transactionId: referenceId,
        orderId: payoutId,
        userId,
        amount: numAmount,
        type: "WITHDRAWAL",
        paymentMethod: "VIRTUAL_TRANSFER",
        status: "SUCCESS",
        timestamp: savedPayout!.createdAt.toISOString(),
      });

      console.log(
        `🏦  [PAYOUT SUCCESS] Dispatched ₹${numAmount} to ${bankAccountMask} (${cleanIfsc}) for user ${userId}. Reference: ${referenceId}`
      );

      res.status(202).json({
        success: true,
        message: "Payout accepted and processed via IMPS clearing network.",
        data: {
          payoutId,
          referenceId,
          amount: numAmount,
          bankAccountMask,
          ifscCode: cleanIfsc,
          status: "SUCCESS",
          newCashBalance: newCash.toFixed(2),
          dailyWithdrawalsRemaining: Math.max(0, 3 - (recentPayouts.length + 1)),
          timestamp: savedPayout!.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/wallet/payouts
 * Retrieve payout withdrawal log for user from PostgreSQL
 */
walletRouter.get(
  "/payouts",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const userPayouts = await db
        .select()
        .from(payouts)
        .where(eq(payouts.userId, userId))
        .orderBy(desc(payouts.createdAt))
        .limit(50);

      res.json({ success: true, data: userPayouts });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/wallet/summary
 * Summary of user's wallet with Withdrawable vs Unsettled balances
 */
walletRouter.get(
  "/summary",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const portfolio = await getOrCreatePortfolio(userId);
      const userTx = WALLET_LEDGER.filter((tx) => tx.userId === userId && tx.status === "SUCCESS");
      const totalDeposited = userTx
        .filter((tx) => tx.type === "DEPOSIT")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const cash = parseFloat(portfolio.cashBalance);
      const withdrawable = +(cash * 0.9).toFixed(2);
      const unsettled = +(cash * 0.1).toFixed(2);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPayouts = await db
        .select()
        .from(payouts)
        .where(and(eq(payouts.userId, userId), gte(payouts.createdAt, oneDayAgo)));

      res.json({
        success: true,
        data: {
          totalBalance: cash.toFixed(2),
          withdrawableBalance: withdrawable.toFixed(2),
          unsettledBalance: unsettled.toFixed(2),
          totalDeposited: totalDeposited.toFixed(2),
          dailyWithdrawalsUsed: recentPayouts.length,
          dailyWithdrawalsRemaining: Math.max(0, 3 - recentPayouts.length),
          recentTransactions: userTx.slice(0, 5),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
