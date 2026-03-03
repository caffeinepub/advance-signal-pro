import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ImageOff, RefreshCw } from 'lucide-react';
import ProcessingStage from '../components/ProcessingStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalBlob, Timeframe } from '../backend';
import { analyzeChartImage } from '../services/localCandleAnalysis';
import { mapLocalAnalysisResult } from '../utils/mapApiResponse';
import { dataUrlToFile } from '../utils/dataUrlToFile';
import { useAnalyzeChart } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';

const STAGES = [
  { label: 'Carregando imagem do gráfico', duration: 3500 },
  { label: 'Identificando candles e estrutura', duration: 4000 },
  { label: 'Detectando padrões de candle', duration: 4500 },
  { label: 'Gerando resultado da análise', duration: 3000 },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function mapTimeframe(tf: 'M1' | 'M3' | 'M5'): Timeframe {
  if (tf === 'M3') return Timeframe.M3;
  if (tf === 'M5') return Timeframe.M5;
  return Timeframe.M1;
}

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const analyzeChart = useAnalyzeChart();

  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<boolean[]>([false, false, false, false]);
  const [error, setError] = useState<string | null>(null);
  const [isChartDetectionError, setIsChartDetectionError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markComplete = (stageIndex: number) => {
    setCompletedStages((prev) => {
      const next = [...prev];
      next[stageIndex] = true;
      return next;
    });
  };

  const startAnalysis = async () => {
    setIsProcessing(true);
    setError(null);
    setIsChartDetectionError(false);

    // ── Stage 0: Load image ──
    setCurrentStage(0);
    await delay(STAGES[0].duration);

    let imageData: string | null = null;
    try {
      imageData = sessionStorage.getItem('chartImage');
    } catch {
      setError('Não foi possível acessar a imagem. Tente novamente.');
      setIsProcessing(false);
      return;
    }

    if (!imageData || !imageData.startsWith('data:')) {
      setError('Imagem não encontrada. Envie o gráfico novamente.');
      setIsProcessing(false);
      return;
    }

    const imageFile = dataUrlToFile(imageData, 'chart.png');
    if (!imageFile) {
      setError('Imagem inválida ou corrompida. Envie o gráfico novamente.');
      setIsProcessing(false);
      return;
    }

    let imageBlob: ExternalBlob;
    try {
      const buffer = await imageFile.arrayBuffer();
      imageBlob = ExternalBlob.fromBytes(new Uint8Array(buffer));
    } catch {
      setError('Não foi possível processar a imagem. Tente novamente.');
      setIsProcessing(false);
      return;
    }

    markComplete(0);

    // ── Stage 1: Process data ──
    setCurrentStage(1);
    await delay(STAGES[1].duration);
    markComplete(1);

    // ── Stage 2: Detect patterns ──
    setCurrentStage(2);

    const [localResult] = await Promise.all([
      analyzeChartImage(imageFile),
      delay(STAGES[2].duration),
    ]);

    // Treat as chart detection error only if confidence is very low and signal is NEUTRO
    if (localResult.sinal === 'NEUTRO' && localResult.confianca < 35) {
      setIsChartDetectionError(true);
      setIsProcessing(false);
      return;
    }

    markComplete(2);

    // ── Stage 3: Generate result ──
    setCurrentStage(3);
    await delay(STAGES[3].duration);
    markComplete(3);

    let mappedResult: ReturnType<typeof mapLocalAnalysisResult>;
    try {
      mappedResult = mapLocalAnalysisResult(localResult);
      sessionStorage.setItem('latestAnalysis', JSON.stringify(mappedResult));
    } catch {
      setError('Não foi possível processar o resultado. Tente novamente.');
      setIsProcessing(false);
      return;
    }

    // ── Backend save: non-blocking, best-effort ──
    if (actor) {
      Promise.resolve().then(async () => {
        try {
          await analyzeChart.mutateAsync({
            direction:
              localResult.sinal === 'COMPRA'
                ? ({ bullish: null } as any)
                : localResult.sinal === 'VENDA'
                ? ({ bearish: null } as any)
                : ({ sideways: null } as any),
            resistanceLevels: [],
            candlestickPatterns: [],
            pullbacks: false,
            breakouts: false,
            trendStrength: BigInt(Math.floor(localResult.confianca * 0.8)),
            confidencePercentage: BigInt(Math.floor(localResult.confianca)),
            timestamp: BigInt(Date.now() * 1_000_000),
            image: imageBlob,
            probabilidadeAlta: localResult.probAlta / 100,
            probabilidadeBaixa: localResult.probBaixa / 100,
            acaoSugerida: localResult.sinal,
            operationFollowed: undefined,
            entradaExemplo: undefined,
            stopExemplo: undefined,
            alvoExemplo: undefined,
            timeframe: mapTimeframe(localResult.timeframe),
          });
        } catch (err) {
          console.warn('[ProcessingScreen] Backend save skipped:', err);
        }
      });
    }

    navigate({ to: '/results/$id', params: { id: 'latest' } });
  };

  if (isChartDetectionError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-zinc-900 border-zinc-800">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-950/40 flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-orange-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Gráfico Não Identificado</h2>
            <p className="text-zinc-400">
              Não foi possível identificar o gráfico corretamente
            </p>
          </div>
          <div className="p-4 bg-orange-950/20 border border-orange-800/50 rounded-lg text-sm text-orange-200">
            Certifique-se de que o print contém um gráfico de candles visível com velas coloridas
            (verde/vermelho).
          </div>
          <Button
            className="w-full gap-2 bg-white text-black hover:bg-zinc-200"
            onClick={() => navigate({ to: '/analyze' })}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-zinc-900 border-zinc-800">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-950/30 flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-red-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Erro na Análise</h2>
            <p className="text-zinc-400 text-sm">{error}</p>
          </div>
          <Button
            className="w-full gap-2 bg-white text-black hover:bg-zinc-200"
            onClick={() => navigate({ to: '/analyze' })}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const overallProgress = Math.round(
    (completedStages.filter(Boolean).length / STAGES.length) * 100
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 flex flex-col items-center">
        <img
          src="/assets/generated/app-icon.dim_512x512.png"
          alt="Logo"
          className="w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.18))' }}
        />
        <h1 className="text-white text-2xl font-bold tracking-tight">Analisando Gráfico</h1>
        <p className="text-zinc-500 text-sm mt-1">Processamento local com IA</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-800">
        <div className="space-y-5">
          {STAGES.map((stage, idx) => (
            <ProcessingStage
              key={idx}
              label={stage.label}
              duration={stage.duration}
              isActive={currentStage === idx && isProcessing && !completedStages[idx]}
              isComplete={completedStages[idx]}
            />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-500 text-xs">Progresso total</span>
          <span className="text-white text-sm font-bold">{overallProgress}%</span>
        </div>
      </div>

      <p className="text-zinc-600 text-xs mt-8 text-center max-w-xs">
        Análise realizada localmente. Não constitui recomendação financeira.
      </p>
    </div>
  );
}
