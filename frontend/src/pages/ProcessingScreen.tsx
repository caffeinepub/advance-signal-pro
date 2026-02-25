import { useEffect, useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, ImageOff } from 'lucide-react';
import ProcessingStage from '../components/ProcessingStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { analyzeChartImage } from '../services/localCandleAnalysis';
import { mapApiResponseToAnalysisResult } from '../utils/mapApiResponse';
import { useAnalyzeChart } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';

const stages = [
  { id: 1, label: 'Carregando imagem', duration: 700 },
  { id: 2, label: 'Processando dados', duration: 900 },
  { id: 3, label: 'Detectando padrões de candle', duration: 1200 },
  { id: 4, label: 'Gerando resultado', duration: 600 },
];

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [currentStage, setCurrentStage] = useState(0);
  const [imageBlob, setImageBlob] = useState<ExternalBlob | null>(null);
  const [imageFile, setImageFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChartDetectionError, setIsChartDetectionError] = useState(false);
  const analyzeChart = useAnalyzeChart();
  const hasStarted = useRef(false);

  // Load image from sessionStorage
  useEffect(() => {
    const imageData = sessionStorage.getItem('chartImage');

    if (!imageData) {
      toast.error('Nenhuma imagem de gráfico encontrada');
      navigate({ to: '/' });
      return;
    }

    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        setImageFile(blob);
        return blob.arrayBuffer();
      })
      .then((buffer) => {
        const uint8Array = new Uint8Array(buffer);
        const externalBlob = ExternalBlob.fromBytes(uint8Array);
        setImageBlob(externalBlob);
      })
      .catch(() => {
        toast.error('Erro ao carregar imagem');
        navigate({ to: '/' });
      });
  }, [navigate]);

  // Start analysis once image is ready
  useEffect(() => {
    if (!imageBlob || !imageFile || isProcessing || hasStarted.current) return;
    hasStarted.current = true;
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBlob, imageFile]);

  const startAnalysis = async () => {
    if (!imageBlob || !imageFile) return;
    setIsProcessing(true);
    setError(null);
    setIsChartDetectionError(false);

    try {
      // Animate through stages sequentially
      for (let i = 0; i < stages.length; i++) {
        setCurrentStage(i);
        await delay(stages[i].duration);
      }

      // Run local candle analysis (no HTTP requests)
      const localResult = await analyzeChartImage(imageFile);

      // Map to internal format
      const mappedResult = mapApiResponseToAnalysisResult(localResult, imageBlob);

      // Store result in sessionStorage for Results page
      sessionStorage.setItem('latestAnalysis', JSON.stringify(mappedResult));

      // If chart detection error, show error screen
      if (mappedResult.isChartDetectionError) {
        setIsChartDetectionError(true);
        setIsProcessing(false);
        return;
      }

      // Store in backend if actor is available
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

      // Navigate to results using the parameterized route
      navigate({ to: '/results/$id', params: { id: 'latest' } });
    } catch {
      setError('Erro ao processar análise. Tente novamente.');
      setIsProcessing(false);
    }
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Chart detection error screen
  if (isChartDetectionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Gráfico Não Identificado</h2>
            <p className="text-muted-foreground">
              Não foi possível identificar o gráfico corretamente
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-800 dark:text-orange-200">
            Certifique-se de que o print contém um gráfico de candles visível com velas coloridas (verde/vermelho).
          </div>
          <Button
            className="w-full gap-2"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Erro na Análise</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          <Button
            className="w-full gap-2"
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Analisando Gráfico</h1>
          <p className="text-sm text-muted-foreground">
            Detectando padrões de candle localmente...
          </p>
        </div>

        {/* Processing stages */}
        <Card className="p-6 space-y-4">
          {stages.map((stage, index) => (
            <ProcessingStage
              key={stage.id}
              label={stage.label}
              isActive={currentStage === index && isProcessing}
              isComplete={currentStage > index}
            />
          ))}
        </Card>

        {/* Progress indicator */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Análise local — sem envio de dados externos
          </p>
        </div>
      </div>
    </div>
  );
}
