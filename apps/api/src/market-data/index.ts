import { env } from "../config/env.js";
import { MockMarketDataAdapter } from "./mock.adapter.js";
import { FinnhubMarketDataAdapter } from "./finnhub.adapter.js";
import { YahooFinanceAdapter } from "./yahoo.adapter.js";
import { GrowwMarketDataAdapter } from "./groww.adapter.js";
import { UpstoxMarketDataAdapter } from "./upstox.adapter.js";
import type { MarketDataProvider } from "./types.js";

export function createMarketDataProvider(): MarketDataProvider {
  switch (env.MARKET_DATA_PROVIDER) {
    case "mock":
      console.log("📊  Using mock market data provider");
      return new MockMarketDataAdapter();

    case "upstox":
      console.log("📊  Using Upstox API v2 provider (real-time Data API)");
      return new UpstoxMarketDataAdapter();

    case "groww":
      console.log("📊  Using Groww Trade API provider (real-time Data API)");
      return new GrowwMarketDataAdapter();

    case "finnhub":
      console.log("📊  Using Finnhub market data provider");
      return new FinnhubMarketDataAdapter();

    case "yahoo":
      console.log("📊  Using Yahoo Finance adapter (real NSE data, ~15min delay)");
      return new YahooFinanceAdapter();

    default:
      throw new Error(
        `Unknown market data provider: ${env.MARKET_DATA_PROVIDER}`
      );
  }
}

// Singleton instance
let _provider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!_provider) {
    _provider = createMarketDataProvider();
  }
  return _provider;
}

export type { MarketDataProvider };
