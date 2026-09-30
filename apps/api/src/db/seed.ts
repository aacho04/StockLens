import "dotenv/config";
import { db, checkDbConnection, closeDbConnection } from "./client.js";
import { stocks } from "./schema/index.js";
import { NSE_STOCKS } from "../market-data/mock.adapter.js";
import { eq } from "drizzle-orm";

async function seed(): Promise<void> {
  console.log("🌱  Seeding database...\n");
  await checkDbConnection();

  // Seed stocks
  console.log(`📈  Seeding ${NSE_STOCKS.length} NSE stocks...`);
  for (const s of NSE_STOCKS) {
    await db
      .insert(stocks)
      .values({
        symbol: s.symbol,
        name: s.name,
        exchange: "NSE",
        sector: s.sector,
        industry: s.industry,
        marketCap: s.marketCap,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`✅  Stocks seeded`);

  console.log("\n✅  Database seeded successfully!\n");
  await closeDbConnection();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
