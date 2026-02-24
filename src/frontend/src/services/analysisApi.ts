import { ApiAnalysisResponse, ApiError } from '../types/apiTypes';
import { getProviderConfig, getActiveProvider, AI_PROVIDERS, API_TIMEOUT, MAX_RETRIES, RETRY_DELAY } from '../config/apiConfig';

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Error messages in Portuguese
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro ao conectar com o servidor',
  TIMEOUT: 'Tempo esgotado',
  ANALYSIS_ERROR: 'Erro na análise',
  INVALID_RESPONSE: 'Resposta inválida do servidor',
  UNKNOWN: 'Erro desconhecido',
  API_KEY_MISSING: 'Chave de API não configurada. Configure a chave no arquivo .env',
  API_AUTH_ERROR: 'Erro de autenticação da API. Verifique sua chave de API',
  HEIC_NOT_SUPPORTED: 'Arquivos HEIC não são suportados. Por favor, use a câmera ou converta para JPEG',
};

export class AnalysisApiError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AnalysisApiError';
    this.code = code;
  }
}

/**
 * Validate API key configuration
 */
function validateApiKey(apiKey: string | undefined): void {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY_HERE') {
    throw new AnalysisApiError(ERROR_MESSAGES.API_KEY_MISSING, 'API_KEY_MISSING');
  }
}

/**
 * Preprocess image: resize if needed and convert format
 * Gemini limits: 20MB inline request, max 4096x4096 pixels recommended
 */
async function preprocessImage(file: File | Blob): Promise<Blob> {
  // Check for HEIC format
  const fileName = (file as File).name || '';
  const fileType = file.type || '';
  
  if (fileType === 'image/heic' || fileType === 'image/heif' || 
      fileName.toLowerCase().endsWith('.heic') || fileName.toLowerCase().endsWith('.heif')) {
    throw new AnalysisApiError(ERROR_MESSAGES.HEIC_NOT_SUPPORTED, 'HEIC_NOT_SUPPORTED');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Check if resizing is needed (max 4096x4096)
      const maxDimension = 4096;
      let width = img.width;
      let height = img.height;
      
      if (width <= maxDimension && height <= maxDimension && file.size <= 10 * 1024 * 1024) {
        // Image is within limits, return as-is
        resolve(file);
        return;
      }
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG blob with 0.9 quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`Image preprocessed: ${img.width}x${img.height} -> ${width}x${height}, ${(file.size / 1024).toFixed(2)}KB -> ${(blob.size / 1024).toFixed(2)}KB`);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Convert File/Blob to base64 string
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get the technical analysis prompt in Portuguese
 */
function getTechnicalAnalysisPrompt(): string {
  return `Você é um especialista em análise técnica de gráficos de trading. Analise esta imagem de gráfico seguindo EXATAMENTE estas 6 etapas objetivas:

1) PREPROCESSAMENTO DA IMAGEM:
   - Identifique os candles individuais
   - Detecte corpo, pavio superior e inferior de cada candle
   - Ignore elementos visuais da corretora

2) LEITURA DOS CANDLES:
   - Extraia: direção (alta/baixa), tamanho do corpo, tamanho dos pavios, sequência de cores

3) IDENTIFICAÇÃO DE TENDÊNCIA:
   - Topos e fundos ascendentes = ALTA
   - Topos e fundos descendentes = BAIXA
   - Lateral = LATERAL

4) DETECÇÃO DE PADRÕES DE PRICE ACTION:
   - Engolfo (bullish/bearish)
   - Martelo
   - Estrela cadente
   - Doji
   - Pullback
   - Rompimento
   - Suporte e resistência

5) SISTEMA DE PONTUAÇÃO:
   +2 pontos = tendência forte
   +1 ponto = padrão favorável
   -1 ponto = resistência contra
   -2 pontos = padrão contrário
   
   Resultado:
   >= 2 → COMPRA
   <= -2 → VENDA
   entre -1 e 1 → NEUTRO

6) RETORNO OBRIGATÓRIO:
   Retorne APENAS um JSON válido com esta estrutura EXATA:
   {
     "sinal": "COMPRA" ou "VENDA" ou "NEUTRO" ou "SEM ENTRADA",
     "tendencia": "ALTA" ou "BAIXA" ou "LATERAL",
     "confianca": número entre 0 e 100,
     "padroes": ["padrão1", "padrão2"],
     "explicacao": "explicação técnica breve",
     "pontuacao": número da pontuação (opcional)
   }

CRÍTICO: Se não houver clareza ou confirmação → retorne "SEM ENTRADA".
NÃO INVENTE sinais. Siga APENAS regras objetivas.

Retorne SOMENTE o JSON, sem texto adicional antes ou depois.`;
}

/**
 * Safely log request details without exposing API key
 */
function logRequestDetails(url: string, payload: any, imageSize: number, mimeType: string) {
  // Redact API key from URL
  const redactedUrl = url.replace(/key=[^&]+/, 'key=***REDACTED***');
  
  console.log('=== API Request Details ===');
  console.log('URL:', redactedUrl);
  console.log('Image MIME type:', mimeType);
  console.log('Image size:', (imageSize / 1024).toFixed(2), 'KB');
  console.log('Base64 data length:', payload.contents?.[0]?.parts?.[1]?.inline_data?.data?.length || 0, 'chars');
  console.log('Device:', /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
  console.log('===========================');
}

/**
 * Send chart image to external AI API for analysis
 * 
 * IMPORTANT: The external API must follow objective rule-based analysis without subjective interpretation.
 * It must implement the 6-step technical process documented in apiConfig.ts.
 * 
 * The API MUST return 'SEM ENTRADA' for unclear cases rather than fabricating signals.
 * 
 * Analysis methodology requirements:
 * - Objective rule-based approach only
 * - No subjective interpretation
 * - Clear scoring system (+2/-2 scale)
 * - Return 'SEM ENTRADA' when no clear signal is detected
 * 
 * @param imageFile - Image file or blob to analyze
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to API analysis response
 */
export async function analyzeChartImage(
  imageFile: File | Blob,
  onProgress?: (percentage: number) => void
): Promise<ApiAnalysisResponse> {
  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff
        await sleep(RETRY_DELAY * Math.pow(2, attempt - 1));
      }
      
      const result = await sendAnalysisRequest(imageFile, onProgress);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation errors or API key errors
      if (error instanceof AnalysisApiError && 
          (error.code === 'INVALID_RESPONSE' || 
           error.code === 'API_KEY_MISSING' || 
           error.code === 'HEIC_NOT_SUPPORTED')) {
        throw error;
      }
      
      // Continue to next retry attempt
      console.warn(`Analysis attempt ${attempt + 1} failed:`, error);
    }
  }
  
  // All retries exhausted
  throw lastError || new AnalysisApiError(ERROR_MESSAGES.UNKNOWN, 'UNKNOWN');
}

