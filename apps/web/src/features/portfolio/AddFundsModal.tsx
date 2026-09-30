import React, { useState } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: string, amount: number) => void;
}

const QUICK_AMOUNTS = [500, 1000, 5000, 10000, 25000, 50000];

const PAYMENT_METHODS = [
  {
    id: "UPI",
    name: "UPI Apps",
    subtitle: "Google Pay, PhonePe, Paytm",
    icon: "⚡",
    badge: "Fastest",
  },
  {
    id: "NETBANKING",
    name: "Net Banking",
    subtitle: "HDFC, SBI, ICICI, Axis Bank",
    icon: "🏦",
    badge: "All Banks",
  },
  {
    id: "CARD",
    name: "Debit / Credit Card",
    subtitle: "Visa, Mastercard, RuPay",
    icon: "💳",
    badge: "Zero Fee",
  },
];

export const AddFundsModal: React.FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(5000);
  const [selectedMethod, setSelectedMethod] = useState<string>("UPI");
  const [upiId, setUpiId] = useState<string>("investor@oksbi");
  const [step, setStep] = useState<"INPUT" | "PROCESSING" | "SUCCESS">("INPUT");
  const [orderData, setOrderData] = useState<any>(null);
  const [txResult, setTxResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickAdd = (val: number) => {
    setAmount((prev) => prev + val);
  };

  const handleInitiatePayment = async () => {
    if (!amount || amount < 100) {
      setErrorMsg("Minimum deposit amount is ₹100");
      return;
    }
    setErrorMsg(null);
    setStep("PROCESSING");

    try {
      // Step 1: Create tracking order
      const orderRes = await apiClient.post("/wallet/create-order", { amount });
      const order = orderRes.data.data;
      setOrderData(order);

      // Simulate network / bank gateway processing delay (700ms)
      await new Promise((r) => setTimeout(r, 700));

      // Step 2: Complete checkout with simulated sandbox payment
      const checkoutRes = await apiClient.post("/wallet/checkout-complete", {
        orderId: order.orderId,
        paymentMethod: selectedMethod,
        upiId: selectedMethod === "UPI" ? upiId : undefined,
      });

      const tx = checkoutRes.data.data;
      setTxResult(tx);
      setStep("SUCCESS");
      onSuccess(tx.newCashBalance, amount);
    } catch (err: any) {
      console.error("Payment failed:", err);
      setErrorMsg(
        err.response?.data?.error?.message ||
          "Payment processing failed. Please try again."
      );
      setStep("INPUT");
    }
  };

  const handleResetAndClose = () => {
    setStep("INPUT");
    setOrderData(null);
    setTxResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-bg-border)] rounded-[24px] shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#6366f1] to-cyan-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-bg-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Add Money to Wallet</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SANDBOX
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Instant virtual top-up with simulated UPI / NetBanking
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {step === "INPUT" && (
            <div className="space-y-6">
              {/* Amount Input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-2">
                  Enter Amount
                </label>
                <div className="flex items-center w-full h-14 px-4 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] focus-within:border-[#6366f1] focus-within:ring-2 focus-within:ring-[#6366f1]/20 rounded-[14px] transition-all">
                  <span className="text-2xl font-bold text-[#818cf8] select-none pr-3 flex-shrink-0">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={10000000}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-full bg-transparent text-2xl font-bold text-[var(--color-text-primary)] outline-none mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none p-0 focus:ring-0"
                    placeholder="0"
                  />
                </div>

                {/* Quick Add Pills */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickAdd(q)}
                      className="px-3 py-1.5 rounded-[10px] text-xs font-bold bg-[var(--color-bg-input)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-bg-border)] transition-colors mono"
                    >
                      +₹{q.toLocaleString("en-IN")}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(100000)}
                    className="px-3 py-1.5 rounded-[10px] text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors mono"
                  >
                    ₹1,00,000 (1 Lakh)
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = selectedMethod === pm.id;
                    return (
                      <div
                        key={pm.id}
                        onClick={() => setSelectedMethod(pm.id)}
                        className={`p-3.5 rounded-[14px] border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[rgba(99,102,241,0.12)] border-[#6366f1] shadow-lg shadow-[#6366f1]/10"
                            : "bg-[var(--color-bg-input)] border-[var(--color-bg-border)] hover:border-[#6366f1]/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{pm.icon}</span>
                          <div>
                            <span className="text-sm font-bold text-[var(--color-text-primary)] block">
                              {pm.name}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {pm.subtitle}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[#818cf8] border border-[var(--color-bg-border)]">
                            {pm.badge}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-[#6366f1] bg-[#6366f1]"
                                : "border-[var(--color-text-muted)]"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedMethod === "UPI" && (
                  <div className="mt-3 p-3 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[12px]">
                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] block mb-1">
                      Simulated UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full px-3 py-1.5 bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] outline-none mono"
                    />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[12px] text-xs text-red-400">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleInitiatePayment}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-[14px] shadow-lg shadow-emerald-500/20"
              >
                Deposit ₹{amount.toLocaleString("en-IN")} Instantly
              </Button>
            </div>
          )}

          {step === "PROCESSING" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <div>
                <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Authorizing Payment...
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Connecting to sandbox bank gateway & verifying HMAC-SHA256 signature
                </p>
                {orderData && (
                  <div className="mt-3 inline-block px-3 py-1 rounded bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] text-xs text-[#818cf8] mono">
                    Order Ref: {orderData.orderId}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "SUCCESS" && txResult && (
            <div className="py-6 text-center space-y-5 animate-scale-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PAYMENT SUCCESSFUL
                </span>
                <h4 className="text-2xl font-bold text-[var(--color-text-primary)] mt-2 mono">
                  +₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Credited to your trading wallet cash balance
                </p>
              </div>

              {/* Receipt Box */}
              <div className="p-4 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[16px] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Transaction ID</span>
                  <span className="mono font-semibold text-[var(--color-text-primary)]">
                    {txResult.transactionId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Payment Method</span>
                  <span className="font-semibold text-[#818cf8]">
                    {txResult.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Ledger Balance</span>
                  <span className="mono font-bold text-emerald-400">
                    ₹{parseFloat(txResult.newCashBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Idempotency Status</span>
                  <span className="font-semibold text-emerald-400">
                    Reconciled & Locked
                  </span>
                </div>
              </div>

              <Button
                onClick={handleResetAndClose}
                className="w-full h-11 text-sm font-bold bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-[12px]"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
