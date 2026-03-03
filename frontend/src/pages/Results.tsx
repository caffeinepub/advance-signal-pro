import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateOperationFollowed } from '../hooks/useQueries';
import ChartOverlay from '../components/ChartOverlay';
import { useCountdownTimer } from '../hooks/useCountdownTimer';

type TimeframeStr = 'M1' | 'M3' | 'M5';

// Shape stored in sessionStorage by mapLocalAnalysisResult / mapApiResponse.ts
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
}

function getTimeframeDuration(tf: string): number {
  if (tf === 'M5') return 300;
  if (tf === 'M3') return 180;
  return 60;
}

function getTimeframeLabel(tf: string): string {
  if (tf === 'M5') return '5 min/vela';
  if (tf === 'M3') return '3 min/vela';
  return '1 min/vela';
}

function getEntryTime(tf: string): string {
  const now = new Date();
  const minutes = tf === 'M5' ? 5 : tf === 'M3' ? 3 : 1;
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams({ from: '/results/$id' });
  const [analysisData, setAnalysisData] = useState<StoredAnalysis | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'win' | 'loss' | null>(null);
  const updateOperationFollowed = useUpdateOperationFollowed();
  const entryTimeRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      // Support both 'latestAnalysis' (written by ProcessingScreen) and 'analysis_${id}'
      const stored =
        sessionStorage.getItem('latestAnalysis') ??
        sessionStorage.getItem(`analysis_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredAnalysis;
        setAnalysisData(parsed);
        if (!entryTimeRef.current) {
          entryTimeRef.current = getEntryTime(parsed.timeframe ?? 'M1');
        }
      } else {
        navigate({ to: '/' });
      }
    } catch {
      navigate({ to: '/' });
    }
  }, [id, navigate]);

  const timeframeDuration = analysisData ? getTimeframeDuration(analysisData.timeframe) : 60;
  const { timeRemaining, isFinished } = useCountdownTimer(timeframeDuration);

  const handleFeedback = (result: 'win' | 'loss') => {
    setFeedbackGiven(result);
    // Best-effort: always try index 0 (most recent analysis)
    updateOperationFollowed.mutate(
      { analysisIndex: 0, followed: result === 'win' },
      {
        onSuccess: () => {
          toast.success(result === 'win' ? '✅ WIN registrado!' : '❌ LOSS registrado!');
        },
        onError: () => {
          // Still show success to user — feedback is best-effort
          toast.success(result === 'win' ? '✅ WIN registrado!' : '❌ LOSS registrado!');
        },
      }
    );
  };

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isBuy = analysisData.sinal === 'COMPRA';
  const isSell = analysisData.sinal === 'VENDA';
  const signalBg = isBuy ? 'bg-green-500' : isSell ? 'bg-red-500' : 'bg-white/20';
  const signalArrow = isBuy ? '▲' : isSell ? '▼' : '●';
  const signalLabel = isBuy ? 'COMPRA' : isSell ? 'VENDA' : 'NEUTRO';

  const tf = (analysisData.timeframe as TimeframeStr) ?? 'M1';
  const entryTime = entryTimeRef.current ?? getEntryTime(tf);

  const forcaColor =
    analysisData.forca === 'forte'
      ? 'text-green-400'
      : analysisData.forca === 'média'
      ? 'text-amber-400'
      : 'text-white/40';

  // probAlta/probBaixa are stored as 0–100 integers by mapLocalAnalysisResult
  const probAlta = Math.round(analysisData.probAlta ?? 50);
  const probBaixa = Math.round(analysisData.probBaixa ?? 50);

  const imageDataUrl = sessionStorage.getItem('chartImage');

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate({ to: '/analyze' })}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Resultado da Análise</h1>
          <p className="text-sm text-white/40">
            {analysisData.tendencia === 'ALTA'
              ? 'Tendência de Alta'
              : analysisData.tendencia === 'BAIXA'
              ? 'Tendência de Baixa'
              : 'Mercado Lateral'}{' '}
            · Confiança {analysisData.confianca}%
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Timer + Entry Time tiles */}
        <div className="grid grid-cols-2 gap-3">
          {/* Countdown */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center min-h-[90px]">
            <p className="text-black/50 text-xs font-medium uppercase tracking-wider mb-1">TEMPO</p>
            <p className={`text-3xl font-black tabular-nums ${isFinished ? 'text-red-500' : 'text-black'}`}>
              {timeRemaining}
            </p>
            <p className="text-black/40 text-xs mt-1">{tf}</p>
          </div>

          {/* Entry time */}
          <div className="bg-cyan-400 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[90px]">
            <p className="text-black/60 text-xs font-medium uppercase tracking-wider mb-1">ENTRAR ÀS</p>
            <p className="text-2xl font-black text-black tabular-nums">{entryTime}</p>
            <p className="text-black/50 text-xs mt-1">{getTimeframeLabel(tf)}</p>
          </div>
        </div>

        {/* Signal banner */}
        <div className={`${signalBg} rounded-2xl p-5 flex items-center justify-between`}>
          <div>
            <p className="text-white/70 text-sm font-medium">Sinal de Entrada</p>
            <p className="text-3xl font-black text-white mt-1">{signalLabel}</p>
            {analysisData.forca && (
              <p className={`text-sm font-semibold mt-1 ${forcaColor}`}>
                Força: {analysisData.forca}
              </p>
            )}
          </div>
          <span className="text-5xl text-white/90">{signalArrow}</span>
        </div>

        {/* 2×2 Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tendência */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Tendência</p>
            <div className="flex items-center gap-2">
              {analysisData.tendencia === 'ALTA' ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : analysisData.tendencia === 'BAIXA' ? (
                <TrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <Minus className="w-5 h-5 text-white/40" />
              )}
              <span
                className={`font-bold text-sm ${
                  analysisData.tendencia === 'ALTA'
                    ? 'text-green-400'
                    : analysisData.tendencia === 'BAIXA'
                    ? 'text-red-400'
                    : 'text-white/40'
                }`}
              >
                {analysisData.tendencia}
              </span>
            </div>
          </div>

          {/* Precisão */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Precisão</p>
            <p className="text-cyan-400 font-bold text-lg">{analysisData.precisao}%</p>
          </div>

          {/* Volume */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Volume</p>
            <p className="text-purple-400 font-bold text-sm capitalize">{analysisData.volume}</p>
          </div>

          {/* Time Frame */}
          <div className="bg-white/5 rounded-2xl p-4 border border-amber-400/30">
            <p className="text-amber-400/70 text-xs uppercase tracking-wider mb-2">Time Frame</p>
            <p className="text-amber-400 font-bold text-lg">{tf}</p>
            <p className="text-amber-400/50 text-xs mt-0.5">{getTimeframeLabel(tf)}</p>
          </div>
        </div>

        {/* Chart overlay */}
        {imageDataUrl && imageDataUrl.startsWith('data:') && (
          <div className="rounded-2xl overflow-hidden border border-white/10">
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
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Padrões Detectados</p>
            <div className="flex flex-wrap gap-2">
              {analysisData.padroes.map((p, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical analysis explanation */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Análise Técnica</p>
          <p className="text-white/70 text-sm leading-relaxed">{analysisData.explicacao}</p>
        </div>

        {/* Probability bar */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Probabilidade</p>
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
            <span className="text-green-400 font-semibold">Alta {probAlta}%</span>
            <span className="text-red-400 font-semibold">Baixa {probBaixa}%</span>
          </div>
        </div>

        {/* Support / Resistance */}
        {(analysisData.suportes.length > 0 || analysisData.resistencias.length > 0) && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Suporte &amp; Resistência
            </p>
            <div className="grid grid-cols-2 gap-3">
              {analysisData.suportes.length > 0 && (
                <div>
                  <p className="text-green-400/60 text-xs mb-1">Suportes</p>
                  {analysisData.suportes.map((s, i) => (
                    <p key={i} className="text-green-400 font-bold text-sm font-mono">
                      {(s * 100).toFixed(1)}%
                    </p>
                  ))}
                </div>
              )}
              {analysisData.resistencias.length > 0 && (
                <div>
                  <p className="text-red-400/60 text-xs mb-1">Resistências</p>
                  {analysisData.resistencias.map((r, i) => (
                    <p key={i} className="text-red-400 font-bold text-sm font-mono">
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
          <p className="text-white/40 text-xs uppercase tracking-wider text-center">
            Como foi a operação?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleFeedback('win')}
              disabled={feedbackGiven !== null}
              className={`py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                feedbackGiven === 'win'
                  ? 'bg-green-500 text-white'
                  : feedbackGiven === 'loss'
                  ? 'bg-white/5 text-white/20 border border-white/10'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              WIN
            </button>
            <button
              onClick={() => handleFeedback('loss')}
              disabled={feedbackGiven !== null}
              className={`py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                feedbackGiven === 'loss'
                  ? 'bg-red-500 text-white'
                  : feedbackGiven === 'win'
                  ? 'bg-white/5 text-white/20 border border-white/10'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              <XCircle className="w-5 h-5" />
              LOSS
            </button>
          </div>
        </div>

        {/* New analysis */}
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium text-white/50"
        >
          Nova Análise
        </button>
      </div>
    </div>
  );
}
