# ADR-003: Finnhub as Phase 2 Market Data Provider

**Date:** 2026-09-23
**Status:** Proposed (Phase 2)

---

## What

**Phase 1:** Mock data adapter (deterministic random walk, 30 NSE stocks, no API key).
**Phase 2+:** **Finnhub** (free tier) for real US market data via REST + WebSocket.

## Why Finnhub (Phase 2)

1. **WebSocket support on free tier** — 50 simultaneous symbol subscriptions; perfect for watchlist live prices.
2. **60 REST requests/minute** — sufficient for Phase 2 user load.
3. **No API key needed in Phase 1** — mock adapter gets us fully working without external dependencies.
4. **Comprehensive endpoints** — quotes, OHLCV, company profiles, news, earnings.
5. **Free tier is permanent** — unlike many providers that cut free access, Finnhub's free tier has been stable.

## Redistribution Limitations

⚠️ Finnhub's free tier is licensed for **personal/non-commercial use only**. If StockLens ever becomes a public-facing commercial service, a commercial Finnhub plan (or a licensed enterprise provider like Refinitiv/Bloomberg) will be required.

## Indian Market Note

Finnhub's free tier covers **US markets (NYSE, NASDAQ)**. NSE/BSE data is paid. Options for Phase 2:
- Switch UI symbols to US market (AAPL, TSLA, etc.)
- Use a separate NSE provider (e.g., NSEpy for historical, or a paid tier)
- Keep mock adapter for Indian stocks + Finnhub for US stocks

**Decision deferred to Phase 2 planning.**

## Alternatives considered

- **Alpha Vantage** — 25 req/day on free tier (too low). Good historical data.
- **Twelve Data** — 800 req/day free, real-time streaming. Strong alternative.
- **Marketstack** — No real-time on free tier.
- **EODHD** — 15-min delay, broad global coverage. Good alternative for historical.
