import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { tradingService } from '../../services/tradingService';
import { marketService } from '../../services/marketService';
import {
  PaperAccount,
  PaperPortfolio,
  PaperHoldingItem,
  StockSearchResult,
  StockQuote,
  OrderSide
} from '../../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PieChart,
  RefreshCw,
  Search,
  Sliders,
  AlertCircle,
  CheckCircle,
  FileText,
  History,
  Shield,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useMarketData } from '../../hooks/useMarketData';

interface SelectedStockInfo {
  symbol: string;
  name: string;
  exchange?: string;
  sector?: string;
}

export const PaperTradingPage: React.FC = () => {
  const navigate = useNavigate();

  // Account & Portfolio state
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Capital Modal State
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [newCapital, setNewCapital] = useState<number>(1000000);
  const [isUpdatingCapital, setIsUpdatingCapital] = useState(false);
  const [capitalSuccessMsg, setCapitalSuccessMsg] = useState<string | null>(null);

  // Trade Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SelectedStockInfo | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const [side, setSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState<number>(10);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Load paper trading data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accData, portData] = await Promise.all([
        tradingService.getPaperAccount(),
        tradingService.getPaperPortfolio()
      ]);
      setAccount(accData);
      setPortfolio(portData);
      if (accData.initial_cash) {
        setNewCapital(accData.initial_cash);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load paper trading data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search stocks (stocks only)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await marketService.searchStocks(searchQuery);
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch live quote when a stock is selected
  const handleSelectStock = async (stock: SelectedStockInfo) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchResults([]);
    setOrderError(null);
    setOrderSuccessMsg(null);
    setIsLoadingQuote(true);
    try {
      const q = await marketService.getStockQuote(stock.symbol);
      setQuote(q);
    } catch (err: any) {
      setQuote(null);
      setOrderError('Could not fetch market quote for ' + stock.symbol);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Select stock from holding row
  const handleTradeFromHolding = (holding: PaperHoldingItem, tradeSide: OrderSide = 'SELL') => {
    handleSelectStock({
      symbol: holding.symbol,
      name: holding.company_name,
      exchange: 'NSE',
      sector: holding.sector || 'Unclassified'
    });
    setSide(tradeSide);
    setQuantity(holding.quantity);
  };

  // Capital update
  const handleUpdateCapitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCapital <= 0) return;
    setIsUpdatingCapital(true);
    setCapitalSuccessMsg(null);
    try {
      await tradingService.updateCapital(newCapital);
      setCapitalSuccessMsg(`Paper capital successfully updated to ₹${newCapital.toLocaleString('en-IN')}`);
      await fetchData();
      setTimeout(() => {
        setIsCapitalModalOpen(false);
        setCapitalSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update capital');
    } finally {
      setIsUpdatingCapital(false);
    }
  };

  // Execute paper trade
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !quote) {
      setOrderError('Please select a stock first.');
      return;
    }
    if (quantity <= 0) {
      setOrderError('Quantity must be greater than zero.');
      return;
    }

    const currentPrice = quote.current_price;
    const estimatedValue = currentPrice * quantity;
    if (side === 'BUY' && account && estimatedValue > account.available_cash) {
      setOrderError(`Insufficient virtual cash: Required ₹${estimatedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}, Available ₹${account.available_cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.`);
      return;
    }

    if (side === 'SELL') {
      const existingHolding = portfolio?.holdings?.find(h => h.symbol.toUpperCase() === selectedStock.symbol.toUpperCase());
      const ownedQty = existingHolding ? existingHolding.quantity : 0;
      if (ownedQty < quantity) {
        setOrderError(`Cannot sell ${quantity} shares of ${selectedStock.symbol}. You only hold ${ownedQty} paper shares.`);
        return;
      }
    }

    setIsSubmittingOrder(true);
    setOrderError(null);
    setOrderSuccessMsg(null);
    try {
      const order = await tradingService.createPaperOrder({
        symbol: selectedStock.symbol,
        side,
        quantity,
        order_type: 'MARKET'
      });

      setOrderSuccessMsg(
        `Successfully executed paper ${side} for ${order.quantity} ${order.symbol} @ ₹${order.executed_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}!`
      );
      // Refresh paper trading account and positions
      await fetchData();
      // Re-fetch current quote to update display
      if (selectedStock) {
        const updatedQuote = await marketService.getStockQuote(selectedStock.symbol);
        setQuote(updatedQuote);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Failed to execute paper order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const paperSymbols = [
    ...(portfolio?.holdings?.map(h => h.symbol) || []),
    ...(selectedStock?.symbol ? [selectedStock.symbol] : [])
  ];
  const { getTick, flashes, connectionState, providerStatus } = useMarketData(paperSymbols);

  const selectedTick = selectedStock ? getTick(selectedStock.symbol) : undefined;
  const currentPrice = selectedTick?.ltp ?? quote?.current_price ?? 0;
  const estimatedOrderValue = currentPrice * quantity;
  const isBuy = side === 'BUY';
  const holdingsList = portfolio?.holdings || [];
  const selectedFlash = selectedStock ? flashes[selectedStock.symbol.toUpperCase()] : null;

  return (
    <AppShell pageTitle="Paper Trading Terminal">
      <div className="space-y-6 pb-12">
        {/* Top Header & Isolation Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-graphite tracking-tight">Paper Trading Terminal</h1>
              <Badge variant="silver" size="sm">PAPER / SIMULATED</Badge>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-3 h-3 mr-1" /> Isolated Environment
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                (providerStatus?.is_upstox_live || providerStatus?.mode === 'live')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-silver-subtle text-muted border border-silver-border'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                {(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'LIVE FEED' : 'SIMULATED FEED'}
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
            <p className="text-xs text-graphite-muted mt-1">
              Practice trading NSE/BSE stocks with zero financial risk. Real holdings and cash are completely separate.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<History className="w-4 h-4" />}
              onClick={() => navigate('/trades')}
            >
              Paper Trades
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => navigate('/orders')}
            >
              Paper Orders
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sliders className="w-4 h-4" />}
              onClick={() => setIsCapitalModalOpen(true)}
            >
              Set / Modify Capital
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Paper Account Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Virtual Capital */}
          <div className="bg-white p-4 rounded-xl border border-silver-border shadow-silver-sm">
            <div className="flex items-center justify-between text-xs text-graphite-muted mb-1">
              <span>Paper Capital</span>
              <DollarSign className="w-3.5 h-3.5 text-graphite-muted" />
            </div>
            <div className="text-lg font-bold text-graphite">
              ₹{(account?.initial_cash || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-graphite-muted mt-1">
              Configured initial virtual balance
            </div>
          </div>

          {/* Available Cash */}
          <div className="bg-white p-4 rounded-xl border border-silver-border shadow-silver-sm">
            <div className="flex items-center justify-between text-xs text-graphite-muted mb-1">
              <span>Available Cash</span>
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-graphite">
              ₹{(account?.available_cash || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Ready for paper orders
            </div>
          </div>

          {/* Portfolio Value */}
          <div className="bg-white p-4 rounded-xl border border-silver-border shadow-silver-sm">
            <div className="flex items-center justify-between text-xs text-graphite-muted mb-1">
              <span>Portfolio Value</span>
              <PieChart className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-graphite">
              ₹{(portfolio?.market_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-graphite-muted mt-1">
              {holdingsList.length} active positions
            </div>
          </div>

          {/* Total Unrealized P/L */}
          <div className="bg-white p-4 rounded-xl border border-silver-border shadow-silver-sm">
            <div className="flex items-center justify-between text-xs text-graphite-muted mb-1">
              <span>Total P/L</span>
              {(portfolio?.unrealized_pnl || 0) >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            <div className={`text-lg font-bold ${(portfolio?.unrealized_pnl || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {(portfolio?.unrealized_pnl || 0) >= 0 ? '+' : ''}₹{(portfolio?.unrealized_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-graphite-muted mt-1">
              Unrealized paper returns
            </div>
          </div>

          {/* Realized P/L */}
          <div className="bg-white p-4 rounded-xl border border-silver-border shadow-silver-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs text-graphite-muted mb-1">
              <span>Realized P/L</span>
              {(account?.realized_pnl || 0) >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            <div className={`text-lg font-bold ${(account?.realized_pnl || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {(account?.realized_pnl || 0) >= 0 ? '+' : ''}₹{(account?.realized_pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-graphite-muted mt-1">
              From closed paper trades
            </div>
          </div>
        </div>

        {/* Main Grid: Positions (Left 65%) & Trade Stock Form (Right 35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Paper Positions Table */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-silver-border shadow-silver-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-silver-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-graphite">Paper Positions</h2>
                <p className="text-xs text-graphite-muted">Current simulated holdings calculated at live market price</p>
              </div>
              <Badge variant="silver" size="sm">{holdingsList.length} Positions</Badge>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs text-graphite">
                <thead className="bg-silver-subtle/50 text-[11px] font-semibold text-graphite-muted uppercase tracking-wider border-b border-silver-border">
                  <tr>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Avg Price</th>
                    <th className="px-4 py-3 text-right">Market Price</th>
                    <th className="px-4 py-3 text-right">Market Value</th>
                    <th className="px-4 py-3 text-right">P/L (P/L %)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border">
                  {holdingsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-graphite-muted">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-silver-dark" />
                        <p className="font-medium text-graphite">No active paper positions</p>
                        <p className="text-xs mt-1">Select a stock on the right to place a paper order.</p>
                      </td>
                    </tr>
                  ) : (
                    holdingsList.map((item) => {
                      const tick = getTick(item.symbol);
                      const livePrice = tick?.ltp ?? item.current_price;
                      const marketVal = Math.round(item.quantity * livePrice * 100) / 100;
                      const cost = Math.round(item.quantity * item.average_price * 100) / 100;
                      const pnl = Math.round((marketVal - cost) * 100) / 100;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      const isProfitable = pnl >= 0;
                      const flash = flashes[item.symbol.toUpperCase()];

                      return (
                        <tr
                          key={item.symbol}
                          className={`transition-colors duration-500 ${
                            flash === 'up'
                              ? 'bg-emerald-50/70'
                              : flash === 'down'
                              ? 'bg-rose-50/70'
                              : 'hover:bg-silver-subtle/30'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-graphite">{item.symbol}</div>
                            <div className="text-[10px] text-graphite-muted truncate max-w-[120px]">
                              {item.company_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-graphite-muted">
                            ₹{item.average_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            <div className="flex items-center justify-end gap-1">
                              {flash && (
                                <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                                  flash === 'up' ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                                }`}>
                                  {flash === 'up' ? '▲' : '▼'}
                                </span>
                              )}
                              <span>₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            ₹{marketVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className={`font-mono font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isProfitable ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-[10px] ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isProfitable ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleTradeFromHolding(item, 'SELL')}
                              className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                            >
                              Sell
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Stock Panel */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-silver-border shadow-silver-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-silver-border mb-4">
                <div>
                  <h2 className="text-sm font-bold text-graphite">Trade Stock</h2>
                  <p className="text-xs text-graphite-muted">Stocks only • Market price execution</p>
                </div>
                <Badge variant="positive" size="sm">LIVE QUOTES</Badge>
              </div>

              {/* Stock Search Input */}
              <div className="mb-4 relative">
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Search Stock (NSE/BSE)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-graphite-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search e.g. INFY, TCS, RELIANCE..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-silver-border rounded-lg focus:outline-none focus:ring-1 focus:ring-graphite text-graphite placeholder:text-graphite-muted"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 text-[10px] text-graphite-muted animate-pulse">
                      Searching...
                    </div>
                  )}
                </div>

                {/* Search Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-silver-border rounded-lg shadow-silver-md max-h-48 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <div
                        key={stock.symbol}
                        onClick={() => handleSelectStock(stock)}
                        className="px-3 py-2 hover:bg-silver-subtle/40 cursor-pointer flex items-center justify-between text-xs border-b border-silver-border last:border-b-0"
                      >
                        <div>
                          <span className="font-bold text-graphite">{stock.symbol}</span>
                          <span className="text-graphite-muted text-[11px] ml-2">
                            {stock.company_name || stock.name}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-silver-subtle text-graphite-muted">
                          {stock.exchange || 'NSE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Stock Banner */}
              {selectedStock ? (
                <div className={`p-3 border rounded-lg mb-4 transition-colors duration-500 ${
                  selectedFlash === 'up' ? 'bg-emerald-50 border-emerald-300' :
                  selectedFlash === 'down' ? 'bg-rose-50 border-rose-300' :
                  'bg-silver-subtle/30 border-silver-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-graphite">{selectedStock.symbol}</span>
                        {selectedTick && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-graphite-muted">
                        {selectedStock.name}
                      </span>
                    </div>
                    {isLoadingQuote ? (
                      <span className="text-xs text-graphite-muted animate-pulse">Fetching price...</span>
                    ) : (currentPrice > 0) ? (
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-graphite">
                          ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[10px] font-medium ${
                          (selectedTick?.change ?? quote?.day_change ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {(selectedTick?.change ?? quote?.day_change ?? 0) >= 0 ? '+' : ''}
                          {(selectedTick?.change ?? quote?.day_change ?? 0).toFixed(2)} ({
                            (selectedTick?.change_percent ?? quote?.day_change_percentage ?? 0).toFixed(2)
                          }%)
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500">Price unavailable</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg mb-4 text-xs text-blue-700 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                  <span>Search and pick an instrument above or click "Sell" on a position to populate order details.</span>
                </div>
              )}

              {/* Order Form */}
              <form onSubmit={handleExecuteTrade} className="space-y-4">
                {/* BUY / SELL Switch */}
                <div>
                  <label className="block text-xs font-semibold text-graphite mb-1">Order Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSide('BUY')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        side === 'BUY'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-silver-sm'
                          : 'bg-white text-graphite-muted border-silver-border hover:bg-silver-subtle'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('SELL')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        side === 'SELL'
                          ? 'bg-red-600 text-white border-red-600 shadow-silver-sm'
                          : 'bg-white text-graphite-muted border-silver-border hover:bg-silver-subtle'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-graphite">Quantity</label>
                    <div className="flex gap-1">
                      {[5, 10, 25, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`px-1.5 py-0.5 text-[10px] rounded border ${
                            quantity === preset
                              ? 'bg-graphite text-white border-graphite'
                              : 'bg-silver-subtle/50 text-graphite-muted border-silver-border hover:bg-silver-subtle'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-xs border border-silver-border rounded-lg focus:outline-none focus:ring-1 focus:ring-graphite text-graphite"
                  />
                </div>

                {/* Price Display (Requirement 7: No manual buy price input) */}
                <div className="p-3 bg-silver-subtle/40 rounded-lg space-y-1.5 text-xs border border-silver-border">
                  <div className="flex justify-between text-graphite-muted">
                    <span>Order Type:</span>
                    <span className="font-semibold text-graphite">MARKET (Live Price)</span>
                  </div>
                  <div className="flex justify-between text-graphite-muted">
                    <span>Current Execution Price:</span>
                    <span className="font-mono font-semibold text-graphite">
                      ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-graphite-muted pt-1 border-t border-silver-border">
                    <span className="font-semibold text-graphite">Estimated Order Value:</span>
                    <span className="font-mono font-bold text-graphite text-sm">
                      ₹{estimatedOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Error / Success Feedback */}
                {orderError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}

                {orderSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{orderSuccessMsg}</span>
                  </div>
                )}

                {/* Submit Trade Button */}
                <Button
                  type="submit"
                  variant={isBuy ? 'primary' : 'outline'}
                  size="md"
                  disabled={!selectedStock || isSubmittingOrder || currentPrice <= 0}
                  className={`w-full ${!isBuy ? 'text-red-600 border-red-300 hover:bg-red-50' : ''}`}
                >
                  {isSubmittingOrder
                    ? 'Executing Order...'
                    : `Execute Paper ${side} Order`}
                </Button>
              </form>
            </div>

            {/* Simulated Disclaimer */}
            <div className="mt-4 pt-3 border-t border-silver-border text-[11px] text-graphite-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-graphite-muted shrink-0" />
              <span>Simulated environment. No money deducted from bank or broker.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Set / Modify Capital Modal */}
      <Modal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        title="Set / Modify Paper Capital"
        subtitle="Configure your virtual cash balance for paper trading experiments"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateCapitalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1">
              Virtual Capital (₹)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={newCapital}
              onChange={(e) => setNewCapital(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-silver-border rounded-lg focus:outline-none focus:ring-1 focus:ring-graphite text-graphite font-mono"
            />
          </div>

          <div>
            <span className="block text-xs text-graphite-muted mb-2">Quick Presets:</span>
            <div className="flex flex-wrap gap-2">
              {[100000, 500000, 1000000, 2500000, 5000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewCapital(preset)}
                  className={`px-3 py-1 text-xs rounded-lg border font-mono transition-colors ${
                    newCapital === preset
                      ? 'bg-graphite text-white border-graphite'
                      : 'bg-silver-subtle/50 text-graphite hover:bg-silver-subtle border-silver-border'
                  }`}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Note:</strong> Modifying virtual capital only adjusts your paper trading cash balance. It has zero effect on your real holdings or actual money.
          </div>

          {capitalSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{capitalSuccessMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-silver-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCapitalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingCapital || newCapital <= 0}
            >
              {isUpdatingCapital ? 'Updating...' : 'Save Capital'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};

export default PaperTradingPage;
