import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Clock,
  Building,
  BarChart2,
  ArrowLeft,
  ShieldAlert,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { marketService } from '../../services/marketService';
import { useMarketData } from '../../hooks/useMarketData';
import {
  StockDetails,
  StockHistoryPoint,
  Watchlist
} from '../../types';

export const StockDetailPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const { getTick, flashes, connectionState, providerStatus } = useMarketData(symbol ? [symbol] : []);
  const liveTick = symbol ? getTick(symbol) : undefined;

  const [stock, setStock] = useState<StockDetails | null>(null);
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | '5Y'>('1M');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState<boolean>(false);

  useEffect(() => {
    if (!symbol) return;

    const loadStockData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const details = await marketService.getStockDetails(symbol);
        setStock(details);

        const hist = await marketService.getStockHistory(symbol, timeframe);
        setHistory(hist);

        try {
          const wls = await marketService.getWatchlists();
          setWatchlists(wls);
          const found = wls.some(w => w.symbols.includes(symbol.toUpperCase()));
          setIsInWatchlist(found);
        } catch {
          // Unauthenticated or watchlist unavailable
        }
      } catch (err: any) {
        setError(err.message || `Failed to load stock details for ${symbol}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadStockData();
  }, [symbol]);

  const handleTimeframeChange = async (tf: '1D' | '1W' | '1M' | '1Y' | '5Y') => {
    setTimeframe(tf);
    if (!symbol) return;
    try {
      const hist = await marketService.getStockHistory(symbol, tf);
      setHistory(hist);
    } catch (err) {
      console.warn('Failed to load timeframe chart:', err);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!symbol || watchlists.length === 0 || isUpdatingWatchlist) return;
    setIsUpdatingWatchlist(true);
    const targetWl = watchlists[0];

    try {
      if (isInWatchlist) {
        await marketService.removeStockFromWatchlist(targetWl.id, symbol);
        setIsInWatchlist(false);
      } else {
        await marketService.addStockToWatchlist(targetWl.id, symbol);
        setIsInWatchlist(true);
      }
    } catch (err) {
      console.error('Watchlist update error:', err);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell pageTitle="Stock Details">
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-8 h-8 border-2 border-graphite border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted font-medium">Fetching simulated quotes for {symbol}...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !stock) {
    return (
      <AppShell pageTitle="Stock Not Found">
        <div className="p-8 max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-financial-negativeBg text-financial-negative flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-graphite">Stock Not Available</h2>
          <p className="text-xs text-muted leading-relaxed">
            {error || `Unable to load market data for symbol "${symbol}".`}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
            Go Back
          </Button>
        </div>
      </AppShell>
    );
  }

  const displayPrice = liveTick?.ltp ?? stock.current_price;
  const displayChange = liveTick?.change ?? stock.day_change;
  const displayChangePercent = liveTick?.change_percent ?? stock.day_change_percentage;
  const isPositive = displayChange >= 0;
  const flash = symbol ? flashes[symbol.toUpperCase()] : null;
  const isUpstoxLive = Boolean(providerStatus?.is_upstox_live || providerStatus?.mode === 'live' || stock.data_source === 'upstox');

  return (
    <AppShell pageTitle={`${stock.symbol} — ${stock.company_name}`}>
      <div className="space-y-6 pb-12">
        {/* Top Navigation & Company Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-muted hover:text-graphite hover:bg-silver-light transition-colors border border-silver-border"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-graphite tracking-tight">{stock.symbol}</h1>
                <Badge variant="silver" size="sm">{stock.exchange}</Badge>
                <Badge variant={isUpstoxLive ? 'positive' : 'silver'} size="sm">
                  {isUpstoxLive ? (
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-financial-positive animate-pulse" />
                      LIVE MARKET
                    </span>
                  ) : 'SIMULATED SANDBOX'}
                </Badge>
                <div className="ml-1">
                  {connectionState === 'CONNECTED' ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-financial-positive">
                      <Wifi className="w-3.5 h-3.5" /> Live Feed
                    </span>
                  ) : connectionState === 'CONNECTING' || connectionState === 'RECONNECTING' ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
                      <Activity className="w-3.5 h-3.5 animate-pulse" /> Reconnecting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
                      <WifiOff className="w-3.5 h-3.5" /> Standby
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted mt-0.5 font-medium">{stock.company_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={isInWatchlist ? <StarOff className="w-4 h-4 text-graphite" /> : <Star className="w-4 h-4" />}
              onClick={handleToggleWatchlist}
              disabled={isUpdatingWatchlist}
            >
              {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </Button>
          </div>
        </div>

        {/* Price & Primary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className={`p-4 rounded-2xl border transition-colors duration-500 shadow-silver-sm ${
            flash === 'up' ? 'bg-emerald-50 border-emerald-300' :
            flash === 'down' ? 'bg-rose-50 border-rose-300' : 'bg-white border-silver-border'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {isUpstoxLive ? 'Live Market Price' : 'Market Price'}
              </p>
              {flash && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  flash === 'up' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {flash === 'up' ? '▲ LIVE' : '▼ LIVE'}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-graphite mt-1">
              ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${isPositive ? 'text-financial-positive' : 'text-financial-negative'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isPositive ? '+' : ''}{displayChange} ({isPositive ? '+' : ''}{displayChangePercent}%)</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Day Range</p>
            <p className="text-sm font-bold text-graphite mt-1">
              ₹{(liveTick?.day_low ?? stock.day_low)?.toLocaleString('en-IN') || '—'} — ₹{(liveTick?.day_high ?? stock.day_high)?.toLocaleString('en-IN') || '—'}
            </p>
            <p className="text-[11px] text-muted mt-1">Open: ₹{(liveTick?.day_open ?? stock.day_open)?.toLocaleString('en-IN') || '—'}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">52-Week Range</p>
            <p className="text-sm font-bold text-graphite mt-1">
              ₹{stock.week_52_low?.toLocaleString('en-IN') || '—'} — ₹{stock.week_52_high?.toLocaleString('en-IN') || '—'}
            </p>
            <p className="text-[11px] text-muted mt-1">Prev Close: ₹{(liveTick?.previous_close ?? stock.previous_close)?.toLocaleString('en-IN') || '—'}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Market Cap</p>
            <p className="text-sm font-bold text-graphite mt-1">
              {stock.market_cap ? (stock.market_cap).toLocaleString('en-IN') + ' Cr' : 'N/A'}
            </p>
            <p className="text-[11px] text-muted mt-1">P/E: {stock.pe_ratio || 'N/A'}</p>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Volume</p>
            <p className="text-sm font-bold text-graphite mt-1">
              {(liveTick?.volume ?? stock.volume)?.toLocaleString('en-IN') || '—'} shares
            </p>
            <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated: {liveTick?.timestamp ? new Date(liveTick.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(stock.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Main Content: Chart & Fundamentals */}
        <div className="space-y-6">
          {/* Chart Section */}
          <div className="bg-white rounded-2xl border border-silver-border p-6 shadow-silver-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-graphite">Price Trend</h2>
                <p className="text-[11px] text-muted">Simulated candle trajectory and price history</p>
              </div>
              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1 p-1 bg-silver-light border border-silver-border rounded-xl">
                {(['1D', '1W', '1M', '1Y', '5Y'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${timeframe === tf
                      ? 'bg-white text-graphite shadow-silver-sm border border-silver-border'
                      : 'text-muted hover:text-graphite'
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-80 w-full pt-4">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="formatted_date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      domain={['dataMin - 10', 'dataMax + 10']}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={val => `₹${val}`}
                      orientation="right"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-graphite text-white text-xs p-3 rounded-xl shadow-silver-lg space-y-1">
                              <p className="font-semibold text-platinum">{d.formatted_date}</p>
                              <p className="text-sm font-bold">₹{d.price?.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-muted">High: ₹{d.high} • Low: ₹{d.low}</p>
                              <p className="text-[10px] text-muted">Vol: {d.volume?.toLocaleString('en-IN')}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#10b981' : '#f43f5e'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#priceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted">
                  No chart points available for this timeframe.
                </div>
              )}
            </div>
          </div>

          {/* Company Overview & Fundamentals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-silver-border p-5 shadow-silver-sm space-y-3">
              <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-muted" /> Company Profile
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Entity Name</span>
                  <span className="font-semibold text-graphite">{stock.company_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Exchange</span>
                  <span className="font-semibold text-graphite">{stock.exchange}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Sector</span>
                  <span className="font-semibold text-graphite">{stock.sector}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted">Industry</span>
                  <span className="font-semibold text-graphite">{stock.industry}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-silver-border p-5 shadow-silver-sm space-y-3">
              <h3 className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted" /> Key Statistics
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Price-to-Earnings (P/E)</span>
                  <span className="font-semibold text-graphite">{stock.pe_ratio || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Instrument Type</span>
                  <span className="font-semibold text-graphite">{stock.instrument_type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-silver-border">
                  <span className="text-muted">Trading Status</span>
                  <span className="font-semibold text-graphite">{stock.is_active !== false ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted">Market Provider</span>
                  <span className="font-semibold text-graphite">{isUpstoxLive ? 'Live Exchange Feed (NSE/BSE)' : 'Exchange Market Feed'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
