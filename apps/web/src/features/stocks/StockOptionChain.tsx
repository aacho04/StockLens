import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface StockOptionChainProps {
  symbol: string;
}

type OptionViewMode = "quotes" | "oi" | "greeks";

export const StockOptionChain: React.FC<StockOptionChainProps> = ({ symbol }) => {
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [viewMode, setViewMode] = useState<OptionViewMode>("quotes");
  const [strikeRange, setStrikeRange] = useState<"near" | "all">("near");

  const { data, isLoading } = useQuery({
    queryKey: ["analysis-options", symbol, selectedExpiry],
    queryFn: async () => {
      const url = selectedExpiry
        ? `/analysis/options/${symbol}?expiry=${encodeURIComponent(selectedExpiry)}`
        : `/analysis/options/${symbol}`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Skeleton height="360px" className="rounded-2xl" />;
  }

  if (!data) return null;

  const expiries: string[] = data.availableExpiries && data.availableExpiries.length > 0
    ? data.availableExpiries
    : [data.expiryDate];

  const currentExpiry = selectedExpiry || data.expiryDate;
  const isUpstoxLive = data.dataSource === "UPSTOX_LIVE";

  // Filter strikes
  let displayStrikes = data.strikes || [];
  if (strikeRange === "near" && displayStrikes.length > 14) {
    const atmIndex = displayStrikes.findIndex((s: any) => s.isATM);
    const start = Math.max(0, atmIndex - 6);
    const end = Math.min(displayStrikes.length, atmIndex + 7);
    displayStrikes = displayStrikes.slice(start, end);
  }

  return (
    <div className="glass-card p-4 sm:p-5 border border-[var(--color-bg-border)] space-y-4 rounded-2xl shadow-sm">
      {/* ─── Header & Expiry Bar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--color-bg-border)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-extrabold text-[var(--color-text-primary)]">
              {symbol} Option Chain
            </h3>
            {isUpstoxLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Upstox Live Feed
              </span>
            ) : (
              <Badge variant="neutral" size="sm">Calibrated Feed</Badge>
            )}
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              Spot: <strong className="font-mono text-[var(--color-text-primary)]">₹{data.underlyingPrice?.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>

        {/* Expiry Selector & Range Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Expiry:</label>
            <select
              value={currentExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] text-xs rounded-lg px-2.5 py-1.5 font-bold text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {expiries.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-lg p-0.5 bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] text-xs">
            <button
              onClick={() => setStrikeRange("near")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                strikeRange === "near"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              ATM ± 6
            </button>
            <button
              onClick={() => setStrikeRange("all")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                strikeRange === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              All ({data.strikes?.length ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* ─── Metric Strip: PCR, Max Pain & Totals ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-bg-border)] text-xs">
        <div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium block">PCR (OI)</span>
          <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {data.pcrOI}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
            {data.pcrOI > 1.2 ? "(Bullish)" : data.pcrOI < 0.8 ? "(Bearish)" : "(Neutral)"}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium block">Max Pain Strike</span>
          <span className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
            ₹{data.maxPainStrike?.toLocaleString("en-IN")}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium block">Total Call OI</span>
          <span className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
            {data.totalCallOI?.toLocaleString("en-IN")}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium block">Total Put OI</span>
          <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
            {data.totalPutOI?.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* ─── View Mode Switcher (Quotes vs OI vs Greeks) ────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-xl p-1 bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] text-xs">
          <button
            onClick={() => setViewMode("quotes")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === "quotes"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Price & Volume
          </button>
          <button
            onClick={() => setViewMode("oi")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === "oi"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Open Interest (OI)
          </button>
          <button
            onClick={() => setViewMode("greeks")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === "greeks"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Option Greeks (Δ, Θ, Γ, IV)
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />
            In-The-Money (ITM)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
            At-The-Money (ATM)
          </span>
        </div>
      </div>

      {/* ─── Upstox-Style Interactive Ladder Table ─────────────────────── */}
      <div className="overflow-x-auto max-h-[460px] scrollbar-thin rounded-xl border border-[var(--color-bg-border)]">
        <table className="w-full text-xs text-center border-collapse">
          <thead className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-bg-border)] z-20 text-[11px] font-bold text-[var(--color-text-muted)]">
            {/* Super Header */}
            <tr className="border-b border-[var(--color-bg-border)]/60 text-[10px] uppercase tracking-wider">
              <th colSpan={viewMode === "quotes" ? 4 : viewMode === "oi" ? 3 : 5} className="py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold border-r border-[var(--color-bg-border)]">
                CALL OPTIONS (CE)
              </th>
              <th className="py-1 bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-black">
                STRIKE
              </th>
              <th colSpan={viewMode === "quotes" ? 4 : viewMode === "oi" ? 3 : 5} className="py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold border-l border-[var(--color-bg-border)]">
                PUT OPTIONS (PE)
              </th>
            </tr>

            {/* Sub Header per Column */}
            <tr className="bg-[var(--color-bg-input)]">
              {viewMode === "quotes" && (
                <>
                  <th className="py-2 px-2 text-right">Volume</th>
                  <th className="py-2 px-2 text-right">Bid</th>
                  <th className="py-2 px-2 text-right">Ask</th>
                  <th className="py-2 px-2.5 text-right font-extrabold border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400">LTP</th>
                </>
              )}
              {viewMode === "oi" && (
                <>
                  <th className="py-2 px-2 text-right">Chg in OI</th>
                  <th className="py-2 px-2 text-right font-extrabold">Call OI</th>
                  <th className="py-2 px-2 text-right border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400">LTP</th>
                </>
              )}
              {viewMode === "greeks" && (
                <>
                  <th className="py-2 px-1 text-right">IV%</th>
                  <th className="py-2 px-1 text-right">Delta</th>
                  <th className="py-2 px-1 text-right">Theta</th>
                  <th className="py-2 px-1 text-right">Gamma</th>
                  <th className="py-2 px-1.5 text-right border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400">LTP</th>
                </>
              )}

              {/* Central Strike */}
              <th className="py-2 px-3 bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-black">
                Strike
              </th>

              {viewMode === "quotes" && (
                <>
                  <th className="py-2 px-2.5 text-left font-extrabold border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400">LTP</th>
                  <th className="py-2 px-2 text-left">Bid</th>
                  <th className="py-2 px-2 text-left">Ask</th>
                  <th className="py-2 px-2 text-left">Volume</th>
                </>
              )}
              {viewMode === "oi" && (
                <>
                  <th className="py-2 px-2 text-left border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400">LTP</th>
                  <th className="py-2 px-2 text-left font-extrabold">Put OI</th>
                  <th className="py-2 px-2 text-left">Chg in OI</th>
                </>
              )}
              {viewMode === "greeks" && (
                <>
                  <th className="py-2 px-1.5 text-left border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400">LTP</th>
                  <th className="py-2 px-1 text-left">Delta</th>
                  <th className="py-2 px-1 text-left">Theta</th>
                  <th className="py-2 px-1 text-left">Gamma</th>
                  <th className="py-2 px-1 text-left">IV%</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-bg-border)] font-mono text-[11px]">
            {displayStrikes.map((st: any) => {
              const isATM = st.isATM;
              const isCallITM = st.isCallITM ?? (st.strikePrice < data.underlyingPrice);
              const isPutITM = st.isPutITM ?? (st.strikePrice > data.underlyingPrice);

              // ITM shading: amber tint for ITM contracts
              const callBg = isCallITM
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-transparent";
              const putBg = isPutITM
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-transparent";

              return (
                <tr
                  key={st.strikePrice}
                  className={`transition-colors hover:bg-indigo-500/5 ${isATM ? "ring-1 ring-indigo-500/50" : ""}`}
                >
                  {/* ─── CALL SIDE ─────────────────────────────────────── */}
                  {viewMode === "quotes" && (
                    <>
                      <td className={`py-1.5 px-2 text-right text-[var(--color-text-muted)] ${callBg}`}>
                        {st.call.volume ? st.call.volume.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-right text-[var(--color-text-secondary)] ${callBg}`}>
                        ₹{st.call.bid ? st.call.bid.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-right text-[var(--color-text-secondary)] ${callBg}`}>
                        ₹{st.call.ask ? st.call.ask.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-2.5 text-right font-extrabold border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400 ${callBg}`}>
                        ₹{st.call.ltp ? st.call.ltp.toFixed(2) : "0.00"}
                      </td>
                    </>
                  )}
                  {viewMode === "oi" && (
                    <>
                      <td className={`py-1.5 px-2 text-right ${st.call.oiChange >= 0 ? "text-emerald-600" : "text-rose-600"} ${callBg}`}>
                        {st.call.oiChange > 0 ? `+${st.call.oiChange.toLocaleString("en-IN")}` : st.call.oiChange?.toLocaleString("en-IN") ?? "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-right font-extrabold text-[var(--color-text-primary)] ${callBg}`}>
                        {st.call.openInterest ? st.call.openInterest.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-right font-bold border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400 ${callBg}`}>
                        ₹{st.call.ltp?.toFixed(2)}
                      </td>
                    </>
                  )}
                  {viewMode === "greeks" && (
                    <>
                      <td className={`py-1.5 px-1 text-right text-indigo-600 dark:text-indigo-400 ${callBg}`}>
                        {st.call.iv ? `${st.call.iv}%` : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-right text-[var(--color-text-primary)] ${callBg}`}>
                        {st.call.delta ? st.call.delta.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-right text-rose-500 ${callBg}`}>
                        {st.call.theta ? st.call.theta.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-right text-[var(--color-text-muted)] ${callBg}`}>
                        {st.call.gamma ? st.call.gamma.toFixed(4) : "-"}
                      </td>
                      <td className={`py-1.5 px-1.5 text-right font-bold border-r border-[var(--color-bg-border)] text-emerald-600 dark:text-emerald-400 ${callBg}`}>
                        ₹{st.call.ltp?.toFixed(2)}
                      </td>
                    </>
                  )}

                  {/* ─── CENTRAL STRIKE ─────────────────────────────────── */}
                  <td className={`py-1.5 px-3 font-black text-center ${
                    isATM
                      ? "bg-indigo-600 text-white font-extrabold shadow-sm scale-105"
                      : "bg-[var(--color-bg-base)] text-[var(--color-text-primary)]"
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>{st.strikePrice}</span>
                      {isATM && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900 text-indigo-200">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ─── PUT SIDE ──────────────────────────────────────── */}
                  {viewMode === "quotes" && (
                    <>
                      <td className={`py-1.5 px-2.5 text-left font-extrabold border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400 ${putBg}`}>
                        ₹{st.put.ltp ? st.put.ltp.toFixed(2) : "0.00"}
                      </td>
                      <td className={`py-1.5 px-2 text-left text-[var(--color-text-secondary)] ${putBg}`}>
                        ₹{st.put.bid ? st.put.bid.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-left text-[var(--color-text-secondary)] ${putBg}`}>
                        ₹{st.put.ask ? st.put.ask.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-left text-[var(--color-text-muted)] ${putBg}`}>
                        {st.put.volume ? st.put.volume.toLocaleString("en-IN") : "-"}
                      </td>
                    </>
                  )}
                  {viewMode === "oi" && (
                    <>
                      <td className={`py-1.5 px-2 text-left font-bold border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400 ${putBg}`}>
                        ₹{st.put.ltp?.toFixed(2)}
                      </td>
                      <td className={`py-1.5 px-2 text-left font-extrabold text-[var(--color-text-primary)] ${putBg}`}>
                        {st.put.openInterest ? st.put.openInterest.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className={`py-1.5 px-2 text-left ${st.put.oiChange >= 0 ? "text-emerald-600" : "text-rose-600"} ${putBg}`}>
                        {st.put.oiChange > 0 ? `+${st.put.oiChange.toLocaleString("en-IN")}` : st.put.oiChange?.toLocaleString("en-IN") ?? "-"}
                      </td>
                    </>
                  )}
                  {viewMode === "greeks" && (
                    <>
                      <td className={`py-1.5 px-1.5 text-left font-bold border-l border-[var(--color-bg-border)] text-rose-600 dark:text-rose-400 ${putBg}`}>
                        ₹{st.put.ltp?.toFixed(2)}
                      </td>
                      <td className={`py-1.5 px-1 text-left text-[var(--color-text-primary)] ${putBg}`}>
                        {st.put.delta ? st.put.delta.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-left text-rose-500 ${putBg}`}>
                        {st.put.theta ? st.put.theta.toFixed(2) : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-left text-[var(--color-text-muted)] ${putBg}`}>
                        {st.put.gamma ? st.put.gamma.toFixed(4) : "-"}
                      </td>
                      <td className={`py-1.5 px-1 text-left text-indigo-600 dark:text-indigo-400 ${putBg}`}>
                        {st.put.iv ? `${st.put.iv}%` : "-"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
