import type {
  Quote,
  OHLCVCandle,
  MarketSummary,
  DataStatus,
  Stock,
  MarketIndex,
} from "@stocklens/types";
import type { MarketDataProvider } from "./types.js";
import {
  NSE_UNIVERSE,
  NSE_STOCKS,
  getStockBasePrice,
  generateOHLCV,
} from "./data.js";

import { getLiveQuote } from "./websocket.server.js";

export { NSE_STOCKS, NSE_UNIVERSE };

// ─── Market Indices ───────────────────────────────────────────────────────────

const INDICES = [
  { name: "NIFTY 50", baseValue: 24500 },
  { name: "SENSEX", baseValue: 80500 },
  { name: "NIFTY BANK", baseValue: 52800 },
  { name: "NIFTY IT", baseValue: 38200 },
];

// ─── Mock Adapter ─────────────────────────────────────────────────────────────

export class MockMarketDataAdapter implements MarketDataProvider {
  readonly name = "mock";
  readonly isRealtime = true;
  readonly dataStatus: DataStatus = "DELAYED";

  private priceCache = new Map<string, number>();

  private getCurrentPrice(symbol: string): number {
    const basePrice = getStockBasePrice(symbol);
    const currentCached = this.priceCache.get(symbol) ?? basePrice;
    // Mean-reverting realistic tick (within ±1.5% of base)
    const drift = (basePrice - currentCached) * 0.05;
    const noise = (Math.random() - 0.5) * (basePrice * 0.003);
    const newPrice = Math.max(1, +(currentCached + drift + noise).toFixed(2));
    this.priceCache.set(symbol, newPrice);
    return newPrice;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const live = getLiveQuote(symbol);
    if (live) return live;

    const basePrice = getStockBasePrice(symbol);
    const current = this.getCurrentPrice(symbol);
    const prevClose = +(basePrice * 0.995).toFixed(2);
    const change = +(current - prevClose).toFixed(2);
    const changePercent = +((change / (prevClose || 1)) * 100).toFixed(2);
    const spread = 0.05;

    return {
      symbol: symbol.toUpperCase(),
      exchange: "NSE",
      currentPrice: current.toFixed(2),
      previousClose: prevClose.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      dayHigh: (current * 1.015).toFixed(2),
      dayLow: (current * 0.985).toFixed(2),
      volume: Math.floor(1_000_000 + Math.random() * 50_000_000),
      bid: (current - spread).toFixed(2),
      ask: (current + spread).toFixed(2),
      dataStatus: this.dataStatus,
      timestamp: new Date().toISOString(),
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  async getOHLCV(
    symbol: string,
    period: string,
    _interval: string
  ): Promise<OHLCVCandle[]> {
    const basePrice = getStockBasePrice(symbol);

    const periodToDays: Record<string, number> = {
      "1D": 7, // 7 days ensure there is weekend-safe data
      "1W": 14,
      "1M": 35,
      "3M": 95,
      "6M": 185,
      "1Y": 365,
      "2Y": 730,
      "5Y": 1825,
    };

    const days = periodToDays[period] ?? 365;
    return generateOHLCV(symbol, basePrice, days);
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const quotes = await this.getQuotes(NSE_UNIVERSE.slice(0, 30).map((s) => s.symbol));

    const sorted = [...quotes].sort(
      (a, b) => parseFloat(b.changePercent) - parseFloat(a.changePercent)
    );

    const indices: MarketIndex[] = INDICES.map((idx) => {
      const variation = (Math.random() - 0.5) * 0.02;
      const value = idx.baseValue * (1 + variation);
      const change = idx.baseValue * variation;
      return {
        name: idx.name,
        value: value.toFixed(2),
        change: change.toFixed(2),
        changePercent: (variation * 100).toFixed(2),
        dataStatus: this.dataStatus,
      };
    });

    // Determine market status based on IST time (UTC+5:30)
    const now = new Date();
    const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
    const marketOpen = 9 * 60 + 15;   // 09:15 IST
    const marketClose = 15 * 60 + 30; // 15:30 IST
    const dayOfWeek = now.getDay();

    let marketStatus: MarketSummary["marketStatus"] = "CLOSED";
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const currentMinutes = istMinutes % (24 * 60);
      if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        marketStatus = "OPEN";
      } else if (currentMinutes >= marketOpen - 15 && currentMinutes < marketOpen) {
        marketStatus = "PRE_MARKET";
      } else if (currentMinutes >= marketClose && currentMinutes < marketClose + 60) {
        marketStatus = "POST_MARKET";
      }
    }

    return {
      indices,
      topGainers: sorted.slice(0, 5),
      topLosers: sorted.slice(-5).reverse(),
      mostActive: quotes
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5),
      marketStatus,
      asOf: new Date().toISOString(),
    };
  }

  async searchStocks(query: string): Promise<Partial<Stock>[]> {
    const q = query.toLowerCase();
    return NSE_UNIVERSE.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    ).map((s) => ({
      symbol: s.symbol,
      name: s.name,
      exchange: "NSE" as const,
      sector: s.sector,
      industry: s.industry,
      marketCap: s.marketCap,
      isActive: true,
    }));
  }
}
