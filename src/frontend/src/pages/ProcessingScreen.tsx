import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import ProcessingStage from '../components/ProcessingStage';
import { useAnalyzeChart } from '../hooks/useQueries';
import { ExternalBlob, AnalysisDirection, CandlestickPattern, Timeframe } from '../backend';
import { toast } from 'sonner';

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
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => {
        const uint8Array = new Uint8Array(buffer);
        const externalBlob = ExternalBlob.fromBytes(uint8Array);
        setImageBlob(externalBlob);
      });
  }, [navigate]);

  useEffect(() => {
    if (currentStage >= stages.length) {
      // Processing complete, perform analysis
      if (imageBlob) {
        performAnalysis();
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStage((prev) => prev + 1);
    }, stages[currentStage].duration);

    return () => clearTimeout(timer);
  }, [currentStage, imageBlob]);

  const performAnalysis = async () => {
    if (!imageBlob) return;

    try {
      // Simulate AI analysis with realistic results - only M1, M5, M10
      const timeframes = [Timeframe.M1, Timeframe.M5, Timeframe.M10];
      const randomTimeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      
      const mockResult = {
        direction: Math.random() > 0.5 ? AnalysisDirection.bullish : AnalysisDirection.bearish,
        resistanceLevels: [
          { price: 45000 + Math.random() * 5000, strength: BigInt(Math.floor(Math.random() * 100)) },
          { price: 42000 + Math.random() * 3000, strength: BigInt(Math.floor(Math.random() * 100)) },
        ],
        candlestickPatterns: [
          Math.random() > 0.5 ? CandlestickPattern.engulfing : CandlestickPattern.hammer,
        ],
        pullbacks: Math.random() > 0.5,
        breakouts: Math.random() > 0.5,
        trendStrength: BigInt(Math.floor(Math.random() * 100)),
        confidencePercentage: BigInt(Math.floor(60 + Math.random() * 35)),
        timestamp: BigInt(Date.now() * 1000000),
        image: imageBlob,
        defaultTimeframe: randomTimeframe,
      };

      await analyzeChart.mutateAsync(mockResult);
      
      // Store result for display
      sessionStorage.setItem('latestAnalysis', JSON.stringify({
        ...mockResult,
        direction: mockResult.direction,
        resistanceLevels: mockResult.resistanceLevels.map(r => ({ ...r, strength: Number(r.strength) })),
        trendStrength: Number(mockResult.trendStrength),
        confidencePercentage: Number(mockResult.confidencePercentage),
        timestamp: Number(mockResult.timestamp),
        defaultTimeframe: mockResult.defaultTimeframe,
      }));

      navigate({ to: '/results/$id', params: { id: 'latest' } });
    } catch (error) {
      toast.error('Análise falhou. Por favor, tente novamente.');
      navigate({ to: '/analyze' });
    }
  };

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
