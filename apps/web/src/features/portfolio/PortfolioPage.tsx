import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge, ChangeBadge } from "@/components/ui/Badge";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { AddFundsModal } from "./AddFundsModal";
import { WithdrawFundsModal } from "./WithdrawFundsModal";

interface HoldingItem {
  id: string;
  stockId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: string;
  currentPrice: string;
  investedValue: string;
  currentValue: string;
  pnl: string;
  pnlPercentage: string;
  quote?: any;
}

export interface PositionItem {
  id: string;
  stockId: string;
  symbol: string;
  name: string;
  product: string; // "MIS"
  side: "LONG" | "SHORT";
  quantity: number;
  averagePrice: string;
  marginBlocked: string;
  currentPrice: string;
  exposure: string;
  unrealizedPnl: string;
  unrealizedPnlPercentage: string;
  leverage: number;
  createdAt?: string;
  quote?: any;
}

interface OrderItem {
  id: string;
  symbol: string;
  name?: string;
  side: "BUY" | "SELL";
  productType: "MIS" | "CNC";
  orderType: "MARKET" | "LIMIT" | "SL" | "SL-M";
  quantity: number;
  limitPrice?: string | null;
  triggerPrice?: string | null;
  averagePrice?: string | null;
  status: "CREATED" | "OPEN" | "TRIGGERED" | "EXECUTED" | "CANCELLED" | "REJECTED";
  charges?: string;
  createdAt: string;
  executedAt?: string | null;
}

interface TradeItem {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: string;
  exitPrice: string;
  grossPnl: string;
  charges: string;
  netPnl: string;
  executedAt: string;
}

// ─── Position Row with Live LTP & Dynamic P&L ─────────────────────────────────

