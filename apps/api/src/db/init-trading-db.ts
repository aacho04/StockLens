import { db, closeDbConnection } from "./client.js";
import { sql } from "drizzle-orm";

export async function initTradingDb() {
  console.log("Checking and updating database schema for Intraday Trading...");

  await db.execute(sql`
    -- Ensure columns exist in orders table
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "instrument_key" varchar(50);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "exchange" varchar(10) DEFAULT 'NSE';
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "side" varchar(10) DEFAULT 'BUY';
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "product_type" varchar(10) DEFAULT 'MIS';
    ALTER TABLE "orders" ALTER COLUMN "order_type" TYPE varchar(20);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "limit_price" numeric(20, 2);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trigger_price" numeric(20, 2);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "average_price" numeric(20, 2);
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "charges" numeric(20, 2) DEFAULT '0.00';
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "realized_pnl" numeric(20, 2) DEFAULT '0.00';
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

    CREATE INDEX IF NOT EXISTS "orders_user_id_status_idx" ON "orders" ("user_id", "status");
    CREATE INDEX IF NOT EXISTS "orders_user_id_created_at_idx" ON "orders" ("user_id", "created_at");

    -- Create trades table
    CREATE TABLE IF NOT EXISTS "trades" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "portfolio_id" uuid NOT NULL REFERENCES "portfolios"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL,
      "stock_id" uuid NOT NULL REFERENCES "stocks"("id") ON DELETE CASCADE,
      "order_id" uuid,
      "symbol" varchar(20) NOT NULL,
      "exchange" varchar(10) DEFAULT 'NSE' NOT NULL,
      "side" varchar(10) NOT NULL,
      "product_type" varchar(10) DEFAULT 'MIS' NOT NULL,
      "quantity" integer NOT NULL,
      "entry_price" numeric(20, 2) NOT NULL,
      "exit_price" numeric(20, 2) NOT NULL,
      "gross_pnl" numeric(20, 2) DEFAULT '0.00' NOT NULL,
      "charges" numeric(20, 2) DEFAULT '0.00' NOT NULL,
      "net_pnl" numeric(20, 2) DEFAULT '0.00' NOT NULL,
      "executed_at" timestamp with time zone DEFAULT now(),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "trades_user_id_idx" ON "trades" ("user_id");
    CREATE INDEX IF NOT EXISTS "trades_user_id_created_at_idx" ON "trades" ("user_id", "created_at");
    CREATE INDEX IF NOT EXISTS "trades_symbol_idx" ON "trades" ("symbol");
    CREATE INDEX IF NOT EXISTS "positions_user_id_symbol_idx" ON "positions" ("user_id", "symbol");
  `);

  console.log("✅ Database schema for Intraday Trading verified & updated successfully");
}

if (process.argv[1]?.endsWith("init-trading-db.ts")) {
  initTradingDb()
    .then(() => closeDbConnection())
    .catch((err) => {
      console.error("Failed to init trading db:", err);
      process.exit(1);
    });
}
