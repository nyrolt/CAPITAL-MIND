import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { tradingService } from '../../services/tradingService';
import { PaperTrade, OrderSide } from '../../types';
import {
  History,
  Search,
  RefreshCw,
  TrendingUp,
  Info,
  Filter
} from 'lucide-react';

export const TradesPage: React.FC = () => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [sideFilter, setSideFilter] = useState<string>('ALL');

  const fetchTrades = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tradingService.getTrades({
        symbol: symbolFilter.trim() || undefined,
        side: sideFilter !== 'ALL' ? sideFilter : undefined
      });
      setTrades(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load paper trades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [sideFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrades();
  };

  return (
    <AppShell pageTitle="Paper Trades">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-graphite tracking-tight">Paper Executed Trades</h1>
              <Badge variant="silver" size="sm">PAPER TRADES</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Verified simulated execution log of filled trades
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchTrades}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<TrendingUp className="w-4 h-4" />}
              onClick={() => navigate('/watchlist')}
            >
              Trade Stocks
            </Button>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="flex items-center gap-3 p-3.5 bg-silver-light/60 border border-silver-border rounded-2xl text-xs text-muted">
          <Info className="w-4 h-4 text-graphite shrink-0" />
          <div>
            <span className="font-semibold text-graphite">SIMULATED EXECUTION:</span>{' '}
            These trades were filled against simulated market quotes in the paper trading environment. No real funds or broker connections were utilized.
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-silver-border shadow-silver-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by symbol (e.g. TCS)..."
                value={symbolFilter}
                onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2 bg-silver-light/50 border border-silver-border rounded-xl text-xs font-semibold text-graphite placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-graphite"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Filter
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Filter className="w-3.5 h-3.5" />
              <span>Side:</span>
            </div>
            <select
              value={sideFilter}
              onChange={e => setSideFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-silver-light border border-silver-border rounded-xl text-xs font-semibold text-graphite focus:outline-none"
            >
              <option value="ALL">All Sides</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-white rounded-3xl border border-silver-border shadow-silver-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-graphite border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted">Loading paper trades...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-financial-negative space-y-2">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={fetchTrades}>Retry</Button>
            </div>
          ) : trades.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-silver-light text-muted flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-graphite">No Trades Executed Yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Executed paper market orders will appear here once filled.
              </p>
              <Button size="sm" onClick={() => navigate('/watchlist')}>
                Find Stocks to Trade
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-silver-light/40 border-b border-silver-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Trade ID</th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Symbol</th>
                    <th className="py-3.5 px-4">Side</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                    <th className="py-3.5 px-4 text-right">Execution Price</th>
                    <th className="py-3.5 px-4 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border">
                  {trades.map(trade => (
                    <tr
                      key={trade.trade_id}
                      className="hover:bg-silver-light/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/stocks/${trade.symbol}`)}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-graphite font-semibold">
                        {trade.trade_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted">
                        {trade.order_id}
                      </td>
                      <td className="py-3.5 px-4 text-muted whitespace-nowrap">
                        {trade.executed_at ? new Date(trade.executed_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-graphite hover:underline">
                          {trade.symbol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          trade.side === 'BUY' ? 'bg-financial-positive' : 'bg-financial-negative'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-graphite">
                        {trade.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-graphite">
                        ₹{trade.execution_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-graphite">
                        ₹{trade.total_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
