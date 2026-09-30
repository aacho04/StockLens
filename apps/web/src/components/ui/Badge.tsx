import React from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gain" | "loss" | "neutral" | "brand" | "gold";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  className,
}) => {
  const variantStyles = {
    gain: "bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]",
    loss: "bg-[rgba(244,63,94,0.1)] text-[#f43f5e] border border-[rgba(244,63,94,0.2)]",
    neutral: "bg-[#1a2235] text-[#94a3b8] border border-[#1f2d45]",
    brand: "bg-[rgba(99,102,241,0.12)] text-[#818cf8] border border-[rgba(99,102,241,0.25)]",
    gold: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs rounded-[6px]",
    md: "px-3 py-1 text-sm rounded-[8px]",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

// Convenience helpers
export const GainBadge: React.FC<{ value: string; size?: "sm" | "md" }> = ({ value, size }) => (
  <Badge variant="gain" {...(size ? { size } : {})}>▲ {value}%</Badge>
);

export const LossBadge: React.FC<{ value: string; size?: "sm" | "md" }> = ({ value, size }) => (
  <Badge variant="loss" {...(size ? { size } : {})}>▼ {value}%</Badge>
);

export const ChangeBadge: React.FC<{ value: number | string; size?: "sm" | "md" }> = ({ value, size }) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return <Badge variant="neutral" {...(size ? { size } : {})}>—</Badge>;
  return num >= 0
    ? <GainBadge value={Math.abs(num).toFixed(2)} {...(size ? { size } : {})} />
    : <LossBadge value={Math.abs(num).toFixed(2)} {...(size ? { size } : {})} />;
};
