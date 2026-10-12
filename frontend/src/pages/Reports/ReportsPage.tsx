import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { ReportCard } from '../../components/reports/ReportCard';
import { ReportPreviewModal } from '../../components/reports/ReportPreviewModal';
import { useApp } from '../../context/AppContext';
import { Report } from '../../types';
import { FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { reports } = useApp();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const handleDownload = (report: Report) => {
    // Simulated Blob download
    const element = document.createElement('a');
    const file = new Blob([`CapitalMind Official Report: ${report.title}\nDate: ${report.date}\nPortfolio: ${report.portfolioName}\n\nSummary:\n${report.summaryText}\n\nDisclaimer: Educational & Analytical Report.`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${report.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <AppShell pageTitle="Reports & Audits">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-graphite tracking-tight">Generated Portfolio Reports</h2>
          <p className="text-xs text-muted mt-0.5">Download structured performance, risk, and AI advisory PDF documents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(rep => (
            <ReportCard
              key={rep.id}
              report={rep}
              onView={setSelectedReport}
              onDownload={handleDownload}
            />
          ))}
        </div>

        <ReportPreviewModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDownload={handleDownload}
        />
      </div>
    </AppShell>
  );
};

