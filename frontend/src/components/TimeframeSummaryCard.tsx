import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MultiTimeframeEntry } from '../types/analysisTypes';

interface TimeframeSummaryCardProps {
  entry: MultiTimeframeEntry;
  highlighted?: boolean;
}

const TIMEFRAME_COLORS = {
  M1: {
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
  },
  M3: {
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
  },
  M5: {
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
  },
};

export default function TimeframeSummaryCard({ entry, highlighted = false }: TimeframeSummaryCardProps) {
  const colors = TIMEFRAME_COLORS[entry.timeframe] ?? TIMEFRAME_COLORS.M1;

  const isBuy = entry.sinal === 'COMPRA';
  const isSell = entry.sinal === 'VENDA';

  const signalColor = isBuy ? 'text-green-400' : isSell ? 'text-red-400' : 'text-white/40';
  const signalLabel = isBuy ? 'COMPRA ↑' : isSell ? 'VENDA ↓' : 'NEUTRO';

  const trendIcon = entry.tendencia === 'ALTA'
    ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
    : entry.tendencia === 'BAIXA'
    ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    : <Minus className="w-3.5 h-3.5 text-white/30" />;

  const trendColor = entry.tendencia === 'ALTA'
    ? 'text-green-400'
    : entry.tendencia === 'BAIXA'
    ? 'text-red-400'
    : 'text-white/30';

  return (
    <div
      className={`flex-shrink-0 w-36 rounded-2xl p-3 border transition-all ${
        highlighted
          ? `${colors.bg} ${colors.border} border-2`
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Timeframe badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors.badge}`}>
          {entry.timeframe}
        </span>
        {highlighted && (
          <span className="text-[10px] text-white/30 font-medium">principal</span>
        )}
      </div>

      {/* Signal */}
      <p className={`text-sm font-bold mb-1 ${signalColor}`}>{signalLabel}</p>

      {/* Trend */}
      <div className="flex items-center gap-1 mb-2">
        {trendIcon}
        <span className={`text-xs font-medium ${trendColor}`}>{entry.tendencia}</span>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between">
        <span className="text-white/30 text-[10px]">Confiança</span>
        <span className="text-white/70 text-xs font-bold">{entry.confianca}%</span>
      </div>
    </div>
  );
}
