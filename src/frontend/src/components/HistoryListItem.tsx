import {
  AlertCircle,
  CheckCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { AnalysisResult } from "../backend";
import { formatTimestamp } from "../utils/formatTimestamp";

interface HistoryListItemProps {
  analysis: AnalysisResult;
  onClick?: () => void;
}

function getSignalFromDirection(direction: string): string {
  if (direction === "bullish") return "COMPRA";
  if (direction === "bearish") return "VENDA";
  return "NEUTRO";
}

export default function HistoryListItem({
  analysis,
  onClick,
}: HistoryListItemProps) {
  const signal = getSignalFromDirection(analysis.direction.toString());
  const confidence = Number(analysis.confidencePercentage);
  const timestamp = analysis.timestamp;

  const isCompra = signal === "COMPRA";
  const isVenda = signal === "VENDA";
  const isNeutro = signal === "NEUTRO";

  const signalColor = isCompra
    ? "text-green-600"
    : isVenda
      ? "text-red-600"
      : "text-gray-500";
  const signalBg = isCompra
    ? "bg-green-50 border-green-200"
    : isVenda
      ? "bg-red-50 border-red-200"
      : "bg-gray-100 border-gray-200";

  const Icon = isCompra
    ? TrendingUp
    : isVenda
      ? TrendingDown
      : isNeutro
        ? Minus
        : AlertCircle;

  const operationFollowed = analysis.operationFollowed;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.99] shadow-sm"
    >
      <div className={`p-2 rounded-lg border ${signalBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${signalColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold ${signalColor}`}>{signal}</span>
          <span className="text-xs text-gray-400">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          Confiança: <span className="text-gray-600">{confidence}%</span>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {operationFollowed === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 border border-green-300 text-green-700">
            <CheckCircle className="w-3 h-3" />
            WIN
          </span>
        )}
        {operationFollowed === false && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 border border-red-300 text-red-700">
            <XCircle className="w-3 h-3" />
            LOSS
          </span>
        )}
      </div>
    </button>
  );
}
