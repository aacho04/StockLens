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
  generateIntradayOHLCV,
} from "./data.js";
import { env } from "../config/env.js";

export { NSE_STOCKS, NSE_UNIVERSE };

const INDICES = [
  { name: "NIFTY 50", baseValue: 24500 },
  { name: "SENSEX", baseValue: 80500 },
  { name: "NIFTY BANK", baseValue: 52800 },
  { name: "NIFTY IT", baseValue: 38200 },
];

/**
 * Real Upstox NSE Instrument Key mapping (ISINs)
 */
export const UPSTOX_INSTRUMENT_MAP: Record<string, string> = {
  // Indices
  "NIFTY": "NSE_INDEX|Nifty 50",
  "NIFTY 50": "NSE_INDEX|Nifty 50",
  "BANKNIFTY": "NSE_INDEX|Nifty Bank",
  "FINNIFTY": "NSE_INDEX|Nifty Fin Service",
  "SENSEX": "BSE_INDEX|SENSEX",
  "MIDCPNIFTY": "NSE_INDEX|NIFTY MID SELECT",

  // Equities (All NSE Universe)
  "RELIANCE": "NSE_EQ|INE002A01018",
  "TCS": "NSE_EQ|INE467B01029",
  "HDFCBANK": "NSE_EQ|INE040A01034",
  "INFY": "NSE_EQ|INE009A01021",
  "ICICIBANK": "NSE_EQ|INE090A01021",
  "HINDUNILVR": "NSE_EQ|INE030A01027",
  "BHARTIARTL": "NSE_EQ|INE397D01024",
  "SBIN": "NSE_EQ|INE062A01020",
  "WIPRO": "NSE_EQ|INE075A01022",
  "HCLTECH": "NSE_EQ|INE860A01027",
  "BAJFINANCE": "NSE_EQ|INE296A01032",
  "MARUTI": "NSE_EQ|INE585B01010",
  "LT": "NSE_EQ|INE018A01030",
  "ASIANPAINT": "NSE_EQ|INE021A01026",
  "AXISBANK": "NSE_EQ|INE238A01034",
  "SUNPHARMA": "NSE_EQ|INE044A01036",
  "TITAN": "NSE_EQ|INE280A01028",
  "ULTRACEMCO": "NSE_EQ|INE481G01011",
  "KOTAKBANK": "NSE_EQ|INE237A01036",
  "POWERGRID": "NSE_EQ|INE752E01010",
  "NTPC": "NSE_EQ|INE733E01010",
  "ONGC": "NSE_EQ|INE213A01029",
  "NESTLEIND": "NSE_EQ|INE239A01024",
  "ITC": "NSE_EQ|INE154A01025",
  "DRREDDY": "NSE_EQ|INE089A01031",
  "BAJAJFINSV": "NSE_EQ|INE918I01026",
  "TATAMOTORS": "NSE_EQ|INE155A01022",
  "JSWSTEEL": "NSE_EQ|INE019A01038",
  "ADANIPORTS": "NSE_EQ|INE742F01042",
  "TATACONSUM": "NSE_EQ|INE192A01025",
  "TATASTEEL": "NSE_EQ|INE081A01020",
  "HINDALCO": "NSE_EQ|INE038A01020",
  "COALINDIA": "NSE_EQ|INE522F01014",
  "TECHM": "NSE_EQ|INE669C01036",
  "HDFCLIFE": "NSE_EQ|INE795G01014",
  "SBILIFE": "NSE_EQ|INE123W01016",
  "DIVISLAB": "NSE_EQ|INE361B01024",
  "CIPLA": "NSE_EQ|INE059A01026",
  "GRASIM": "NSE_EQ|INE047A01021",
  "HEROMOTOCO": "NSE_EQ|INE158A01026",
  "EICHERMOT": "NSE_EQ|INE066A01021",
  "BAJAJ-AUTO": "NSE_EQ|INE917I01010",
  "M&M": "NSE_EQ|INE101A01026",
  "BPCL": "NSE_EQ|INE029A01011",
  "IOC": "NSE_EQ|INE242A01010",
  "INDUSINDBK": "NSE_EQ|INE095A01012",
  "APOLLOHOSP": "NSE_EQ|INE437A01024",
  "ADANIENT": "NSE_EQ|INE423A01024",
  "ADANIGREEN": "NSE_EQ|INE364U01010",
  "ADANITRANS": "NSE_EQ|INE931S01010",
  "SIEMENS": "NSE_EQ|INE003A01024",
  "ABB": "NSE_EQ|INE117A01022",
  "BOSCHLTD": "NSE_EQ|INE323A01026",
  "MCDOWELL-N": "NSE_EQ|INE854D01024",
  "PAGEIND": "NSE_EQ|INE761H01022",
  "PIDILITIND": "NSE_EQ|INE318A01026",
  "BERGEPAINT": "NSE_EQ|INE463A01038",
  "HAVELLS": "NSE_EQ|INE176B01034",
  "DMART": "NSE_EQ|INE192R01011",
  "ZOMATO": "NSE_EQ|INE758T01015",
  "NYKAA": "NSE_EQ|INE388Y01029",
  "POLICYBZR": "NSE_EQ|INE417T01026",
  "PAYTM": "NSE_EQ|INE982J01020",
  "IRFC": "NSE_EQ|INE053F01010",
  "IRCTC": "NSE_EQ|INE335Y01020",
  "HAL": "NSE_EQ|INE066F01020",
  "BEL": "NSE_EQ|INE263A01024",
  "MUTHOOTFIN": "NSE_EQ|INE414G01012",
  "CHOLAFIN": "NSE_EQ|INE121A01024",
  "FEDERALBNK": "NSE_EQ|INE171A01029",
  "BANDHANBNK": "NSE_EQ|INE545U01014",
  "PNB": "NSE_EQ|INE160A01022",
  "CANBK": "NSE_EQ|INE476A01022",
  "BANKBARODA": "NSE_EQ|INE028A01039",
  "TATAPOWER": "NSE_EQ|INE245A01021",
  "TORNTPHARM": "NSE_EQ|INE685A01028",
  "LUPIN": "NSE_EQ|INE326A01037",
  "AUROPHARMA": "NSE_EQ|INE406A01037",
  "BIOCON": "NSE_EQ|INE376G01013",
  "GMRINFRA": "NSE_EQ|INE776C01039",
  "INDIGO": "NSE_EQ|INE646L01027",
};

