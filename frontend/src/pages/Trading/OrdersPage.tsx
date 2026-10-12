import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { tradingService } from '../../services/tradingService';
import { PaperOrder, OrderStatus, OrderSide } from '../../types';
import {
  FileText,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [sideFilter, setSideFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tradingService.getOrders({
        symbol: symbolFilter.trim() || undefined,
        side: sideFilter !== 'ALL' ? sideFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load paper orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [sideFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'FILLED':
        return <Badge variant="positive" size="sm">FILLED</Badge>;
      case 'REJECTED':
        return <Badge variant="negative" size="sm">REJECTED</Badge>;
      case 'CANCELLED':
        return <Badge variant="silver" size="sm">CANCELLED</Badge>;
      default:
        return <Badge variant="silver" size="sm">{status}</Badge>;
    }
  };

  return (
    <AppShell pageTitle="Paper Orders">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-graphite tracking-tight">Paper Orders Ledger</h1>
              <Badge variant="silver" size="sm">PAPER TRADING</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Complete chronological audit trail of simulated buy and sell order requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchOrders}
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
            <span className="font-semibold text-graphite">PAPER TRADING ONLY:</span>{' '}
            All orders below represent simulated paper trades executed against simulated market data. No real broker execution or real money is involved.
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

            <div className="flex items-center gap-1.5 text-xs text-muted ml-2">
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-silver-light border border-silver-border rounded-xl text-xs font-semibold text-graphite focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="FILLED">FILLED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl border border-silver-border shadow-silver-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-graphite border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted">Loading paper orders...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-financial-negative space-y-2">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={fetchOrders}>Retry</Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-silver-light text-muted flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-graphite">No Paper Orders Found</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                You haven't placed any paper trading orders matching your criteria yet.
              </p>
              <Button size="sm" onClick={() => navigate('/watchlist')}>
                Browse Stocks to Trade
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-silver-light/40 border-b border-silver-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Symbol</th>
                    <th className="py-3.5 px-4">Side</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-right">Price</th>
                    <th className="py-3.5 px-4 text-right">Total Value</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border">
                  {orders.map(order => (
                    <tr
                      key={order.order_id}
                      className="hover:bg-silver-light/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/stocks/${order.symbol}`)}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted">
                        {order.order_id}
                      </td>
                      <td className="py-3.5 px-4 text-muted whitespace-nowrap">
                        {order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-graphite hover:underline">
                          {order.symbol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          order.side === 'BUY' ? 'bg-financial-positive' : 'bg-financial-negative'
                        }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-graphite">
                        {order.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-muted font-medium">
                        {order.order_type}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-graphite">
                        ₹{order.executed_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-graphite">
                        ₹{order.total_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(order.status)}
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
