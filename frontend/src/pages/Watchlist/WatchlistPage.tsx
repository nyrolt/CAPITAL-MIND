import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { marketService } from '../../services/marketService';
import { useMarketData } from '../../hooks/useMarketData';
import { Watchlist, StockQuote, StockSearchResult } from '../../types';

export const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [isCreatingWl, setIsCreatingWl] = useState<boolean>(false);

  const activeWatchlist = watchlists.find(w => w.id === selectedWatchlistId) || watchlists[0];
  const watchlistSymbols = (activeWatchlist?.items || []).map(i => i.symbol);
  const { getTick, flashes, connectionState, providerStatus } = useMarketData(watchlistSymbols);

  const fetchWatchlists = async () => {
    setIsLoading(true);
    try {
      const data = await marketService.getWatchlists();
      setWatchlists(data);
      if (data.length > 0 && !selectedWatchlistId) {
        setSelectedWatchlistId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  // Quick stock search for adding to watchlist
  useEffect(() => {
    const q = searchSymbol.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await marketService.searchStocks(q, 5);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search stocks error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchSymbol]);

  const handleAddStock = async (symbol: string) => {
    if (!activeWatchlist) return;
    try {
      await marketService.addStockToWatchlist(activeWatchlist.id, symbol);
      setSearchSymbol('');
      setSearchResults([]);
      await fetchWatchlists();
    } catch (err) {
      console.error('Failed to add stock to watchlist:', err);
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!activeWatchlist) return;
    try {
      await marketService.removeStockFromWatchlist(activeWatchlist.id, symbol);
      await fetchWatchlists();
    } catch (err) {
      console.error('Failed to remove stock from watchlist:', err);
    }
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const newWl = await marketService.createWatchlist(newWatchlistName.trim());
      setNewWatchlistName('');
      setIsCreatingWl(false);
      await fetchWatchlists();
      setSelectedWatchlistId(newWl.id);
    } catch (err) {
      console.error('Failed to create watchlist:', err);
    }
  };

  return (
    <AppShell pageTitle="Market Watchlists">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-graphite tracking-tight">Market Watchlists</h1>
              <Badge variant="silver">Indian Equities</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Track real-time quotes, daily percentage variations, and volume across NSE/BSE stocks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingWl(!isCreatingWl)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-graphite bg-white hover:bg-silver-light border border-silver-border rounded-xl shadow-silver-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Watchlist
            </button>
          </div>
        </div>

        {/* Create Watchlist Modal / Form */}
        {isCreatingWl && (
          <form onSubmit={handleCreateWatchlist} className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm flex items-center gap-3">
            <input
              type="text"
              value={newWatchlistName}
              onChange={e => setNewWatchlistName(e.target.value)}
              placeholder="Watchlist Name (e.g., Banking Leaders, Bluechips)..."
              className="flex-1 text-xs px-3 py-2 border border-silver-border rounded-xl outline-none focus:border-graphite"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-graphite rounded-xl hover:bg-black transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingWl(false)}
              className="px-3 py-2 text-xs font-semibold text-muted hover:text-graphite"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Watchlist Tabs */}
        {watchlists.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {watchlists.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWatchlistId(w.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
                  activeWatchlist?.id === w.id
                    ? 'bg-graphite text-white border-graphite shadow-silver-sm'
                    : 'bg-white text-muted hover:text-graphite border-silver-border'
                }`}
              >
                {w.name} ({w.symbols.length})
              </button>
            ))}
          </div>
        )}

        {/* Add Stock Quick Bar */}
        <div className="relative">
          <div className="flex items-center px-4 py-2.5 bg-white rounded-2xl border border-silver-border shadow-silver-sm gap-2">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              type="text"
              value={searchSymbol}
              onChange={e => setSearchSymbol(e.target.value)}
              placeholder="Quick Add to Watchlist: type stock symbol or company name (e.g., TCS, INFY, RELIANCE)..."
              className="w-full text-xs text-graphite placeholder-muted outline-none bg-transparent"
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-graphite/30 border-t-graphite rounded-full animate-spin shrink-0"></div>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-silver-border rounded-2xl shadow-silver-lg p-2 z-30 space-y-1">
              {searchResults.map(stock => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-silver-light transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-graphite">{stock.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-silver-light text-muted font-medium">
                        {stock.exchange}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate max-w-sm">{stock.company_name || stock.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-graphite">
                      ₹{stock.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleAddStock(stock.symbol)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-graphite hover:bg-black rounded-lg transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist Table */}
        <div className="bg-white rounded-2xl border border-silver-border shadow-silver-sm overflow-hidden">
          <div className="p-4 border-b border-silver-border flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-graphite uppercase tracking-wider">
                {activeWatchlist?.name || 'Watchlist'}
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                {activeWatchlist?.items?.length || 0} equities tracked
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                (providerStatus?.is_upstox_live || providerStatus?.mode === 'live')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-silver-light text-muted border border-silver-border'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                {(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'LIVE MARKET FEED' : 'SIMULATED FEED'}
              </span>
              {connectionState === 'CONNECTED' ? (
                <span className="text-[10px] text-financial-positive font-medium flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Standby
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-graphite border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-muted">Loading watchlist quotes...</p>
            </div>
          ) : activeWatchlist && activeWatchlist.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-silver-light/60 text-muted font-semibold border-b border-silver-border">
                  <tr>
                    <th className="py-3 px-4">Symbol / Company</th>
                    <th className="py-3 px-4">Exchange</th>
                    <th className="py-3 px-4 text-right">LTP (₹)</th>
                    <th className="py-3 px-4 text-right">Day Change</th>
                    <th className="py-3 px-4 text-right">Volume</th>
                    <th className="py-3 px-4 text-center">Data Mode</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border">
                  {activeWatchlist.items.map(item => {
                    const liveTick = getTick(item.symbol);
                    const ltp = liveTick?.ltp ?? item.current_price;
                    const dayChange = liveTick?.change ?? item.day_change;
                    const dayChangePct = liveTick?.change_percent ?? item.day_change_percentage;
                    const isPos = dayChange >= 0;
                    const flash = flashes[item.symbol.toUpperCase()];
                    const isLive = Boolean(providerStatus?.is_upstox_live || providerStatus?.mode === 'live' || item.data_source === 'upstox');

                    return (
                      <tr
                        key={item.symbol}
                        className={`transition-colors duration-500 ${
                          flash === 'up'
                            ? 'bg-emerald-50/70'
                            : flash === 'down'
                            ? 'bg-rose-50/70'
                            : 'hover:bg-silver-light/40'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/stocks/${item.symbol}`)}
                            className="text-left group"
                          >
                            <span className="font-bold text-graphite group-hover:underline flex items-center gap-1.5">
                              {item.symbol}
                              <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[11px] text-muted block truncate max-w-xs">{item.company_name}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-silver-light text-muted">
                            {item.exchange || 'NSE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-graphite">
                          <div className="flex items-center justify-end gap-1.5">
                            {flash && (
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                                flash === 'up' ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                              }`}>
                                {flash === 'up' ? '▲' : '▼'}
                              </span>
                            )}
                            <span>₹{ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold ${isPos ? 'text-financial-positive' : 'text-financial-negative'}`}>
                            {isPos ? '+' : ''}{dayChange} ({isPos ? '+' : ''}{dayChangePct}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-muted">
                          {(liveTick?.volume ?? item.volume)?.toLocaleString('en-IN') || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[9px] font-medium px-2 py-0.5 rounded ${
                            isLive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isLive ? 'Live Market' : 'Simulated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveStock(item.symbol)}
                            title="Remove from Watchlist"
                            className="p-1.5 text-muted hover:text-financial-negative hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <Star className="w-8 h-8 text-muted mx-auto" />
              <p className="text-xs font-semibold text-graphite">This watchlist is empty</p>
              <p className="text-[11px] text-muted">Use the search box above to add Indian stocks like TCS, INFY, or RELIANCE.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