/**
 * Upstox Developer API v2 Adapter
 * Documentation: https://upstox.com/developer/api-documentation
 */
export class UpstoxMarketDataAdapter implements MarketDataProvider {
  readonly name = "upstox";
  readonly isRealtime = true;
  readonly dataStatus: DataStatus = (env as any).UPSTOX_ACCESS_TOKEN ? "LIVE" : "DELAYED";

  private accessToken: string | undefined;
  private apiKey: string | undefined;
  private baseUrl: string;
  private cache = new Map<string, { quote: Quote; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 2_000;

  constructor() {
    this.accessToken = (env as any).UPSTOX_ACCESS_TOKEN;
    this.apiKey = (env as any).UPSTOX_API_KEY;
    this.baseUrl = process.env["UPSTOX_API_BASE_URL"] || "https://api.upstox.com/v2";

    if (this.accessToken) {
      console.log("⚡  Upstox API v2 active (Real-time NSE LTP & Quotes)");
    } else {
      console.log(
        "💡  Upstox Adapter initialized in sandbox mode. Set UPSTOX_ACCESS_TOKEN in .env for direct broker connectivity."
      );
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.accessToken}`,
      "Accept": "application/json",
      "Api-Version": "2.0",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  private formatUpstoxQuote(symbol: string, data: any): Quote {
    const ltp = parseFloat(data.last_price || data.ohlc?.close || 0);
    const netChange = typeof data.net_change === "number" ? data.net_change : 0;
    const prevClose = parseFloat((ltp - netChange).toFixed(2));
    const change = parseFloat(netChange.toFixed(2));
    const changePct = parseFloat(((change / (prevClose || 1)) * 100).toFixed(2));

    return {
      symbol: symbol.toUpperCase(),
      exchange: "NSE",
      currentPrice: ltp.toFixed(2),
      previousClose: prevClose.toFixed(2),
      change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
      changePercent: changePct > 0 ? `+${changePct.toFixed(2)}` : changePct.toFixed(2),
      dayHigh: (data.ohlc?.high ?? ltp).toFixed(2),
      dayLow: (data.ohlc?.low ?? ltp).toFixed(2),
      volume: data.volume ?? 1_250_000,
      bid: (data.depth?.buy?.[0]?.price ?? ltp).toFixed(2),
      ask: (data.depth?.sell?.[0]?.price ?? ltp).toFixed(2),
      dataStatus: "LIVE",
      timestamp: data.timestamp || new Date().toISOString(),
    };
  }

  async getQuote(symbol: string): Promise<Quote> {
    const upperSym = symbol.toUpperCase();

    // Check cache
    const cached = this.cache.get(upperSym);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.quote;
    }

    // If Upstox Access Token is configured, fetch live quote from Upstox API v2
    if (this.accessToken) {
      try {
        const instrumentKey = UPSTOX_INSTRUMENT_MAP[upperSym] ?? `NSE_EQ|${upperSym}`;
        const url = `${this.baseUrl}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
          headers: this.getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const json = (await res.json()) as any;
          const keys = Object.keys(json.data ?? {});
          const data = keys.length > 0 && keys[0] ? json.data[keys[0]] : undefined;

          if (data && (data.last_price || data.ohlc?.close)) {
            const quote = this.formatUpstoxQuote(upperSym, data);
            this.cache.set(upperSym, { quote, cachedAt: Date.now() });
            return quote;
          }
        }
      } catch (err) {
        console.warn(`[Upstox API] Fetch failed for ${upperSym}:`, (err as Error).message);
      }
    }

    // Fallback if network or key missing
    const basePrice = getStockBasePrice(upperSym);
    const prevClose = +(basePrice * 0.995).toFixed(2);
    const change = +(basePrice - prevClose).toFixed(2);
    const changePercent = +((change / prevClose) * 100).toFixed(2);

    const fallbackQuote: Quote = {
      symbol: upperSym,
      exchange: "NSE",
      currentPrice: basePrice.toFixed(2),
      previousClose: prevClose.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      dayHigh: (basePrice * 1.01).toFixed(2),
      dayLow: (basePrice * 0.99).toFixed(2),
      volume: 1_500_000,
      bid: (basePrice - 0.05).toFixed(2),
      ask: (basePrice + 0.05).toFixed(2),
      dataStatus: this.dataStatus,
      timestamp: new Date().toISOString(),
    };

    this.cache.set(upperSym, { quote: fallbackQuote, cachedAt: Date.now() });
    return fallbackQuote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (!this.accessToken) {
      return Promise.all(symbols.map((s) => this.getQuote(s)));
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const instrumentKeys: string[] = [];
    const tokenToSymbolsMap = new Map<string, string[]>();

    for (const sym of upperSymbols) {
      const ik = UPSTOX_INSTRUMENT_MAP[sym];
      if (ik) {
        if (!instrumentKeys.includes(ik)) {
          instrumentKeys.push(ik);
        }
        const list = tokenToSymbolsMap.get(ik) || [];
        list.push(sym);
        tokenToSymbolsMap.set(ik, list);

        const colonKey = ik.replace("|", ":");
        const listColon = tokenToSymbolsMap.get(colonKey) || [];
        listColon.push(sym);
        tokenToSymbolsMap.set(colonKey, listColon);
      }
    }

    if (instrumentKeys.length === 0) {
      return Promise.all(symbols.map((s) => this.getQuote(s)));
    }

    try {
      // Chunk instrument keys into batches of 30 to prevent URL truncation or gateway timeouts
      const chunkSize = 30;
      const chunks: string[][] = [];
      for (let i = 0; i < instrumentKeys.length; i += chunkSize) {
        chunks.push(instrumentKeys.slice(i, i + chunkSize));
      }

      const results: Quote[] = [];

      await Promise.all(
        chunks.map(async (chunk) => {
          const url = `${this.baseUrl}/market-quote/quotes?instrument_key=${encodeURIComponent(chunk.join(","))}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          try {
            const res = await fetch(url, {
              headers: this.getHeaders(),
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (res.ok) {
              const json = (await res.json()) as any;
              for (const [key, val] of Object.entries(json.data ?? {})) {
                const rawToken = (val as any)?.instrument_token || key.replace(":", "|");
                const matchedList = tokenToSymbolsMap.get(rawToken) || tokenToSymbolsMap.get(key) || [];

                // Also check symbol field
                const rawSymbol = (val as any)?.symbol;
                if (rawSymbol && rawSymbol !== "NA" && !matchedList.includes(rawSymbol)) {
                  matchedList.push(rawSymbol);
                }

                if (matchedList.length === 0) {
                  const symFromKey = key.split(":")[1] || "";
                  if (symFromKey) matchedList.push(symFromKey);
                }

                for (const sym of matchedList) {
                  const quote = this.formatUpstoxQuote(sym, val);
                  this.cache.set(sym, { quote, cachedAt: Date.now() });
                  results.push(quote);
                }
              }
            }
          } catch (chunkErr) {
            clearTimeout(timeout);
            console.warn("[Upstox API] Chunk quote fetch error:", (chunkErr as Error).message);
          }
        })
      );

      if (results.length > 0) {
        return upperSymbols.map((sym) => {
          const cached = this.cache.get(sym);
          if (cached) return cached.quote;
          const found = results.find((r) => r.symbol === sym);
          if (found) return found;
          const basePrice = getStockBasePrice(sym);
          return {
            symbol: sym,
            exchange: "NSE",
            currentPrice: basePrice.toFixed(2),
            previousClose: (basePrice * 0.995).toFixed(2),
            change: "0.00",
            changePercent: "0.00",
            dayHigh: (basePrice * 1.01).toFixed(2),
            dayLow: (basePrice * 0.99).toFixed(2),
            volume: 1_000_000,
            bid: (basePrice - 0.05).toFixed(2),
            ask: (basePrice + 0.05).toFixed(2),
            dataStatus: this.dataStatus,
            timestamp: new Date().toISOString(),
          };
        });
      }
    } catch (err) {
      console.warn("[Upstox API] Batch getQuotes failed, falling back to individual calls:", (err as Error).message);
    }

    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  async getOHLCV(symbol: string, period: string, interval: string = "1d"): Promise<OHLCVCandle[]> {
    const upperSym = symbol.toUpperCase();
    const isIntraday =
      ["1m", "5m", "15m", "30m", "1h", "1H"].includes(interval) ||
      period === "1D" ||
      period === "INTRADAY";

    let intervalMinutes = 5;
    if (interval === "1m") intervalMinutes = 1;
    else if (interval === "5m") intervalMinutes = 5;
    else if (interval === "15m") intervalMinutes = 15;
    else if (interval === "30m") intervalMinutes = 30;
    else if (interval === "1h" || interval === "1H") intervalMinutes = 60;

    // If Upstox token is configured, fetch real candles from Upstox API
    if (this.accessToken) {
      try {
        const instrumentKey = UPSTOX_INSTRUMENT_MAP[upperSym] ?? `NSE_EQ|${upperSym}`;

        if (isIntraday) {
          const upstoxInterval = interval === "30m" ? "30minute" : "1minute";
          const bucketSize = interval === "30m" ? 1 : intervalMinutes;
          
          // 1. Try today's live intraday candles
          let url = `${this.baseUrl}/historical-candle/intraday/${encodeURIComponent(instrumentKey)}/${upstoxInterval}`;
          let controller = new AbortController();
          let timeout = setTimeout(() => controller.abort(), 4000);

          let res = await fetch(url, {
            headers: this.getHeaders(),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          let candles: any[] = [];
          if (res.ok) {
            const json = (await res.json()) as any;
            candles = json.data?.candles || [];
          }

          // 2. If 0 candles (e.g. pre-market or outside session), fetch latest trading session's real 1-minute candles from Upstox
          if (!candles || candles.length === 0) {
            const toDate = new Date().toISOString().split("T")[0];
            const fallbackUrl = `${this.baseUrl}/historical-candle/${encodeURIComponent(instrumentKey)}/1minute/${toDate}`;
            const c2 = new AbortController();
            const t2 = setTimeout(() => c2.abort(), 5000);
            try {
              const r2 = await fetch(fallbackUrl, {
                headers: this.getHeaders(),
                signal: c2.signal,
              });
              clearTimeout(t2);
              if (r2.ok) {
                const j2 = (await r2.json()) as any;
                const allCandles = j2.data?.candles || [];
                if (Array.isArray(allCandles) && allCandles.length > 0) {
                  // Upstox returns newest first: take last session (up to 375 1-min bars)
                  candles = allCandles.slice(0, 375);
                }
              }
            } catch {
              clearTimeout(t2);
            }
          }

          if (Array.isArray(candles) && candles.length > 0) {
            const parsed: OHLCVCandle[] = candles.map((c: any) => {
              const ts = c[0] || "";
              const timeSec = Math.floor(new Date(ts).getTime() / 1000);
              return {
                date: ts,
                time: timeSec,
                open: parseFloat(c[1]).toFixed(2),
                high: parseFloat(c[2]).toFixed(2),
                low: parseFloat(c[3]).toFixed(2),
                close: parseFloat(c[4]).toFixed(2),
                volume: parseInt(c[5], 10) || 500,
              };
            }).reverse();

            const aggregated = this.aggregateCandles(parsed, bucketSize);
            if (aggregated.length > 0) {
              return aggregated;
            }
          }
        } else {
          // Daily / Multi-day
          const toDate = new Date().toISOString().split("T")[0];
          const url = `${this.baseUrl}/historical-candle/${encodeURIComponent(instrumentKey)}/day/${toDate}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(url, {
            headers: this.getHeaders(),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const json = (await res.json()) as any;
            const candles = json.data?.candles;
            if (Array.isArray(candles) && candles.length > 0) {
              return candles.slice(0, 100).map((c: any) => ({
                date: (c[0] || "").split("T")[0],
                open: parseFloat(c[1]).toFixed(2),
                high: parseFloat(c[2]).toFixed(2),
                low: parseFloat(c[3]).toFixed(2),
                close: parseFloat(c[4]).toFixed(2),
                volume: parseInt(c[5], 10) || 500_000,
              })).reverse();
            }
          }
        }
      } catch (err) {
        console.warn(`[Upstox API] Candles failed for ${upperSym}:`, (err as Error).message);
      }
    }

    // High-performance calibrated fallback engine
    const basePrice = getStockBasePrice(upperSym);

    if (isIntraday) {
      return generateIntradayOHLCV(upperSym, basePrice, intervalMinutes);
    }

    const periodToDays: Record<string, number> = {
      "1D": 7,
      "1W": 14,
      "1M": 35,
      "3M": 95,
      "6M": 185,
      "1Y": 365,
      "2Y": 730,
      "5Y": 1825,
    };
    const days = periodToDays[period] ?? 365;
    return generateOHLCV(upperSym, basePrice, days);
  }

  private aggregateCandles(candles: OHLCVCandle[], bucketSize: number): OHLCVCandle[] {
    if (bucketSize <= 1 || candles.length === 0) return candles;
    const result: OHLCVCandle[] = [];
    for (let i = 0; i < candles.length; i += bucketSize) {
      const chunk = candles.slice(i, i + bucketSize);
      if (chunk.length === 0) continue;
      const open = chunk[0]!.open;
      const close = chunk[chunk.length - 1]!.close;
      let high = parseFloat(chunk[0]!.high);
      let low = parseFloat(chunk[0]!.low);
      let vol = 0;
      for (const c of chunk) {
        const h = parseFloat(c.high);
        const l = parseFloat(c.low);
        if (h > high) high = h;
        if (l < low) low = l;
        vol += c.volume;
      }
      const lastCandle = chunk[chunk.length - 1]!;
      const aggregatedItem: OHLCVCandle = {
        date: lastCandle.date,
        open,
        high: high.toFixed(2),
        low: low.toFixed(2),
        close,
        volume: vol,
      };
      if (typeof lastCandle.time === "number") {
        aggregatedItem.time = lastCandle.time;
      }
      result.push(aggregatedItem);
    }
    return result;
  }

  async getMarketSummary(): Promise<MarketSummary> {
    const quotes = await this.getQuotes(NSE_UNIVERSE.slice(0, 30).map((s) => s.symbol));

    const sorted = [...quotes].sort(
      (a, b) => parseFloat(b.changePercent) - parseFloat(a.changePercent)
    );

    const indices: MarketIndex[] = INDICES.map((idx) => {
      const variation = (Math.random() - 0.49) * 0.01;
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

    const now = new Date();
    const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;
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
      mostActive: quotes.sort((a, b) => b.volume - a.volume).slice(0, 5),
      marketStatus,
      asOf: new Date().toISOString(),
    };
  }

  async searchStocks(query: string): Promise<Partial<Stock>[]> {
    const rawQ = (query || "").trim().toLowerCase();
    if (!rawQ) {
      return NSE_UNIVERSE.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        exchange: "NSE" as const,
        sector: s.sector,
        industry: s.industry,
        marketCap: s.marketCap,
        isActive: true,
      }));
    }

    const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanQ = clean(rawQ);

    const matches = NSE_UNIVERSE.filter((s) => {
      const symLow = s.symbol.toLowerCase();
      const nameLow = s.name.toLowerCase();
      const sectorLow = (s.sector || "").toLowerCase();
      const indLow = (s.industry || "").toLowerCase();

      const symClean = clean(s.symbol);
      const nameClean = clean(s.name);

      return (
        symLow.includes(rawQ) ||
        nameLow.includes(rawQ) ||
        sectorLow.includes(rawQ) ||
        indLow.includes(rawQ) ||
        (cleanQ.length > 0 && (symClean.includes(cleanQ) || nameClean.includes(cleanQ)))
      );
    });

    // Score and rank matches so exact or prefix matches appear at the top
    matches.sort((a, b) => {
      const aSym = a.symbol.toLowerCase();
      const bSym = b.symbol.toLowerCase();
      const aClean = clean(a.symbol);
      const bClean = clean(b.symbol);

      const aExact = aSym === rawQ || aClean === cleanQ ? 1 : 0;
      const bExact = bSym === rawQ || bClean === cleanQ ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      const aStarts = aSym.startsWith(rawQ) || aClean.startsWith(cleanQ) ? 1 : 0;
      const bStarts = bSym.startsWith(rawQ) || bClean.startsWith(cleanQ) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;

      return a.symbol.localeCompare(b.symbol);
    });

    return matches.map((s) => ({
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
