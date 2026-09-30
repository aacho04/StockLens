import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface PredictionData {
  ticker: string;
  current_price: number;
  next_5_days_predicted: number[];
  confidence_score: number;
  timestamp: string;
  disclaimer: string;
  fallback?: boolean;
}

interface PredictionCardProps {
  symbol: string;
  currentPrice?: number;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ symbol, currentPrice }) => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<PredictionData>({
    queryKey: ["prediction", symbol],
    queryFn: async () => {
      const res = await apiClient.get(`/predict/${symbol}`);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const basePrice = currentPrice && currentPrice > 0 ? currentPrice : data?.current_price ?? 0;

  return (
    <div className="glass-card p-5 border border-[var(--color-bg-border)] relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-bold text-sm">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">AI Market Forecast Engine</h3>
              <Badge variant="brand" size="sm">5-Day Projection</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">
              Sequential Machine Learning Regression & Rolling Indicators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {data?.confidence_score && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              <span>Confidence:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{Math.round(data.confidence_score * 100)}%</span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs px-3 py-1 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-semibold transition-all disabled:opacity-50"
            title="Refresh AI prediction"
          >
            {isFetching ? "Computing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="80px" className="rounded-xl" />
            ))}
          </div>
          <Skeleton height="36px" className="rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs text-center font-medium">
          Forecast engine is temporarily synchronizing data. Click refresh to retry.
        </div>
      ) : (
        <div className="space-y-4">
          {/* 5-Day Predicted Price Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {data.next_5_days_predicted.map((predPrice, idx) => {
              const diff = basePrice > 0 ? predPrice - basePrice : 0;
              const pct = basePrice > 0 ? (diff / basePrice) * 100 : 0;
              const isUp = diff >= 0;

              return (
                <div
                  key={idx}
                  className="bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] rounded-xl p-3 text-center transition-all hover:border-indigo-500/40 hover:-translate-y-0.5"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                    Day +{idx + 1}
                  </p>
                  <p className="text-sm sm:text-base font-extrabold mono text-[var(--color-text-primary)]">
                    ₹{predPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`text-[11px] font-bold mt-1 flex items-center justify-center gap-0.5 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    <span>{isUp ? "▲" : "▼"}</span>
                    <span>{Math.abs(pct).toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model Metrics & Forecast Timestamp */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1 flex-wrap gap-2 font-medium">
            <div className="flex items-center gap-2">
              <span>Features: SMA(5,10,20) · EMA(12,26) · RSI(14) · Volatility</span>
              {data.fallback && <span className="text-amber-600 dark:text-amber-400 font-semibold">· Synthetic baseline</span>}
            </div>
            <span>
              Updated: {new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Mandatory Regulatory Compliance Disclaimer Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <span className="text-amber-600 dark:text-amber-400 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-950/80 dark:text-amber-200/90 leading-relaxed font-medium">
              <span className="font-bold text-amber-700 dark:text-amber-300">Disclaimer: </span>
              AI-driven statistical projections are for educational mock tracking only and do not constitute certified financial advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
