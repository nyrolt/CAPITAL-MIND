import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AssetClassAllocation } from '../../types';

interface AllocationDonutProps {
  allocations: AssetClassAllocation[];
}

const SEGMENT_COLORS = [
  '#1D1D1F', // Graphite (Equity)
  '#2563EB', // Blue (ETF)
  '#059669', // Emerald (Bond/Debt)
  '#D97706', // Amber (Commodities/Gold)
  '#7C3AED', // Violet (Cash Equivalent)
  '#475569', // Slate (Other)
];

export const AllocationDonut: React.FC<AllocationDonutProps> = ({ allocations }) => {
  const safeAllocations = allocations || [];

  const data = safeAllocations.map(a => ({
    name: a.assetType,
    value: a.value,
    percentage: a.percentage,
  }));

  const totalValue = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-base font-bold text-graphite tracking-tight">Segment / Asset Allocation</h3>
        <p className="text-xs text-muted mt-0.5">Distribution across available segments and asset types</p>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-muted text-xs">
          <p className="font-semibold text-graphite">No Assets Found</p>
          <p className="mt-1">Add real holdings to see segment allocation.</p>
        </div>
      ) : (
        <>
          <div className="relative h-48 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`segment-cell-${index}`}
                      fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E2E5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `₹${Number(val).toLocaleString('en-IN')} (${item.payload.percentage}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-silver-border">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                  />
                  <span className="font-semibold text-graphite truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono flex-shrink-0 ml-2">
                  <span className="text-muted text-[11px]">₹{item.value.toLocaleString('en-IN')}</span>
                  <span className="font-bold text-graphite text-[11px] w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalValue > 0 && (
            <div className="pt-2 mt-2 border-t border-silver-border/60 flex items-center justify-between text-[11px] text-muted">
              <span>Dominant: <strong className="text-graphite">{data[0]?.name || 'Equity'}</strong></span>
              <span>Total: <strong className="text-graphite font-mono">₹{totalValue.toLocaleString('en-IN')}</strong></span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
