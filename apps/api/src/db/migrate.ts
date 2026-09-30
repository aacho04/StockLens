import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, checkDbConnection, closeDbConnection } from "./client.js";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations(): Promise<void> {
  console.log("🔄  Running database migrations...");

  await checkDbConnection();

  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../../drizzle"),
  });

  console.log("✅  Migrations completed successfully");

  await closeDbConnection();
}

runMigrations().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
