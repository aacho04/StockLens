import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link } from "react-router-dom";
import { useChatStore } from "@/stores/chatStore";
import { StockOptionChain } from "../stocks/StockOptionChain";

type AnalysisTab = "opportunities" | "risk" | "options" | "news" | "education";

export const MarketAnalysisPage: React.FC = () => {
  const { openChat } = useChatStore();
  const [activeTab, setActiveTab] = useState<AnalysisTab>("opportunities");
  const [selectedStock, setSelectedStock] = useState<string>("RELIANCE");
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");

  // 1. AI Opportunities Query
  const { data: opportunities, isLoading: oppsLoading } = useQuery({
    queryKey: ["analysis-opportunities"],
    queryFn: async () => {
      const res = await apiClient.get("/analysis/opportunities");
      return res.data.data as Array<any>;
    },
  });

  // 2. Risk Metrics Query
  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ["analysis-risk", selectedStock],
    queryFn: async () => {
      const res = await apiClient.get(`/analysis/risk/${selectedStock}`);
      return res.data.data as any;
    },
  });

  // 3. News & Sentiment Query
  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ["analysis-news", selectedStock],
    queryFn: async () => {
      const res = await apiClient.get("/analysis/news");
      return res.data.data as any;
    },
  });

  // 5. Educational Resources Query
  const { data: educationData } = useQuery({
    queryKey: ["analysis-education"],
    queryFn: async () => {
      const res = await apiClient.get("/analysis/education");
      return res.data.data as any;
    },
  });

  const filteredOpps = opportunities?.filter((opp) => {
    if (strategyFilter === "ALL") return true;
    return opp.strategy === strategyFilter;
  }) ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-[var(--color-bg-border)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xl shadow-sm">
                📊
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Stock Market Analysis Suite
                  </h1>
                  <Badge variant="brand" size="sm">Institutional Grade</Badge>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
                  Algorithmic opportunity discovery, quantitative risk modeling, live option chains, and NLP sentiment indexing.
                </p>
              </div>
            </div>
          </div>

          {/* Active Asset Selector */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-[var(--color-bg-base)] p-1.5 rounded-xl border border-[var(--color-bg-border)] shadow-sm">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] px-2">Asset:</span>
            {["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "TATAMOTORS", "BAJFINANCE"].map((sym) => (
              <button
                key={sym}
                onClick={() => setSelectedStock(sym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStock === sym
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "opportunities", label: "AI & Big Data Analytics", icon: "🧠" },
          { id: "risk", label: "Risk Assessment & Volatility", icon: "🛡️" },
          { id: "options", label: "Interactive Option Chains", icon: "⚡" },
          { id: "news", label: "Market News & Sentiment", icon: "📰" },
          { id: "education", label: "Educational & SEBI Resources", icon: "🎓" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalysisTab)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] hover:border-slate-400/40"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: AI & BIG DATA OPPORTUNITIES ─────────────────────────── */}
      {activeTab === "opportunities" && (
        <div className="space-y-5 animate-fade-in">
          {/* Filter Bar */}
          <div className="glass-card p-3.5 border border-[var(--color-bg-border)] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--color-text-muted)] font-semibold mr-1">Strategy:</span>
              {[
                { id: "ALL", label: "All Setups" },
                { id: "MOMENTUM_BREAKOUT", label: "Momentum Breakout" },
                { id: "GOLDEN_CROSS", label: "Golden Cross" },
                { id: "MEAN_REVERSION", label: "Mean Reversion" },
                { id: "VOLUME_SURGE", label: "Volume Surge" },
                { id: "RSI_REVERSAL", label: "RSI Reversal" },
              ].map((strat) => (
                <button
                  key={strat.id}
                  onClick={() => setStrategyFilter(strat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    strategyFilter === strat.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] border border-[var(--color-bg-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  }`}
                >
                  {strat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span>●</span>
              <span>{filteredOpps.length} High-Probability Setups</span>
            </div>
          </div>

          {/* AI Copilot Callout Banner */}
          <div className="glass-card p-4 border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  StockLens AI Trading Copilot
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Comprehensive audit for every trade setup, support/resistance levels, and trading rationale based on NCFM Technical Analysis.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openChat("Analyze all given trades with complete technical & statistical breakdown")}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Audit All 8 Trades</span>
                <span>⚡</span>
              </button>
              <button
                onClick={() => openChat("On what basis has the analysis been done?")}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-hover)] text-xs font-semibold text-[var(--color-text-primary)] transition-all cursor-pointer"
              >
                NCFM Analysis Basis
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {oppsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="240px" className="rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOpps.map((opp) => (
                <div
                  key={opp.id}
                  className="glass-card p-5 border border-[var(--color-bg-border)] hover:border-indigo-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/stocks/${opp.symbol}`}
                            className="text-lg font-extrabold text-[var(--color-text-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {opp.symbol}
                          </Link>
                          <Badge variant="brand" size="sm">{opp.strategy.replace(/_/g, " ")}</Badge>
                          <Badge variant={opp.signalStrength === "STRONG" ? "gain" : "neutral"} size="sm">
                            {opp.signalStrength}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-medium">
                          {opp.name} · {opp.sector}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Win Prob</div>
                        <div className="text-xl font-extrabold mono text-emerald-600 dark:text-emerald-400">
                          {opp.winProbability}%
                        </div>
                      </div>
                    </div>

                    {/* Price Targets Matrix */}
                    <div className="grid grid-cols-4 gap-2 bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-bg-border)] my-3 text-center">
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-0.5">Current</span>
                        <span className="text-sm font-bold mono text-[var(--color-text-primary)]">
                          ₹{opp.currentPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-0.5">Target 1</span>
                        <span className="text-sm font-bold mono text-emerald-600 dark:text-emerald-400">
                          ₹{opp.target1.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-0.5">Target 2</span>
                        <span className="text-sm font-bold mono text-emerald-700 dark:text-emerald-300">
                          ₹{opp.target2.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block mb-0.5">Stop Loss</span>
                        <span className="text-sm font-bold mono text-rose-600 dark:text-rose-400">
                          ₹{opp.stopLoss.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Catalyst Box */}
                    <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 my-2.5">
                      <p className="text-xs text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Catalyst: </span>
                        {opp.catalyst}
                      </p>
                    </div>

                    {/* Triggers */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {opp.triggers.map((trig: string, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] border border-[var(--color-bg-border)] font-medium"
                        >
                          ✓ {trig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-bg-border)] flex items-center justify-between text-xs gap-2 flex-wrap">
                    <span className="text-[var(--color-text-muted)] font-medium">
                      Risk/Reward <strong className="text-[var(--color-text-primary)]">{opp.riskReward}</strong> · {opp.timeframe}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openChat(`Analyze the trade setup for ${opp.symbol} (${opp.name}) in detail`, opp.symbol)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 font-semibold transition-all border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                        title="Open AI Copilot explanation for this setup"
                      >
                        <span>🤖 Ask Copilot</span>
                      </button>
                      <Link
                        to={`/stocks/${opp.symbol}`}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>Trade Setup</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: RISK ASSESSMENT & VOLATILITY ───────────────────────── */}
      {activeTab === "risk" && (
        <div className="space-y-6 animate-fade-in">
          {riskLoading ? (
            <Skeleton height="320px" className="rounded-2xl" />
          ) : (
            <>
              {/* Risk KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 border border-rose-500/25 bg-[var(--color-bg-card)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold mb-1">
                    <span>Value at Risk (1D, 95% CI)</span>
                    <span className="text-rose-500">▼ Daily</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mono text-rose-600 dark:text-rose-400">
                    -{riskData?.var95_1Day?.percent}%
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
                    ₹{riskData?.var95_1Day?.amount} maximum statistical daily loss
                  </p>
                </div>

                <div className="glass-card p-4 border border-amber-500/25 bg-[var(--color-bg-card)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold mb-1">
                    <span>10-Day Horizon VaR</span>
                    <span className="text-amber-500">▼ Horizon</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mono text-amber-600 dark:text-amber-400">
                    -{riskData?.var95_10Day?.percent}%
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
                    ₹{riskData?.var95_10Day?.amount} cumulative tail risk buffer
                  </p>
                </div>

                <div className="glass-card p-4 border border-emerald-500/25 bg-[var(--color-bg-card)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold mb-1">
                    <span>Sharpe Ratio</span>
                    <span className="text-emerald-500">★ Risk-Adjusted</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mono text-emerald-600 dark:text-emerald-400">
                    {riskData?.sharpeRatio}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
                    Above 1.4 signifies superior risk-adjusted return
                  </p>
                </div>

                <div className="glass-card p-4 border border-indigo-500/25 bg-[var(--color-bg-card)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold mb-1">
                    <span>Beta (vs NIFTY 50)</span>
                    <span className="text-indigo-500">⚡ Covariance</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black mono text-indigo-600 dark:text-indigo-400">
                    {riskData?.beta}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
                    Annual Volatility: {riskData?.annualizedVolatility}%
                  </p>
                </div>
              </div>

              {/* Stress Testing Table */}
              <div className="glass-card p-5 border border-[var(--color-bg-border)] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      Macroeconomic Stress Testing & Scenario Analysis
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Simulated portfolio drawdowns under severe monetary, geopolitical, and liquidity shock waves.
                    </p>
                  </div>
                  <Badge variant="gold" size="sm">Stress Engine</Badge>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--color-bg-border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-bg-input)] text-[var(--color-text-muted)] border-b border-[var(--color-bg-border)]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Stress Scenario</th>
                        <th className="py-3 px-4 font-bold">Transmission Mechanism</th>
                        <th className="py-3 px-4 font-bold text-right">Projected Drawdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-bg-border)]">
                      {riskData?.stressTests?.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[var(--color-text-primary)]">{st.scenario}</td>
                          <td className="py-3.5 px-4 text-[var(--color-text-secondary)] leading-relaxed">{st.description}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                            {st.projectedImpactPercent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 3: INTERACTIVE OPTION CHAINS ───────────────────────────── */}
      {activeTab === "options" && (
        <div className="space-y-5 animate-fade-in">
          <StockOptionChain symbol={selectedStock} />
        </div>
      )}

      {/* ─── TAB 4: MARKET NEWS & SENTIMENT ────────────────────────────── */}
      {activeTab === "news" && (
        <div className="space-y-5 animate-fade-in">
          {newsLoading ? (
            <Skeleton height="280px" className="rounded-2xl" />
          ) : (
            <>
              {/* Sentiment Summary Card */}
              <div className="glass-card p-5 border border-[var(--color-bg-border)] flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      Natural Language AI Sentiment Index
                    </h3>
                    {newsData?.source === "UPSTOX_LIVE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Upstox Live Feed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Machine-scored sentiment telemetry aggregating real-time corporate announcements and financial news directly from Upstox.
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block uppercase">Market Bias</span>
                    <span className={`text-2xl font-black mono ${
                      (newsData?.overallScore ?? 0) >= 0.05
                        ? "text-emerald-600 dark:text-emerald-400"
                        : (newsData?.overallScore ?? 0) <= -0.05
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-[var(--color-text-secondary)]"
                    }`}>
                      {(newsData?.overallScore ?? 0) > 0 ? "+" : ""}{newsData?.overallScore ?? 0}
                    </span>
                    <div className="mt-1">
                      <Badge
                        variant={(newsData?.overallScore ?? 0) >= 0.05 ? "gain" : (newsData?.overallScore ?? 0) <= -0.05 ? "loss" : "neutral"}
                        size="sm"
                      >
                        {(newsData?.overallScore ?? 0) >= 0.05 ? "Net Bullish" : (newsData?.overallScore ?? 0) <= -0.05 ? "Net Bearish" : "Neutral / Balanced"}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-52 space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold text-[var(--color-text-secondary)] text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400">Bullish: {newsData?.sentimentSummary?.bullish}%</span>
                      <span className="text-rose-600 dark:text-rose-400">Bearish: {newsData?.sentimentSummary?.bearish}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] overflow-hidden flex shadow-inner">
                      <div style={{ width: `${newsData?.sentimentSummary?.bullish}%` }} className="bg-emerald-500" />
                      <div style={{ width: `${newsData?.sentimentSummary?.neutral}%` }} className="bg-slate-400 dark:bg-slate-600" />
                      <div style={{ width: `${newsData?.sentimentSummary?.bearish}%` }} className="bg-rose-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* News Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newsData?.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="glass-card p-5 border border-[var(--color-bg-border)] hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.source}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <Badge
                          variant={item.sentiment === "BULLISH" ? "gain" : item.sentiment === "BEARISH" ? "loss" : "neutral"}
                          size="sm"
                        >
                          {item.sentiment} ({item.sentimentScore > 0 ? "+" : ""}{item.sentimentScore})
                        </Badge>
                      </div>

                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-[var(--color-text-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug flex items-start justify-between gap-2"
                        >
                          <span>{item.title}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-500 flex-shrink-0 mt-0.5">↗</span>
                        </a>
                      ) : (
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
                          {item.title}
                        </h4>
                      )}

                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                        {item.summary}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--color-bg-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)] font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.symbols?.map((s: string) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] text-[var(--color-text-primary)] font-mono font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                          >
                            Read Article ↗
                          </a>
                        )}
                        <span>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 5: EDUCATIONAL & SEBI RESOURCES ───────────────────────── */}
      {activeTab === "education" && (
        <div className="space-y-6 animate-fade-in">
          {/* Statutory Advisory Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                SEBI Mandatory Risk Disclosure on Derivatives (F&O)
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed font-medium">
                According to the SEBI market study, 9 out of 10 individual traders in the Equity Derivatives segment incurred net losses, with average annual losses around ₹50,000. Never trade with borrowed capital, always set predefined stop-loss levels, and study verified NISM/NSE certification materials before deploying live strategies.
              </p>
            </div>
          </div>

          {/* SEBI Resource Cards */}
          <div>
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <span>🏛️</span>
              <span>SEBI Investor Protection & Education Guidelines</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {educationData?.sebiResources?.map((res: any, idx: number) => (
                <div key={idx} className="glass-card p-5 border border-[var(--color-bg-border)] space-y-2.5">
                  <Badge variant="brand" size="sm">{res.badge}</Badge>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{res.title}</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{res.description}</p>
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {res.topics?.map((top: string) => (
                      <span
                        key={top}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] text-[var(--color-text-secondary)] font-semibold"
                      >
                        {top}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NSE / NISM Certification Curricula */}
          <div>
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <span>📜</span>
              <span>NSE & NISM Professional Certification Examination Pathways</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {educationData?.nseCertifications?.map((cert: any, idx: number) => (
                <div key={idx} className="glass-card p-5 border border-[var(--color-bg-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{cert.code}</span>
                    <Badge variant="neutral" size="sm">{cert.level}</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{cert.name}</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{cert.description}</p>
                  <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                    Format: {cert.duration} · Pass Score: {cert.passingScore}
                  </div>
                  <div className="pt-2.5 border-t border-[var(--color-bg-border)] space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Core Curriculum:</span>
                    <ul className="text-[11px] text-[var(--color-text-secondary)] space-y-1 list-disc list-inside font-medium">
                      {cert.curriculum?.map((cur: string) => (
                        <li key={cur}>{cur}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
