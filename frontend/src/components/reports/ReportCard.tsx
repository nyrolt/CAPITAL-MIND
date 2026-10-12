import React from 'react';
import { Report } from '../../types';
import { FileText, Download, Eye } from 'lucide-react';
import { Button } from '../common/Button';

interface ReportCardProps {
  report: Report;
  onView: (report: Report) => void;
  onDownload: (report: Report) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onView, onDownload }) => {
  return (
    <div className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-xl bg-silver-light text-graphite border border-silver-border">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono text-muted">{report.fileSize} • {report.date}</span>
        </div>

        <h4 className="text-sm font-bold text-graphite">{report.title}</h4>
        <p className="text-[11px] font-medium text-muted mt-0.5">{report.type} • {report.portfolioName}</p>

        <p className="text-xs text-graphite/80 mt-3 line-clamp-2 leading-relaxed">
          {report.summaryText}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-silver-border flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => onView(report)}>
          View Report
        </Button>
        <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => onDownload(report)}>
          Download PDF
        </Button>
      </div>
    </div>
  );
};

