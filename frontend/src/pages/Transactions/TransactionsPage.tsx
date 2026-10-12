import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { TransactionTable } from '../../components/portfolio/TransactionTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useApp } from '../../context/AppContext';
import { Plus } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { selectedPortfolio, addTransaction } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [symbol, setSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(10);
  const [price, setPrice] = useState<number>(1500);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !selectedPortfolio.id) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await addTransaction(selectedPortfolio.id, {
        symbol: symbol.toUpperCase(),
        assetName: assetName || symbol.toUpperCase(),
        type,
        quantity,
        price,
        date,
      });
      setSymbol('');
      setAssetName('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell pageTitle="Transaction Ledger">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">
              Transaction History for {selectedPortfolio.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Complete chronological audit trail of buy/sell execution
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Record Transaction
          </Button>
        </div>

        <TransactionTable transactions={selectedPortfolio.transactions} />

        {/* Record Transaction Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record New Transaction"
          subtitle={`Log a Buy/Sell execution in ${selectedPortfolio.name}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Transaction Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as 'BUY' | 'SELL')}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite font-bold"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Execution Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Symbol *</label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  placeholder="e.g. HDFCBANK"
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                  placeholder="e.g. HDFC Bank Ltd."
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-graphite mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-graphite mb-1">Execution Price per Unit (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-silver-light/60 rounded-xl border border-silver-border flex justify-between items-center text-xs">
              <span className="text-muted font-semibold">Total Value:</span>
              <span className="font-mono font-bold text-graphite">₹{(quantity * price).toLocaleString('en-IN')}</span>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-financial-negativeBg border border-financial-negative/30 rounded-xl text-financial-negative text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-silver-border">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Transaction'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
};

