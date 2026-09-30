import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(1);
});

export const db = drizzle(pool, { schema, logger: env.NODE_ENV === "development" });

export type DB = typeof db;

export async function checkDbConnection(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        console.log("✅  Database connection established");
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[DB] Connection attempt ${attempt} failed, retrying in 1s...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function closeDbConnection(): Promise<void> {
  await pool.end();
}
