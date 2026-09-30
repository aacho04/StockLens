import React, { useState } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface WithdrawFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: string, amount: number) => void;
  currentCash: number;
}

export const WithdrawFundsModal: React.FC<WithdrawFundsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentCash,
}) => {
  const withdrawableBalance = +(currentCash * 0.9).toFixed(2);
  const unsettledBalance = +(currentCash * 0.1).toFixed(2);

  const [amount, setAmount] = useState<number>(Math.min(5000, Math.floor(withdrawableBalance)));
  const [accountNumber, setAccountNumber] = useState<string>("50100412345678");
  const [confirmAccount, setConfirmAccount] = useState<string>("50100412345678");
  const [ifscCode, setIfscCode] = useState<string>("HDFC0000123");
  const [accountHolder, setAccountHolder] = useState<string>("Investor User");
  const [step, setStep] = useState<"INPUT" | "PROCESSING" | "SUCCESS">("INPUT");
  const [payoutResult, setPayoutResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePercentageSelect = (pct: number) => {
    setAmount(Math.floor((withdrawableBalance * pct) / 100));
  };

  const handleInitiatePayout = async () => {
    if (!amount || amount < 100) {
      setErrorMsg("Minimum withdrawal amount is ₹100");
      return;
    }
    if (amount > withdrawableBalance) {
      setErrorMsg(`Amount exceeds withdrawable balance of ₹${withdrawableBalance.toLocaleString("en-IN")}`);
      return;
    }
    if (amount > 200000) {
      setErrorMsg("Maximum single withdrawal limit is ₹2,00,000");
      return;
    }
    if (accountNumber !== confirmAccount) {
      setErrorMsg("Bank account numbers do not match.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      setErrorMsg("Please enter a valid 11-character IFSC code (e.g., HDFC0000123).");
      return;
    }

    setErrorMsg(null);
    setStep("PROCESSING");

    try {
      // Simulate bank network handshake
      await new Promise((r) => setTimeout(r, 800));

      const res = await apiClient.post("/wallet/payouts", {
        amount,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountHolderName: accountHolder,
      });

      const data = res.data.data;
      setPayoutResult(data);
      setStep("SUCCESS");
      onSuccess(data.newCashBalance, amount);
    } catch (err: any) {
      console.error("Payout failed:", err);
      setErrorMsg(
        err.response?.data?.error?.message ||
          "Withdrawal processing failed. Please check bank details or velocity limits."
      );
      setStep("INPUT");
    }
  };

  const handleResetAndClose = () => {
    setStep("INPUT");
    setPayoutResult(null);
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#6366f1] to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-bg-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-lg font-bold">
              🏦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Withdraw to Bank</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  IMPS INSTANT
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Direct bank settlement with atomic ledger locking
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
            <div className="space-y-5">
              {/* Balance Pools Breakdown (T+1 Settlement Blueprint) */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[14px]">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                    Withdrawable (Cleared)
                  </span>
                  <span className="text-lg font-bold text-[var(--color-text-primary)] mono">
                    ₹{withdrawableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-l border-[var(--color-bg-border)] pl-3">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                    Unsettled (T+1 Clearing)
                  </span>
                  <span className="text-lg font-bold text-[var(--color-text-secondary)] mono">
                    ₹{unsettledBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Amount Input with Fixed Clean Flex Prefix */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-2">
                  Withdrawal Amount
                </label>
                <div className="flex items-center w-full h-14 px-4 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] focus-within:border-[#6366f1] focus-within:ring-2 focus-within:ring-[#6366f1]/20 rounded-[14px] transition-all">
                  <span className="text-2xl font-bold text-[#818cf8] select-none pr-3 flex-shrink-0">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={withdrawableBalance}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-full bg-transparent text-2xl font-bold text-[var(--color-text-primary)] outline-none mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none p-0 focus:ring-0"
                    placeholder="0"
                  />
                </div>

                {/* Percentage Shortcuts */}
                <div className="flex gap-2 mt-2.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSelect(pct)}
                      className="flex-1 py-1 rounded-[8px] text-xs font-bold bg-[var(--color-bg-input)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-bg-border)] transition-colors mono"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Account Fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] block mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[10px] text-xs text-[var(--color-text-primary)] outline-none mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] block mb-1">
                      Confirm Account
                    </label>
                    <input
                      type="text"
                      value={confirmAccount}
                      onChange={(e) => setConfirmAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[10px] text-xs text-[var(--color-text-primary)] outline-none mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] block mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[10px] text-xs text-[var(--color-text-primary)] outline-none mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] block mb-1">
                      Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[10px] text-xs text-[var(--color-text-primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Velocity & Security Policy Notice */}
              <div className="p-3 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[12px] text-[11px] text-[var(--color-text-secondary)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-primary)]">🛡️ Velocity Protection</span>
                  <span className="text-emerald-400 font-bold">3 / 24h</span>
                </div>
                <p>
                  Funds will be dispatched via standard IMPS clearing network. Single payout limit: ₹2,00,000.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[12px] text-xs text-red-400">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleInitiatePayout}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[14px] shadow-lg shadow-blue-600/20"
              >
                Withdraw ₹{amount.toLocaleString("en-IN")} via IMPS
              </Button>
            </div>
          )}

          {step === "PROCESSING" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin" />
              <div>
                <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Dispatching IMPS Payout...
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Executing atomic database lock & sending clearing instruction to banking gateway
                </p>
              </div>
            </div>
          )}

          {step === "SUCCESS" && payoutResult && (
            <div className="py-6 text-center space-y-5 animate-scale-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-3xl font-bold">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  WITHDRAWAL PROCESSED
                </span>
                <h4 className="text-2xl font-bold text-[var(--color-text-primary)] mt-2 mono">
                  -₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Dispatched to bank account {payoutResult.bankAccountMask}
                </p>
              </div>

              {/* Receipt Box */}
              <div className="p-4 bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-[16px] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Banking Reference</span>
                  <span className="mono font-semibold text-[var(--color-text-primary)]">
                    {payoutResult.referenceId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Destination Bank</span>
                  <span className="font-semibold text-[#818cf8]">
                    {payoutResult.bankAccountMask} ({payoutResult.ifscCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">New Cash Balance</span>
                  <span className="mono font-bold text-emerald-400">
                    ₹{parseFloat(payoutResult.newCashBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">24h Payouts Left</span>
                  <span className="font-semibold text-emerald-400">
                    {payoutResult.dailyWithdrawalsRemaining} / 3 remaining
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