const PositionRow: React.FC<{
  position: PositionItem;
  onOpenCloseModal: (position: PositionItem, currentLtp: number) => void;
}> = ({ position, onOpenCloseModal }) => {
  const { quote, tickDirection } = useLiveQuote(position.symbol, position.quote);

  const avgPrice = parseFloat(position.averagePrice);
  const currentPrice = quote ? parseFloat(quote.currentPrice) : parseFloat(position.currentPrice);
  const isLong = position.side === "LONG";
  const pnl = isLong
    ? (currentPrice - avgPrice) * position.quantity
    : (avgPrice - currentPrice) * position.quantity;
  const exposure = avgPrice * position.quantity;
  const pnlPct = exposure > 0 ? (pnl / exposure) * 100 : 0;
  const isGain = pnl >= 0;

  return (
    <tr className="hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[#1f2d45]/40 last:border-b-0">
      {/* Instrument */}
      <td className="py-4 px-4">
        <Link to={`/stocks/${position.symbol}`} className="flex items-center gap-3 group">
          <div
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
              isLong
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}
          >
            <span className="text-xs font-bold">{position.symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors">
                {position.symbol}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                MIS 5x
              </span>
            </div>
            <span className="text-xs text-[#94a3b8] truncate block max-w-[180px]">
              {position.name}
            </span>
          </div>
        </Link>
      </td>

      {/* Side (Long or Short) */}
      <td className="py-4 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isLong
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          }`}
        >
          {isLong ? "▲ BUY (Long)" : "▼ SHORT (Sell)"}
        </span>
      </td>

      {/* Qty */}
      <td className="py-4 px-4 text-center">
        <span className="font-bold mono text-sm text-[#f1f5f9]">{position.quantity}</span>
        <span className="text-[11px] text-[#475569] block">shares</span>
      </td>

      {/* Entry Price */}
      <td className="py-4 px-4 text-right">
        <span className="mono font-semibold text-sm text-[#94a3b8]">
          ₹{avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </td>

      {/* Live LTP with Flash */}
      <td className="py-4 px-4 text-right">
        <div
          className={`inline-block px-2 py-0.5 rounded-[6px] transition-all ${
            tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
          }`}
        >
          <span className="mono font-bold text-sm text-[#f1f5f9]">
            ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </td>

      {/* Margin Blocked */}
      <td className="py-4 px-4 text-right">
        <span className="mono font-semibold text-sm text-indigo-400">
          ₹{parseFloat(position.marginBlocked).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-[#475569] block">20% margin</span>
      </td>

      {/* Unrealized P&L */}
      <td className="py-4 px-4 text-right">
        <div className={`mono font-bold text-sm ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
          {isGain ? "+" : ""}₹{pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
        <div className={`text-xs mono ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
          {isGain ? "+" : ""}{pnlPct.toFixed(2)}%
        </div>
      </td>

      {/* Actions: Close Position Modal */}
      <td className="py-4 px-4 text-center">
        <Button
          variant="danger"
          size="sm"
          onClick={() => onOpenCloseModal(position, currentPrice)}
          className="h-8 text-xs font-semibold px-3 shadow-md bg-rose-600 hover:bg-rose-700"
        >
          CLOSE
        </Button>
      </td>
    </tr>
  );
};

// ─── Delivery Holding Row ─────────────────────────────────────────────────────

const HoldingRow: React.FC<{
  holding: HoldingItem;
  onQuickSell: (holding: HoldingItem) => void;
}> = ({ holding, onQuickSell }) => {
  const { quote, tickDirection } = useLiveQuote(holding.symbol, holding.quote);

  const avgPrice = parseFloat(holding.averageBuyPrice);
  const currentPrice = quote ? parseFloat(quote.currentPrice) : parseFloat(holding.currentPrice);
  const invested = avgPrice * holding.quantity;
  const currentVal = currentPrice * holding.quantity;
  const pnl = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isGain = pnl >= 0;

  return (
    <tr className="hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[#1f2d45]/40 last:border-b-0">
      <td className="py-4 px-4">
        <Link to={`/stocks/${holding.symbol}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <span className="text-xs font-bold text-[#818cf8]">
              {holding.symbol.slice(0, 2)}
            </span>
          </div>
          <div>
            <span className="font-bold text-sm text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors">
              {holding.symbol}
            </span>
            <span className="text-xs text-[#94a3b8] truncate block max-w-[180px]">
              {holding.name}
            </span>
          </div>
        </Link>
      </td>

      <td className="py-4 px-4 text-center mono font-semibold text-sm">
        {holding.quantity}
      </td>

      <td className="py-4 px-4 text-right mono text-sm text-[#94a3b8]">
        ₹{avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>

      <td className="py-4 px-4 text-right">
        <div
          className={`inline-block px-2 py-0.5 rounded-[6px] transition-all ${
            tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
          }`}
        >
          <span className="mono font-bold text-sm text-[#f1f5f9]">
            ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </td>

      <td className="py-4 px-4 text-right mono font-semibold text-sm text-[#f1f5f9]">
        ₹{currentVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>

      <td className="py-4 px-4 text-right">
        <div className={`mono font-bold text-sm ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
          {isGain ? "+" : ""}₹{pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
        <div className={`text-xs mono ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
          {isGain ? "+" : ""}{pnlPct.toFixed(2)}%
        </div>
      </td>

      <td className="py-4 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => onQuickSell(holding)}
            className="h-8 text-xs font-semibold px-3"
          >
            Sell
          </Button>
          <Link to={`/stocks/${holding.symbol}`}>
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-3">
              Buy More
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
};

// ─── Mobile Position Card Component ───────────────────────────────────────────

const PositionMobileCard: React.FC<{
  position: PositionItem;
  onOpenCloseModal: (position: PositionItem, currentLtp: number) => void;
}> = ({ position, onOpenCloseModal }) => {
  const { quote, tickDirection } = useLiveQuote(position.symbol, position.quote);

  const avgPrice = parseFloat(position.averagePrice);
  const currentPrice = quote ? parseFloat(quote.currentPrice) : parseFloat(position.currentPrice);
  const isLong = position.side === "LONG";
  const pnl = isLong
    ? (currentPrice - avgPrice) * position.quantity
    : (avgPrice - currentPrice) * position.quantity;
  const exposure = avgPrice * position.quantity;
  const pnlPct = exposure > 0 ? (pnl / exposure) * 100 : 0;
  const isGain = pnl >= 0;
  const marginBlocked = parseFloat(position.marginBlocked);

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-[14px] border border-slate-200 dark:border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <Link to={`/stocks/${position.symbol}`} className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-xs ${
              isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
            }`}
          >
            {position.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">{position.symbol}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                MIS 5x
              </span>
            </div>
            <span className="text-[11px] text-slate-500 truncate block max-w-[150px]">{position.name}</span>
          </div>
        </Link>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
            isLong
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          }`}
        >
          {isLong ? "▲ BUY (Long)" : "▼ SHORT"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-950/40 p-2.5 rounded-[10px] border border-slate-200 dark:border-slate-800/80">
        <div>
          <span className="text-slate-500 block text-[10px]">Qty @ Avg Entry</span>
          <span className="font-bold mono text-slate-900 dark:text-white">
            {position.quantity} @ ₹{avgPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Live LTP</span>
          <span
            className={`font-bold mono text-slate-900 dark:text-white ${
              tickDirection === "up" ? "text-emerald-500" : tickDirection === "down" ? "text-rose-500" : ""
            }`}
          >
            ₹{currentPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Margin Blocked</span>
          <span className="font-semibold mono text-slate-700 dark:text-slate-300">
            ₹{marginBlocked.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Day P&L</span>
          <span className={`font-bold mono ${isGain ? "text-emerald-500" : "text-rose-500"}`}>
            {isGain ? "+" : ""}₹{pnl.toFixed(2)} ({isGain ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={() => onOpenCloseModal(position, currentPrice)}
        className="w-full text-xs font-bold py-1.5 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-[8px]"
      >
        Square Off Position
      </Button>
    </div>
  );
};

// ─── Mobile Holding Card Component ────────────────────────────────────────────

const HoldingMobileCard: React.FC<{
  holding: HoldingItem;
  onQuickSell: (holding: HoldingItem) => void;
}> = ({ holding, onQuickSell }) => {
  const { quote, tickDirection } = useLiveQuote(holding.symbol, holding.quote);

  const avgPrice = parseFloat(holding.averageBuyPrice);
  const currentPrice = quote ? parseFloat(quote.currentPrice) : parseFloat(holding.currentPrice);
  const invested = avgPrice * holding.quantity;
  const currentVal = currentPrice * holding.quantity;
  const pnl = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isGain = pnl >= 0;

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-[14px] border border-slate-200 dark:border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <Link to={`/stocks/${holding.symbol}`} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center font-bold text-xs text-[#818cf8]">
            {holding.symbol.slice(0, 2)}
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{holding.symbol}</span>
            <span className="text-[11px] text-slate-500 truncate block max-w-[150px]">{holding.name}</span>
          </div>
        </Link>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
          Delivery (CNC)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-950/40 p-2.5 rounded-[10px] border border-slate-200 dark:border-slate-800/80">
        <div>
          <span className="text-slate-500 block text-[10px]">Qty @ Avg Buy</span>
          <span className="font-bold mono text-slate-900 dark:text-white">
            {holding.quantity} @ ₹{avgPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Live LTP</span>
          <span
            className={`font-bold mono text-slate-900 dark:text-white ${
              tickDirection === "up" ? "text-emerald-500" : tickDirection === "down" ? "text-rose-500" : ""
            }`}
          >
            ₹{currentPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Current Value</span>
          <span className="font-semibold mono text-slate-700 dark:text-slate-300">
            ₹{currentVal.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Total P&L</span>
          <span className={`font-bold mono ${isGain ? "text-emerald-500" : "text-rose-500"}`}>
            {isGain ? "+" : ""}₹{pnl.toFixed(2)} ({isGain ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={() => onQuickSell(holding)}
          className="text-xs font-bold py-1.5 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-[8px]"
        >
          Sell
        </Button>
        <Link to={`/stocks/${holding.symbol}`} className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold py-1.5 h-8 border-slate-300 dark:border-slate-700 rounded-[8px]"
          >
            Buy More
          </Button>
        </Link>
      </div>
    </div>
  );
};

// ─── Main Portfolio Page Component ───────────────────────────────────────────

export const PortfolioPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "positions" | "holdings" | "orders" | "trades" | "funds" | "wallet" | "payouts"
  >("positions");

  const [orderFilter, setOrderFilter] = useState<
    "ALL" | "OPEN" | "EXECUTED" | "CANCELLED" | "REJECTED"
  >("ALL");

  // Close Position Modal State
  const [closeTarget, setCloseTarget] = useState<{
    position: PositionItem;
    currentLtp: number;
  } | null>(null);

  const [selectedSellHolding, setSelectedSellHolding] = useState<HoldingItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Fetch portfolio summary & holdings & positions
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await apiClient.get("/portfolio");
      return res.data.data;
    },
    refetchInterval: 3000,
  });

  // Fetch Order Book from Trading Engine
  const { data: orderBook = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", orderFilter],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/orders", {
          params: { status: orderFilter === "ALL" ? undefined : orderFilter },
        });
        return (res.data.data ?? []) as OrderItem[];
      } catch {
        const res = await apiClient.get("/portfolio/orders");
        return (res.data.data ?? []).map((o: any) => ({
          id: o.id,
          symbol: o.symbol,
          name: o.name,
          side: o.type,
          productType: o.orderType === "MIS" ? "MIS" : "CNC",
          orderType: "MARKET",
          quantity: o.quantity,
          averagePrice: o.price,
          status: "EXECUTED",
          createdAt: o.createdAt,
        })) as OrderItem[];
      }
    },
    refetchInterval: 4000,
  });

  // Fetch Trade Book (Completed Trades)
  const { data: tradeBook = [], isLoading: tradesLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/trades");
        return (res.data.data ?? []) as TradeItem[];
      } catch {
        return [] as TradeItem[];
      }
    },
    refetchInterval: 5000,
  });

  // Fetch Wallet transactions
  const { data: walletTransactions } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/wallet/transactions");
      return res.data.data as any[];
    },
  });

  // Fetch Payouts list
  const { data: payoutsList } = useQuery({
    queryKey: ["wallet-payouts"],
    queryFn: async () => {
      const res = await apiClient.get("/wallet/payouts");
      return res.data.data as any[];
    },
  });

  // Reset virtual cash
  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/portfolio/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      setShowResetModal(false);
    },
  });

  // Close / Square off single position
  const closePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      try {
        const res = await apiClient.post(`/positions/${positionId}/close`);
        return res.data.data;
      } catch {
        const fallback = await apiClient.post(`/portfolio/square-off/${positionId}`);
        return fallback.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      setCloseTarget(null);
    },
  });

  // Cancel eligible open simulated order
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.delete(`/orders/${orderId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  // Square off all MIS positions (Auto Square-off threshold)
  const squareOffAllMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiClient.post("/positions/close-all");
        return res.data.data;
      } catch {
        const fallback = await apiClient.post("/portfolio/square-off-all");
        return fallback.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  // Execute sell delivery holding
  const sellHoldingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSellHolding) return;
      await apiClient.post("/portfolio/trade", {
        symbol: selectedSellHolding.symbol,
        type: "SELL",
        quantity: sellQuantity,
        orderType: "MARKET",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedSellHolding(null);
    },
  });

  const cash = portfolio ? parseFloat(portfolio.cashBalance) : 1_000_000;
  const holdingsValue = portfolio ? parseFloat(portfolio.currentHoldingsValue) : 0;
  const totalMarginBlocked = portfolio ? parseFloat(portfolio.totalMarginBlocked) : 0;
  const totalIntradayPnl = portfolio ? parseFloat(portfolio.totalIntradayPnl) : 0;
  const buyingPower = portfolio ? parseFloat(portfolio.effectiveBuyingPower) : cash * 5;
  const totalNetWorth = portfolio ? parseFloat(portfolio.totalNetWorth) : 1_000_000;
  const totalInvested = portfolio ? parseFloat(portfolio.totalInvested) : 0;
  const totalPnl = portfolio ? parseFloat(portfolio.totalPnl) : 0;
  const totalPnlPct = portfolio ? parseFloat(portfolio.totalPnlPercentage) : 0;
  const isNetGain = totalPnl >= 0;
  const isIntradayGain = totalIntradayPnl >= 0;

  const holdingsList: HoldingItem[] = portfolio?.holdings ?? [];
  const positionsList: PositionItem[] = portfolio?.positions ?? [];

  // Close Position Modal Calculations
  const closeDetails = React.useMemo(() => {
    if (!closeTarget) return null;
    const { position, currentLtp } = closeTarget;
    const entry = parseFloat(position.averagePrice);
    const qty = position.quantity;
    const turnover = +(qty * currentLtp).toFixed(2);

    const isLong = position.side === "LONG";
    const grossPnl = +(isLong ? (currentLtp - entry) * qty : (entry - currentLtp) * qty).toFixed(2);

    // Simulated exit charges
    const brokerage = Math.min(20, +(turnover * 0.0005).toFixed(2));
    const stt = isLong ? +(turnover * 0.00025).toFixed(2) : 0; // STT on sell side
    const exchange = +(turnover * 0.0000345).toFixed(2);
    const gst = +((brokerage + exchange) * 0.18).toFixed(2);
    const sebi = Math.max(0.01, +(turnover * 0.000001).toFixed(2));
    const stamp = !isLong ? +(turnover * 0.00003).toFixed(2) : 0; // Stamp duty on buy side
    const totalCharges = +(brokerage + stt + exchange + gst + sebi + stamp).toFixed(2);
    const netPnl = +(grossPnl - totalCharges).toFixed(2);

    return {
      symbol: position.symbol,
      side: position.side,
      oppositeSide: isLong ? "SELL" : "BUY",
      quantity: qty,
      entryPrice: entry,
      currentLtp,
      grossPnl,
      totalCharges,
      netPnl,
      isGain: netPnl >= 0,
      marginReleased: parseFloat(position.marginBlocked),
    };
  }, [closeTarget]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Page Header with Paper Trading Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Trading Portfolio</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              PAPER TRADING — Virtual Funds
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">
            Real-time Indian Equity (NSE/BSE) paper trading with 5x Intraday Margin (MIS) & Delivery (CNC).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetModal(true)}
            className="text-xs border-[#1f2d45] hover:bg-[#111827]"
          >
            ↺ Reset to ₹10L
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddFundsModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20"
          >
            + Add Virtual Funds
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Available Cash / Margin */}
        <div className="glass-card p-4 rounded-[14px] border border-[#1f2d45]">
          <span className="text-xs text-[#94a3b8] font-medium block mb-1">Available Cash</span>
          <div className="text-xl font-bold mono text-[#f1f5f9]">
            ₹{cash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
            ⚡ 5x Buying Power: ₹{buyingPower.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Card 2: Used Margin */}
        <div className="glass-card p-4 rounded-[14px] border border-[#1f2d45]">
          <span className="text-xs text-[#94a3b8] font-medium block mb-1">Used Margin (MIS)</span>
          <div className="text-xl font-bold mono text-indigo-400">
            ₹{totalMarginBlocked.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#64748b] block mt-1">
            {positionsList.length} Active Intraday Positions
          </span>
        </div>

        {/* Card 3: Today's Intraday P&L */}
        <div className="glass-card p-4 rounded-[14px] border border-[#1f2d45]">
          <span className="text-xs text-[#94a3b8] font-medium block mb-1">Today's Intraday P&L</span>
          <div className={`text-xl font-bold mono ${isIntradayGain ? "text-emerald-400" : "text-rose-400"}`}>
            {isIntradayGain ? "+" : ""}₹{totalIntradayPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#64748b] block mt-1">
            Live prices via Upstox Engine
          </span>
        </div>

        {/* Card 4: Total Net Worth */}
        <div className="glass-card p-4 rounded-[14px] border border-[#1f2d45]">
          <span className="text-xs text-[#94a3b8] font-medium block mb-1">Total Net Worth</span>
          <div className="text-xl font-bold mono text-[#f1f5f9]">
            ₹{totalNetWorth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className={`text-[11px] font-semibold block mt-1 ${isNetGain ? "text-emerald-400" : "text-rose-400"}`}>
            Overall P&L: {isNetGain ? "+" : ""}₹{totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#1f2d45] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("positions")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "positions"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          ⚡ Intraday Positions ({positionsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("holdings")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "holdings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          📦 Delivery Holdings ({holdingsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "orders"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          📋 Order Book ({orderBook.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("trades")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "trades"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          🧾 Trade Book ({tradeBook.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("funds")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "funds"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          💰 Funds & Margin
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "wallet"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          💳 Sandbox Deposits
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={`py-2 px-4 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "payouts"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-[#94a3b8] hover:text-white hover:bg-[#111827]"
          }`}
        >
          🏦 Payouts Log
        </button>
      </div>

      {/* ─── TAB 1: INTRADAY (MIS) POSITIONS ──────────────────────────────── */}
      {activeTab === "positions" && (
        <div className="space-y-3">
          {positionsList.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[12px] bg-indigo-500/10 border border-indigo-500/25">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-sm">⏰ 15:15 IST Auto Square-off:</span>
                <span className="text-xs text-[#cbd5e1]">
                  All open MIS intraday positions will be automatically squared off at market close (15:15 IST) using the latest market price.
                </span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => squareOffAllMutation.mutate()}
                disabled={squareOffAllMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                {squareOffAllMutation.isPending ? "Exiting All..." : "Exit All MIS Positions Now"}
              </Button>
            </div>
          )}

          <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton height="40px" />
                <Skeleton height="40px" />
                <Skeleton height="40px" />
              </div>
            ) : positionsList.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-[16px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-bold">
                  ⚡
                </div>
                <h3 className="text-lg font-bold">No Open Intraday Positions</h3>
                <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                  Trade Indian equities with <strong>5x Margin (MIS)</strong>! Go <strong>BUY (Long)</strong> or <strong>SHORT SELL</strong> stocks with only 20% capital required.
                </p>
                <Link to="/stocks">
                  <Button className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-bold shadow-lg shadow-indigo-600/30">
                    + Open MIS 5x Trade
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                    <tr>
                      <th className="py-3 px-4">Instrument</th>
                      <th className="py-3 px-4 text-center">Side</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Avg Entry</th>
                      <th className="py-3 px-4 text-right">LTP (Live)</th>
                      <th className="py-3 px-4 text-right">Margin Blocked</th>
                      <th className="py-3 px-4 text-right">Day P&L</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2d45]/40">
                    {positionsList.map((pos) => (
                      <PositionRow
                        key={pos.id}
                        position={pos}
                        onOpenCloseModal={(p, ltp) => setCloseTarget({ position: p, currentLtp: ltp })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: DELIVERY HOLDINGS (CNC) ───────────────────────────────── */}
      {activeTab === "holdings" && (
        <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          ) : holdingsList.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-[16px] bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-2xl font-bold">
                📦
              </div>
              <h3 className="text-lg font-bold">No Delivery Holdings</h3>
              <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                You currently have ₹{cash.toLocaleString("en-IN")} available. Explore stocks to place long-term delivery (CNC) orders!
              </p>
              <Link to="/stocks">
                <Button>Explore Stocks to Buy</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                  <tr>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Avg Price</th>
                    <th className="py-3 px-4 text-right">LTP (Live)</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Overall P&L</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d45]/40">
                  {holdingsList.map((h) => (
                    <HoldingRow
                      key={h.id}
                      holding={h}
                      onQuickSell={(item) => {
                        setSelectedSellHolding(item);
                        setSellQuantity(item.quantity);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: ORDER BOOK ────────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Sub-tabs: All, Open, Executed, Cancelled, Rejected */}
          <div className="flex items-center gap-1.5 bg-[#111827] p-1 rounded-[10px] border border-[#1f2d45] w-fit">
            {(["ALL", "OPEN", "EXECUTED", "CANCELLED", "REJECTED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setOrderFilter(filter)}
                className={`py-1 px-3 rounded-[6px] text-xs font-bold transition-all ${
                  orderFilter === filter
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#1a2333]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
            {ordersLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton height="40px" />
                <Skeleton height="40px" />
              </div>
            ) : orderBook.length === 0 ? (
              <div className="py-16 text-center text-[#94a3b8] text-sm">
                No orders found under {orderFilter} status.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Instrument</th>
                      <th className="py-3 px-4 text-center">Side</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-center">Product</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Price / Trigger</th>
                      <th className="py-3 px-4 text-right">Avg Exec</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2d45]/40">
                    {orderBook.map((order) => {
                      const isOpen = order.status === "OPEN" || order.status === "TRIGGERED";
                      return (
                        <tr key={order.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                          <td className="py-3.5 px-4 text-xs text-[#94a3b8] mono">
                            {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            <Link to={`/stocks/${order.symbol}`} className="hover:text-indigo-400">
                              {order.symbol}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] ${
                                order.side === "BUY"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {order.side}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs font-semibold text-[#94a3b8]">
                            {order.orderType}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                              {order.productType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center mono font-semibold">
                            {order.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right mono text-xs text-[#94a3b8]">
                            {order.limitPrice ? `₹${parseFloat(order.limitPrice).toFixed(2)}` : "MKT"}
                            {order.triggerPrice ? ` (Trg: ₹${parseFloat(order.triggerPrice).toFixed(2)})` : ""}
                          </td>
                          <td className="py-3.5 px-4 text-right mono text-xs font-bold text-white">
                            {order.averagePrice ? `₹${parseFloat(order.averagePrice).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                order.status === "EXECUTED"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : order.status === "OPEN"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse"
                                  : order.status === "TRIGGERED"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : order.status === "CANCELLED"
                                  ? "bg-slate-700/30 text-slate-400 border border-slate-700"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isOpen ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => cancelOrderMutation.mutate(order.id)}
                                disabled={cancelOrderMutation.isPending}
                                className="h-7 text-[11px] font-bold px-2.5 bg-rose-600/80 hover:bg-rose-600"
                              >
                                Cancel
                              </Button>
                            ) : (
                              <span className="text-xs text-[#475569]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: TRADE BOOK ────────────────────────────────────────────── */}
      {activeTab === "trades" && (
        <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
          {tradesLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          ) : tradeBook.length === 0 ? (
            <div className="py-16 text-center text-[#94a3b8] text-sm">
              No completed trades yet. Close a position to see realized trades and simulated charges.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4 text-center">Side</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Entry Price</th>
                    <th className="py-3 px-4 text-right">Exit Price</th>
                    <th className="py-3 px-4 text-right">Gross P&L</th>
                    <th className="py-3 px-4 text-right">Charges</th>
                    <th className="py-3 px-4 text-right">Net Realized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d45]/40">
                  {tradeBook.map((trade) => {
                    const gross = parseFloat(trade.grossPnl);
                    const net = parseFloat(trade.netPnl);
                    const isNetPositive = net >= 0;
                    return (
                      <tr key={trade.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="py-3.5 px-4 text-xs text-[#94a3b8] mono">
                          {new Date(trade.executedAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          <Link to={`/stocks/${trade.symbol}`} className="hover:text-indigo-400">
                            {trade.symbol}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] ${
                              trade.side === "BUY"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center mono font-semibold">
                          {trade.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right mono text-xs text-[#94a3b8]">
                          ₹{parseFloat(trade.entryPrice).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right mono text-xs font-semibold text-white">
                          ₹{parseFloat(trade.exitPrice).toFixed(2)}
                        </td>
                        <td className={`py-3.5 px-4 text-right mono text-xs font-semibold ${gross >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {gross >= 0 ? "+" : ""}₹{gross.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right mono text-xs text-[#94a3b8]">
                          -₹{parseFloat(trade.charges).toFixed(2)}
                        </td>
                        <td className={`py-3.5 px-4 text-right mono font-bold text-sm ${isNetPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isNetPositive ? "+" : ""}₹{net.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: FUNDS & MARGIN ────────────────────────────────────────── */}
      {activeTab === "funds" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-6 rounded-[16px] border border-[#1f2d45] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Virtual Wallet & Equity Margins</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </h3>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#1f2d45]/60">
                <span className="text-[#94a3b8]">Available Cash Balance</span>
                <span className="font-bold mono text-white">
                  ₹{cash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#1f2d45]/60">
                <span className="text-[#94a3b8]">Used Margin (MIS Intraday)</span>
                <span className="font-bold mono text-indigo-400">
                  ₹{totalMarginBlocked.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#1f2d45]/60">
                <span className="text-[#94a3b8]">Effective Intraday Buying Power (5x)</span>
                <span className="font-bold mono text-emerald-400">
                  ₹{buyingPower.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#1f2d45]/60">
                <span className="text-[#94a3b8]">Delivery Holdings Current Value</span>
                <span className="font-bold mono text-white">
                  ₹{holdingsValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#1f2d45]/60">
                <span className="text-[#94a3b8]">Today's Unrealized Intraday P&L</span>
                <span className={`font-bold mono ${isIntradayGain ? "text-emerald-400" : "text-rose-400"}`}>
                  {isIntradayGain ? "+" : ""}₹{totalIntradayPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-[#1f2d45] text-base">
                <span className="font-bold text-white">Total Portfolio Value (Net Worth)</span>
                <span className="font-bold mono text-emerald-400">
                  ₹{totalNetWorth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                onClick={() => setShowAddFundsModal(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
              >
                + Add Virtual Funds
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowResetModal(true)}
                className="flex-1 text-xs border-[#1f2d45]"
              >
                ↺ Reset to ₹10L
              </Button>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[16px] border border-[#1f2d45] space-y-4">
            <h3 className="text-base font-bold text-white">Regulatory & Charges Framework</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              StockLens models realistic Indian market charges based on standard NSE/SEBI tariff structures:
            </p>
            <div className="space-y-2 text-xs text-[#94a3b8] bg-[#0b0f19] p-4 rounded-[12px] border border-[#1f2d45]">
              <div className="flex justify-between">
                <span>Brokerage</span>
                <span className="text-white font-medium">Flat ₹20 or 0.05% (whichever is lower)</span>
              </div>
              <div className="flex justify-between">
                <span>STT (Securities Transaction Tax)</span>
                <span className="text-white font-medium">0.025% on Intraday Sell side · 0.1% CNC</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Turnover Charges (NSE)</span>
                <span className="text-white font-medium">0.00345% of turnover</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span className="text-white font-medium">18% on (Brokerage + Exchange Charges)</span>
              </div>
              <div className="flex justify-between">
                <span>SEBI Turnover Charges</span>
                <span className="text-white font-medium">₹10 per crore</span>
              </div>
              <div className="flex justify-between">
                <span>Stamp Duty</span>
                <span className="text-white font-medium">0.003% on Buy side</span>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[10px] text-xs text-amber-400">
              Note: All fees shown are SIMULATED and subtracted only from virtual demo wallet balances.
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: WALLET DEPOSITS ───────────────────────────────────────── */}
      {activeTab === "wallet" && (
        <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
          {!walletTransactions || walletTransactions.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold">
                💳
              </div>
              <h3 className="text-lg font-bold text-[#f1f5f9]">No Wallet Deposits Yet</h3>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                Test the cryptographic payment sandbox! Simulate instant UPI, NetBanking, or Card top-ups to credit your trading cash balance.
              </p>
              <Button
                onClick={() => setShowAddFundsModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                + Add Money Now
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d45]/40">
                  {walletTransactions.map((tx: any) => (
                    <tr key={tx.id || tx.transactionId} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3.5 px-4 text-xs text-[#94a3b8] mono">
                        {new Date(tx.timestamp).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4 mono text-xs font-bold text-[#818cf8]">
                        {tx.transactionId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#172338] border border-[#1f2d45] text-[#f1f5f9]">
                          {tx.paymentMethod === "UPI" && "⚡"}
                          {tx.paymentMethod === "CARD" && "💳"}
                          {tx.paymentMethod === "NETBANKING" && "🏦"}
                          {tx.paymentMethod}
                          {tx.upiId && <span className="text-[10px] text-[#94a3b8]">({tx.upiId})</span>}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right mono font-bold text-emerald-400">
                        +₹{parseFloat(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          SUCCESS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 7: PAYOUTS LOG ───────────────────────────────────────────── */}
      {activeTab === "payouts" && (
        <div className="glass-card border border-[#1f2d45] rounded-[16px] overflow-hidden">
          {!payoutsList || payoutsList.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-[16px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-2xl font-bold">
                🏦
              </div>
              <h3 className="text-lg font-bold text-white">No Bank Withdrawals Yet</h3>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                Withdraw cleared cash directly to your verified bank account via instant IMPS clearing.
              </p>
              <Button
                onClick={() => setShowWithdrawModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Withdraw to Bank
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111827] text-xs font-semibold uppercase tracking-wider text-[#94a3b8] border-b border-[#1f2d45]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Payout ID</th>
                    <th className="py-3 px-4">Reference ID (IMPS)</th>
                    <th className="py-3 px-4">Bank Account</th>
                    <th className="py-3 px-4">IFSC Code</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d45]/40">
                  {payoutsList.map((p: any) => (
                    <tr key={p.id || p.payoutId} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3.5 px-4 text-xs text-[#94a3b8] mono">
                        {new Date(p.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4 mono text-xs font-bold text-[#818cf8]">
                        {p.payoutId}
                      </td>
                      <td className="py-3.5 px-4 mono text-xs font-semibold text-blue-400">
                        {p.referenceId}
                      </td>
                      <td className="py-3.5 px-4 mono text-xs font-bold text-white">
                        {p.bankAccountMask}
                      </td>
                      <td className="py-3.5 px-4 mono text-xs text-[#94a3b8]">
                        {p.ifscCode}
                      </td>
                      <td className="py-3.5 px-4 text-right mono font-bold text-rose-400">
                        -₹{parseFloat(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          ✓ {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── CLOSE POSITION CONFIRMATION DIALOG ──────────────────────────── */}
      {closeTarget && closeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-[#1f2d45] rounded-[20px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2d45]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Close Position</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/20 text-rose-400">
                    Exit {closeDetails.symbol}
                  </span>
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Execute opposite order ({closeDetails.oppositeSide} {closeDetails.quantity} shares) to realize P&L
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCloseTarget(null)}
                className="text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-[#1f2d45]"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0b0f19] rounded-[14px] p-4 border border-[#1f2d45] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Instrument & Side</span>
                <span className="font-semibold text-white">
                  {closeDetails.symbol} ({closeDetails.side})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Position Quantity</span>
                <span className="font-semibold text-white">{closeDetails.quantity} Shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Average Entry Price</span>
                <span className="font-semibold text-white">₹{closeDetails.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Current Market Price (LTP)</span>
                <span className="font-bold text-white">₹{closeDetails.currentLtp.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#1f2d45] flex justify-between">
                <span className="text-[#94a3b8]">Gross Unrealized P&L</span>
                <span className={`font-semibold ${closeDetails.grossPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {closeDetails.grossPnl >= 0 ? "+" : ""}₹{closeDetails.grossPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Simulated Statutory Charges</span>
                <span className="font-semibold text-[#94a3b8]">-₹{closeDetails.totalCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#1f2d45] text-white">
                <span>Estimated Net Realized P&L</span>
                <span className={closeDetails.isGain ? "text-emerald-400" : "text-rose-400"}>
                  {closeDetails.isGain ? "+" : ""}₹{closeDetails.netPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[#64748b] pt-1">
                <span>Margin to Unblock & Return to Cash</span>
                <span className="text-indigo-400 font-semibold">+₹{closeDetails.marginReleased.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCloseTarget(null)}
                disabled={closePositionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => closePositionMutation.mutate(closeTarget.position.id)}
                loading={closePositionMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 font-bold px-4"
              >
                Confirm Close Position
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK SELL DELIVERY MODAL ────────────────────────────────────── */}
      {selectedSellHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 rounded-[20px] max-w-md w-full space-y-4 border border-[#1f2d45] shadow-2xl">
            <h3 className="text-lg font-bold text-rose-400">
              Sell Delivery Shares: {selectedSellHolding.symbol}
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Available shares in portfolio: <strong className="text-white">{selectedSellHolding.quantity}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-xs text-[#94a3b8]">Quantity to Sell</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={selectedSellHolding.quantity}
                  value={sellQuantity}
                  onChange={(e) =>
                    setSellQuantity(
                      Math.min(
                        selectedSellHolding.quantity,
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    )
                  }
                  className="flex-1 px-3 py-2 rounded-[10px] bg-[#111827] border border-[#1f2d45] text-sm text-[#f1f5f9] mono font-bold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSellQuantity(selectedSellHolding.quantity)}
                >
                  Sell All
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSellHolding(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => sellHoldingMutation.mutate()}
                disabled={sellHoldingMutation.isPending || sellQuantity <= 0}
              >
                {sellHoldingMutation.isPending ? "Selling..." : `Confirm Sell (${sellQuantity} Shares)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESET FUNDS MODAL ────────────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 rounded-[20px] max-w-md w-full space-y-4 border border-[#1f2d45] shadow-2xl">
            <h3 className="text-lg font-bold text-[#f1f5f9]">Reset Virtual Funds?</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              This will clear all your current paper trading holdings and order history, resetting your cash balance back to <strong>₹10,00,000</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Resetting..." : "Yes, Reset to ₹10L"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["portfolio"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
        }}
      />

      {/* Withdraw Funds Modal */}
      <WithdrawFundsModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        currentCash={cash}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["portfolio"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-payouts"] });
        }}
      />
    </div>
  );
};
