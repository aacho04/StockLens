import { create } from "zustand";
import type { Quote } from "@stocklens/types";

interface MarketStreamState {
  quotes: Record<string, Quote>;
  tickDirections: Record<string, "up" | "down">;
  isConnected: boolean;
  totalStocks: number;
  lastTickTimestamp: number | null;

  connect: () => void;
  disconnect: () => void;
  subscribe: (symbols?: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  focus: (symbol: string) => void;
  unfocus: (symbol: string) => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const flashTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useMarketStreamStore = create<MarketStreamState>((set, get) => ({
  quotes: {},
  tickDirections: {},
  isConnected: false,
  totalStocks: 0,
  lastTickTimestamp: null,

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const isHttps = window.location.protocol === "https:";
      const proto = isHttps ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const port =
        window.location.port === "5173" || window.location.port === "3000"
          ? ":4000"
          : window.location.port
          ? `:${window.location.port}`
          : "";
      wsUrl = `${proto}//${host}${port}/ws`;
    }

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        set({ isConnected: true });
        // Automatically subscribe to all active stocks
        get().subscribe(["*"]);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "connected") {
            set({ totalStocks: msg.totalStocks ?? 0 });
          } else if (msg.type === "snapshot" && Array.isArray(msg.data)) {
            const nextQuotes: Record<string, Quote> = { ...get().quotes };
            msg.data.forEach((q: Quote) => {
              if (q?.symbol) nextQuotes[q.symbol.toUpperCase()] = q;
            });
            set({ quotes: nextQuotes, lastTickTimestamp: Date.now() });
          } else if (msg.type === "tick" && msg.symbol && msg.data) {
            const sym = msg.symbol.toUpperCase();
            const direction = msg.tickDirection as "up" | "down" | "flat";

            const nextQuotes = { ...get().quotes, [sym]: msg.data };
            const nextDirections = { ...get().tickDirections };

            if (direction === "up" || direction === "down") {
              nextDirections[sym] = direction;

              // Clear previous flash timer if active
              const existingTimer = flashTimers.get(sym);
              if (existingTimer) clearTimeout(existingTimer);

              // Clear flash after 850ms
              const timer = setTimeout(() => {
                const currentDirections = { ...get().tickDirections };
                delete currentDirections[sym];
                set({ tickDirections: currentDirections });
                flashTimers.delete(sym);
              }, 850);

              flashTimers.set(sym, timer);
            }

            set({
              quotes: nextQuotes,
              tickDirections: nextDirections,
              lastTickTimestamp: Date.now(),
            });
          }
        } catch {
          // ignore malformed message
        }
      };

      socket.onclose = () => {
        set({ isConnected: false });
        socket = null;
        // Auto-reconnect after 3s
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            get().connect();
          }, 3000);
        }
      };

      socket.onerror = () => {
        set({ isConnected: false });
      };
    } catch (e) {
      console.warn("[MarketStream] Could not connect to WebSocket:", e);
    }
  },

  disconnect: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
    set({ isConnected: false });
  },

  subscribe: (symbols = ["*"]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "subscribe", symbols }));
    }
  },

  unsubscribe: (symbols) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "unsubscribe", symbols }));
    }
  },

  focus: (symbol: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && symbol) {
      socket.send(JSON.stringify({ type: "focus", symbol: symbol.toUpperCase() }));
    }
  },

  unfocus: (symbol: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && symbol) {
      socket.send(JSON.stringify({ type: "unfocus", symbol: symbol.toUpperCase() }));
    }
  },
}));
