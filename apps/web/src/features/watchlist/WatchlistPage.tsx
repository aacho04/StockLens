import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChangeBadge, Badge } from "@/components/ui/Badge";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import type { Quote } from "@stocklens/types";

interface WatchlistStock {
  id: string;
  stockId: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  quote?: Quote | null;
}

interface Watchlist {
  id: string;
  name: string;
  createdAt: string;
  stocks: WatchlistStock[];
}

const WatchlistStockRow: React.FC<{
  item: WatchlistStock;
  watchlistId: string;
  onRemove: (stockId: string) => void;
}> = ({ item, watchlistId, onRemove }) => {
  const { quote, tickDirection } = useLiveQuote(item.symbol, item.quote);
  const pct = quote ? parseFloat(quote.changePercent) : 0;
  const isGain = pct >= 0;

  return (
    <div className="py-3.5 flex items-center justify-between gap-4 hover:bg-[rgba(255,255,255,0.02)] px-3 rounded-[12px] transition-colors border-b border-[#1f2d45]/40 last:border-b-0">
      <Link to={`/stocks/${item.symbol}`} className="flex items-center gap-3.5 flex-1 min-w-0 group">
        <div className="w-10 h-10 rounded-[10px] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <span className="text-xs font-bold text-[#818cf8]">{item.symbol.slice(0, 2)}</span>
        </div>
        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors">
              {item.symbol}
            </span>
            <Badge variant="neutral" size="sm">{item.exchange}</Badge>
            <span className="text-xs text-[#475569] hidden md:inline truncate">{item.sector}</span>
          </div>
          <p className="text-xs text-[#94a3b8] truncate">{item.name}</p>
        </div>
      </Link>

      {/* Live LTP & Change with Groww Flash */}
      <div
        className={`text-right px-3 py-1 rounded-[8px] transition-all min-w-[120px] ${
          tickDirection === "up" ? "flash-up" : tickDirection === "down" ? "flash-down" : ""
        }`}
      >
        <div className="text-base font-bold mono text-[#f1f5f9]">
          ₹{quote ? parseFloat(quote.currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className={`text-xs mono ${isGain ? "text-gain" : "text-loss"}`}>
            {isGain ? "+" : ""}{quote?.change ?? "0"}
          </span>
          <ChangeBadge value={pct} size="sm" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link to={`/stocks/${item.symbol}`}>
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
            Trade
          </Button>
        </Link>
        <button
          onClick={() => onRemove(item.stockId)}
          className="p-2 text-[#475569] hover:text-loss transition-colors rounded-[8px] hover:bg-loss/10"
          title="Remove from watchlist"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const WatchlistPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Fetch watchlists
  const { data: watchlists, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const res = await apiClient.get("/watchlist");
      return res.data.data;
    },
  });

  // Search stocks for adding to watchlist
  const { data: searchResults } = useQuery({
    queryKey: ["stock-search-wl", stockSearchQuery],
    queryFn: async () => {
      const res = await apiClient.get("/stocks/search", {
        params: { q: stockSearchQuery, limit: 5 },
      });
      return res.data.data as any[];
    },
    enabled: stockSearchQuery.trim().length >= 1,
  });

  // Create watchlist mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post("/watchlist", { name });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setNewWatchlistName("");
      setShowCreateModal(false);
      if (data?.id) setActiveTab(data.id);
    },
  });

  // Add stock to active watchlist
  const addStockMutation = useMutation({
    mutationFn: async ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) => {
      await apiClient.post(`/watchlist/${watchlistId}/stocks`, { symbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setStockSearchQuery("");
      setShowAddStockModal(false);
    },
  });

  // Remove stock mutation
  const removeStockMutation = useMutation({
    mutationFn: async ({ watchlistId, stockId }: { watchlistId: string; stockId: string }) => {
      await apiClient.delete(`/watchlist/${watchlistId}/stocks/${stockId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  // Delete watchlist mutation
  const deleteWatchlistMutation = useMutation({
    mutationFn: async (watchlistId: string) => {
      await apiClient.delete(`/watchlist/${watchlistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setActiveTab(null);
    },
  });

  const list = watchlists ?? [];
  const currentWatchlist = list.find((w) => w.id === (activeTab ?? list[0]?.id));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">My Watchlists</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <span className="live-pulse-dot">
                <span />
                <span />
              </span>
              <span>LIVE TICKS</span>
            </div>
          </div>
          <p className="text-sm text-[#94a3b8] mt-1">
            Real-time streaming stock prices and instant paper trade execution
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Create Watchlist
        </Button>
      </div>

      {/* Watchlist Tabs & Content */}
      {isLoading ? (
        <Skeleton height="300px" className="rounded-[16px]" />
      ) : list.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-[16px] bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.5} className="w-8 h-8">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">No Watchlists Yet</h3>
          <p className="text-sm text-[#94a3b8] max-w-sm mx-auto">
            Create a custom watchlist or search stocks to start tracking live prices like Groww.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setShowCreateModal(true)}>Create Watchlist</Button>
            <Link to="/stocks">
              <Button variant="outline">Browse Markets</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Watchlist Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {list.map((w) => {
              const isActive = w.id === (currentWatchlist?.id ?? list[0]?.id);
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveTab(w.id)}
                  className={`px-4 py-2 rounded-[12px] text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20"
                      : "bg-[#111827] text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1e293b]"
                  }`}
                >
                  <span>{w.name}</span>
                  <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                    {w.stocks.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Watchlist Details */}
          {currentWatchlist && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1f2d45]">
                <div>
                  <h2 className="text-lg font-bold">{currentWatchlist.name}</h2>
                  <p className="text-xs text-[#94a3b8]">
                    {currentWatchlist.stocks.length} stocks · Live tick stream active
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddStockModal(true)}
                  >
                    + Add Stock
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWatchlistMutation.mutate(currentWatchlist.id)}
                    className="text-loss hover:bg-loss/10"
                  >
                    Delete Watchlist
                  </Button>
                </div>
              </div>

              {currentWatchlist.stocks.length === 0 ? (
                <div className="py-12 text-center text-[#475569] text-sm space-y-3">
                  <p>This watchlist is currently empty.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddStockModal(true)}
                  >
                    + Add Stocks Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {currentWatchlist.stocks.map((item) => (
                    <WatchlistStockRow
                      key={item.id}
                      item={item}
                      watchlistId={currentWatchlist.id}
                      onRemove={(stockId) =>
                        removeStockMutation.mutate({
                          watchlistId: currentWatchlist.id,
                          stockId,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 rounded-[20px] max-w-md w-full space-y-4 border border-[#1f2d45] shadow-2xl">
            <h3 className="text-lg font-bold">Create Watchlist</h3>
            <p className="text-xs text-[#94a3b8]">
              Organize stocks into tailored lists (e.g. Nifty Giants, Banking, Tech)
            </p>
            <input
              type="text"
              placeholder="e.g. My Top Picks"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#111827] border border-[#1f2d45] text-sm text-[#f1f5f9] focus:outline-none focus:border-[#6366f1]"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate(newWatchlistName)}
                disabled={!newWatchlistName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Quick Modal */}
      {showAddStockModal && currentWatchlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 rounded-[20px] max-w-md w-full space-y-4 border border-[#1f2d45] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Stock to {currentWatchlist.name}</h3>
              <button
                onClick={() => setShowAddStockModal(false)}
                className="text-[#94a3b8] hover:text-[#f1f5f9]"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by symbol or name (e.g. RELIANCE, TCS)..."
              value={stockSearchQuery}
              onChange={(e) => setStockSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#111827] border border-[#1f2d45] text-sm text-[#f1f5f9] focus:outline-none focus:border-[#6366f1]"
              autoFocus
            />

            {searchResults && searchResults.length > 0 && (
              <div className="divide-y divide-[#1f2d45] max-h-60 overflow-y-auto rounded-[10px] bg-[#111827]">
                {searchResults.map((stock: any) => (
                  <div
                    key={stock.symbol}
                    className="p-3 flex items-center justify-between hover:bg-[#1a2235] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#f1f5f9]">{stock.symbol}</p>
                      <p className="text-xs text-[#94a3b8] truncate max-w-[220px]">{stock.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        addStockMutation.mutate({
                          watchlistId: currentWatchlist.id,
                          symbol: stock.symbol,
                        })
                      }
                      disabled={addStockMutation.isPending}
                    >
                      + Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
