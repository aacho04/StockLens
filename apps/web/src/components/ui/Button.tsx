import React from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#6366f1] text-white hover:bg-[#5254cc] active:scale-[0.98] shadow-[0_0_16px_rgba(99,102,241,0.35)]",
  secondary:
    "bg-[#1a2235] text-[#f1f5f9] border border-[#1f2d45] hover:bg-[#1e2a3d] hover:border-[rgba(99,102,241,0.4)]",
  ghost:
    "bg-transparent text-[#94a3b8] hover:bg-[#1a2235] hover:text-[#f1f5f9]",
  danger:
    "bg-[rgba(244,63,94,0.12)] text-[#f43f5e] border border-[rgba(244,63,94,0.25)] hover:bg-[rgba(244,63,94,0.2)]",
  outline:
    "bg-transparent text-[#818cf8] border border-[#6366f1] hover:bg-[rgba(99,102,241,0.1)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[6px] font-medium",
  md: "px-4 py-2 text-sm rounded-[10px] font-semibold",
  lg: "px-6 py-3 text-base rounded-[10px] font-semibold",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 select-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-1 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
