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
