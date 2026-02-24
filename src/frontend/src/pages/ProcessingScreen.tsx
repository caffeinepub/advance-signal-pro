import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ProcessingStage from '../components/ProcessingStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { analyzeChartImage, AnalysisApiError } from '../services/analysisApi';
import { mapApiResponseToAnalysisResult } from '../utils/mapApiResponse';
import { useAnalyzeChart } from '../hooks/useQueries';

const stages = [
  { id: 1, label: 'Carregando imagem', duration: 800 },
  { id: 2, label: 'Processando dados', duration: 1200 },
  { id: 3, label: 'Detectando padrões', duration: 1500 },
  { id: 4, label: 'Gerando resultado', duration: 800 },
];

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [imageBlob, setImageBlob] = useState<ExternalBlob | null>(null);
  const [imageFile, setImageFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const analyzeChart = useAnalyzeChart();

  useEffect(() => {
    // Load image from session storage
    const imageData = sessionStorage.getItem('chartImage');
    if (!imageData) {
      toast.error('Nenhuma imagem de gráfico encontrada');
      navigate({ to: '/analyze' });
      return;
    }

    // Convert base64 to blob
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
      .catch((err) => {
        console.error('Error loading image:', err);
        toast.error('Erro ao carregar imagem');
        navigate({ to: '/analyze' });
      });
  }, [navigate]);

  useEffect(() => {
    if (!imageBlob || !imageFile || isProcessing) return;

    // Start processing animation and API call
    startAnalysis();
  }, [imageBlob, imageFile]);

  const startAnalysis = async () => {
    if (!imageBlob || !imageFile || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStage(0);

    try {
      // Animate through stages while waiting for API
      const stageInterval = setInterval(() => {
        setCurrentStage((prev) => {
          if (prev < stages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);

      // Call external API
      const apiResponse = await analyzeChartImage(imageFile);

      // Clear stage animation
      clearInterval(stageInterval);
      setCurrentStage(stages.length);

      // Map API response to internal format
      const analysisResult = mapApiResponseToAnalysisResult(apiResponse, imageBlob);

      // Store in backend
      await analyzeChart.mutateAsync({
        direction: analysisResult.direction,
        resistanceLevels: analysisResult.resistanceLevels,
        candlestickPatterns: analysisResult.candlestickPatterns,
        pullbacks: analysisResult.pullbacks,
        breakouts: analysisResult.breakouts,
        trendStrength: analysisResult.trendStrength,
        confidencePercentage: analysisResult.confidencePercentage,
        timestamp: analysisResult.timestamp,
        image: imageBlob,
      });

      // Store result for display (including explanation from API)
      sessionStorage.setItem(
        'latestAnalysis',
        JSON.stringify({
          ...analysisResult,
          direction: analysisResult.direction,
          resistanceLevels: analysisResult.resistanceLevels.map((r: any) => ({
            ...r,
            strength: Number(r.strength),
          })),
          trendStrength: Number(analysisResult.trendStrength),
          confidencePercentage: Number(analysisResult.confidencePercentage),
          timestamp: Number(analysisResult.timestamp),
        })
      );

      // Navigate to results
      navigate({ to: '/results/$id', params: { id: 'latest' } });
    } catch (err) {
      console.error('Analysis error:', err);

      let errorMessage = 'Erro ao analisar gráfico';

      if (err instanceof AnalysisApiError) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsProcessing(false);
      toast.error(errorMessage);
    }
  };

  const handleRetry = () => {
    startAnalysis();
  };

  const handleGoBack = () => {
    navigate({ to: '/analyze' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Erro na Análise</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full" size="lg">
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Analisando Gráfico</h1>
          <p className="text-muted-foreground">
            A IA está processando os dados do seu gráfico...
          </p>
        </div>

        <div className="space-y-6">
          {stages.map((stage, index) => (
            <ProcessingStage
              key={stage.id}
              label={stage.label}
              isActive={index === currentStage}
              isComplete={index < currentStage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
