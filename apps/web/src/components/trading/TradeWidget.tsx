import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface TradeWidgetProps {
  symbol: string;
  name: string;
  currentPrice: number;
}

export const TradeWidget: React.FC<TradeWidgetProps> = ({
  symbol,
  name,
  currentPrice,
}) => {
  const queryClient = useQueryClient();
  const [product, setProduct] = useState<"MIS" | "CNC">("MIS");
  const [tab, setTab] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<number>(1);
  const [tradeMessage, setTradeMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch user portfolio info
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await apiClient.get("/portfolio");
      return res.data.data;
    },
  });

  const cashBalance = portfolioData ? parseFloat(portfolioData.cashBalance) : 1_000_000;
  const userHoldings = portfolioData?.holdings ?? [];
  const currentHolding = userHoldings.find((h: any) => h.symbol.toUpperCase() === symbol.toUpperCase());
  const sharesOwned = currentHolding ? currentHolding.quantity : 0;

  // Open Intraday MIS positions
  const userPositions = portfolioData?.positions ?? [];
  const openPosition = userPositions.find(
    (p: any) => p.symbol.toUpperCase() === symbol.toUpperCase() && p.status === "OPEN"
  );

  const totalCost = +(quantity * currentPrice).toFixed(2);
  const marginRequired = product === "MIS" ? +(totalCost / 5).toFixed(2) : totalCost;
  const buyingPower = +(cashBalance * (product === "MIS" ? 5 : 1)).toFixed(2);

  // Validation
  const canAfford = cashBalance >= marginRequired;
  // In MIS, user can short sell even with 0 shares! In CNC, user must own shares to sell.
  const canSell = product === "MIS" ? canAfford : sharesOwned >= quantity;
  const canTrade = tab === "BUY" ? canAfford : canSell;

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/portfolio/trade", {
        symbol,
        type: tab,
        quantity,
        product,
        orderType: "MARKET",
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-orders"] });
      setTradeMessage({ text: data.message, type: "success" });
      setTimeout(() => setTradeMessage(null), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || "Trade failed to execute";
      setTradeMessage({ text: msg, type: "error" });
      setTimeout(() => setTradeMessage(null), 6000);
    },
  });

  // Dynamic button label
  const getButtonLabel = () => {
    if (tradeMutation.isPending) return "Executing Order...";
    if (currentPrice <= 0) return "Fetching Live Price...";

    if (tab === "BUY") {
      if (!canAfford) return "Insufficient Margin";
      if (product === "MIS" && openPosition?.side === "SHORT") {
        return `COVER SHORT (${quantity} ${symbol}) @ ₹${currentPrice.toFixed(2)}`;
      }
      return `BUY ${product === "MIS" ? "LONG (5x)" : "(CNC)"} ${quantity} ${symbol} @ ₹${currentPrice.toFixed(2)}`;
    } else {
      // SELL tab
      if (product === "CNC") {
        if (!canSell) return "No Delivery Shares to Sell";
        return `SELL ${quantity} ${symbol} (CNC) @ ₹${currentPrice.toFixed(2)}`;
      } else {
        // MIS
        if (!canAfford) return "Insufficient Margin";
        if (openPosition?.side === "LONG") {
          return `SQUARE OFF LONG (${quantity} ${symbol}) @ ₹${currentPrice.toFixed(2)}`;
        }
        return `SHORT SELL (5x) ${quantity} ${symbol} @ ₹${currentPrice.toFixed(2)}`;
      }
    }
  };

  return (
    <div className="glass-card p-5 border border-[#1f2d45] rounded-[16px] shadow-xl space-y-4">
      {/* Product Selector Toggle: MIS (5x) vs CNC (Delivery) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#94a3b8] font-semibold">Product Type</span>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            {product === "MIS" ? "⚡ 5x Leverage Enabled" : "📦 Delivery 1x Margin"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-[#111827] p-1 rounded-[10px] border border-[#1f2d45]">
          <button
            type="button"
            onClick={() => setProduct("MIS")}
            className={`py-2 px-3 rounded-[8px] text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
              product === "MIS"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2235]"
            }`}
          >
            <span>Intraday (MIS)</span>
            <span className={`text-[10px] ${product === "MIS" ? "text-indigo-200" : "text-[#475569]"}`}>
              5x Margin · 20% Funds
            </span>
          </button>
          <button
            type="button"
            onClick={() => setProduct("CNC")}
            className={`py-2 px-3 rounded-[8px] text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
              product === "CNC"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30"
                : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2235]"
            }`}
          >
            <span>Delivery (CNC)</span>
            <span className={`text-[10px] ${product === "CNC" ? "text-blue-200" : "text-[#475569]"}`}>
              100% Cash · Long-term
            </span>
          </button>
        </div>
      </div>

      {/* Header Tabs: BUY vs SELL */}
      <div className="flex items-center justify-between border-b border-[#1f2d45] pb-3">
        <div className="flex bg-[#111827] p-1 rounded-[10px]">
          <button
            onClick={() => { setTab("BUY"); setTradeMessage(null); }}
            className={`px-5 py-1.5 rounded-[8px] text-xs font-bold tracking-wide transition-all ${
              tab === "BUY"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "text-[#94a3b8] hover:text-[#f1f5f9]"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => { setTab("SELL"); setTradeMessage(null); }}
            className={`px-5 py-1.5 rounded-[8px] text-xs font-bold tracking-wide transition-all ${
              tab === "SELL"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "text-[#94a3b8] hover:text-[#f1f5f9]"
            }`}
          >
            SELL {product === "MIS" && <span className="text-[10px] ml-0.5 opacity-90">(Short)</span>}
          </button>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-[#475569] block">Execution</span>
          <span className="text-xs font-semibold text-[#818cf8]">MARKET (Instant)</span>
        </div>
      </div>

      {/* Account Info Pill */}
      <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-[10px] bg-[#111827] border border-[#1f2d45]">
        <div>
          <span className="text-[11px] text-[#94a3b8] block">Available Cash</span>
          <span className="font-bold mono text-[#f1f5f9] text-xs">
            ₹{cashBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#94a3b8] block">
            {product === "MIS" ? "5x Buying Power" : "Holding Shares"}
          </span>
          <span className="font-bold mono text-emerald-400 text-xs">
            {product === "MIS"
              ? `₹${buyingPower.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              : `${sharesOwned} shares`}
          </span>
        </div>
      </div>

      {/* Active Position Info if user has open position in this stock */}
      {openPosition && (
        <div className="p-2.5 rounded-[8px] bg-indigo-500/10 border border-indigo-500/30 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              openPosition.side === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              MIS {openPosition.side}
            </span>
            <span className="text-[#f1f5f9] font-medium">{openPosition.quantity} shares @ ₹{parseFloat(openPosition.averagePrice).toFixed(2)}</span>
          </div>
          <span className="text-[11px] text-[#94a3b8]">Open Trade</span>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <label htmlFor="trade-quantity" className="font-medium">Number of Shares</label>
          <span className="text-[#475569]">Lot size: 1</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-[10px] bg-[#1a2235] hover:bg-[#1e2a3d] border border-[#1f2d45] flex items-center justify-center text-lg font-bold transition-colors"
          >
            -
          </button>
          <input
            id="trade-quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 h-10 text-center font-bold mono bg-[#111827] border border-[#1f2d45] rounded-[10px] text-[#f1f5f9]"
          />
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-10 h-10 rounded-[10px] bg-[#1a2235] hover:bg-[#1e2a3d] border border-[#1f2d45] flex items-center justify-center text-lg font-bold transition-colors"
          >
            +
          </button>
        </div>

        {/* Quick Quantity Chips */}
        <div className="flex gap-1.5 pt-1">
          {[5, 10, 25, 50, 100].map((num) => (
            <button
              key={num}
              onClick={() => setQuantity(num)}
              className="flex-1 py-1 rounded-[6px] text-[11px] font-semibold bg-[#111827] hover:bg-[#1a2235] border border-[#1f2d45] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
            >
              +{num}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Box with 5x Margin Breakdown */}
      <div className="space-y-1.5 pt-2 border-t border-[#1f2d45] text-xs">
        <div className="flex justify-between text-[#94a3b8]">
          <span>Execution Price (LTP)</span>
          <span className="mono font-semibold text-[#f1f5f9]">
            ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>Gross Exposure Value</span>
          <span className="mono text-[#cbd5e1]">
            ₹{totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {product === "MIS" && (
          <div className="flex justify-between text-[#818cf8] font-semibold">
            <span>Margin Required (20% · 5x)</span>
            <span className="mono text-indigo-400 font-bold">
              ₹{marginRequired.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-[#1f2d45]/50">
          <span className="text-[#f1f5f9]">
            {product === "MIS" ? "Cash Required to Trade" : "Total Order Value"}
          </span>
          <span className={`mono ${canAfford ? "text-emerald-400" : "text-rose-400"}`}>
            ₹{marginRequired.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* MIS Auto Square-off Warning Badge */}
      {product === "MIS" && (
        <div className="p-2 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-1.5 leading-snug">
          <span>⏰</span>
          <span>
            <strong>MIS Intraday Notice:</strong> All open positions must be squared off before <strong>03:15 PM IST</strong>. Short selling permitted.
          </span>
        </div>
      )}

      {/* Notification Toast */}
      {tradeMessage && (
        <div
          className={`p-3 rounded-[10px] text-xs font-semibold animate-fade-in ${
            tradeMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          {tradeMessage.text}
        </div>
      )}

      {/* Execution Button */}
      <Button
        variant={tab === "BUY" ? "primary" : "danger"}
        onClick={() => tradeMutation.mutate()}
        disabled={
          tradeMutation.isPending ||
          portfolioLoading ||
          currentPrice <= 0 ||
          !canTrade
        }
        className="w-full h-11 text-sm font-bold tracking-wide shadow-lg"
      >
        {getButtonLabel()}
      </Button>

      <p className="text-[11px] text-[#475569] text-center">
        ⚡ Simulated Paper Trade with Upstox Real-time Pricing · Zero Real Money Risk
      </p>
    </div>
  );
};