/**
 * Internal function to send the actual API request
 * Handles different provider formats (Gemini, OpenAI, custom)
 */
async function sendAnalysisRequest(
  imageFile: File | Blob,
  onProgress?: (percentage: number) => void
): Promise<ApiAnalysisResponse> {
  const config = getProviderConfig();
  const provider = getActiveProvider();
  
  // Validate API key for Gemini and OpenAI
  if (provider === AI_PROVIDERS.GEMINI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    validateApiKey(apiKey);
  } else if (provider === AI_PROVIDERS.OPENAI) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    validateApiKey(apiKey);
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    // Track upload progress if supported
    if (onProgress) {
      onProgress(0);
    }
    
    // Preprocess image (resize, format conversion)
    console.log('Preprocessing image...');
    const processedImage = await preprocessImage(imageFile);
    console.log('Image preprocessing complete');
    
    let requestBody: any;
    let requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let requestUrl = config.endpoint;
    
    // Format request based on provider
    if (provider === AI_PROVIDERS.GEMINI) {
      // Google Gemini Vision format
      const base64Image = await fileToBase64(processedImage);
      const mimeType = processedImage.type || 'image/jpeg';
      
      // CRITICAL: Gemini API requires API key in URL query parameter, not in headers
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      requestUrl = `${config.endpoint}?key=${apiKey}`;
      
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: getTechnicalAnalysisPrompt(),
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      };
      
      // Log request details for debugging
      logRequestDetails(requestUrl, requestBody, processedImage.size, mimeType);
      
    } else if (provider === AI_PROVIDERS.OPENAI) {
      // OpenAI Vision format
      const base64Image = await fileToBase64(processedImage);
      const mimeType = processedImage.type || 'image/jpeg';
      
      requestHeaders['Authorization'] = `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`;
      
      requestBody = {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: getTechnicalAnalysisPrompt(),
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      };
    } else {
      // Custom/Python backend - use FormData
      const formData = new FormData();
      formData.append('imagem', processedImage, 'chart.jpg');
      
      // For FormData, don't set Content-Type (browser will set it with boundary)
      delete requestHeaders['Content-Type'];
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        headers: requestHeaders,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (onProgress) {
        onProgress(100);
      }
      
      return await handleResponse(response);
    }
    
    // For JSON-based providers (Gemini, OpenAI)
    if (onProgress) {
      onProgress(50);
    }
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: requestHeaders,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (onProgress) {
      onProgress(100);
    }
    
    return await handleResponse(response, provider);
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AnalysisApiError(ERROR_MESSAGES.TIMEOUT, 'TIMEOUT');
    }
    
    // Handle network errors
    if (error instanceof TypeError) {
      throw new AnalysisApiError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR');
    }
    
    // Re-throw AnalysisApiError
    if (error instanceof AnalysisApiError) {
      throw error;
    }
    
    // Unknown error
    throw new AnalysisApiError(
      ERROR_MESSAGES.UNKNOWN,
      'UNKNOWN'
    );
  }
}

