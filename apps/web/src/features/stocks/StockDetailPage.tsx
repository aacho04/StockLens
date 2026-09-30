import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ChangeBadge, Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { CandlestickChart, AreaChart } from "@/components/charts/Charts";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { TradePanel } from "@/components/trading/TradePanel";
import { PredictionCard } from "./PredictionCard";
import { StockOptionChain } from "./StockOptionChain";
import { StockRiskProfile } from "./StockRiskProfile";
import type { Quote, OHLCVCandle } from "@stocklens/types";

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "1D" | "1W" | "1M" | "1Y";

const TIMEFRAMES: { label: string; value: Timeframe; period: string; interval: string }[] = [
  { label: "1m", value: "1m", period: "INTRADAY", interval: "1m" },
  { label: "5m", value: "5m", period: "INTRADAY", interval: "5m" },
  { label: "15m", value: "15m", period: "INTRADAY", interval: "15m" },
  { label: "30m", value: "30m", period: "INTRADAY", interval: "30m" },
  { label: "1H", value: "1H", period: "INTRADAY", interval: "1H" },
  { label: "1D", value: "1D", period: "1D", interval: "1d" },
  { label: "1W", value: "1W", period: "1W", interval: "1d" },
  { label: "1M", value: "1M", period: "1M", interval: "1d" },
  { label: "1Y", value: "1Y", period: "1Y", interval: "1d" },
];

const MAJOR_INDICES = [
  { symbol: "NIFTY", name: "NIFTY 50", lot: 25 },
  { symbol: "BANKNIFTY", name: "BANK NIFTY", lot: 15 },
  { symbol: "FINNIFTY", name: "FINNIFTY", lot: 25 },
  { symbol: "SENSEX", name: "SENSEX", lot: 10 },
  { symbol: "MIDCPNIFTY", name: "MIDCP NIFTY", lot: 50 },
];

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 dark:bg-[#111827] rounded-[12px] p-3.5 border border-slate-200 dark:border-[#1f2d45] shadow-sm">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-sm font-bold mono text-slate-900 dark:text-[#f1f5f9]">{value}</p>
  </div>
);

