import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ChartOverlay from "../components/ChartOverlay";
import TimeframeSummaryCard from "../components/TimeframeSummaryCard";
import { useCountdownTimer } from "../hooks/useCountdownTimer";
import { useUpdateOperationFollowed } from "../hooks/useQueries";
import type { MultiTimeframeEntry } from "../types/analysisTypes";

type TimeframeStr = "M1" | "M3" | "M5";

interface StoredAnalysis {
  sinal: string;
  tendencia: string;
  confianca: number;
  probAlta: number;
  probBaixa: number;
  padroes: string[];
  forca: string;
  explicacao: string;
  precisao: number;
  volume: string;
  timeframe: string;
  suportes: number[];
  resistencias: number[];
  multiTimeframe?: MultiTimeframeEntry[];
}

function getTimeframeDuration(tf: string): number {
  if (tf === "M5") return 300;
  if (tf === "M3") return 180;
  return 60;
}

function getTimeframeLabel(tf: string): string {
  if (tf === "M5") return "5 min/vela";
  if (tf === "M3") return "3 min/vela";
  return "1 min/vela";
}

function getEntryTime(tf: string): string {
  const now = new Date();
  const minutes = tf === "M5" ? 5 : tf === "M3" ? 3 : 1;
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/results/$id" });
  const [analysisData, setAnalysisData] = useState<StoredAnalysis | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<"win" | "loss" | null>(
    null,
  );
  const updateOperationFollowed = useUpdateOperationFollowed();
  const entryTimeRef = useRef<string | null>(null);

  const defaultTimeframe = (() => {
    try {
      const raw = localStorage.getItem("userSettings");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.defaultTimeframe as TimeframeStr;
      }
    } catch {
      // ignore
    }
    return "M1" as TimeframeStr;
  })();

  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem("latestAnalysis") ??
        sessionStorage.getItem(`analysis_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredAnalysis;
        setAnalysisData(parsed);
        if (!entryTimeRef.current) {
          entryTimeRef.current = getEntryTime(parsed.timeframe ?? "M1");
        }
      } else {
        navigate({ to: "/" });
      }
    } catch {
      navigate({ to: "/" });
    }
  }, [id, navigate]);

  const timeframeDuration = analysisData
    ? getTimeframeDuration(analysisData.timeframe)
    : 60;
  const { timeRemaining, isFinished } = useCountdownTimer(timeframeDuration);

  const handleFeedback = (result: "win" | "loss") => {
    setFeedbackGiven(result);
    updateOperationFollowed.mutate(
      { analysisIndex: 0, followed: result === "win" },
      {
        onSuccess: () => {
          toast.success(
            result === "win" ? "✅ WIN registrado!" : "❌ LOSS registrado!",
          );
        },
        onError: () => {
          toast.success(
            result === "win" ? "✅ WIN registrado!" : "❌ LOSS registrado!",
          );
        },
      },
    );
  };

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const isBuy = analysisData.sinal === "COMPRA";
  const isSell = analysisData.sinal === "VENDA";
  const signalBg = isBuy
    ? "bg-green-500"
    : isSell
      ? "bg-red-500"
      : "bg-gray-200";
  const signalArrow = isBuy ? "▲" : isSell ? "▼" : "●";
  const signalLabel = isBuy ? "COMPRA" : isSell ? "VENDA" : "NEUTRO";

  const tf = (analysisData.timeframe as TimeframeStr) ?? "M1";
  const entryTime = entryTimeRef.current ?? getEntryTime(tf);

  const forcaColor =
    analysisData.forca === "forte"
      ? "text-green-600"
      : analysisData.forca === "média"
        ? "text-amber-600"
        : "text-gray-400";

  const probAlta = Math.round(analysisData.probAlta ?? 50);
  const probBaixa = Math.round(analysisData.probBaixa ?? 50);

  const imageDataUrl = sessionStorage.getItem("chartImage");
  const showMultiTimeframe =
    analysisData.multiTimeframe && analysisData.multiTimeframe.length > 1;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          type="button"
          data-ocid="results.back_button"
          onClick={() => navigate({ to: "/analyze" })}
          className="p-2 rounded-full bg-white/70 hover:bg-white border border-gray-200 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Resultado da Análise
          </h1>
          <p className="text-sm text-gray-500">
            {analysisData.tendencia === "ALTA"
              ? "Tendência de Alta"
              : analysisData.tendencia === "BAIXA"
                ? "Tendência de Baixa"
                : "Mercado Lateral"}{" "}
            · Confiança {analysisData.confianca}%
            {showMultiTimeframe && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-bold border border-cyan-200">
                MULTI-TF
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Timer + Entry Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center min-h-[90px] border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
              TEMPO
            </p>
            <p
              className={`text-3xl font-black tabular-nums ${isFinished ? "text-red-500" : "text-gray-900"}`}
            >
              {timeRemaining}
            </p>
            <p className="text-gray-400 text-xs mt-1">{tf}</p>
          </div>
          <div className="bg-cyan-400 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[90px]">
            <p className="text-black/60 text-xs font-medium uppercase tracking-wider mb-1">
              ENTRAR ÀS
            </p>
            <p className="text-2xl font-black text-black tabular-nums">
              {entryTime}
            </p>
            <p className="text-black/50 text-xs mt-1">
              {getTimeframeLabel(tf)}
            </p>
          </div>
        </div>

        {/* Signal banner */}
        <div
          className={`${signalBg} rounded-2xl p-5 flex items-center justify-between`}
        >
          <div>
            <p className="text-white/80 text-sm font-medium">
              Sinal de Entrada
            </p>
            <p className="text-3xl font-black text-white mt-1">{signalLabel}</p>
            {analysisData.forca && (
              <p className={`text-sm font-semibold mt-1 ${forcaColor}`}>
                Força: {analysisData.forca}
              </p>
            )}
          </div>
          <span className="text-5xl text-white/90">{signalArrow}</span>
        </div>

        {/* Multi-timeframe cards */}
        {showMultiTimeframe && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3 px-1">
              Análise por Timeframe
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {analysisData.multiTimeframe!.map((entry) => (
                <TimeframeSummaryCard
                  key={entry.timeframe}
                  entry={entry}
                  highlighted={entry.timeframe === defaultTimeframe}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2×2 Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
              Tendência
            </p>
            <div className="flex items-center gap-2">
              {analysisData.tendencia === "ALTA" ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : analysisData.tendencia === "BAIXA" ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <Minus className="w-5 h-5 text-gray-400" />
              )}
              <span
                className={`font-bold text-sm ${
                  analysisData.tendencia === "ALTA"
                    ? "text-green-600"
                    : analysisData.tendencia === "BAIXA"
                      ? "text-red-600"
                      : "text-gray-400"
                }`}
              >
                {analysisData.tendencia}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
              Precisão
            </p>
            <p className="text-cyan-600 font-bold text-lg">
              {analysisData.precisao}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
              Volume
            </p>
            <p className="text-purple-600 font-bold text-sm capitalize">
              {analysisData.volume}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
            <p className="text-amber-500 text-xs uppercase tracking-wider mb-2">
              Time Frame
            </p>
            <p className="text-amber-600 font-bold text-lg">{tf}</p>
            <p className="text-amber-400 text-xs mt-0.5">
              {getTimeframeLabel(tf)}
            </p>
          </div>
        </div>

        {/* Chart overlay */}
        {imageDataUrl?.startsWith("data:") && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <ChartOverlay
              imageUrl={imageDataUrl}
              signal={analysisData.sinal}
              sinal={analysisData.sinal}
              suportes={analysisData.suportes}
              resistencias={analysisData.resistencias}
            />
          </div>
        )}

        {/* Patterns */}
        {analysisData.padroes.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Padrões Detectados
            </p>
            <div className="flex flex-wrap gap-2">
              {analysisData.padroes.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical analysis explanation */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
            Análise Técnica
          </p>
          <p className="text-gray-700 text-sm leading-relaxed">
            {analysisData.explicacao}
          </p>
        </div>

        {/* Probability bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
            Probabilidade
          </p>
          <div className="flex rounded-full overflow-hidden h-4">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${probAlta}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${probBaixa}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-green-600 font-semibold">
              Alta {probAlta}%
            </span>
            <span className="text-red-600 font-semibold">
              Baixa {probBaixa}%
            </span>
          </div>
          {/* Recommendation text */}
          <p className="text-center mt-2 text-xs font-semibold">
            {probAlta >= 65 ? (
              <span className="text-green-600">
                ✅ Bom momento para operar — probabilidade favorável
              </span>
            ) : probBaixa >= 65 ? (
              <span className="text-red-600">
                ⚠️ Tendência de baixa — opere com cautela
              </span>
            ) : (
              <span className="text-gray-500">
                ⚪ Mercado indeciso — aguarde confirmação
              </span>
            )}
          </p>
        </div>

        {/* Support / Resistance */}
        {(analysisData.suportes.length > 0 ||
          analysisData.resistencias.length > 0) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              Suporte &amp; Resistência
            </p>
            <div className="grid grid-cols-2 gap-3">
              {analysisData.suportes.length > 0 && (
                <div>
                  <p className="text-green-500 text-xs mb-1">Suportes</p>
                  {analysisData.suportes.map((s) => (
                    <p
                      key={s}
                      className="text-green-600 font-bold text-sm font-mono"
                    >
                      {(s * 100).toFixed(1)}%
                    </p>
                  ))}
                </div>
              )}
              {analysisData.resistencias.length > 0 && (
                <div>
                  <p className="text-red-500 text-xs mb-1">Resistências</p>
                  {analysisData.resistencias.map((r) => (
                    <p
                      key={r}
                      className="text-red-600 font-bold text-sm font-mono"
                    >
                      {(r * 100).toFixed(1)}%
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WIN / LOSS buttons */}
        <div className="space-y-3 pt-2">
          <p className="text-gray-500 text-xs uppercase tracking-wider text-center">
            Como foi a operação?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-ocid="results.win_button"
              onClick={() => handleFeedback("win")}
              disabled={feedbackGiven !== null}
              className={`py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                feedbackGiven === "win"
                  ? "bg-green-500 text-white"
                  : feedbackGiven === "loss"
                    ? "bg-gray-100 text-gray-300 border border-gray-200"
                    : "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              WIN
            </button>
            <button
              type="button"
              data-ocid="results.loss_button"
              onClick={() => handleFeedback("loss")}
              disabled={feedbackGiven !== null}
              className={`py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                feedbackGiven === "loss"
                  ? "bg-red-500 text-white"
                  : feedbackGiven === "win"
                    ? "bg-gray-100 text-gray-300 border border-gray-200"
                    : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
              }`}
            >
              <XCircle className="w-5 h-5" />
              LOSS
            </button>
          </div>
        </div>

        {/* New analysis */}
        <button
          type="button"
          data-ocid="results.new_analysis_button"
          onClick={() => navigate({ to: "/" })}
          className="w-full py-3 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 transition-colors text-sm font-medium text-gray-600 shadow-sm"
        >
          Nova Análise
        </button>
      </div>
    </div>
  );
}
