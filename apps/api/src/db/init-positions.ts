import { db, closeDbConnection } from "./client.js";
import { sql } from "drizzle-orm";

export async function initPositionsTable() {
  console.log("Checking / creating positions table for Intraday MIS trading...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "positions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "portfolio_id" uuid NOT NULL REFERENCES "portfolios"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL,
      "stock_id" uuid NOT NULL REFERENCES "stocks"("id") ON DELETE CASCADE,
      "symbol" varchar(20) NOT NULL,
      "product" varchar(10) DEFAULT 'MIS' NOT NULL,
      "side" varchar(10) NOT NULL,
      "quantity" integer NOT NULL,
      "average_price" numeric(20, 2) NOT NULL,
      "margin_blocked" numeric(20, 2) NOT NULL,
      "status" varchar(20) DEFAULT 'OPEN' NOT NULL,
      "realized_pnl" numeric(20, 2) DEFAULT '0.00' NOT NULL,
      "exit_price" numeric(20, 2),
      "closed_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "positions_portfolio_id_idx" ON "positions" ("portfolio_id");
    CREATE INDEX IF NOT EXISTS "positions_user_id_idx" ON "positions" ("user_id");
    CREATE INDEX IF NOT EXISTS "positions_status_idx" ON "positions" ("status");
  `);
  console.log("✅ Positions table verified/created successfully");
}

if (process.argv[1]?.endsWith("init-positions.ts")) {
  initPositionsTable()
    .then(() => closeDbConnection())
    .catch((err) => {
      console.error("Failed to init positions table:", err);
      process.exit(1);
    });
}
