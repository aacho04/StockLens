import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Quote } from "@stocklens/types";
import { NSE_UNIVERSE, getStockBasePrice } from "./data.js";
import { getMarketDataProvider } from "./index.js";
import { env } from "../config/env.js";

interface ClientSubscription {
  ws: WebSocket;
  symbols: Set<string>; // empty means subscribed to all
  focusedSymbols: Set<string>; // specific symbols client is actively watching on screen
  isAlive: boolean;
}

// In-memory live price book
interface LivePriceState {
  quote: Quote;
  lastTickDirection: "up" | "down" | "flat";
  anchorPrice?: number; // authoritative real market price from Upstox API
}

const livePriceBook = new Map<string, LivePriceState>();
const clients = new Set<ClientSubscription>();

// Initialize the price book with base quotes
function initPriceBook(): void {
  for (const item of NSE_UNIVERSE) {
    const base = getStockBasePrice(item.symbol);
    livePriceBook.set(item.symbol.toUpperCase(), {
      quote: {
        symbol: item.symbol.toUpperCase(),
        exchange: "NSE",
        currentPrice: base.toFixed(2),
        previousClose: (base * 0.995).toFixed(2),
        change: (base * 0.005).toFixed(2),
        changePercent: "0.50",
        dayHigh: (base * 1.01).toFixed(2),
        dayLow: (base * 0.99).toFixed(2),
        volume: 1_250_000,
        bid: (base - 0.05).toFixed(2),
        ask: (base + 0.05).toFixed(2),
        dataStatus: "DELAYED",
        timestamp: new Date().toISOString(),
      },
      lastTickDirection: "flat",
      anchorPrice: base,
    });
  }
}

