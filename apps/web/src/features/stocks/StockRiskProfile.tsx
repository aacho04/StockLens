import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface StockRiskProfileProps {
  symbol: string;
}

export const StockRiskProfile: React.FC<StockRiskProfileProps> = ({ symbol }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analysis-risk", symbol],
    queryFn: async () => {
      const res = await apiClient.get(`/analysis/risk/${symbol}`);
      return res.data.data;
    },
  });

  if (isLoading) {
    return <Skeleton height="160px" className="rounded-xl" />;
  }

  if (!data) return null;

  return (
    <div className="glass-card p-4 border border-[var(--color-bg-border)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[var(--color-text-primary)]">Risk & Volatility Profile</span>
          <Badge variant="gold" size="sm">Risk: {data.riskCategory}</Badge>
        </div>
        <span className="text-xs text-[var(--color-text-muted)] font-medium">
          Annual Volatility: <strong className="text-[var(--color-text-primary)]">{data.annualizedVolatility}%</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="bg-[var(--color-bg-base)] p-2.5 rounded-lg border border-[var(--color-bg-border)]">
          <span className="text-[var(--color-text-muted)] block text-[11px] mb-0.5 font-medium">Value at Risk (1D 95%)</span>
          <span className="font-extrabold mono text-rose-600 dark:text-rose-400 text-sm">-{data.var95_1Day.percent}%</span>
        </div>
        <div className="bg-[var(--color-bg-base)] p-2.5 rounded-lg border border-[var(--color-bg-border)]">
          <span className="text-[var(--color-text-muted)] block text-[11px] mb-0.5 font-medium">Sharpe Ratio</span>
          <span className="font-extrabold mono text-emerald-600 dark:text-emerald-400 text-sm">{data.sharpeRatio}</span>
        </div>
        <div className="bg-[var(--color-bg-base)] p-2.5 rounded-lg border border-[var(--color-bg-border)]">
          <span className="text-[var(--color-text-muted)] block text-[11px] mb-0.5 font-medium">Beta (NIFTY)</span>
          <span className="font-extrabold mono text-indigo-600 dark:text-indigo-400 text-sm">{data.beta}</span>
        </div>
      </div>
    </div>
  );
};
