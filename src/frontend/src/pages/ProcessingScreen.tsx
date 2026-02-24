import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import ProcessingStage from '../components/ProcessingStage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { analyzeChartImage, AnalysisApiError } from '../services/analysisApi';
import { mapApiResponseToAnalysisResult } from '../utils/mapApiResponse';
import { useAnalyzeChart } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { validateApiKey } from '../config/apiConfig';

const stages = [
  { id: 1, label: 'Carregando imagem', duration: 800 },
  { id: 2, label: 'Processando dados', duration: 1200 },
  { id: 3, label: 'Detectando padrões', duration: 1500 },
  { id: 4, label: 'Gerando resultado', duration: 800 },
];

export default function ProcessingScreen() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [currentStage, setCurrentStage] = useState(0);
  const [imageBlob, setImageBlob] = useState<ExternalBlob | null>(null);
  const [imageFile, setImageFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const analyzeChart = useAnalyzeChart();

  useEffect(() => {
    // Load image from session storage
    const imageData = sessionStorage.getItem('chartImage');
    const imageSource = sessionStorage.getItem('imageSource') || 'unknown';
    
    if (!imageData) {
      toast.error('Nenhuma imagem de gráfico encontrada');
      navigate({ to: '/' });
      return;
    }

    // Convert base64 to blob
    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        console.log(`Image loaded from ${imageSource}: ${(blob.size / 1024).toFixed(2)}KB, type: ${blob.type}`);
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
        navigate({ to: '/' });
      });
  }, [navigate]);

  useEffect(() => {
    if (!imageBlob || !imageFile || isProcessing || !actor) return;

    // Validate API key before starting analysis
    validateApiKeyAndStart();
  }, [imageBlob, imageFile, actor]);

  const validateApiKeyAndStart = async () => {
    if (!actor) return;

    try {
      console.log('[API Key] Validating API key configuration...');
      const validation = await validateApiKey(actor);
      
      if (!validation.isValid) {
        console.error('[API Key] Validation failed:', validation.errorMessage);
        setError(validation.errorMessage || 'CHAVE DE API NÃO CONFIGURADA');
        setApiKeyError(true);
        return;
      }

      console.log('[API Key] Validation successful');
      // Start processing animation and API call
      startAnalysis();
    } catch (err) {
      console.error('[API Key] Validation error:', err);
      setError('Erro ao validar chave da API');
      setApiKeyError(true);
    }
  };

  const startAnalysis = async () => {
    if (!imageBlob || !imageFile || isProcessing || !actor) return;

    setIsProcessing(true);
    setError(null);
    setApiKeyError(false);

    // Start stage animation
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      if (stageIndex < stages.length) {
        setCurrentStage(stageIndex);
        stageIndex++;
      }
    }, 1000);

    try {
      // Get API key from backend
      const apiKey = await actor.getGeminiApiKey();
      console.log('[Analysis] API key retrieved from backend');

      // Call external API for analysis
      console.log('[Analysis] Starting chart analysis...');
      const apiResponse = await analyzeChartImage(imageFile, apiKey, (progress) => {
        console.log(`[Analysis] Upload progress: ${progress}%`);
      });

      console.log('[Analysis] Analysis complete:', apiResponse);

      // Clear stage animation
      clearInterval(stageInterval);
      setCurrentStage(stages.length);

      // Map API response to internal format
      const analysisResult = mapApiResponseToAnalysisResult(apiResponse, imageBlob);

      // Store analysis in backend
      await analyzeChart.mutateAsync(analysisResult);

      // Store analysis in session storage for Results page
      sessionStorage.setItem('latestAnalysis', JSON.stringify(analysisResult));

      // Generate a simple ID for the route (timestamp)
      const analysisId = Date.now().toString();

      // Navigate to results with the analysis ID
      navigate({
        to: '/results/$id',
        params: { id: analysisId },
      });
    } catch (err) {
      clearInterval(stageInterval);
      console.error('[Analysis] Analysis error:', err);

      let errorMessage = 'Erro ao analisar o gráfico';
      let isApiKeyIssue = false;
      
      if (err instanceof AnalysisApiError) {
        switch (err.code) {
          case 'API_KEY_MISSING':
            errorMessage = 'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações';
            isApiKeyIssue = true;
            break;
          case 'API_AUTH_ERROR':
            errorMessage = 'Erro de autenticação da API. Verifique sua chave de API nas configurações';
            isApiKeyIssue = true;
            break;
          case 'INVALID_API_KEY':
            errorMessage = 'Chave de API inválida. Configure uma chave válida nas configurações';
            isApiKeyIssue = true;
            break;
          case 'HEIC_NOT_SUPPORTED':
            errorMessage = 'Arquivos HEIC não são suportados. Por favor, use a câmera ou converta para JPEG';
            break;
          case 'RATE_LIMIT':
            errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde';
            break;
          case 'TIMEOUT':
            errorMessage = 'Tempo esgotado. Tente novamente';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Erro de conexão. Verifique sua internet';
            break;
          default:
            errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setApiKeyError(isApiKeyIssue);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setApiKeyError(false);
    setCurrentStage(0);
    if (apiKeyError) {
      // Re-validate API key before retrying
      validateApiKeyAndStart();
    } else {
      startAnalysis();
    }
  };

  const handleBack = () => {
    navigate({ to: '/analyze' });
  };

  const handleGoToSettings = () => {
    navigate({ to: '/settings' });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {error ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {apiKeyError ? 'Configuração Necessária' : 'Erro na Análise'}
              </h2>
              <p className="text-muted-foreground whitespace-pre-line">{error}</p>
            </div>
            <div className="flex flex-col gap-3">
              {apiKeyError ? (
                <>
                  <Button
                    className="w-full gap-2"
                    onClick={handleGoToSettings}
                  >
                    <Settings className="w-4 h-4" />
                    Ir para Configurações
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleBack}
                  >
                    Voltar
                  </Button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleBack}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Analisando Gráfico</h2>
              <p className="text-muted-foreground">
                Aguarde enquanto processamos sua análise
              </p>
            </div>

            <div className="space-y-4">
              {stages.map((stage, index) => (
                <ProcessingStage
                  key={stage.id}
                  label={stage.label}
                  isActive={currentStage === index}
                  isComplete={currentStage > index}
                />
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Isso pode levar alguns segundos...
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
