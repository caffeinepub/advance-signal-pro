import { useEffect, useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, ImageOff } from 'lucide-react';
import ProcessingStage from '../components/ProcessingStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalBlob } from '../backend';
import { analyzeChartImage } from '../services/localCandleAnalysis';
import { mapApiResponseToAnalysisResult } from '../utils/mapApiResponse';
import { dataUrlToFile } from '../utils/dataUrlToFile';
import { useAnalyzeChart } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';

const stages = [
  { id: 1, label: 'Carregando imagem', duration: 600 },
  { id: 2, label: 'Processando dados', duration: 700 },
  { id: 3, label: 'Detectando padrões de candle', duration: 800 },
  { id: 4, label: 'Gerando resultado', duration: 500 },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChartDetectionError, setIsChartDetectionError] = useState(false);
  const analyzeChart = useAnalyzeChart();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAnalysis = async () => {
    setIsProcessing(true);
    setError(null);
    setIsChartDetectionError(false);

    // ── Stage 0: Load image ──
    setCurrentStage(0);
    await delay(stages[0].duration);

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

    // ── Stage 1: Process data ──
    setCurrentStage(1);
    await delay(stages[1].duration);

    // ── Stage 2: Detect patterns ──
    setCurrentStage(2);

    let localResult;
    try {
      localResult = await analyzeChartImage(imageFile);
    } catch {
      setError('Não foi possível processar a imagem. Tente novamente.');
      setIsProcessing(false);
      return;
    }

    if (localResult.erro && localResult.confianca === 0) {
      setIsChartDetectionError(true);
      setIsProcessing(false);
      return;
    }

    // ── Stage 3: Generate result ──
    setCurrentStage(3);
    await delay(stages[3].duration);

    try {
      const mappedResult = mapApiResponseToAnalysisResult(localResult, imageBlob);
      sessionStorage.setItem('latestAnalysis', JSON.stringify(mappedResult));

      if (actor) {
        try {
          await analyzeChart.mutateAsync({
            direction: mappedResult.direction,
            resistanceLevels: mappedResult.resistanceLevels,
            candlestickPatterns: mappedResult.candlestickPatterns,
            pullbacks: mappedResult.pullbacks,
            breakouts: mappedResult.breakouts,
            trendStrength: mappedResult.trendStrength,
            confidencePercentage: mappedResult.confidencePercentage,
            timestamp: mappedResult.timestamp,
            image: imageBlob,
            probabilidadeAlta: localResult.probabilidade_alta,
            probabilidadeBaixa: localResult.probabilidade_baixa,
            acaoSugerida: localResult.sinal,
            operationFollowed: undefined,
            entradaExemplo: undefined,
            stopExemplo: undefined,
            alvoExemplo: undefined,
          });
        } catch {
          // Backend storage is best-effort; continue to results
        }
      }

      navigate({ to: '/results/$id', params: { id: 'latest' } });
    } catch {
      setError('Não foi possível salvar o resultado. Tente novamente.');
      setIsProcessing(false);
    }
  };

  // Chart detection error screen
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
            Certifique-se de que o print contém um gráfico de candles visível com velas coloridas (verde/vermelho).
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

  // Generic error screen
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-zinc-900 border-zinc-800">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-950/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Logo + Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/assets/generated/app-icon.dim_512x512.png"
              alt="Logo"
              className="w-16 h-16 rounded-2xl shadow-lg"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Analisando Gráfico
            </h1>
            <p className="text-sm text-zinc-400">
              Detectando padrões de velas localmente...
            </p>
          </div>
        </div>

        {/* Processing stages card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
          {stages.map((stage, index) => (
            <ProcessingStage
              key={stage.id}
              label={stage.label}
              isActive={currentStage === index && isProcessing}
              isComplete={currentStage > index}
              duration={stage.duration}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-zinc-600">
            Análise local —{' '}
            <span className="text-zinc-500">sem envio de dados externos</span>
          </p>
        </div>
      </div>
    </div>
  );
}
