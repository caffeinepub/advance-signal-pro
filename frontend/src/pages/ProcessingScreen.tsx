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
  const [is404Error, setIs404Error] = useState(false);
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
        console.log(
          `[Image Load] Source: ${imageSource}, Size: ${(blob.size / 1024).toFixed(2)}KB, Type: ${blob.type}`
        );
        setImageFile(blob);
        return blob.arrayBuffer();
      })
      .then((buffer) => {
        const uint8Array = new Uint8Array(buffer);
        const externalBlob = ExternalBlob.fromBytes(uint8Array);
        setImageBlob(externalBlob);
      })
      .catch((err: unknown) => {
        console.error('[Image Load] Error loading image:', err);
        toast.error('Erro ao carregar imagem');
        navigate({ to: '/' });
      });
  }, [navigate]);

  useEffect(() => {
    if (!imageBlob || !imageFile || isProcessing || !actor) return;

    // Validate API key before starting analysis
    validateApiKeyAndStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBlob, imageFile, actor]);

  const validateApiKeyAndStart = async () => {
    if (!actor) return;

    try {
      console.log('[API Key] Validating API key configuration...');
      const validation = await validateApiKey(actor);

      if (!validation.isValid) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] API Key validation failed:`, validation.errorMessage);
        setError(validation.errorMessage || 'CHAVE DE API NÃO CONFIGURADA');
        setApiKeyError(true);
        setIs404Error(false);
        return;
      }

      console.log('[API Key] Validation successful, starting analysis...');
      startAnalysis();
    } catch (err: unknown) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] API Key validation error:`, err);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${timestamp}] Error message:`, message);
      setError('Erro ao validar chave da API');
      setApiKeyError(true);
      setIs404Error(false);
    }
  };

  const startAnalysis = async () => {
    if (!imageBlob || !imageFile || isProcessing || !actor) return;

    setIsProcessing(true);
    setError(null);
    setApiKeyError(false);
    setIs404Error(false);

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
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] API key retrieved from backend`);
      console.log(`[${timestamp}] API key present:`, !!apiKey);
      console.log(
        `[${timestamp}] API key format:`,
        apiKey ? `${apiKey.substring(0, 4)}...` : 'null'
      );

      // Call external API for analysis
      console.log(`[${timestamp}] Starting chart analysis...`);
      console.log(`[${timestamp}] Image details:`, {
        size: `${(imageFile.size / 1024).toFixed(2)}KB`,
        type: imageFile.type,
      });

      const apiResponse = await analyzeChartImage(imageFile, apiKey, (progress) => {
        console.log(`[${timestamp}] Upload progress: ${progress}%`);
      });

      console.log(`[${timestamp}] Analysis complete:`, apiResponse);

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
    } catch (err: unknown) {
      clearInterval(stageInterval);

      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ========== ANALYSIS ERROR ==========`);
      console.error(`[${timestamp}] Error object:`, err);
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${timestamp}] Error message:`, errMessage);

      if (err instanceof Error && err.stack) {
        console.error(`[${timestamp}] Stack trace:`, err.stack);
      }

      if (err instanceof AnalysisApiError) {
        console.error(`[${timestamp}] API Error code:`, err.code);
        console.error(`[${timestamp}] API Error status:`, err.statusCode);
      }

      console.error(`[${timestamp}] Current processing stage:`, currentStage);
      console.error(`[${timestamp}] Image file details:`, {
        size: imageFile ? `${(imageFile.size / 1024).toFixed(2)}KB` : 'null',
        type: imageFile?.type || 'null',
      });

      console.error(`[${timestamp}] ====================================`);

      let errorMessage = 'Erro ao analisar o gráfico';
      let isApiKeyIssue = false;
      let is404 = false;

      if (err instanceof AnalysisApiError) {
        switch (err.code) {
          case 'API_KEY_MISSING':
            errorMessage =
              'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações';
            isApiKeyIssue = true;
            break;
          case 'API_AUTH_ERROR':
            errorMessage =
              'Erro de autenticação da API. Verifique sua chave de API nas configurações';
            isApiKeyIssue = true;
            break;
          case 'INVALID_API_KEY':
            errorMessage =
              'Chave de API inválida. Configure uma chave válida nas configurações';
            isApiKeyIssue = true;
            break;
          case 'ENDPOINT_NOT_FOUND':
            // HTTP 404: endpoint not found — show actionable Portuguese message
            errorMessage =
              'Endpoint da API não encontrado (404). Verifique se a URL e o modelo estão configurados corretamente nas Configurações.';
            is404 = true;
            break;
          case 'INVALID_ENDPOINT':
            errorMessage = err.message;
            is404 = true;
            break;
          case 'HEIC_NOT_SUPPORTED':
            errorMessage =
              'Arquivos HEIC não são suportados. Por favor, use a câmera ou converta para JPEG';
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
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setApiKeyError(isApiKeyIssue);
      setIs404Error(is404);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setApiKeyError(false);
    setIs404Error(false);
    setCurrentStage(0);
    if (apiKeyError || is404Error) {
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
                {apiKeyError || is404Error ? 'Configuração Necessária' : 'Erro na Análise'}
              </h2>
              <p className="text-muted-foreground whitespace-pre-line">{error}</p>
              {is404Error && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-left text-sm">
                  <p className="font-semibold mb-2">Endpoint correto da API Gemini:</p>
                  <code className="block text-xs break-all bg-background border border-border rounded p-2 mt-1 text-foreground">
                    https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
                  </code>
                  <p className="mt-3 text-muted-foreground text-xs">
                    Se o erro persistir, verifique se sua chave de API está correta e ativa no Google AI Studio.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {apiKeyError || is404Error ? (
                <>
                  <Button className="w-full gap-2" onClick={handleGoToSettings}>
                    <Settings className="w-4 h-4" />
                    Ir para Configurações
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleBack}>
                    Voltar
                  </Button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleRetry}>
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
