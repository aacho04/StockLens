import React from "react";
import { useTheme } from "@/stores/themeStore";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center gap-1.5 p-1 rounded-full border transition-all duration-200 cursor-pointer ${
        isDark
          ? "bg-[#111827] border-[#1f2d45] text-[#94a3b8] hover:border-[#6366f1]"
          : "bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:border-[#6366f1]"
      } ${className}`}
    >
      {/* Dark / Moon option */}
      <span
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
          isDark
            ? "bg-[#1e2a3d] text-[#818cf8] shadow-sm"
            : "text-[#94a3b8] hover:text-[#475569]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Light / Sun option */}
      <span
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
          !isDark
            ? "bg-white text-[#f59e0b] shadow-sm"
            : "text-[#475569] hover:text-[#94a3b8]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </span>
    </button>
  );
};
