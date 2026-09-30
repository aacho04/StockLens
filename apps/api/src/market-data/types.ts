import type { Quote, OHLCVCandle, MarketSummary, DataStatus, Stock } from "@stocklens/types";

// ─── Provider Interface ────────────────────────────────────────────────────────

export interface MarketDataProvider {
  /** Get current quote for a symbol */
  getQuote(symbol: string): Promise<Quote>;

  /** Get quotes for multiple symbols */
  getQuotes(symbols: string[]): Promise<Quote[]>;

  /** Get OHLCV candles for a symbol */
  getOHLCV(
    symbol: string,
    period: string,
    interval: string
  ): Promise<OHLCVCandle[]>;

  /** Get market summary (indices + movers) */
  getMarketSummary(): Promise<MarketSummary>;

  /** Search for stocks by query */
  searchStocks(query: string): Promise<Partial<Stock>[]>;

  /** Provider name for logging */
  readonly name: string;

  /** Whether data is real-time */
  readonly isRealtime: boolean;

  /** Data status label shown to users */
  readonly dataStatus: DataStatus;
}