// Background auto-sync of market prices
export async function syncRealMarketPrices(): Promise<{ updated: number; timestamp: string }> {
  let updated = 0;
  try {
    const provider = getMarketDataProvider();
    const symbols = NSE_UNIVERSE.map((item) => item.symbol);
    const quotes = await provider.getQuotes(symbols);
    const changedTicks: { symbol: string; quote: Quote; direction: "up" | "down" }[] = [];

    for (const q of quotes) {
      if (q && q.currentPrice && !isNaN(parseFloat(q.currentPrice))) {
        const sym = q.symbol.toUpperCase();
        const existing = livePriceBook.get(sym);
        let direction: "up" | "down" | "flat" = "flat";
        const newP = parseFloat(q.currentPrice);
        if (existing?.quote?.currentPrice) {
          const oldP = parseFloat(existing.quote.currentPrice);
          if (newP > oldP) direction = "up";
          else if (newP < oldP) direction = "down";
        }

        livePriceBook.set(sym, {
          quote: q,
          lastTickDirection: direction,
          anchorPrice: newP,
        });
        updated++;

        if (direction !== "flat") {
          changedTicks.push({ symbol: sym, quote: q, direction });
        }
      }
    }

    // Broadcast updated snapshot to all connected WebSocket clients
    const allQuotes = Array.from(livePriceBook.values()).map((s) => s.quote);
    const snapMsg = JSON.stringify({ type: "snapshot", data: allQuotes });
    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(snapMsg);

        // Broadcast individual tick events so client flash & charts move immediately
        for (const t of changedTicks) {
          if (client.symbols.size === 0 || client.symbols.has(t.symbol) || client.focusedSymbols.has(t.symbol)) {
            client.ws.send(
              JSON.stringify({
                type: "tick",
                symbol: t.symbol,
                tickDirection: t.direction,
                data: t.quote,
              })
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn("[WebSocket] Auto-sync failed:", (err as Error).message);
  }
  return { updated, timestamp: new Date().toISOString() };
}

export function getLiveQuote(symbol: string): Quote | null {
  return livePriceBook.get(symbol.toUpperCase())?.quote ?? null;
}

export function getAllLiveQuotes(): Quote[] {
  return Array.from(livePriceBook.values()).map((s) => s.quote);
}

export function initWebSocketServer(server: Server): WebSocketServer {
  initPriceBook();
  syncRealMarketPrices().catch(() => {});

  // Continuous background price synchronization every 4 seconds when clients are connected
  const autoSyncInterval = setInterval(() => {
    if (clients.size > 0 || env.MARKET_DATA_PROVIDER === "upstox") {
      syncRealMarketPrices().catch(() => {});
    }
  }, 4 * 1000);

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    const sub: ClientSubscription = {
      ws,
      symbols: new Set<string>(), // default to all
      focusedSymbols: new Set<string>(), // user currently viewing this stock
      isAlive: true,
    };
    clients.add(sub);

    // Send connection greeting with initial market overview
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "StockLens Real-Time Market Stream Connected",
        serverTime: new Date().toISOString(),
        totalStocks: livePriceBook.size,
      })
    );

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === "subscribe") {
          const reqSymbols: string[] = Array.isArray(payload.symbols) ? payload.symbols : [];
          if (reqSymbols.length === 0 || reqSymbols.includes("*")) {
            sub.symbols.clear(); // clear means subscribe to all
          } else {
            reqSymbols.forEach((s) => sub.symbols.add(s.toUpperCase()));
          }

          // Send current snapshots for subscribed symbols
          const toSend = sub.symbols.size === 0
            ? Array.from(livePriceBook.values()).map((s) => s.quote)
            : Array.from(sub.symbols)
                .map((s) => livePriceBook.get(s)?.quote)
                .filter(Boolean) as Quote[];

          ws.send(
            JSON.stringify({
              type: "snapshot",
              data: toSend,
            })
          );
        } else if (payload.type === "focus" && payload.symbol) {
          sub.focusedSymbols.add(String(payload.symbol).toUpperCase());
        } else if (payload.type === "unfocus" && payload.symbol) {
          sub.focusedSymbols.delete(String(payload.symbol).toUpperCase());
        } else if (payload.type === "unsubscribe") {
          const reqSymbols: string[] = Array.isArray(payload.symbols) ? payload.symbols : [];
          reqSymbols.forEach((s) => {
            sub.symbols.delete(s.toUpperCase());
            sub.focusedSymbols.delete(s.toUpperCase());
          });
        } else if (payload.type === "ping") {
          sub.isAlive = true;
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (err) {
        console.error("[WebSocket] Bad message:", err);
      }
    });

    ws.on("pong", () => {
      sub.isAlive = true;
    });

    ws.on("close", () => {
      clients.delete(sub);
    });

    ws.on("error", () => {
      clients.delete(sub);
    });
  });

  // ─── Real-Time Tick Streaming Loop (Upstox / TradingView 1000ms Ticks) ─────────
  const tickInterval = setInterval(() => {
    if (clients.size === 0) return;

    // 1. Gather all actively focused symbols from all connected clients
    const symbolsToTick = new Set<string>();

    for (const client of clients) {
      for (const fs of client.focusedSymbols) {
        symbolsToTick.add(fs);
      }
    }

    // Always include major indices so tickers & benchmark charts are always alive
    symbolsToTick.add("NIFTY");
    symbolsToTick.add("BANKNIFTY");
    symbolsToTick.add("SENSEX");
    symbolsToTick.add("RELIANCE");

    // Also pick 4-8 random symbols from the broader universe for market breadth
    const allSymbols = Array.from(livePriceBook.keys());
    const countToPick = Math.min(8, allSymbols.length);
    for (let i = 0; i < countToPick; i++) {
      const randIdx = Math.floor(Math.random() * allSymbols.length);
      const s = allSymbols[randIdx];
      if (s) symbolsToTick.add(s);
    }

    for (const sym of symbolsToTick) {
      const state = livePriceBook.get(sym);
      if (!state) continue;

      const prevPrice = parseFloat(state.quote.currentPrice);
      if (isNaN(prevPrice) || prevPrice <= 0) continue;

      // Base price anchor: prefer authoritative Upstox anchorPrice, fallback to getStockBasePrice
      const base = state.anchorPrice ?? prevPrice;

      // Realistic micro-tick: tight oscillation (±0.02% to ±0.06%), anchored to real Upstox market price
      const driftToBase = (base - prevPrice) * 0.25;
      const noise = (Math.random() - 0.5) * (base * 0.0008);
      const rawDelta = driftToBase + noise;
      const tickStep = prevPrice > 5000 ? 0.25 : prevPrice > 1000 ? 0.1 : 0.05;
      let quantizedDelta = Math.round(rawDelta / tickStep) * tickStep;
      if (quantizedDelta === 0) {
        quantizedDelta = Math.random() > 0.5 ? tickStep : -tickStep;
      }

      // Bound strictly to within ±0.20% of Upstox anchor so prices never drift
      const candidatePrice = prevPrice + quantizedDelta;
      const minBound = +(base * 0.998).toFixed(2);
      const maxBound = +(base * 1.002).toFixed(2);
      const boundedPrice = Math.min(maxBound, Math.max(minBound, candidatePrice));
      const nextPrice = Math.max(1, +boundedPrice.toFixed(2));

      const prevClose = parseFloat(state.quote.previousClose) || prevPrice;
      const newChange = +(nextPrice - prevClose).toFixed(2);
      const newChangePct = +((newChange / prevClose) * 100).toFixed(2);
      const currentHigh = parseFloat(state.quote.dayHigh) || nextPrice;
      const currentLow = parseFloat(state.quote.dayLow) || nextPrice;

      const direction: "up" | "down" | "flat" =
        nextPrice > prevPrice ? "up" : nextPrice < prevPrice ? "down" : "flat";

      const updatedQuote: Quote = {
        ...state.quote,
        currentPrice: nextPrice.toFixed(2),
        change: newChange > 0 ? `+${newChange.toFixed(2)}` : newChange.toFixed(2),
        changePercent: newChangePct > 0 ? `+${newChangePct.toFixed(2)}` : newChangePct.toFixed(2),
        dayHigh: Math.max(currentHigh, nextPrice).toFixed(2),
        dayLow: Math.min(currentLow, nextPrice).toFixed(2),
        volume: state.quote.volume + Math.floor(Math.random() * 80) + 5,
        bid: (nextPrice - tickStep).toFixed(2),
        ask: (nextPrice + tickStep).toFixed(2),
        dataStatus: state.quote.dataStatus || "LIVE",
        timestamp: new Date().toISOString(),
      };

      state.quote = updatedQuote;
      state.lastTickDirection = direction;

      // Broadcast to matching clients
      const tickMessage = JSON.stringify({
        type: "tick",
        symbol: sym,
        data: updatedQuote,
        tickDirection: direction,
      });

      for (const client of clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          if (
            client.symbols.size === 0 ||
            client.symbols.has(sym) ||
            client.focusedSymbols.has(sym)
          ) {
            client.ws.send(tickMessage);
          }
        }
      }
    }
  }, 1000);

  // ─── Connection Heartbeat (every 30s) ─────────────────────────────────────────
  const heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
      } else {
        client.isAlive = false;
        client.ws.ping();
      }
    }
  }, 30_000);

  wss.on("close", () => {
    clearInterval(tickInterval);
    clearInterval(heartbeatInterval);
  });

  console.log("⚡  Real-Time WebSocket Stream initialised on /ws");
  return wss;
}