/**
 * Handle API response and extract analysis data
 */
async function handleResponse(
  response: Response,
  provider?: string
): Promise<ApiAnalysisResponse> {
  // Handle non-200 responses
  if (!response.ok) {
    let errorText = '';
    let errorDetails = '';
    
    try {
      const errorData = await response.json();
      errorText = errorData.error?.message || JSON.stringify(errorData);
      errorDetails = JSON.stringify(errorData, null, 2);
    } catch {
      errorText = await response.text().catch(() => 'Unknown error');
    }
    
    // Log detailed error information
    console.error('=== API Error Response ===');
    console.error('Status:', response.status, response.statusText);
    console.error('Error details:', errorDetails || errorText);
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    console.error('========================');
    
    // Provide specific error messages based on status code
    if (response.status === 403) {
      throw new AnalysisApiError(
        ERROR_MESSAGES.API_AUTH_ERROR,
        'API_AUTH_ERROR'
      );
    } else if (response.status === 401) {
      throw new AnalysisApiError(
        'Chave de API inválida',
        'INVALID_API_KEY'
      );
    } else if (response.status === 429) {
      throw new AnalysisApiError(
        'Limite de requisições excedido. Tente novamente mais tarde',
        'RATE_LIMIT'
      );
    }
    
    throw new AnalysisApiError(
      `${ERROR_MESSAGES.ANALYSIS_ERROR}: ${response.status}`,
      'HTTP_ERROR'
    );
  }
  
  // Parse JSON response
  const data = await response.json();
  
  // Extract analysis from provider-specific format
  let analysisData: any;
  
  if (provider === AI_PROVIDERS.GEMINI) {
    // Gemini response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const textResponse = data.candidates[0].content.parts[0].text;
      // Extract JSON from text (may have markdown code blocks)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new AnalysisApiError(
          ERROR_MESSAGES.INVALID_RESPONSE,
          'INVALID_RESPONSE'
        );
      }
    } else {
      throw new AnalysisApiError(
        ERROR_MESSAGES.INVALID_RESPONSE,
        'INVALID_RESPONSE'
      );
    }
  } else if (provider === AI_PROVIDERS.OPENAI) {
    // OpenAI response format: { choices: [{ message: { content: "..." } }] }
    if (data.choices && data.choices[0]?.message?.content) {
      const textResponse = data.choices[0].message.content;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new AnalysisApiError(
          ERROR_MESSAGES.INVALID_RESPONSE,
          'INVALID_RESPONSE'
        );
      }
    } else {
      throw new AnalysisApiError(
        ERROR_MESSAGES.INVALID_RESPONSE,
        'INVALID_RESPONSE'
      );
    }
  } else {
    // Custom/Python backend - direct JSON response
    analysisData = data;
  }
  
  // Validate response structure
  if (!isValidApiResponse(analysisData)) {
    throw new AnalysisApiError(
      ERROR_MESSAGES.INVALID_RESPONSE,
      'INVALID_RESPONSE'
    );
  }
  
  return analysisData as ApiAnalysisResponse;
}

/**
 * Validate API response structure
 * Updated to accept all four signal types: COMPRA, VENDA, NEUTRO, SEM ENTRADA
 */
function isValidApiResponse(data: any): data is ApiAnalysisResponse {
  return (
    data &&
    typeof data === 'object' &&
    (data.sinal === 'COMPRA' || data.sinal === 'VENDA' || data.sinal === 'NEUTRO' || data.sinal === 'SEM ENTRADA') &&
    typeof data.tendencia === 'string' &&
    typeof data.confianca === 'number' &&
    Array.isArray(data.padroes) &&
    typeof data.explicacao === 'string'
  );
}
