import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ChangeBadge, Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { useMarketStreamStore } from "@/stores/marketStreamStore";
import type { Quote } from "@stocklens/types";

interface StockWithQuote {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: string;
  quote?: Quote | null;
}

const MarketStockRow: React.FC<{
  stock: StockWithQuote;
  idx: number;
}> = ({ stock, idx }) => {
  const { quote, tickDirection } = useLiveQuote(stock.symbol, stock.quote);
  const currentPrice = quote ? parseFloat(quote.currentPrice) : null;
  const pct = quote ? parseFloat(quote.changePercent) : null;
  const change = quote ? parseFloat(quote.change) : null;
  const isGain = pct !== null ? pct >= 0 : null;

  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[36px_1fr_130px_130px_100px] gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-[#111827] hover:bg-[#1a2235] transition-colors items-center group"
    >
      <span className="hidden md:inline text-xs text-[#475569]">{idx + 1}</span>

      {/* Stock Logo + Name */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-[8px] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <span className="text-[10px] font-bold text-[#818cf8]">{stock.symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs sm:text-sm font-semibold text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors truncate">
              {stock.symbol}
            </p>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#1e2a3d] text-[#64748b] font-medium hidden xs:inline">
              {stock.exchange || "NSE"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#64748b] truncate max-w-[140px] xs:max-w-[200px] sm:max-w-md">
            {stock.name}
          </p>
        </div>
      </div>

      {/* Sector (hidden on mobile to prevent overlapping) */}
      <div className="hidden md:block">
        <Badge variant="neutral" size="sm">{stock.sector || "Other"}</Badge>
      </div>

      {/* Price with Groww-style tick flashing */}
      <div className="text-right min-w-[70px] sm:min-w-[90px]">
        <div
          className={`inline-block px-1.5 py-0.5 rounded transition-colors ${
            tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
          }`}
        >
          <span
            className={`text-xs sm:text-sm font-semibold mono ${
              isGain === null ? "text-[#94a3b8]" : isGain ? "text-gain" : "text-loss"
            }`}
          >
            {currentPrice !== null
              ? `₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </span>
          {change !== null && (
            <p className="text-[10px] text-[#475569] mono">
              {change >= 0 ? "+" : ""}{change.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Percentage badge */}
      <div className="text-right min-w-[62px] sm:min-w-[70px]">
        {pct !== null ? (
          <ChangeBadge value={pct} size="sm" />
        ) : (
          <span className="text-xs text-[#2d3f5e]">—</span>
        )}
      </div>
    </Link>
  );
};

export const StockSearchPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const isConnected = useMarketStreamStore((s) => s.isConnected);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncMarket = async () => {
    setIsSyncing(true);
    try {
      const res = await apiClient.post("/stocks/sync-market");
      setSyncNotice(res.data.message || "Market prices synced");
      setTimeout(() => setSyncNotice(null), 4000);
    } catch {
      setSyncNotice("Sync failed");
      setTimeout(() => setSyncNotice(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Debounce search input 250ms
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch full stock list with quotes in 1 fast query
  const { data: results, isLoading } = useQuery<StockWithQuote[]>({
    queryKey: ["stock-search-page", debouncedQuery],
    queryFn: async () => {
      const res = await apiClient.get("/stocks/search", {
        params: { q: debouncedQuery || "", limit: 100 },
      });
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const allStocks = results ?? [];
  const SECTORS = [...new Set(allStocks.map((s) => s.sector))].filter(Boolean).sort();

  const filtered = activeSector
    ? allStocks.filter((s) => s.sector === activeSector)
    : allStocks;

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in pb-10">
      {/* Sync Notification Banner */}
      {syncNotice && (
        <div className="px-4 py-2 rounded-[8px] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>{syncNotice}</span>
          <button onClick={() => setSyncNotice(null)} className="text-[#64748b] hover:text-[#f1f5f9]">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold">Markets</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
              <span className="live-pulse-dot" />
              Live Stream
            </span>
          </div>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {allStocks.length > 0 ? `${allStocks.length} NSE-listed stocks` : "NSE Markets"} · Auto-syncs every 5 mins · 1.2s live ticks
          </p>
        </div>

        {/* Sync button & Live status badge */}
        <div className="flex items-center gap-2.5">
          <button
            id="sync-market-prices-btn"
            onClick={handleSyncMarket}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[#1a2235] hover:bg-[#243048] border border-[#2d3f5e] text-[#818cf8] transition-all disabled:opacity-50 hover:border-[#6366f1]"
            title="Auto-sync market prices across the entire universe"
          >
            <svg
              className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#818cf8]" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{isSyncing ? "Syncing..." : "Sync Prices"}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#64748b] bg-[#111827] px-3 py-1.5 rounded-[8px] border border-[#1f2d45]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#10b981] animate-pulse" : "bg-[#f59e0b]"}`} />
            <span>{isConnected ? "Live Stream Active" : "Connecting..."}</span>
          </div>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#475569] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          id="stocks-search-input"
          type="text"
          placeholder="Search by symbol, company name or sector (e.g. Reliance, TCS, HDFC, IT)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="!pl-12 pr-4 h-11 sm:h-12 text-xs sm:text-sm rounded-[12px] bg-[#111827] w-full border border-[rgba(255,255,255,0.06)] focus:outline-none focus:border-[#6366f1] transition-colors text-[#f1f5f9] placeholder:text-[#475569]"
        />
      </div>

      {/* Sector filter pills */}
      {SECTORS.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap items-center scrollbar-none">
          <button
            onClick={() => setActiveSector(null)}
            className={`px-3 py-1.5 rounded-[20px] text-xs font-medium transition-all shrink-0 ${
              !activeSector
                ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20"
                : "bg-[#1a2235] text-[#94a3b8] hover:bg-[#1e2a3d]"
            }`}
          >
            All ({allStocks.length})
          </button>
          {SECTORS.map((sector) => {
            const count = allStocks.filter((s) => s.sector === sector).length;
            return (
              <button
                key={sector}
                onClick={() => setActiveSector(sector === activeSector ? null : sector)}
                className={`px-3 py-1.5 rounded-[20px] text-xs font-medium transition-all shrink-0 ${
                  activeSector === sector
                    ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20"
                    : "bg-[#1a2235] text-[#94a3b8] hover:bg-[#1e2a3d]"
                }`}
              >
                {sector} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results table */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[36px_1fr_130px_130px_100px] gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3 border-b border-[#1f2d45] text-xs font-medium text-[#475569] uppercase tracking-wider">
          <span className="hidden md:inline">#</span>
          <span>Stock</span>
          <span className="hidden md:inline">Sector</span>
          <span className="text-right min-w-[70px] sm:min-w-[90px]">Price (₹)</span>
          <span className="text-right min-w-[62px] sm:min-w-[70px]">Change</span>
        </div>

        {isLoading ? (
          <div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[36px_1fr_130px_130px_100px] gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-3.5 border-b border-[#111827] items-center"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                  <Skeleton width="32px" height="32px" className="rounded-[8px] flex-shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton width="70px" height="14px" />
                    <Skeleton width="120px" height="11px" />
                  </div>
                </div>
                <div className="hidden md:block">
                  <Skeleton height="20px" width="70px" />
                </div>
                <Skeleton height="16px" className="ml-auto w-16 sm:w-20" />
                <Skeleton height="22px" className="ml-auto w-14 sm:w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#64748b] text-sm">No stocks found matching "{query}"</p>
          </div>
        ) : (
          <div>
            {filtered.map((stock, idx) => (
              <MarketStockRow key={stock.symbol} stock={stock} idx={idx} />
            ))}
          </div>
        )}

        {/* Footer bar */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1f2d45] flex items-center justify-between text-xs text-[#64748b]">
            <span>
              Showing {filtered.length} of {allStocks.length} NSE stocks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              Real-time ticks active
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
