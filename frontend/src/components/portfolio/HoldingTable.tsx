import React, { useState } from 'react';
import { Holding } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Search, Trash2, Edit2, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMarketData } from '../../hooks/useMarketData';

interface HoldingTableProps {
  holdings: Holding[];
  showActions?: boolean;
}

export const HoldingTable: React.FC<HoldingTableProps> = ({ holdings, showActions = true }) => {
  const { selectedPortfolio, deleteHolding, updateHolding } = useApp();
  const [filterType, setFilterType] = useState<string>('All');
  const [search, setSearch] = useState('');

  const safeHoldings = holdings || [];
  const symbols = safeHoldings.map(h => h.symbol);
  const { getTick, flashes, connectionState, providerStatus } = useMarketData(symbols);

  // Editing state
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editAvgPrice, setEditAvgPrice] = useState<number>(0);
  const [editCurrentPrice, setEditCurrentPrice] = useState<number>(0);
  const [editSector, setEditSector] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (h: Holding) => {
    setEditingHolding(h);
    setEditQty(h.quantity);
    setEditAvgPrice(h.avgPrice);
    setEditCurrentPrice(h.currentPrice);
    setEditSector(h.sector);
  };

  const handleUpdateHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding || !selectedPortfolio.id) return;
    setIsSubmitting(true);
    try {
      await updateHolding(selectedPortfolio.id, editingHolding.id, {
        quantity: editQty,
        avgPrice: editAvgPrice,
        currentPrice: editCurrentPrice,
        sector: editSector,
      });
      setEditingHolding(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHolding = async (holdingId: string, symbol: string) => {
    if (!selectedPortfolio.id) return;
    if (window.confirm(`Are you sure you want to remove holding "${symbol}"?`)) {
      try {
        await deleteHolding(selectedPortfolio.id, holdingId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete holding');
      }
    }
  };

  const filtered = safeHoldings.filter(h => {
    const matchesType = filterType === 'All' || h.assetType === filterType;
    const matchesSearch =
      h.symbol.toLowerCase().includes(search.toLowerCase()) ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.sector.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-silver-border shadow-silver-sm overflow-hidden">
      {/* Table Header / Filters */}
      <div className="p-4 border-b border-silver-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-background-secondary/40">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Stock', 'ETF', 'Mutual Fund', 'Cash', 'Gold', 'Bond'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                filterType === type
                  ? 'bg-graphite text-white shadow-silver-sm'
                  : 'bg-white text-muted hover:text-graphite border border-silver-border'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-xl flex items-center gap-1.5 whitespace-nowrap ${
            (providerStatus?.is_upstox_live || providerStatus?.mode === 'live')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-white text-muted border border-silver-border'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
            {(providerStatus?.is_upstox_live || providerStatus?.mode === 'live') ? 'LIVE MARKET FEED' : 'SIMULATED FEED'}
          </span>
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search holdings..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-silver-border rounded-xl text-graphite placeholder-muted outline-none focus:border-graphite"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-silver-light/60 text-muted uppercase text-[10px] tracking-wider font-semibold border-b border-silver-border">
            <tr>
              <th className="p-3.5 pl-4">Asset / Sector</th>
              <th className="p-3.5">Asset Class</th>
              <th className="p-3.5 text-right">Qty</th>
              <th className="p-3.5 text-right">Avg Cost Basis</th>
              <th className="p-3.5 text-right">Current Price</th>
              <th className="p-3.5 text-right">Invested Cost</th>
              <th className="p-3.5 text-right">Market Value</th>
              <th className="p-3.5 text-right">Unrealized P/L</th>
              <th className="p-3.5 text-right">Allocation</th>
              {showActions && <th className="p-3.5 pr-4 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-border/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted">
                  No holdings match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map(h => {
                const liveTick = getTick(h.symbol);
                const livePrice = liveTick?.ltp ?? h.currentPrice;
                const liveCurrentValue = Math.round(h.quantity * livePrice * 100) / 100;
                const liveProfitLoss = Math.round((liveCurrentValue - h.investedValue) * 100) / 100;
                const liveReturnPct = h.investedValue > 0 ? (liveProfitLoss / h.investedValue) * 100 : 0;
                const flash = flashes[h.symbol.toUpperCase()];

                return (
                  <tr
                    key={h.id}
                    className={`transition-colors duration-500 ${
                      flash === 'up'
                        ? 'bg-emerald-50/70'
                        : flash === 'down'
                        ? 'bg-rose-50/70'
                        : 'hover:bg-silver-light/40'
                    }`}
                  >
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-graphite flex items-center gap-1.5">
                        <span>{h.symbol}</span>
                        {h.isPriceStale && (
                          <span
                            title={h.priceWarning || 'Price may be stale'}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            Stale
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted truncate max-w-[140px]">{h.name} • {h.sector}</div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="neutral" size="sm">{h.assetType}</Badge>
                    </td>
                    <td className="p-3.5 text-right font-mono text-graphite">{h.quantity}</td>
                    <td className="p-3.5 text-right font-mono text-muted">₹{h.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3.5 text-right font-mono text-graphite font-semibold">
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
                    <td className="p-3.5 text-right font-mono text-muted">₹{h.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3.5 text-right font-mono text-graphite font-bold">₹{liveCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3.5 text-right font-mono">
                      <div className={`font-bold ${liveProfitLoss >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                        {liveProfitLoss >= 0 ? '+' : ''}₹{liveProfitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[10px] font-semibold ${liveProfitLoss >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                        {liveProfitLoss >= 0 ? '+' : ''}{liveReturnPct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-semibold text-graphite">
                      {h.allocationPercentage}%
                    </td>
                    {showActions && (
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(h)}
                            title="Edit holding"
                            className="p-1.5 rounded-lg text-muted hover:text-graphite hover:bg-silver-light transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(h.id, h.symbol)}
                            title="Remove holding"
                            className="p-1.5 rounded-lg text-muted hover:text-financial-negative hover:bg-financial-negativeBg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Holding Modal */}
      {editingHolding && (
        <Modal
          isOpen={!!editingHolding}
          onClose={() => setEditingHolding(null)}
          title={`Edit Holding: ${editingHolding.symbol}`}
          subtitle={`Update position details for ${editingHolding.name}`}
        >
          <form onSubmit={handleUpdateHolding} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editQty}
                  onChange={e => setEditQty(Number(e.target.value))}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite font-mono outline-none focus:border-graphite"
                />
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Average Purchase Price (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editAvgPrice}
                  onChange={e => setEditAvgPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite font-mono outline-none focus:border-graphite"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Current Market Price (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editCurrentPrice}
                  onChange={e => setEditCurrentPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite font-mono outline-none focus:border-graphite"
                />
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Sector</label>
                <input
                  type="text"
                  required
                  value={editSector}
                  onChange={e => setEditSector(e.target.value)}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-silver-border">
              <Button type="button" variant="outline" onClick={() => setEditingHolding(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
