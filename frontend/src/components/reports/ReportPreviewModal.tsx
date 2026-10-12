import React from 'react';
import { Report } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Download, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ReportPreviewModalProps {
  report: Report | null;
  onClose: () => void;
  onDownload: (report: Report) => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  report,
  onClose,
  onDownload,
}) => {
  const { selectedPortfolio, user } = useApp();

  if (!report) return null;

  return (
    <Modal
      isOpen={!!report}
      onClose={onClose}
      title={report.title}
      subtitle={`Generated on ${report.date} for ${report.portfolioName}`}
      maxWidth="xl"
    >
      <div className="space-y-6 text-xs text-graphite font-sans">
        {/* Document Banner */}
        <div className="p-4 rounded-xl bg-graphite text-white flex items-center justify-between shadow-silver-sm">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-silver-light" />
              <span className="font-bold text-sm">CapitalMind Portfolio Report</span>
            </div>
            <p className="text-[11px] text-silver mt-0.5">Prepared for: {user.name} ({user.email})</p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
            OFFICIAL AUDIT
          </span>
        </div>

        {/* Executive Summary */}
        <div className="p-4 rounded-xl bg-background-secondary border border-silver-border space-y-2">
          <h4 className="font-bold text-graphite uppercase tracking-wider text-[10px]">1. Executive Summary</h4>
          <p className="leading-relaxed">
            This analytical report synthesizes current asset holdings, sector concentration metrics, risk scores, and AI recommendations for <strong>{report.portfolioName}</strong>. Total Net Asset Value stands at <strong>₹{selectedPortfolio.totalValue.toLocaleString('en-IN')}</strong> with a net profit/loss of <strong>+₹{selectedPortfolio.profitLoss.toLocaleString('en-IN')} ({selectedPortfolio.returnPercentage.toFixed(2)}%)</strong>.
          </p>
        </div>

        {/* Risk & Diversification Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-silver-border text-center">
            <span className="text-[10px] uppercase font-semibold text-muted">Risk Score</span>
            <p className="text-2xl font-bold text-graphite mt-1">{selectedPortfolio.riskScore} / 100</p>
            <span className="text-[10px] font-bold text-financial-warning uppercase">{selectedPortfolio.riskLevel} Risk</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-silver-border text-center">
            <span className="text-[10px] uppercase font-semibold text-muted">Diversification Score</span>
            <p className="text-2xl font-bold text-graphite mt-1">{selectedPortfolio.diversificationScore} / 100</p>
            <span className="text-[10px] font-bold text-graphite uppercase">{selectedPortfolio.diversificationLevel} Diversification</span>
          </div>
        </div>

        {/* Holdings Summary Table */}
        <div>
          <h4 className="font-bold text-graphite uppercase tracking-wider text-[10px] mb-2">2. Current Portfolio Assets</h4>
          <div className="border border-silver-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-silver-light text-muted uppercase text-[9px] font-bold border-b border-silver-border">
                <tr>
                  <th className="p-2 pl-3">Asset</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Value</th>
                  <th className="p-2 pr-3 text-right">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-border">
                {selectedPortfolio.holdings.map(h => (
                  <tr key={h.id}>
                    <td className="p-2 pl-3 font-semibold">{h.symbol}</td>
                    <td className="p-2 text-muted">{h.assetType}</td>
                    <td className="p-2 text-right font-mono font-bold">₹{h.currentValue.toLocaleString('en-IN')}</td>
                    <td className="p-2 pr-3 text-right font-mono">{h.allocationPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Advisory Findings */}
        <div className="p-4 rounded-xl bg-white border border-silver-border space-y-2">
          <h4 className="font-bold text-graphite uppercase tracking-wider text-[10px]">3. Key AI Advisory Findings</h4>
          <p className="leading-relaxed text-muted">
            The banking and financial services exposure represents 34.5% of total asset value. To optimize your risk-adjusted return, consider rebalancing incremental cash flows towards non-correlated instruments such as sovereign gold or short-duration liquid debt.
          </p>
        </div>

        {/* Regulatory Disclaimer */}
        <div className="p-3 rounded-xl bg-silver-light/60 border border-silver-border text-[10px] text-muted flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-graphite mt-0.5" />
          <span>
            <strong>Disclaimer:</strong> CapitalMind provides analytical and educational insights based on portfolio data. It does not guarantee investment outcomes and does not constitute regulated financial advice.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-silver-border">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <Button icon={<Download className="w-4 h-4" />} onClick={() => onDownload(report)}>
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};

