import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  BarChart2,
  Timer,
} from 'lucide-react';
import { useCountdownTimer } from '../hooks/useCountdownTimer';
import { AnalysisResult } from '../utils/mapApiResponse';
import ChartOverlay from '../components/ChartOverlay';
import { useUpdateOperationFollowed } from '../hooks/useQueries';

function getTimeframeDuration(tf: string): number {
  if (tf === 'M3') return 180;
  if (tf === 'M5') return 300;
  if (tf === 'M10') return 600;
  return 60; // M1 default
}

function computeEntryTime(durationSeconds: number): string {
  const now = new Date();
  now.setSeconds(now.getSeconds() + durationSeconds);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function Results() {
  const navigate = useNavigate();
  const { id } = useParams({ from: '/results/$id' });

  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const updateOperationFollowed = useUpdateOperationFollowed();

  useEffect(() => {
    const raw = sessionStorage.getItem('latestAnalysis');
    if (raw) {
      try {
        setAnalysisData(JSON.parse(raw));
      } catch {
        // ignore parse errors
      }
    }

    const chartImage = sessionStorage.getItem('chartImage');
    if (chartImage && chartImage.startsWith('data:')) {
      setImageDataUrl(chartImage);
    }
  }, [id]);

  const timeframe = analysisData?.timeframe || 'M1';
  const durationSeconds = useMemo(() => getTimeframeDuration(timeframe), [timeframe]);
  const entryTime = useMemo(() => computeEntryTime(durationSeconds), [durationSeconds]);

  const { timeRemaining, isFinished } = useCountdownTimer(durationSeconds);

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Carregando análise...</p>
        </div>
      </div>
    );
  }

  const {
    tendencia,
    sinal,
    confianca,
    forca,
    padroes,
    explicacao,
    probAlta,
    probBaixa,
    suportes,
    resistencias,
    precisao,
    volume,
  } = analysisData;

  const isCompra = sinal === 'COMPRA';
  const isVenda = sinal === 'VENDA';

  const TrendIcon =
    tendencia === 'ALTA' ? TrendingUp : tendencia === 'BAIXA' ? TrendingDown : Minus;

  const tendenciaColor =
    tendencia === 'ALTA'
      ? 'text-green-400'
      : tendencia === 'BAIXA'
      ? 'text-red-400'
      : 'text-zinc-400';

  const handleFeedback = async (win: boolean) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(win);
    try {
      await updateOperationFollowed.mutateAsync({ analysisIndex: 0, followed: win });
      setFeedbackSaved(true);
    } catch {
      // silent fail — feedback is best-effort
    }
  };

  const timeframeSubtitle =
    timeframe === 'M1'
      ? '1 min/vela'
      : timeframe === 'M3'
      ? '3 min/vela'
      : timeframe === 'M5'
      ? '5 min/vela'
      : '10 min/vela';

  const signalArrow = isCompra ? '↗' : isVenda ? '↙' : '→';

  const forcaBadgeClass =
    forca === 'forte'
      ? 'bg-green-900/70 text-green-300 border border-green-600/60'
      : forca === 'média'
      ? 'bg-amber-900/70 text-amber-300 border border-amber-600/60'
      : 'bg-zinc-800/70 text-zinc-300 border border-zinc-600/60';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-3 py-4 pb-10">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-2 rounded-lg hover:bg-zinc-900 transition-colors flex-shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Resultado da Análise</h1>
            <p className="text-xs text-zinc-500">Análise técnica de candles</p>
          </div>
        </div>

        {/* ── TOP TILES: TEMPO + ENTRAR ÀS ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* TEMPO tile */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[96px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Timer className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">
                Tempo
              </span>
            </div>
            <div
              className={`text-3xl font-mono font-black tracking-tight leading-none ${
                isFinished ? 'text-red-400' : 'text-white'
              }`}
            >
              {isFinished ? 'EXPIRADO' : timeRemaining}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1.5">restante</div>
          </div>

          {/* ENTRAR ÀS tile */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[96px]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">
                Entrar às
              </span>
            </div>
            <div className="text-3xl font-mono font-black tracking-tight leading-none text-cyan-400">
              {entryTime}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1.5">horário de entrada</div>
          </div>
        </div>

        {/* ── SIGNAL BANNER ── */}
        <div
          className={`rounded-xl px-5 py-5 mb-3 text-center w-full ${
            isCompra
              ? 'bg-green-600'
              : isVenda
              ? 'bg-red-600'
              : 'bg-zinc-800'
          }`}
        >
          {/* Arrow + Signal label */}
          <div className="text-2xl font-black tracking-widest text-white mb-1.5">
            {signalArrow} {sinal}
          </div>

          {/* Tendência + Confiança */}
          <div className="text-sm text-white/90 mb-3">
            <span className="font-semibold">Tendência: </span>
            <span className="font-black">{tendencia}</span>
            <span className="mx-2 text-white/50">•</span>
            <span className="font-semibold">Confiança: </span>
            <span className="font-black">{confianca}%</span>
          </div>

          {/* Força badge */}
          <div className="flex justify-center">
            <span className={`px-4 py-1 rounded-full text-xs font-bold ${forcaBadgeClass}`}>
              Força: {forca}
            </span>
          </div>
        </div>

        {/* ── 2×2 INFO GRID ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Tendência */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Tendência</div>
            <div className={`flex items-center gap-2 ${tendenciaColor}`}>
              <TrendIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-xl font-bold">{tendencia}</span>
            </div>
          </div>

          {/* Precisão */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Precisão</span>
            </div>
            <div className="text-xl font-bold text-cyan-400">{precisao}%</div>
          </div>

          {/* Volume */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-xl font-bold text-purple-400 capitalize">{volume}</div>
          </div>

          {/* Time Frame */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Time Frame</span>
            </div>
            <div className="text-xl font-bold text-amber-400">{timeframe}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{timeframeSubtitle}</div>
          </div>
        </div>

        {/* ── CHART OVERLAY (full-width, prominent) ── */}
        {imageDataUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-zinc-800 w-full">
            <ChartOverlay
              imageUrl={imageDataUrl}
              signal={isCompra ? 'COMPRA' : isVenda ? 'VENDA' : 'neutral'}
              suportes={suportes}
              resistencias={resistencias}
            />
          </div>
        )}

        {/* ── PADRÕES DETECTADOS ── */}
        {padroes && padroes.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
            <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">
              Padrões Detectados
            </div>
            <div className="flex flex-wrap gap-2">
              {padroes.map((p, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-medium text-white"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── ANÁLISE TÉCNICA ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
          <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">
            Análise Técnica
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{explicacao}</p>
        </div>

        {/* ── PROBABILIDADES ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
          <div className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider">
            Probabilidades
          </div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-green-400 font-semibold">Alta {probAlta}%</span>
            <span className="text-red-400 font-semibold">Baixa {probBaixa}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${probAlta}%` }}
            />
          </div>
        </div>

        {/* ── SUPORTE & RESISTÊNCIA ── */}
        {(suportes.length > 0 || resistencias.length > 0) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
            <div className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider">
              Suporte &amp; Resistência
            </div>
            <div className="grid grid-cols-2 gap-4">
              {suportes.length > 0 && (
                <div>
                  <div className="text-xs text-green-400 mb-1 font-semibold">Suportes</div>
                  {suportes.map((s, i) => (
                    <div key={i} className="text-sm font-mono text-zinc-300">
                      {(s * 100).toFixed(1)}%
                    </div>
                  ))}
                </div>
              )}
              {resistencias.length > 0 && (
                <div>
                  <div className="text-xs text-red-400 mb-1 font-semibold">Resistências</div>
                  {resistencias.map((r, i) => (
                    <div key={i} className="text-sm font-mono text-zinc-300">
                      {(r * 100).toFixed(1)}%
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WIN / LOSS FEEDBACK ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider text-center">
            Como foi a operação?
          </div>
          {feedbackSaved ? (
            <div className="text-center text-sm text-zinc-400 py-1">
              {feedbackGiven ? '✅ WIN registrado!' : '❌ LOSS registrado!'}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleFeedback(true)}
                disabled={feedbackGiven !== null || updateOperationFollowed.isPending}
                className="flex-1 py-3 rounded-xl bg-green-900/40 border border-green-700/50 text-green-400 font-bold text-sm hover:bg-green-900/70 transition-colors disabled:opacity-50"
              >
                ✅ WIN
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={feedbackGiven !== null || updateOperationFollowed.isPending}
                className="flex-1 py-3 rounded-xl bg-red-900/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-900/70 transition-colors disabled:opacity-50"
              >
                ❌ LOSS
              </button>
            </div>
          )}
        </div>

        {/* ── NOVA ANÁLISE ── */}
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors text-sm font-medium text-zinc-400"
        >
          Nova Análise
        </button>
      </div>
    </div>
  );
}
