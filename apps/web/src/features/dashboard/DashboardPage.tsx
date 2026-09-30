import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import type { MarketSummary, Quote, MarketIndex } from "@stocklens/types";

// ─── Sub-components ───────────────────────────────────────────────────────────

const INDEX_SYMBOL_MAP: Record<string, string> = {
  "NIFTY 50": "NIFTY",
  "NIFTY": "NIFTY",
  "NIFTY BANK": "BANKNIFTY",
  "BANKNIFTY": "BANKNIFTY",
  "SENSEX": "SENSEX",
  "FINNIFTY": "FINNIFTY",
  "MIDCPNIFTY": "MIDCPNIFTY",
};

const IndexCard: React.FC<{ index: MarketIndex }> = ({ index }) => {
  const sym = INDEX_SYMBOL_MAP[index.name.toUpperCase()] ?? index.name;
  const { quote, tickDirection } = useLiveQuote(sym);

  const currentVal = quote ? parseFloat(quote.currentPrice) : parseFloat(index.value);
  const changeVal = quote ? parseFloat(quote.change) : parseFloat(index.change);
  const pctVal = quote ? parseFloat(quote.changePercent) : parseFloat(index.changePercent);
  const isGain = pctVal >= 0;

  return (
    <Link
      to={`/stocks/${sym}`}
      className="glass-card p-4 flex-1 min-w-[170px] hover:border-[#6366f1]/60 hover:bg-[#1a2235] transition-all cursor-pointer group block"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-[#94a3b8] font-medium group-hover:text-[#818cf8] transition-colors">{index.name}</p>
        <span className="text-[10px] text-[#818cf8] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          Trade →
        </span>
      </div>
      <p className={`text-xl font-bold mono transition-all ${
        tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
      }`}>
        {currentVal.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-sm font-semibold mono ${isGain ? "text-gain" : "text-loss"}`}>
          {isGain ? "▲" : "▼"} {Math.abs(pctVal).toFixed(2)}%
        </span>
        <span className={`text-xs mono ${isGain ? "text-gain" : "text-loss"}`}>
          {isGain ? "+" : ""}{changeVal.toFixed(2)}
        </span>
      </div>
    </Link>
  );
};

interface StockInfo {
  symbol: string;
  name: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: string;
}

const SectorStockRow: React.FC<{ stock: StockInfo; quote: Quote | null | undefined; index: number }> = ({ stock, quote: initialQuote, index }) => {
  const { quote, tickDirection } = useLiveQuote(stock.symbol, initialQuote);
  const pct = quote ? parseFloat(quote.changePercent) : 0;
  const isGain = pct >= 0;
  const hasQuote = !!quote;

  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-[#1a2235] transition-colors border-b border-[#1f2d45] last:border-b-0 group"
    >
      {/* Left: Index + Avatar + Symbol + Name */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 pr-2 sm:pr-3">
        <span className="text-xs text-[#475569] w-4 text-center hidden sm:inline-block flex-shrink-0">
          {index + 1}
        </span>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[rgba(99,102,241,0.12)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <span className="text-[11px] sm:text-xs font-bold text-[#818cf8]">{stock.symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors truncate">
              {stock.symbol}
            </span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[rgba(99,102,241,0.08)] text-[#818cf8] font-medium hidden md:inline">
              {stock.exchange || "NSE"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#94a3b8] truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md">{stock.name}</p>
        </div>
      </div>

      {/* Middle: Sector / Industry */}
      <div className="hidden lg:block w-52 text-left pr-4">
        <span className="text-xs text-[#f1f5f9] font-medium block truncate">{stock.sector}</span>
        <span className="text-[11px] text-[#475569] block truncate">{stock.industry || "—"}</span>
      </div>

      {/* Right: LTP & Change */}
      <div className="flex items-center gap-2 sm:gap-5 md:gap-8 flex-shrink-0">
        <div className={`text-right min-w-[70px] sm:min-w-[80px] px-1 py-0.5 rounded transition-all ${
          tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
        }`}>
          {hasQuote ? (
            <>
              <p className={`text-xs sm:text-sm font-bold mono ${isGain ? "text-gain" : "text-loss"}`}>
                ₹{parseFloat(quote!.currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#475569] mono">
                {isGain ? "+" : ""}{parseFloat(quote!.change).toFixed(2)}
              </p>
            </>
          ) : (
            <Skeleton width="60px" height="16px" className="ml-auto" />
          )}
        </div>

        <div className="w-[64px] sm:w-20 text-right">
          {hasQuote ? (
            <span className={`inline-flex items-center justify-center min-w-[60px] sm:min-w-[70px] text-[11px] sm:text-xs font-semibold mono px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-[6px] ${
              isGain ? "bg-gain text-gain" : "bg-loss text-loss"
            }`}>
              {isGain ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          ) : (
            <Skeleton width="60px" height="20px" className="ml-auto" />
          )}
        </div>

        {/* Action arrow */}
        <div className="w-4 text-[#475569] group-hover:text-[#818cf8] group-hover:translate-x-0.5 transition-all hidden sm:block">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

// ─── Market Status Banner ─────────────────────────────────────────────────────

const MarketStatusBanner: React.FC<{ status: MarketSummary["marketStatus"] }> = ({ status }) => {
  const config = {
    OPEN: { label: "Market Open", color: "text-gain", dot: "bg-[#10b981]", pulse: true },
    CLOSED: { label: "Market Closed", color: "text-[#475569]", dot: "bg-[#475569]", pulse: false },
    PRE_MARKET: { label: "Pre-Market", color: "text-[#f59e0b]", dot: "bg-[#f59e0b]", pulse: true },
    POST_MARKET: { label: "Post-Market", color: "text-[#818cf8]", dot: "bg-[#818cf8]", pulse: false },
  }[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.dot} ${config.pulse ? "animate-pulse" : ""}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      <span className="text-xs text-[#475569]">NSE / BSE</span>
    </div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Market indices & status (fast: index data only)
  const { data: summary, isLoading: indicesLoading } = useQuery<MarketSummary>({
    queryKey: ["market-summary"],
    queryFn: async () => {
      const res = await apiClient.get("/stocks/market-summary");
      return res.data.data;
    },
    refetchInterval: 30_000, // indices every 30s (Yahoo is 15-min delayed anyway)
  });

  // Stock universe grouped by sector — metadata only, no quotes (fast!)
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery<
    Array<{ sector: string; stocks: StockInfo[] }>
  >({
    queryKey: ["sectors-overview"],
    queryFn: async () => {
      const res = await apiClient.get("/stocks/sectors/overview");
      return res.data.data;
    },
    staleTime: 5 * 60_000, // stock list doesn't change often
  });

  const sectors = sectorsData ?? [];
  const sectorNames = ["ALL", ...sectors.map((s) => s.sector)];

  // Flat list of all stocks
  const allStocks: StockInfo[] = sectors.flatMap((s) => s.stocks);

  // Stocks visible in current sector tab
  const displayedStocks: StockInfo[] =
    selectedSector === "ALL"
      ? allStocks
      : sectors.find((s) => s.sector === selectedSector)?.stocks ?? [];

  const totalStocks = allStocks.length;

  // Build a symbol -> quote map directly from sector overview data (0 network overhead!)
  const quotesMap = React.useMemo(() => {
    const map: Record<string, Quote | null> = {};
    allStocks.forEach((stock: any) => {
      map[stock.symbol] = stock.quote ?? null;
    });
    return map;
  }, [allStocks]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · Indian Stock Markets
          </p>
        </div>
        {summary && <MarketStatusBanner status={summary.marketStatus} />}
      </div>

      {/* Market Indices Strip */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
            Market Indices
          </h2>
          <span className="text-xs text-[#10b981] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            Live Market Stream · Click to Trade
          </span>
        </div>
        {indicesLoading ? (
          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 sm:flex-wrap scrollbar-none">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} className="flex-1 min-w-[150px] sm:min-w-[160px] shrink-0 sm:shrink" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 sm:flex-wrap scrollbar-none">
            {summary?.indices.map((idx) => (
              <IndexCard key={idx.name} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Sector Filter Buttons / Pills */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f1f5f9]">
            {selectedSector === "ALL" ? "All Stocks" : `${selectedSector} Stocks`}
          </h2>
          <span className="text-xs text-[#94a3b8]">
            {displayedStocks.length} of {totalStocks} stocks
          </span>
        </div>

        {/* Horizontal Sector Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sectorNames.map((secName) => {
            const isSelected = selectedSector === secName;
            const count =
              secName === "ALL"
                ? totalStocks
                : sectors.find((s) => s.sector === secName)?.stocks.length ?? 0;

            return (
              <button
                key={secName}
                onClick={() => setSelectedSector(secName)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                    : "glass-card text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[rgba(99,102,241,0.3)]"
                }`}
              >
                <span>{secName === "ALL" ? "All Sectors" : secName}</span>
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#1f2d45] text-[#94a3b8]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Unified Single List Table */}
      <div>
        {sectorsLoading ? (
          <div className="glass-card p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="48px" className="rounded-[8px]" />
            ))}
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="glass-card p-12 text-center text-[#475569]">
            No stocks found for the selected sector.
          </div>
        ) : (
          <div className="glass-card rounded-[14px] overflow-hidden border border-[#1f2d45]">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1220] border-b border-[#1f2d45] text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                <span className="w-4 text-center hidden sm:inline-block">#</span>
                <span>Stock / Company</span>
              </div>
              <div className="hidden lg:block w-52 text-left pr-4">Sector / Industry</div>
              <div className="flex items-center gap-5 sm:gap-8 flex-shrink-0">
                <div className="min-w-[80px] text-right">LTP</div>
                <div className="w-20 text-right">Day Change</div>
                <div className="w-4 hidden sm:block" />
              </div>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-[#1f2d45]">
              {displayedStocks.map((stock, i) => (
                <SectorStockRow
                  key={stock.symbol}
                  stock={stock}
                  quote={quotesMap[stock.symbol]}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-[#475569] text-center pt-2">
        {totalStocks} NSE stocks · Prices via Yahoo Finance (~15-min delay) · Refreshing every 10s
      </p>
    </div>
  );
};