export const StockDetailPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { symbol } = useParams<{ symbol: string }>();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("5m");
  const [chartType, setChartType] = useState<"candlestick" | "area">("candlestick");
  const [addedNotice, setAddedNotice] = useState(false);

  const sym = symbol?.toUpperCase() ?? "";
  const activeTf = TIMEFRAMES.find((t) => t.value === selectedTimeframe) ?? TIMEFRAMES[1]!;

  // Market status calculation (IST)
  const marketStatus = React.useMemo(() => {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const day = istDate.getDay();
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
    const isAutoSquareOff = isWeekday && totalMinutes >= 15 * 60 + 15 && totalMinutes <= 15 * 60 + 30;

    return {
      isOpen,
      isAutoSquareOff,
      label: isOpen ? (isAutoSquareOff ? "Square-Off Window" : "Market Open") : "Market Closed",
      hours: "09:15 - 15:30 IST",
    };
  }, []);

  // Watchlists
  const { data: watchlists } = useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const res = await apiClient.get("/watchlist");
      return res.data.data as Array<{ id: string; name: string }>;
    },
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (watchlistId: string) => {
      await apiClient.post(`/watchlist/${watchlistId}/stocks`, { symbol: sym });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 3000);
    },
  });

  // Stock + initial quote
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ["stock-detail", sym],
    queryFn: async () => {
      const res = await apiClient.get(`/stocks/${sym}`);
      return res.data.data as { stock: any; quote: Quote };
    },
  });

  // Real-time live ticks via WebSocket
  const { quote: liveQuote, tickDirection } = useLiveQuote(sym, stockData?.quote);
  const quote = liveQuote ?? stockData?.quote;
  const stock = stockData?.stock;

  // OHLCV with active timeframe
  const { data: ohlcvData, isLoading: chartLoading } = useQuery({
    queryKey: ["stock-ohlcv", sym, activeTf.period, activeTf.interval],
    queryFn: async () => {
      const res = await apiClient.get(`/stocks/${sym}/ohlcv`, {
        params: { period: activeTf.period, interval: activeTf.interval },
      });
      return res.data.data as { candles: OHLCVCandle[]; dataStatus: string };
    },
    refetchInterval: activeTf.period === "INTRADAY" ? 15000 : 60000,
  });

  const baseCandles = ohlcvData?.candles ?? [];

  // Update last candle close price with real-time live quote price
  const candles = React.useMemo(() => {
    if (!baseCandles.length || !quote?.currentPrice) return baseCandles;
    const currentPrice = parseFloat(quote.currentPrice);
    if (isNaN(currentPrice) || currentPrice <= 0) return baseCandles;

    const updated = [...baseCandles];
    const last = { ...updated[updated.length - 1]! };
    last.close = quote.currentPrice;
    const highNum = parseFloat(last.high);
    const lowNum = parseFloat(last.low);
    if (isNaN(highNum) || currentPrice > highNum) last.high = quote.currentPrice;
    if (isNaN(lowNum) || currentPrice < lowNum) last.low = quote.currentPrice;
    updated[updated.length - 1] = last;
    return updated;
  }, [baseCandles, quote?.currentPrice]);

  const pct = quote ? parseFloat(quote.changePercent) : 0;
  const isGain = pct >= 0;

  // Compute range stats from OHLCV
  const yearHigh = candles.length ? Math.max(...candles.map((c) => parseFloat(c.high))) : 0;
  const yearLow = candles.length ? Math.min(...candles.map((c) => parseFloat(c.low))) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in pb-10">
      {/* Breadcrumb & Major Index Quick Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-[#475569]">
          <Link to="/stocks" className="hover:text-indigo-600 dark:hover:text-[#818cf8] transition-colors font-medium">
            Markets
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 dark:text-[#f1f5f9]">{sym}</span>
        </div>

        {/* Quick Indices Bar (Nifty 50, Bank Nifty, FinNifty, Sensex) */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-nowrap max-w-full">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
            ⚡ Indices:
          </span>
          {MAJOR_INDICES.map((idx) => {
            const isCurrent = sym === idx.symbol || sym === idx.name;
            return (
              <Link
                key={idx.symbol}
                to={`/stocks/${idx.symbol}`}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border flex-shrink-0 ${
                  isCurrent
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <span>{idx.name}</span>
                <span className="text-[10px] opacity-75 font-normal">Lot: {idx.lot}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="glass-card p-4 sm:p-5">
        {stockLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton width="48px" height="48px" />
              <div className="space-y-2">
                <Skeleton width="200px" height="20px" />
                <Skeleton width="120px" height="14px" />
              </div>
            </div>
            <Skeleton width="180px" height="40px" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              {/* Stock avatar */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0">
                <span className="text-base sm:text-lg font-bold text-[#818cf8]">{sym.slice(0, 2)}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold truncate">{sym}</h1>
                  <Badge variant="neutral" size="sm">{stock?.exchange ?? "NSE"}</Badge>
                  <Badge variant="brand" size="sm">{stock?.sector ?? "—"}</Badge>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${
                      marketStatus.isOpen
                        ? marketStatus.isAutoSquareOff
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-700/20 border-slate-700/50 text-[#94a3b8]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        marketStatus.isOpen ? (marketStatus.isAutoSquareOff ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse") : "bg-slate-500"
                      }`}
                    />
                    <span>{marketStatus.label}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-400">
                    <span>{marketStatus.hours}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#94a3b8] mt-0.5 truncate">{stock?.name ?? sym}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!watchlists || watchlists.length === 0) {
                        const res = await apiClient.post("/watchlist", { name: "My Watchlist" });
                        addToWatchlistMutation.mutate(res.data.data.id);
                      } else {
                        addToWatchlistMutation.mutate(watchlists[0]!.id);
                      }
                    }}
                    disabled={addToWatchlistMutation.isPending}
                    className="text-xs py-1 h-7"
                  >
                    {addedNotice ? "✓ In Watchlist" : "+ Add to Watchlist"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Live Price with Flash Animation */}
            <div
              className={`text-left sm:text-right px-3 sm:px-4 py-2 rounded-[12px] bg-slate-50/50 dark:bg-slate-900/40 sm:bg-transparent transition-all duration-300 ${
                tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
              }`}
            >
              <div className="text-2xl sm:text-3xl font-bold mono">
                ₹{quote ? parseFloat(quote.currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
              </div>
              <div className="flex items-center gap-2 sm:justify-end mt-0.5 sm:mt-1">
                <span className={`text-sm sm:text-base font-semibold mono ${isGain ? "text-gain" : "text-loss"}`}>
                  {isGain ? "+" : ""}{quote?.change ?? "0"}
                </span>
                <ChangeBadge value={pct} size="md" />
              </div>
              <div className="flex items-center gap-1.5 sm:justify-end mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-emerald-400 uppercase">Upstox Live Stream</span>
                <span className="text-[10px] sm:text-[11px] text-[#64748b]">· {quote ? new Date(quote.timestamp).toLocaleTimeString("en-IN") : "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Layout: Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (Chart): Col 1-2 on desktop, 1st on mobile */}
        <div className="lg:col-span-2 space-y-5">
          {/* Interactive Chart */}
          <div className="glass-card p-4 sm:p-5">
            {/* Chart controls */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 sm:gap-3 mb-4">
              {/* Timeframe selector: 1m, 5m, 15m, 30m, 1H, 1D, 1W, 1M, 1Y */}
              <div className="flex gap-1 bg-[#111827] rounded-[10px] p-1 border border-[#1f2d45] overflow-x-auto scrollbar-none flex-nowrap max-w-full">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-all flex-shrink-0 ${
                      selectedTimeframe === tf.value
                        ? "bg-[#6366f1] text-white shadow-sm"
                        : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2333]"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Chart type */}
              <div className="flex gap-1 bg-[#111827] rounded-[10px] p-1 border border-[#1f2d45] flex-shrink-0">
                <button
                  onClick={() => setChartType("candlestick")}
                  className={`px-2.5 sm:px-3 py-1 rounded-[6px] text-xs font-semibold transition-all ${
                    chartType === "candlestick" ? "bg-[#1e2a3d] text-white" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  Candle
                </button>
                <button
                  onClick={() => setChartType("area")}
                  className={`px-2.5 sm:px-3 py-1 rounded-[6px] text-xs font-semibold transition-all ${
                    chartType === "area" ? "bg-[#1e2a3d] text-white" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  Area
                </button>
              </div>
            </div>

            {/* Chart */}
            {chartLoading ? (
              <Skeleton height="360px" className="rounded-[12px]" />
            ) : candles.length === 0 ? (
              <div className="h-[360px] flex items-center justify-center text-[#475569] text-sm">
                No chart data available for timeframe {selectedTimeframe}
              </div>
            ) : chartType === "candlestick" ? (
              <CandlestickChart data={candles} height={360} />
            ) : (
              <AreaChart data={candles} height={360} positive={isGain} />
            )}

            <div className="flex items-center justify-between text-xs text-[#94a3b8] mt-3 px-1 flex-wrap gap-2">
              <span>Timeframe: {selectedTimeframe} · Real Market Candles & Volume</span>
              <span className="text-[#64748b]">Powered by Upstox Market Engine</span>
            </div>
          </div>
        </div>

        {/* Trade Panel: Right Column on Desktop (Col 3 Sticky), 2nd on Mobile (Right under Chart!) */}
        <div id="trade-panel-section" className="lg:col-span-1 space-y-5 lg:row-span-2">
          <div className="lg:sticky lg:top-20">
            <TradePanel
              symbol={sym}
              name={stock?.name ?? sym}
              currentPrice={quote ? parseFloat(quote.currentPrice) : 0}
              exchange={stock?.exchange ?? "NSE"}
            />
          </div>
        </div>

        {/* Deep Analytics & Market Stats: Col 1-2 below chart on Desktop, 3rd on Mobile */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Stock Prediction Engine & Forecast Banner */}
          <PredictionCard
            symbol={sym}
            currentPrice={quote ? parseFloat(quote.currentPrice) : 0}
          />

          {/* Risk Assessment & Volatility Profile */}
          <StockRiskProfile symbol={sym} />

          {/* Interactive Option Chain */}
          <StockOptionChain symbol={sym} />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <StatBox label="Day High" value={quote ? `₹${parseFloat(quote.dayHigh).toLocaleString("en-IN")}` : "—"} />
            <StatBox label="Day Low" value={quote ? `₹${parseFloat(quote.dayLow).toLocaleString("en-IN")}` : "—"} />
            <StatBox label={`${selectedTimeframe} High`} value={yearHigh ? `₹${yearHigh.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"} />
            <StatBox label={`${selectedTimeframe} Low`} value={yearLow ? `₹${yearLow.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"} />
            <StatBox label="Volume" value={quote ? parseInt(String(quote.volume)).toLocaleString("en-IN") : "—"} />
            <StatBox label="Prev Close" value={quote ? `₹${parseFloat(quote.previousClose).toLocaleString("en-IN")}` : "—"} />
            <StatBox label="Bid" value={quote?.bid ? `₹${parseFloat(quote.bid).toLocaleString("en-IN")}` : "—"} />
            <StatBox label="Ask" value={quote?.ask ? `₹${parseFloat(quote.ask).toLocaleString("en-IN")}` : "—"} />
          </div>
        </div>
      </div>

      {/* Mobile Floating 1-Tap Trading Bar (Docked above MobileNav on small screens) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d1220]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1f2d45] py-2 px-4 flex items-center justify-between shadow-2xl safe-area-bottom">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase leading-tight">
            {sym} · Live LTP
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold mono text-slate-900 dark:text-white">
              ₹{quote ? parseFloat(quote.currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
            </span>
            <span className={`text-[11px] font-bold ${isGain ? "text-emerald-500" : "text-rose-500"}`}>
              {isGain ? "+" : ""}{pct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("trade-panel-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            BUY (5x)
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("trade-panel-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 active:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            SELL (5x)
          </button>
        </div>
      </div>
    </div>
  );
};
