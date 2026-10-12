import React from 'react';

interface RiskGaugeProps {
  score: number;
  level: string;
  size?: 'md' | 'lg';
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 'lg' }) => {
  const isLg = size === 'lg';
  const W = isLg ? 240 : 180;
  const H = isLg ? 135 : 100;
  const cx = W / 2;
  const cy = isLg ? 116 : 86;
  const r = isLg ? 88 : 64;
  const sw = isLg ? 13 : 10;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  // Color theme matching the CapitalMind design system
  const getColorConfig = (s: number) => {
    if (s <= 25) return { stroke: '#10B981', bg: '#ECFDF5', text: '#059669', border: '#10B981' };
    if (s <= 45) return { stroke: '#10B981', bg: '#ECFDF5', text: '#059669', border: '#10B981' };
    if (s <= 60) return { stroke: '#F59E0B', bg: '#FFFBEB', text: '#D97706', border: '#F59E0B' };
    if (s <= 75) return { stroke: '#EF4444', bg: '#FEF2F2', text: '#DC2626', border: '#EF4444' };
    return { stroke: '#DC2626', bg: '#FEF2F2', text: '#B91C1C', border: '#DC2626' };
  };

  const colors = getColorConfig(clamped);

  // Exact semi-circle path from left tip (cx - r, cy) to right tip (cx + r, cy)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const arcLength = Math.PI * r;
  const strokeOffset = arcLength * (1 - clamped / 100);

  // Radial tick marks at 25%, 50%, 75%
  const ticks = [25, 50, 75];

  // Indicator needle coordinates on the arc
  const scoreRad = (clamped / 100) * Math.PI;
  const sCos = Math.cos(scoreRad);
  const sSin = Math.sin(scoreRad);
  const indInner = r - sw / 2 - 2;
  const indOuter = r + sw / 2 + 2;
  const ix1 = cx - indInner * sCos;
  const iy1 = cy - indInner * sSin;
  const ix2 = cx - indOuter * sCos;
  const iy2 = cy - indOuter * sSin;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <svg width={W} height={H} className="overflow-visible">
        {/* Grey background arc track */}
        <path
          d={arcPath}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* Active colored arc - uses strokeDashoffset so it perfectly tracks the grey arc without looping */}
        {clamped > 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.2, 0.64, 1)',
            }}
          />
        )}

        {/* Radial tick marks */}
        {ticks.map((t) => {
          const rad = (t / 100) * Math.PI;
          const cosA = Math.cos(rad);
          const sinA = Math.sin(rad);
          const innerR = r - sw / 2 - 2;
          const outerR = r + sw / 2 + 2;
          const x1 = cx - innerR * cosA;
          const y1 = cy - innerR * sinA;
          const x2 = cx - outerR * cosA;
          const y2 = cy - outerR * sinA;
          return (
            <line
              key={t}
              x1={x1.toFixed(2)}
              y1={y1.toFixed(2)}
              x2={x2.toFixed(2)}
              y2={y2.toFixed(2)}
              stroke="#D1D5DB"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Needle indicator marker at the score position */}
        {clamped > 0 && (
          <line
            x1={ix1.toFixed(2)}
            y1={iy1.toFixed(2)}
            x2={ix2.toFixed(2)}
            y2={iy2.toFixed(2)}
            stroke="#1E293B"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Center Score Number */}
        <text
          x={cx}
          y={cy - (isLg ? 16 : 12)}
          textAnchor="middle"
          className="font-extrabold"
          style={{
            fontSize: isLg ? 36 : 26,
            fontWeight: 800,
            fill: '#0F172A',
            fontFamily: 'inherit',
          }}
        >
          {clamped}
        </text>

        {/* RISK SCORE / 100 Label */}
        <text
          x={cx}
          y={cy + (isLg ? 4 : 2)}
          textAnchor="middle"
          style={{
            fontSize: isLg ? 9.5 : 8,
            fill: '#94A3B8',
            fontWeight: 600,
            letterSpacing: 1.5,
            fontFamily: 'inherit',
          }}
        >
          RISK SCORE / 100
        </text>

        {/* 0 and 100 Endpoint Labels */}
        <text
          x={cx - r}
          y={cy + (isLg ? 18 : 14)}
          textAnchor="middle"
          style={{
            fontSize: isLg ? 10 : 8.5,
            fill: '#94A3B8',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          0
        </text>
        <text
          x={cx + r}
          y={cy + (isLg ? 18 : 14)}
          textAnchor="middle"
          style={{
            fontSize: isLg ? 10 : 8.5,
            fill: '#94A3B8',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          100
        </text>
      </svg>

      {/* Clean Bottom Pill Badge */}
      <div
        className="mt-2 px-4 py-0.5 rounded-full border-2 text-[11px] font-bold uppercase tracking-wider inline-flex items-center justify-center transition-colors shadow-xs"
        style={{
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.bg,
        }}
      >
        {level}
      </div>
    </div>
  );
};
