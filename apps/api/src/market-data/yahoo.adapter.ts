import YahooFinance from "yahoo-finance2";
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
  getStockBasePrice,
  generateOHLCV,
  generateSimulatedQuote,
} from "./data.js";

export { NSE_UNIVERSE };

// Instantiate once (v4 API — suppress deprecation notice)
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

// Index Yahoo symbols
const NIFTY_INDICES = [
  { name: "NIFTY 50",   yahooSymbol: "^NSEI"  },
  { name: "SENSEX",     yahooSymbol: "^BSESN" },
  { name: "NIFTY BANK", yahooSymbol: "^NSEBANK" },
  { name: "NIFTY IT",   yahooSymbol: "^CNXIT" },
];

// Determine if Indian market is open (IST = UTC+5:30)
function isMarketOpen(): boolean {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % (24 * 60);
  const dayOfWeek = new Date(now.getTime() + 330 * 60 * 1000).getUTCDay();
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  return dayOfWeek >= 1 && dayOfWeek <= 5 && istMinutes >= marketOpen && istMinutes < marketClose;
}

function getMarketStatus(): MarketSummary["marketStatus"] {
  const now = new Date();
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % (24 * 60);
  const dayOfWeek = new Date(now.getTime() + 330 * 60 * 1000).getUTCDay();
  const mOpen = 9 * 60 + 15;
  const mClose = 15 * 60 + 30;

  if (dayOfWeek === 0 || dayOfWeek === 6) return "CLOSED";
  if (istMinutes >= mOpen - 15 && istMinutes < mOpen) return "PRE_MARKET";
  if (istMinutes >= mOpen && istMinutes < mClose) return "OPEN";
  if (istMinutes >= mClose && istMinutes < mClose + 60) return "POST_MARKET";
  return "CLOSED";
}

// ─── Yahoo Finance Adapter ────────────────────────────────────────────────────

export class YahooFinanceAdapter implements MarketDataProvider {
  readonly name = "yahoo";
  readonly isRealtime = true;
  readonly dataStatus: DataStatus = "DELAYED"; // Yahoo is ~15min delayed

  // Quote cache to reduce API calls (TTL: 15s)
  private quoteCache = new Map<string, { data: Quote; expires: number }>();
  private readonly CACHE_TTL_MS = 15_000;

  private getFromCache(symbol: string): Quote | null {
    const cached = this.quoteCache.get(symbol.toUpperCase());
    if (cached && Date.now() < cached.expires) return cached.data;
    return null;
  }

  private setCache(symbol: string, quote: Quote): void {
    this.quoteCache.set(symbol.toUpperCase(), { data: quote, expires: Date.now() + this.CACHE_TTL_MS });
  }

