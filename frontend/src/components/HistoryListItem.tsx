import { LocalAnalysisResult } from '../types/analysisTypes';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatTimestamp } from '../utils/formatTimestamp';
import { AnalysisResult } from '../backend';

interface HistoryListItemProps {
  analysis: AnalysisResult;
  onClick?: () => void;
}

function getSignalFromDirection(direction: string): string {
  if (direction === 'bullish') return 'COMPRA';
  if (direction === 'bearish') return 'VENDA';
  return 'NEUTRO';
}

export default function HistoryListItem({ analysis, onClick }: HistoryListItemProps) {
  const signal = getSignalFromDirection(analysis.direction.toString());
  const confidence = Number(analysis.confidencePercentage);
  const timestamp = analysis.timestamp;

  const isCompra = signal === 'COMPRA';
  const isVenda = signal === 'VENDA';
  const isNeutro = signal === 'NEUTRO';

  const signalColor = isCompra
    ? 'text-green-400'
    : isVenda
    ? 'text-red-400'
    : 'text-zinc-400';

  const signalBg = isCompra
    ? 'bg-green-950/40 border-green-800/40'
    : isVenda
    ? 'bg-red-950/40 border-red-800/40'
    : 'bg-zinc-800/40 border-zinc-700/40';

  const Icon = isCompra ? TrendingUp : isVenda ? TrendingDown : isNeutro ? Minus : AlertCircle;

  const operationFollowed = analysis.operationFollowed;

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-800/80 transition-colors active:scale-[0.99]"
    >
      {/* Signal Icon */}
      <div className={`p-2 rounded-lg border ${signalBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${signalColor}`} />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold ${signalColor}`}>{signal}</span>
          <span className="text-xs text-zinc-500">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Confiança: <span className="text-zinc-300">{confidence}%</span>
        </div>
      </div>

      {/* WIN/LOSS Badge */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {operationFollowed === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-900/60 border border-green-700/50 text-green-300">
            <CheckCircle className="w-3 h-3" />
            WIN
          </span>
        )}
        {operationFollowed === false && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-900/60 border border-red-700/50 text-red-300">
            <XCircle className="w-3 h-3" />
            LOSS
          </span>
        )}
      </div>
    </div>
  );
}
