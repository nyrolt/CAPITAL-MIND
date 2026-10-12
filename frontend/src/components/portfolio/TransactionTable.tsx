import React, { useState } from 'react';
import { Transaction } from '../../types';
import { Badge } from '../common/Badge';

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const [tab, setTab] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = transactions.filter(t => (tab === 'ALL' ? true : t.type === tab));

  return (
    <div className="bg-white rounded-2xl border border-silver-border shadow-silver-sm overflow-hidden">
      <div className="p-4 border-b border-silver-border flex items-center justify-between bg-background-secondary/40">
        <div className="flex items-center gap-1.5">
          {(['ALL', 'BUY', 'SELL'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === t
                  ? 'bg-graphite text-white shadow-silver-sm'
                  : 'bg-white text-muted hover:text-graphite border border-silver-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted font-mono">{filtered.length} Records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-silver-light/60 text-muted uppercase text-[10px] tracking-wider font-semibold border-b border-silver-border">
            <tr>
              <th className="p-3.5 pl-4">Date</th>
              <th className="p-3.5">Asset</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5 text-right">Quantity</th>
              <th className="p-3.5 text-right">Execution Price</th>
              <th className="p-3.5 pr-4 text-right">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-border/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">
                  No transactions recorded.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-silver-light/40 transition-colors">
                  <td className="p-3.5 pl-4 font-mono text-muted">{t.date}</td>
                  <td className="p-3.5">
                    <span className="font-bold text-graphite">{t.symbol}</span>
                    <span className="block text-[10px] text-muted">{t.assetName}</span>
                  </td>
                  <td className="p-3.5">
                    <Badge variant={t.type === 'BUY' ? 'positive' : 'negative'} size="sm">
                      {t.type}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right font-mono text-graphite">{t.quantity}</td>
                  <td className="p-3.5 text-right font-mono text-muted">₹{t.price.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 pr-4 text-right font-mono font-bold text-graphite">
                    ₹{t.totalValue.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

