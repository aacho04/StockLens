import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import { useMarketStreamStore } from "@/stores/marketStreamStore";

export const Topbar: React.FC = () => {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const isConnected = useMarketStreamStore((s) => s.isConnected);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery({
    queryKey: ["stock-search", search],
    queryFn: async () => {
      const res = await apiClient.get("/stocks/search", { params: { q: search, limit: 6 } });
      return res.data.data as any[];
    },
    enabled: search.trim().length >= 1,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    setSearch("");
    setShowResults(false);
    navigate(`/stocks/${symbol}`);
  };

  return (
    <header className="h-[60px] sm:h-[64px] flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 border-b border-[#1f2d45] bg-[#0d1220] z-10">
      {/* Search */}
      <div className="flex-1 max-w-lg relative min-w-0">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search e.g. RELIANCE, NIFTY..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => search && setShowResults(true)}
            className="!pl-9 sm:!pl-10 pr-3 sm:pr-4 h-8 sm:h-9 text-xs sm:text-sm bg-[#111827] border-[#1f2d45] rounded-[10px] w-full placeholder:text-slate-500"
            id="global-stock-search"
          />
        </div>

        {/* Results Dropdown */}
        {showResults && results && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-[calc(100%+8px)] left-0 right-0 glass-card border border-[#1f2d45] rounded-[12px] overflow-hidden z-50 py-1 max-h-72 overflow-y-auto shadow-2xl"
          >
            {results.map((stock: any) => (
              <button
                key={stock.symbol}
                onClick={() => handleSelect(stock.symbol)}
                className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-[#1a2235] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-[7px] bg-[rgba(99,102,241,0.12)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#818cf8]">
                    {stock.symbol?.slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-[#f1f5f9] truncate">{stock.symbol}</p>
                  <p className="text-[11px] text-[#475569] truncate">{stock.name}</p>
                </div>
                <span className="text-[10px] text-[#475569] flex-shrink-0">{stock.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {isConnected ? (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.25)] text-xs font-semibold text-emerald-400">
            <span className="live-pulse-dot">
              <span />
              <span />
            </span>
            <span className="tracking-wide text-[10px] sm:text-[11px] hidden sm:inline">LIVE STREAM</span>
            <span className="tracking-wide text-[10px] sm:hidden">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
            <div className="live-dot" />
            <span className="hidden sm:inline">CONNECTING...</span>
          </div>
        )}
        <div className="w-[1px] h-4 sm:h-5 bg-[#1f2d45]" />
        <ThemeToggle />
      </div>
    </header>
  );
};
