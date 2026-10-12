import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Briefcase, Layers, Receipt, TrendingUp, Sparkles, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { marketService } from '../../services/marketService';
import { StockSearchResult } from '../../types';

export const GlobalSearchModal: React.FC = () => {
  const navigate = useNavigate();
  const { isSearchOpen, setIsSearchOpen, selectedPortfolio, portfolios } = useApp();
  const [query, setQuery] = useState('');
  const [marketStocks, setMarketStocks] = useState<StockSearchResult[]>([]);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  // Fetch stocks from Market Data API with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setMarketStocks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMarket(true);
      try {
        const results = await marketService.searchStocks(trimmed, 6);
        setMarketStocks(results);
      } catch (err) {
        console.warn('Market stock search error:', err);
      } finally {
        setIsSearchingMarket(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingHoldings = selectedPortfolio?.holdings?.filter(
    h => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.sector.toLowerCase().includes(q)
  ) || [];

  const matchingPortfolios = portfolios.filter(
    p => p.name.toLowerCase().includes(q) || p.objective.toLowerCase().includes(q)
  );

  const matchingTransactions = selectedPortfolio?.transactions?.filter(
    t => t.symbol.toLowerCase().includes(q) || t.assetName.toLowerCase().includes(q)
  ) || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-graphite/40 backdrop-blur-sm animate-fadeIn"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl border border-silver-border shadow-silver-lg overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-silver-border gap-3">
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Indian listed stocks (TCS, INFY, RELIANCE...), portfolios, holdings..."
            className="w-full text-sm text-graphite placeholder-muted outline-none bg-transparent"
          />
          {isSearchingMarket && (
            <div className="w-4 h-4 border-2 border-graphite/30 border-t-graphite rounded-full animate-spin shrink-0"></div>
          )}
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-muted hover:text-graphite">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] bg-silver-light border border-silver-border rounded font-mono text-muted">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
          {query === '' ? (
            <div className="text-center py-6 text-xs text-muted">
              Type <span className="font-semibold text-graphite">'TCS'</span>, <span className="font-semibold text-graphite">'INFY'</span>, <span className="font-semibold text-graphite">'RELIANCE'</span>, or <span className="font-semibold text-graphite">'HDFCBANK'</span> to search Indian equities.
            </div>
          ) : (
            <>
              {/* Indian Listed Stocks Section */}
              {marketStocks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" /> Indian Listed Equities (NSE/BSE)
                    </span>
                    <span className="text-[9px] lowercase font-normal px-1.5 py-0.5 rounded bg-silver-light text-muted">
                      {marketStocks[0]?.is_real_time ? 'Real-Time' : 'Simulated Data'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {marketStocks.map(stock => (
                      <button
                        key={stock.symbol}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/stocks/${stock.symbol}`);
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-silver-light text-left transition-colors border border-transparent hover:border-silver-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-platinum flex items-center justify-center font-bold text-xs text-graphite border border-silver-border">
                            {stock.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-graphite">{stock.symbol}</p>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-silver-light font-medium text-muted">
                                {stock.exchange}
                              </span>
                              <span className="text-[9px] px-1 rounded bg-amber-50 text-amber-700 font-medium">
                                {stock.data_source === 'mock' ? 'Mock Data' : 'Live'}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted truncate max-w-xs">{stock.company_name || stock.name}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold text-graphite">
                            ₹{stock.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-[11px] font-medium ${stock.day_change >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                            {stock.day_change >= 0 ? '+' : ''}{stock.day_change} ({stock.day_change >= 0 ? '+' : ''}{stock.day_change_percentage}%)
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio Holdings Section */}
              {matchingHoldings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    <Layers className="w-3.5 h-3.5" /> Portfolio Holdings
                  </div>
                  <div className="space-y-1">
                    {matchingHoldings.map(h => (
                      <button
                        key={h.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate('/holdings');
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-silver-light text-left transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-graphite">{h.symbol} — {h.name}</p>
                          <p className="text-[11px] text-muted">{h.sector} • {h.assetType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-graphite">₹{h.currentValue.toLocaleString('en-IN')}</p>
                          <p className={`text-[11px] font-medium ${h.profitLoss >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                            {h.profitLoss >= 0 ? '+' : ''}{h.returnPercentage.toFixed(2)}%
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolios Section */}
              {matchingPortfolios.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    <Briefcase className="w-3.5 h-3.5" /> Portfolios
                  </div>
                  <div className="space-y-1">
                    {matchingPortfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/portfolio/${p.id}`);
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-silver-light text-left transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-graphite">{p.name}</p>
                          <p className="text-[11px] text-muted">{p.objective} • {p.riskPreference}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-graphite">₹{p.totalValue.toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-muted">{p.holdings.length} holdings</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions Section */}
              {matchingTransactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    <Receipt className="w-3.5 h-3.5" /> Transactions
                  </div>
                  <div className="space-y-1">
                    {matchingTransactions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate('/transactions');
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-silver-light text-left transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-graphite">{t.type} {t.symbol}</p>
                          <p className="text-[11px] text-muted">{t.date} • {t.quantity} shares</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-graphite">₹{t.totalValue.toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-muted">@ ₹{t.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {marketStocks.length === 0 && matchingHoldings.length === 0 && matchingPortfolios.length === 0 && matchingTransactions.length === 0 && (
                <div className="text-center py-8 text-xs text-muted">
                  No matching stocks, holdings, or portfolios found for "{query}".
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
