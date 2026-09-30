import { useEffect } from "react";
import { useMarketStreamStore } from "@/stores/marketStreamStore";
import type { Quote } from "@stocklens/types";

export function useLiveQuote(symbol?: string, fallbackQuote?: Quote | null) {
  const connect = useMarketStreamStore((s) => s.connect);
  const isConnected = useMarketStreamStore((s) => s.isConnected);
  const quotes = useMarketStreamStore((s) => s.quotes);
  const tickDirections = useMarketStreamStore((s) => s.tickDirections);
  const focus = useMarketStreamStore((s) => s.focus);
  const unfocus = useMarketStreamStore((s) => s.unfocus);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!symbol || !isConnected) return;
    const sym = symbol.toUpperCase();
    focus(sym);
    return () => {
      unfocus(sym);
    };
  }, [symbol, isConnected, focus, unfocus]);

  if (!symbol) {
    return {
      quote: fallbackQuote ?? null,
      tickDirection: null,
      isConnected,
    };
  }

  const upper = symbol.toUpperCase();
  const liveQuote = quotes[upper];
  const tickDirection = tickDirections[upper] ?? null;

  return {
    quote: liveQuote ?? fallbackQuote ?? null,
    tickDirection,
    isConnected,
  };
}
