import { db, closeDbConnection } from "../src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🔄 Initializing payouts table in PostgreSQL...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payout_id VARCHAR(100) NOT NULL UNIQUE,
      user_id UUID NOT NULL,
      amount NUMERIC(20, 2) NOT NULL,
      bank_account_mask VARCHAR(30) NOT NULL,
      ifsc_code VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
      reference_id VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON payouts(user_id);
    CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts(status);
  `);
  console.log("✅ Payouts table successfully initialized in PostgreSQL!");
  await closeDbConnection();
}

main().catch((err) => {
  console.error("❌ Failed to initialize payouts table:", err);
  process.exit(1);
});
