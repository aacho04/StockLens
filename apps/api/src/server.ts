// Market data powered by Upstox API v2 - Real-time stream
import { app } from "./app.js";
import { env } from "./config/env.js";
import { checkDbConnection, closeDbConnection } from "./db/client.js";
import { getMarketDataProvider } from "./market-data/index.js";
import { initWebSocketServer } from "./market-data/websocket.server.js";

async function start(): Promise<void> {
  console.log(`\n🚀  StockLens API — ${env.NODE_ENV.toUpperCase()}\n`);

  // Validate DB connection
  await checkDbConnection();

  // Initialize market data provider
  const provider = getMarketDataProvider();
  console.log(`📊  Market data: ${provider.name} (${provider.dataStatus})`);

  const server = app.listen(env.PORT, () => {
    console.log(`\n✅  API server listening on http://localhost:${env.PORT}`);
    console.log(`   Health: http://localhost:${env.PORT}/health`);
    console.log(`   WebSocket: ws://localhost:${env.PORT}/ws\n`);
  });

  // Attach WebSocket Server
  const wss = initWebSocketServer(server);

  // ─── Automated Morning Upstox Token Refresh (Every weekday at 08:45 AM IST) ─
  if (process.env["UPSTOX_TOTP_SECRET"] && process.env["UPSTOX_PIN"]) {
    console.log("🛡️  Automated daily Upstox TOTP refresh active (08:45 AM IST scheduled)");

    let lastRefreshedDate = "";
    setInterval(async () => {
      const now = new Date();
      const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
      const currentMinutes = istMinutes % (24 * 60);
      const dayOfWeek = (now.getUTCDay() + Math.floor(istMinutes / (24 * 60))) % 7;
      const todayDateStr = now.toISOString().split("T")[0]!;

      // Mon-Fri, between 08:45 AM and 08:59 AM IST, run once per day
      if (
        dayOfWeek >= 1 &&
        dayOfWeek <= 5 &&
        currentMinutes >= 8 * 60 + 45 &&
        currentMinutes <= 8 * 60 + 59 &&
        lastRefreshedDate !== todayDateStr
      ) {
        lastRefreshedDate = todayDateStr;
        console.log("🌅 [Cron] Running automated Upstox TOTP token refresh for market open...");
        const { loginViaPlaywright } = await import("./market-data/upstox-auth.service.js");
        const res = await loginViaPlaywright();
        if (res.success) {
          console.log(`✅ [Cron] Upstox Live Token refreshed for ${res.userName || "market session"}!`);
        } else {
          console.warn("⚠️ [Cron] Upstox token refresh error:", res.error);
        }
      }
    }, 60 * 1000); // check every minute
  }

  // ─── Graceful Shutdown ───────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n⚠️   ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      wss.close();
      await closeDbConnection();
      console.log("✅  Server shut down cleanly");
      process.exit(0);
    });

    // Force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      console.error("❌  Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("❌  Failed to start server:", err);
  process.exit(1);
});
