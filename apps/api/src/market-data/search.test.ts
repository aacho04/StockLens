import { describe, it, expect } from "vitest";
import { UpstoxMarketDataAdapter } from "./upstox.adapter.js";

describe("UpstoxMarketDataAdapter Search", () => {
  const adapter = new UpstoxMarketDataAdapter();

  it("finds NIFTY when searching 'nifty50'", async () => {
    const results = await adapter.searchStocks("nifty50");
    const symbols = results.map((r) => r.symbol);
    expect(symbols).toContain("NIFTY");
  });

  it("finds BANKNIFTY when searching 'banknifty'", async () => {
    const results = await adapter.searchStocks("banknifty");
    const symbols = results.map((r) => r.symbol);
    expect(symbols).toContain("BANKNIFTY");
  });

  it("finds TATA stocks when searching 'tata'", async () => {
    const results = await adapter.searchStocks("tata");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.symbol.startsWith("TATA"))).toBe(true);
  });
});
