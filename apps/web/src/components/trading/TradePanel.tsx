import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface TradePanelProps {
  symbol: string;
  name: string;
  currentPrice: number;
  exchange?: "NSE" | "BSE";
}

type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M";
type ProductType = "MIS" | "CNC";
type Side = "BUY" | "SELL";

interface ChargesBreakdown {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gst: number;
  sebiCharges: number;
  stampDuty: number;
  totalCharges: number;
}

// Indian Market Index Lot Size Configuration
const INDEX_LOT_SIZES: Record<string, number> = {
  "NIFTY": 25,
  "NIFTY 50": 25,
  "BANKNIFTY": 15,
  "FINNIFTY": 25,
  "SENSEX": 10,
  "MIDCPNIFTY": 50,
};

export const TradePanel: React.FC<TradePanelProps> = ({
  symbol,
  name,
  currentPrice,
  exchange = "NSE",
}) => {
  const queryClient = useQueryClient();
  const upperSym = symbol.toUpperCase();

  // Detect whether this is an index
  const isIndex =
    upperSym.includes("NIFTY") ||
    upperSym.includes("SENSEX") ||
    upperSym.includes("BANK") ||
    Boolean(INDEX_LOT_SIZES[upperSym]);

  const lotSize = INDEX_LOT_SIZES[upperSym] ?? 1;

  const [side, setSide] = useState<Side>("BUY");
  const [productType, setProductType] = useState<ProductType>("MIS");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");

  // Quantity or Lots
  const [lots, setLots] = useState<number>(1);
  const [customQty, setCustomQty] = useState<number>(lotSize);

  const [limitPrice, setLimitPrice] = useState<string>("");
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [target, setTarget] = useState<string>("");

  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showChargesDetail, setShowChargesDetail] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Sync quantity with lots for indices
  const quantity = isIndex ? lots * lotSize : customQty;

  // Fetch virtual wallet funds
  const { data: fundsData } = useQuery({
    queryKey: ["portfolio-funds"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/trading/funds");
        return res.data.data;
      } catch {
        const fallback = await apiClient.get("/portfolio");
        return {
          virtualCash: fallback.data.data?.cashBalance ?? "1000000",
          usedMargin: fallback.data.data?.usedMargin ?? "0",
          availableMargin: fallback.data.data?.cashBalance ?? "1000000",
        };
      }
    },
    refetchInterval: 8000,
  });

  const availableCash = fundsData
    ? parseFloat(fundsData.availableMargin ?? fundsData.virtualCash ?? "1000000")
    : 1_000_000;

  // Active price based on order type
  const effectivePrice = useMemo(() => {
    if (orderType === "MARKET") return currentPrice;
    if (orderType === "LIMIT") return parseFloat(limitPrice) || currentPrice;
    if (orderType === "SL-M") return parseFloat(triggerPrice) || currentPrice;
    if (orderType === "SL") return parseFloat(limitPrice) || parseFloat(triggerPrice) || currentPrice;
    return currentPrice;
  }, [orderType, currentPrice, limitPrice, triggerPrice]);

  const estimatedOrderValue = +(quantity * effectivePrice).toFixed(2);
  const requiredMargin = productType === "MIS" ? +(estimatedOrderValue / 5).toFixed(2) : estimatedOrderValue;
  const canAfford = availableCash >= requiredMargin;

  // Client-side simulated charges calculation
  const charges: ChargesBreakdown = useMemo(() => {
    const turnover = estimatedOrderValue;
    if (turnover <= 0) {
      return {
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        gst: 0,
        sebiCharges: 0,
        stampDuty: 0,
        totalCharges: 0,
      };
    }

    // Brokerage: Min(₹20, 0.05% of turnover)
    const brokerage = Math.min(20, +(turnover * 0.0005).toFixed(2));
    // STT: 0.025% on sell for intraday, 0.1% for delivery
    let stt = 0;
    if (productType === "MIS") {
      stt = side === "SELL" ? +(turnover * 0.00025).toFixed(2) : 0;
    } else {
      stt = +(turnover * 0.001).toFixed(2);
    }
    // Exchange charges: 0.00345%
    const exchangeCharges = +(turnover * 0.0000345).toFixed(2);
    // GST: 18% on (brokerage + exchangeCharges)
    const gst = +((brokerage + exchangeCharges) * 0.18).toFixed(2);
    // SEBI: ₹10 per crore (0.0001%)
    const sebiCharges = Math.max(0.01, +(turnover * 0.000001).toFixed(2));
    // Stamp duty: 0.003% on buy
    const stampDuty = side === "BUY" ? +(turnover * 0.00003).toFixed(2) : 0;

    const totalCharges = +(
      brokerage +
      stt +
      exchangeCharges +
      gst +
      sebiCharges +
      stampDuty
    ).toFixed(2);

    return {
      brokerage,
      stt,
      exchangeCharges,
      gst,
      sebiCharges,
      stampDuty,
      totalCharges,
    };
  }, [estimatedOrderValue, productType, side]);

  // Order validation before review
  const validateOrder = (): string | null => {
    if (quantity <= 0 || !Number.isInteger(quantity)) return "Quantity must be a positive whole number.";
    if (effectivePrice <= 0) return "Valid price is required.";
    if (!canAfford)
      return `Insufficient virtual balance. Required: ₹${requiredMargin.toLocaleString("en-IN")}, Available: ₹${availableCash.toLocaleString("en-IN")}`;
    if (orderType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      return "Please enter a valid limit price.";
    }
    if (
      orderType === "SL" &&
      (!triggerPrice || parseFloat(triggerPrice) <= 0 || !limitPrice || parseFloat(limitPrice) <= 0)
    ) {
      return "Stop Loss limit orders require both a valid Limit Price and Trigger Price.";
    }
    if (orderType === "SL-M" && (!triggerPrice || parseFloat(triggerPrice) <= 0)) {
      return "Stop Loss market orders require a valid Trigger Price.";
    }
    return null;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateOrder();
    if (error) {
      setFeedbackMessage({ text: error, type: "error" });
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }
    setShowReviewModal(true);
  };

  // Submit Order Mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        symbol: upperSym,
        exchange,
        side,
        productType,
        orderType,
        quantity,
        limitPrice: ["LIMIT", "SL"].includes(orderType) && limitPrice ? parseFloat(limitPrice) : undefined,
        triggerPrice: ["SL", "SL-M"].includes(orderType) && triggerPrice ? parseFloat(triggerPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        target: target ? parseFloat(target) : undefined,
      };

      const res = await apiClient.post("/orders", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setShowReviewModal(false);
      queryClient.invalidateQueries({ queryKey: ["portfolio-funds"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });

      const statusText = data?.order?.status || "PLACED";
      setFeedbackMessage({
        text: `Order ${statusText}! ${side} ${quantity} ${upperSym} via ${orderType} (${productType})`,
        type: "success",
      });
      setTimeout(() => setFeedbackMessage(null), 6000);
    },
    onError: (err: any) => {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to place paper order";
      setFeedbackMessage({ text: errorMsg, type: "error" });
      setTimeout(() => setFeedbackMessage(null), 6000);
    },
  });

  return (
    <div
      id="trade-panel-root"
      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1f2d45] rounded-[18px] p-4 sm:p-5 shadow-xl transition-colors space-y-4"
    >
      {/* Top Banner: Paper Trading + Index Tag */}
      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 rounded-[10px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wide text-amber-700 dark:text-amber-400 uppercase">
            {isIndex ? "⚡ Index Intraday Contract" : "Paper Trading"}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {isIndex ? `Lot: ${lotSize} Shares` : "Simulated Funds"}
        </span>
      </div>

      {/* Side Selector: BUY / SELL (Ultra-clean modern segmented buttons) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-[12px] border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`py-2.5 text-xs font-bold rounded-[9px] transition-all flex items-center justify-center gap-1.5 ${
            side === "BUY"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-extrabold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>BUY (LONG)</span>
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`py-2.5 text-xs font-bold rounded-[9px] transition-all flex items-center justify-center gap-1.5 ${
            side === "SELL"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-extrabold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>SELL (SHORT)</span>
        </button>
      </div>

      {/* Product Type: Intraday (MIS 5x) vs Longterm (CNC) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 dark:text-slate-400 font-semibold">Product Type</span>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            {productType === "MIS" ? "⚡ 5x Margin Active" : "📦 1x Cash Delivery"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-[10px] border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setProductType("MIS")}
            className={`py-2 px-2 text-xs font-bold rounded-[8px] transition-all text-center ${
              productType === "MIS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Intraday (MIS 5x)
          </button>
          <button
            type="button"
            onClick={() => setProductType("CNC")}
            className={`py-2 px-2 text-xs font-bold rounded-[8px] transition-all text-center ${
              productType === "CNC"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {isIndex ? "Normal (NRML)" : "Delivery (CNC)"}
          </button>
        </div>
      </div>

      {/* Order Type Selector */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 dark:text-slate-400 font-semibold">Order Type</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {orderType === "MARKET" && "Executes at LTP"}
            {orderType === "LIMIT" && "Limit price or better"}
            {orderType === "SL" && "Stop-loss with limit"}
            {orderType === "SL-M" && "Stop-loss with market"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-[10px] border border-slate-200 dark:border-slate-800">
          {(["MARKET", "LIMIT", "SL", "SL-M"] as OrderType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`py-1.5 text-[11px] font-bold rounded-[7px] transition-all ${
                orderType === type
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs: Quantity & Price Fields */}
      <form onSubmit={handleOpenReview} className="space-y-3">
        {/* Quantity (or Lots for Index) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <label className="text-slate-700 dark:text-slate-300 font-semibold">
              {isIndex ? `Lots (1 Lot = ${lotSize} Qty)` : "Quantity (Shares)"}
            </label>
            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold mono">
              Total: {quantity} Qty
            </span>
          </div>

          {/* Stepper with Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isIndex) setLots((prev) => Math.max(1, prev - 1));
                else setCustomQty((prev) => Math.max(1, prev - 1));
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              −
            </button>

            <input
              type="number"
              min="1"
              step="1"
              value={isIndex ? lots : customQty}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                if (isIndex) setLots(val);
                else setCustomQty(val);
              }}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[10px] px-3 py-2 text-center text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />

            <button
              type="button"
              onClick={() => {
                if (isIndex) setLots((prev) => prev + 1);
                else setCustomQty((prev) => prev + 1);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              +
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 mt-2">
            {(isIndex ? [1, 2, 4, 10] : [10, 25, 50, 100]).map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (isIndex) setLots(step);
                  else setCustomQty(step);
                }}
                className="flex-1 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-[8px] transition-colors"
              >
                {isIndex ? `${step} Lot${step > 1 ? "s" : ""}` : `+${step}`}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price (if LIMIT or SL) */}
        {["LIMIT", "SL"].includes(orderType) && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">Limit Price (₹)</label>
              <button
                type="button"
                onClick={() => setLimitPrice(currentPrice.toFixed(2))}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Use LTP (₹{currentPrice.toFixed(2)})
              </button>
            </div>
            <input
              type="number"
              step="0.05"
              placeholder={currentPrice.toFixed(2)}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[10px] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
        )}

        {/* Trigger Price (if SL or SL-M) */}
        {["SL", "SL-M"].includes(orderType) && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">Trigger Price (₹)</label>
              <span className="text-slate-500 text-[11px]">Activation trigger</span>
            </div>
            <input
              type="number"
              step="0.05"
              placeholder={(currentPrice * (side === "BUY" ? 1.01 : 0.99)).toFixed(2)}
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[10px] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
        )}

        {/* Target and Stop Loss (Optional risk controls) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block font-medium">
              Stop Loss (₹)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[8px] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block font-medium">
              Target (₹)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="Optional"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[8px] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Summary Card with Light & Dark Mode Compatibility */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-[14px] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Order Value</span>
            <span className="font-bold text-slate-900 dark:text-white mono">
              ₹{estimatedOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Margin Required ({productType === "MIS" ? "5x Leverage" : "100% CNC"})</span>
            <span className={`font-bold mono ${canAfford ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              ₹{requiredMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Available Virtual Balance</span>
            <span className="font-semibold text-slate-900 dark:text-white mono">
              ₹{availableCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setShowChargesDetail(!showChargesDetail)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Simulated Charges: ₹{charges.totalCharges.toFixed(2)}</span>
              <span>{showChargesDetail ? "▲" : "▼"}</span>
            </button>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Brokerage capped at ₹20</span>
          </div>

          {/* Collapsible Charges Breakdown */}
          {showChargesDetail && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Brokerage</span>
                <span className="mono">₹{charges.brokerage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Securities Transaction Tax (STT)</span>
                <span className="mono">₹{charges.stt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Turnover Charges (NSE)</span>
                <span className="mono">₹{charges.exchangeCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span className="mono">₹{charges.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SEBI Charges + Stamp Duty</span>
                <span className="mono">₹{(charges.sebiCharges + charges.stampDuty).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-[10px] text-xs font-semibold border ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Step 1 Review Order Button */}
        <Button
          type="submit"
          className={`w-full py-3.5 text-sm font-bold tracking-wide rounded-[12px] shadow-lg transition-all ${
            side === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25"
          }`}
          disabled={!canAfford || currentPrice <= 0}
        >
          {!canAfford
            ? "Insufficient Virtual Funds"
            : `Review ${side} Order · ₹${requiredMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        </Button>
      </form>

      {/* Step 2: Review Order Confirmation Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border-t sm:border border-slate-200 dark:border-[#1f2d45] rounded-t-[24px] sm:rounded-[20px] max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Review {side} Order</span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                      side === "BUY"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {side}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {name} ({upperSym}) · {exchange}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/80 rounded-[14px] p-4 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Product Type</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {productType === "MIS" ? "Intraday (MIS 5x Margin)" : "Delivery (CNC)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Order Type</span>
                <span className="font-bold text-slate-900 dark:text-white">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {isIndex ? "Contract Quantity" : "Quantity"}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {quantity} Shares {isIndex ? `(${lots} Lot${lots > 1 ? "s" : ""})` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Execution Price</span>
                <span className="font-bold text-slate-900 dark:text-white mono">
                  ₹{effectivePrice.toFixed(2)}
                </span>
              </div>
              {triggerPrice && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Trigger Price</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 mono">
                    ₹{parseFloat(triggerPrice).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Gross Turnover</span>
                <span className="font-bold text-slate-900 dark:text-white mono">
                  ₹{estimatedOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Simulated Charges</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mono">
                  ₹{charges.totalCharges.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                <span>Required Virtual Funds</span>
                <span className="text-emerald-600 dark:text-emerald-400 mono">
                  ₹{requiredMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2.5 rounded-[10px] border border-slate-200 dark:border-slate-700/60">
              ⚡ Paper Trading: Real Upstox market tick matching with virtual demo balance. No real money is risked.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                className="py-2.5 text-xs font-semibold rounded-[10px] border-slate-300 dark:border-slate-700"
                disabled={placeOrderMutation.isPending}
              >
                Modify Order
              </Button>
              <Button
                type="button"
                onClick={() => placeOrderMutation.mutate()}
                loading={placeOrderMutation.isPending}
                className={`py-2.5 text-xs font-bold rounded-[10px] text-white shadow-lg ${
                  side === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                }`}
              >
                Confirm {side} Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
