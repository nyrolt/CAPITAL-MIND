import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { HoldingTable } from '../../components/portfolio/HoldingTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building2, Calculator, CheckCircle2 } from 'lucide-react';
import { AssetType } from '../../types';

import { marketDataService } from '../../services/marketDataService';

interface PresetAsset {
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange: string;
  sector: string;
  suggestedPrice?: number;
  instrumentKey?: string;
}

const COMMON_ASSETS: PresetAsset[] = [
  { symbol: 'INFY', name: 'Infosys Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Technology', suggestedPrice: 1510, instrumentKey: 'NSE_EQ|INE009A01021' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Technology', suggestedPrice: 3950, instrumentKey: 'NSE_EQ|INE467B01029' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Energy', suggestedPrice: 2400, instrumentKey: 'NSE_EQ|INE002A01018' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Banking', suggestedPrice: 1780, instrumentKey: 'NSE_EQ|INE040A01034' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Banking', suggestedPrice: 1230, instrumentKey: 'NSE_EQ|INE090A01021' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', assetType: 'Stock', exchange: 'NSE', sector: 'Automobile', suggestedPrice: 940, instrumentKey: 'NSE_EQ|INE155A01022' },
  { symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 ETF', assetType: 'ETF', exchange: 'NSE', sector: 'Index ETF', suggestedPrice: 262, instrumentKey: 'NSE_EQ|INF732E01015' },
  { symbol: 'LIQUIDBEES', name: 'Nippon India Liquid ETF', assetType: 'ETF', exchange: 'NSE', sector: 'Cash Equivalent', suggestedPrice: 1000, instrumentKey: 'NSE_EQ|INF732E01031' },
  { symbol: 'GOLDBEES', name: 'Nippon India Gold ETF', assetType: 'ETF', exchange: 'NSE', sector: 'Commodities', suggestedPrice: 62, instrumentKey: 'NSE_EQ|INF732E01049' },
  { symbol: 'GSEC2033', name: '7.18% GS 2033 Sovereign Bond', assetType: 'Bond', exchange: 'NSE', sector: 'Government Debt', suggestedPrice: 1000, instrumentKey: 'NSE_EQ|IN0020230085' },
];

export const HoldingsPage: React.FC = () => {
  const { selectedPortfolio, addHolding } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for Add Holding
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [instrumentKey, setInstrumentKey] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('Stock');
  const [exchange, setExchange] = useState('NSE');
  const [sector, setSector] = useState('Technology');
  const [quantity, setQuantity] = useState<number>(100);
  const [avgPrice, setAvgPrice] = useState<number>(1500);

  const [assetSearch, setAssetSearch] = useState('');
  const [remoteResults, setRemoteResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!assetSearch.trim() || assetSearch.length < 2) {
      setRemoteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await marketDataService.searchInstruments(assetSearch.trim(), 8);
        setRemoteResults(results || []);
      } catch {
        setRemoteResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [assetSearch]);

  const handleSelectAsset = (asset: PresetAsset) => {
    setSymbol(asset.symbol);
    setName(asset.name);
    setAssetType(asset.assetType);
    setExchange(asset.exchange);
    setSector(asset.sector);
    setInstrumentKey(asset.instrumentKey || '');
    if (asset.suggestedPrice) {
      setAvgPrice(asset.suggestedPrice);
    }
    setAssetSearch(asset.symbol);
    setShowSuggestions(false);
  };

  const handleSelectRemote = (inst: any) => {
    setSymbol(inst.symbol);
    setName(inst.name);
    setInstrumentKey(inst.instrument_key);
    setExchange(inst.exchange || 'NSE');
    setSector(inst.sector || 'Unclassified');
    if (inst.instrument_type === 'ETF') setAssetType('Mutual Fund');
    else if (inst.instrument_type === 'BOND') setAssetType('Bond');
    else setAssetType('Stock');
    setAssetSearch(inst.symbol);
    setShowSuggestions(false);
  };

  const filteredAssets = COMMON_ASSETS.filter(
    a => a.symbol.toLowerCase().includes(assetSearch.toLowerCase()) ||
         a.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const investedValue = Math.round(quantity * avgPrice * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !selectedPortfolio.id) return;
    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }
    if (avgPrice <= 0) {
      setErrorMsg('Buy price must be greater than zero.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await addHolding(selectedPortfolio.id, {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        assetType,
        quantity,
        avgPrice,
        currentPrice: avgPrice,
        sector,
        instrument_key: instrumentKey || undefined,
        exchange,
      });
      setSymbol('');
      setName('');
      setInstrumentKey('');
      setAssetSearch('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add real holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell pageTitle="Investment Holdings">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">
              Holdings in {selectedPortfolio.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Total Invested: ₹{selectedPortfolio.investedCapital?.toLocaleString('en-IN') || 0} • Current Value: ₹{selectedPortfolio.totalValue.toLocaleString('en-IN')} across {selectedPortfolio.holdings.length} assets
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Add Holding
          </Button>
        </div>

        {/* Real Holdings Table */}
        <HoldingTable holdings={selectedPortfolio.holdings} />

        {/* Add Real Holding Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Real Investment Holding"
          subtitle={`Record an investment position into ${selectedPortfolio.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Asset Search & Quick Select */}
            <div className="space-y-1 relative">
              <label className="block font-semibold text-graphite">Search or Select Asset *</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted" />
                <input
                  type="text"
                  value={assetSearch}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={e => {
                    setAssetSearch(e.target.value);
                    setSymbol(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                  }}
                  placeholder="Type asset symbol e.g. INFY, TCS, RELIANCE, NIFTYBEES, GOLDBEES..."
                  className="w-full pl-9 pr-3 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite font-bold uppercase focus:border-graphite outline-none"
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (filteredAssets.length > 0 || remoteResults.length > 0) && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-silver-border rounded-xl shadow-silver-md divide-y divide-silver-border/40">
                  {remoteResults.map(inst => (
                    <button
                      type="button"
                      key={inst.instrument_key}
                      onClick={() => handleSelectRemote(inst)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-graphite">{inst.symbol}</span>
                        <span className="text-[11px] text-muted truncate max-w-[200px]">{inst.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">{inst.instrument_type || 'EQ'}</span>
                        <span className="text-[10px] text-muted">{inst.exchange}</span>
                      </div>
                    </button>
                  ))}
                  {filteredAssets.map(asset => (
                    <button
                      type="button"
                      key={asset.symbol}
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full text-left px-3 py-2 hover:bg-silver-light/50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-graphite">{asset.symbol}</span>
                        <span className="text-[11px] text-muted truncate max-w-[180px]">{asset.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-silver-light text-muted border border-silver-border">{asset.assetType}</span>
                        <span className="text-[10px] text-muted">{asset.exchange}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Symbol & Name row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Asset Symbol *</label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. INFY"
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite font-bold uppercase outline-none focus:border-graphite"
                />
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Asset / Company Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Infosys Ltd."
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                />
              </div>
            </div>

            {/* Asset Type & Exchange row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-graphite mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={e => setAssetType(e.target.value as AssetType)}
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                >
                  <option value="Stock">Stock (Equity)</option>
                  <option value="Mutual Fund">Mutual Fund / ETF</option>
                  <option value="Cash">Cash / Liquid</option>
                  <option value="Gold">Gold ETF / Commodity</option>
                  <option value="Bond">Bond / Government Debt</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Exchange</label>
                <select
                  value={exchange}
                  onChange={e => setExchange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                  <option value="OTHER">Other / Direct</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Sector</label>
                <input
                  type="text"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="e.g. Technology"
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                />
              </div>
            </div>

            {/* Quantity and Buy Price Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-graphite mb-1">
                  Quantity (Units / Shares) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 100"
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite font-bold font-mono outline-none focus:border-graphite"
                />
                <p className="text-[10px] text-muted mt-1">No artificial limits (e.g. 10 to 50,000+ units)</p>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">
                  Buy / Average Purchase Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={avgPrice}
                  onChange={e => setAvgPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 1520"
                  className="w-full p-2.5 bg-white border border-silver-border rounded-xl text-graphite font-bold font-mono outline-none focus:border-graphite"
                />
                <p className="text-[10px] text-muted mt-1">Your historical purchase or average price</p>
              </div>
            </div>

            {/* Calculated Invested Value Card */}
            <div className="p-3.5 bg-silver-light/60 border border-silver-border rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted">
                <Calculator className="w-4 h-4 text-graphite" />
                <span>Calculated Invested Value:</span>
              </div>
              <div className="text-sm font-bold text-graphite">
                ₹{investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-financial-negativeBg border border-financial-negative/30 rounded-xl text-financial-negative text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-silver-border">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Recording Holding...' : 'Save Real Holding'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
};
