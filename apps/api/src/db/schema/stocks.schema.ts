import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  numeric,
  integer,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const exchangeEnum = pgEnum("exchange", ["NSE", "BSE"]);

// ─── Stocks ───────────────────────────────────────────────────────────────────

export const stocks = pgTable(
  "stocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: text("name").notNull(),
    exchange: exchangeEnum("exchange").notNull().default("NSE"),
    sector: varchar("sector", { length: 100 }).notNull(),
    industry: varchar("industry", { length: 100 }).notNull(),
    // Market cap stored as numeric string — never float
    marketCap: numeric("market_cap", { precision: 20, scale: 2 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stocks_symbol_exchange_idx").on(table.symbol, table.exchange),
    index("stocks_sector_idx").on(table.sector),
    index("stocks_is_active_idx").on(table.isActive),
  ]
);

// ─── Daily OHLCV ──────────────────────────────────────────────────────────────
// All price/volume fields stored as NUMERIC — never FLOAT.
// When TimescaleDB is adopted (Phase 6), this table becomes a hypertable.

export const ohlcvDaily = pgTable(
  "ohlcv_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    open: numeric("open", { precision: 20, scale: 4 }).notNull(),
    high: numeric("high", { precision: 20, scale: 4 }).notNull(),
    low: numeric("low", { precision: 20, scale: 4 }).notNull(),
    close: numeric("close", { precision: 20, scale: 4 }).notNull(),
    volume: numeric("volume", { precision: 20, scale: 0 }).notNull(),
    adjustedClose: numeric("adjusted_close", { precision: 20, scale: 4 }),
  },
  (table) => [
    uniqueIndex("ohlcv_daily_stock_date_idx").on(table.stockId, table.date),
    index("ohlcv_daily_date_idx").on(table.date),
  ]
);

// ─── Watchlists ───────────────────────────────────────────────────────────────
// Deferred to Phase 2 but schema created now for data integrity planning

export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const watchlistStocks = pgTable(
  "watchlist_stocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("watchlist_stocks_unique_idx").on(
      table.watchlistId,
      table.stockId
    ),
  ]
);

// ─── Paper Trading Portfolios (Phase 3) ────────────────────────────────────────
export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  cashBalance: numeric("cash_balance", { precision: 20, scale: 2 })
    .notNull()
    .default("1000000.00"), // ₹10,00,000 initial virtual cash
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Holdings (Stock Positions) ────────────────────────────────────────────────
export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    quantity: integer("quantity").notNull(),
    averageBuyPrice: numeric("average_buy_price", { precision: 20, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("holdings_portfolio_stock_idx").on(table.portfolioId, table.stockId),
    index("holdings_user_id_idx").on(table.userId),
  ]
);

// ─── Orders (Execution History & Intraday Order Engine) ───────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    instrumentKey: varchar("instrument_key", { length: 50 }),
    exchange: varchar("exchange", { length: 10 }).notNull().default("NSE"),
    side: varchar("side", { length: 10 }).notNull().default("BUY"), // "BUY" | "SELL"
    type: varchar("type", { length: 10 }).notNull().default("BUY"), // Legacy sync with side
    productType: varchar("product_type", { length: 10 }).notNull().default("MIS"), // "MIS" | "CNC"
    orderType: varchar("order_type", { length: 20 }).notNull().default("MARKET"), // "MARKET" | "LIMIT" | "SL" | "SL-M"
    quantity: integer("quantity").notNull(),
    price: numeric("price", { precision: 20, scale: 2 }).notNull(), // Estimated or limit price
    limitPrice: numeric("limit_price", { precision: 20, scale: 2 }),
    triggerPrice: numeric("trigger_price", { precision: 20, scale: 2 }),
    averagePrice: numeric("average_price", { precision: 20, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 20, scale: 2 }).notNull(),
    charges: numeric("charges", { precision: 20, scale: 2 }).notNull().default("0.00"),
    realizedPnl: numeric("realized_pnl", { precision: 20, scale: 2 }).notNull().default("0.00"),
    status: varchar("status", { length: 20 }).notNull().default("OPEN"), // CREATED, OPEN, TRIGGERED, EXECUTED, CANCELLED, REJECTED
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("orders_portfolio_id_idx").on(table.portfolioId),
    index("orders_user_id_idx").on(table.userId),
    index("orders_user_id_status_idx").on(table.userId, table.status),
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);

// ─── Trades (Trade Book / Executed Trades History) ───────────────────────────
export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    orderId: uuid("order_id"),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    exchange: varchar("exchange", { length: 10 }).notNull().default("NSE"),
    side: varchar("side", { length: 10 }).notNull(), // "BUY" | "SELL"
    productType: varchar("product_type", { length: 10 }).notNull().default("MIS"),
    quantity: integer("quantity").notNull(),
    entryPrice: numeric("entry_price", { precision: 20, scale: 2 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 20, scale: 2 }).notNull(),
    grossPnl: numeric("gross_pnl", { precision: 20, scale: 2 }).notNull().default("0.00"),
    charges: numeric("charges", { precision: 20, scale: 2 }).notNull().default("0.00"),
    netPnl: numeric("net_pnl", { precision: 20, scale: 2 }).notNull().default("0.00"),
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("trades_user_id_idx").on(table.userId),
    index("trades_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("trades_symbol_idx").on(table.symbol),
  ]
);

// ─── Payouts Log (Bank Withdrawals) ───────────────────────────────────────────
export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payoutId: varchar("payout_id", { length: 100 }).notNull().unique(),
    userId: uuid("user_id").notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    bankAccountMask: varchar("bank_account_mask", { length: 30 }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 20 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("PROCESSING"), // PENDING, PROCESSING, SUCCESS, FAILED
    referenceId: varchar("reference_id", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payouts_user_id_idx").on(table.userId),
    index("payouts_status_idx").on(table.status),
  ]
);

// ─── Intraday Positions (Phase 3 - MIS 5x Margin) ────────────────────────────
export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    product: varchar("product", { length: 10 }).notNull().default("MIS"), // "MIS"
    side: varchar("side", { length: 10 }).notNull(), // "LONG" | "SHORT"
    quantity: integer("quantity").notNull(),
    averagePrice: numeric("average_price", { precision: 20, scale: 2 }).notNull(),
    marginBlocked: numeric("margin_blocked", { precision: 20, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("OPEN"), // "OPEN" | "CLOSED"
    realizedPnl: numeric("realized_pnl", { precision: 20, scale: 2 }).notNull().default("0.00"),
    exitPrice: numeric("exit_price", { precision: 20, scale: 2 }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("positions_portfolio_id_idx").on(table.portfolioId),
    index("positions_user_id_idx").on(table.userId),
    index("positions_status_idx").on(table.status),
    index("positions_user_id_symbol_idx").on(table.userId, table.symbol),
  ]
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;
export type OHLCVDaily = typeof ohlcvDaily.$inferSelect;
export type NewOHLCVDaily = typeof ohlcvDaily.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;