  private getYahooSymbol(symbol: string): string {
    const entry = NSE_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    return entry?.yahooSymbol ?? `${symbol.toUpperCase()}.NS`;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const upperSym = symbol.toUpperCase();
    const cached = this.getFromCache(upperSym);
    if (cached) return cached;

    const yahooSym = this.getYahooSymbol(upperSym);

    try {
      const result = await yahooFinance.quote(yahooSym, {}, { validateResult: false });
      const current = result?.regularMarketPrice;

      if (current == null || isNaN(current)) {
        throw new Error(`No regularMarketPrice for ${yahooSym}`);
      }

      const prevClose = result.regularMarketPreviousClose ?? current;
      const change = result.regularMarketChange ?? (current - prevClose);
      const changePct = result.regularMarketChangePercent ?? ((change / (prevClose || 1)) * 100);

      const quote: Quote = {
        symbol: upperSym,
        exchange: "NSE",
        currentPrice: current.toFixed(2),
        previousClose: prevClose.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePct.toFixed(2),
        dayHigh: (result.regularMarketDayHigh ?? Math.max(current, prevClose)).toFixed(2),
        dayLow: (result.regularMarketDayLow ?? Math.min(current, prevClose)).toFixed(2),
        volume: result.regularMarketVolume ?? 1_000_000,
        bid: result.bid ? result.bid.toFixed(2) : (current * 0.999).toFixed(2),
        ask: result.ask ? result.ask.toFixed(2) : (current * 1.001).toFixed(2),
        dataStatus: isMarketOpen() ? "DELAYED" : "STALE",
        timestamp: result.regularMarketTime
          ? new Date(result.regularMarketTime).toISOString()
          : new Date().toISOString(),
      };

      this.setCache(upperSym, quote);
      return quote;
    } catch (err) {
      // Graceful fallback to deterministic simulated quote
      console.warn(`[YahooFinance] Quote failed for ${upperSym} (${yahooSym}), using simulated data:`, (err as Error).message);
      const basePrice = getStockBasePrice(upperSym);
      const fallbackQuote = generateSimulatedQuote(upperSym, basePrice, isMarketOpen() ? "DELAYED" : "STALE");
      this.setCache(upperSym, fallbackQuote);
      return fallbackQuote;
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    const BATCH = 10;
    for (let i = 0; i < symbols.length; i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(batch.map((s) => this.getQuote(s)));
      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j]!;
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          const sym = batch[j]!;
          results.push(generateSimulatedQuote(sym, getStockBasePrice(sym)));
        }
      }
    }
    return results;
  }

  async getOHLCV(symbol: string, period: string, _interval: string): Promise<OHLCVCandle[]> {
    const upperSym = symbol.toUpperCase();
    const yahooSym = this.getYahooSymbol(upperSym);

    const periodToDays: Record<string, number> = {
      "1D": 7,   // 7 days ensure there is weekend-safe data
      "1W": 14,
      "1M": 35,
      "3M": 95,
      "6M": 185,
      "1Y": 365,
      "2Y": 730,
      "5Y": 1825,
    };

    const days = periodToDays[period] ?? 365;

    try {
      const period1 = new Date();
      period1.setDate(period1.getDate() - days);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout fetching historical for ${yahooSym}`)), 2000)
      );

      const fetchPromise = yahooFinance.historical(
        yahooSym,
        {
          period1,
          period2: new Date(),
          interval: "1d",
        },
        { validateResult: false }
      );

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error(`Empty OHLCV data for ${yahooSym}`);
      }

      const validCandles = (result as any[])
        .filter((r: any) => r.date && r.open != null && r.close != null && !isNaN(r.open) && !isNaN(r.close))
        .map((r: any) => {
          const open = Number(r.open);
          const close = Number(r.close);
          const high = r.high != null && !isNaN(r.high) ? Math.max(Number(r.high), open, close) : Math.max(open, close);
          const low = r.low != null && !isNaN(r.low) ? Math.min(Number(r.low), open, close) : Math.min(open, close);
          const dObj = r.date instanceof Date ? r.date : new Date(r.date);
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, "0");
          const day = String(dObj.getDate()).padStart(2, "0");
          return {
            date: `${y}-${m}-${day}`,
            open: open.toFixed(2),
            high: high.toFixed(2),
            low: low.toFixed(2),
            close: close.toFixed(2),
            volume: Number(r.volume ?? 1_000_000),
          };
        })
        .sort((a: OHLCVCandle, b: OHLCVCandle) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      // Deduplicate timestamps (Lightweight charts requirement)
      const uniqueMap = new Map<string, OHLCVCandle>();
      for (const c of validCandles) {
        uniqueMap.set(c.date, c);
      }
      const deduped = Array.from(uniqueMap.values());

      if (deduped.length < 2) {
        throw new Error(`Insufficient valid candles after filtering for ${yahooSym}`);
      }

      return deduped;
    } catch (err) {
      console.warn(`[YahooFinance] OHLCV fallback for ${upperSym} (${yahooSym}):`, (err as Error).message);
      const basePrice = getStockBasePrice(upperSym);
      return generateOHLCV(upperSym, basePrice, days);
    }
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const topSymbols = NSE_UNIVERSE.slice(0, 20).map((s) => s.symbol);
    const quotes = await this.getQuotes(topSymbols);

    const sorted = [...quotes].sort(
      (a, b) => parseFloat(b.changePercent) - parseFloat(a.changePercent)
    );

    const indices: MarketIndex[] = [];
    for (const idx of NIFTY_INDICES.slice(0, 4)) {
      try {
        const r = await yahooFinance.quote(idx.yahooSymbol, {}, { validateResult: false });
        const val = r?.regularMarketPrice ?? 0;
        const chg = r?.regularMarketChange ?? 0;
        const chgPct = r?.regularMarketChangePercent ?? 0;
        if (val > 0) {
          indices.push({
            name: idx.name,
            value: val.toFixed(2),
            change: chg.toFixed(2),
            changePercent: chgPct.toFixed(2),
            dataStatus: "DELAYED",
          });
        }
      } catch {
        // Fallback default index simulation
        const defaults: Record<string, number> = {
          "NIFTY 50": 24500,
          "SENSEX": 80500,
          "NIFTY BANK": 52800,
          "NIFTY IT": 38200,
        };
        const base = defaults[idx.name] ?? 20000;
        const variation = (Math.random() - 0.49) * 0.01;
        indices.push({
          name: idx.name,
          value: (base * (1 + variation)).toFixed(2),
          change: (base * variation).toFixed(2),
          changePercent: (variation * 100).toFixed(2),
          dataStatus: "DELAYED",
        });
      }
    }

    return {
      indices,
      topGainers: sorted.slice(0, 5),
      topLosers: sorted.slice(-5).reverse(),
      mostActive: [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 5),
      marketStatus: getMarketStatus(),
      asOf: new Date().toISOString(),
    };
  }

  async searchStocks(query: string): Promise<Partial<Stock>[]> {
    const q = query.toLowerCase();
    return NSE_UNIVERSE.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q)
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
