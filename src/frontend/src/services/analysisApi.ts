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
  API_KEY_MISSING: 'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações',
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
function validateApiKey(apiKey: string | null | undefined): void {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY_HERE') {
    throw new AnalysisApiError(ERROR_MESSAGES.API_KEY_MISSING, 'API_KEY_MISSING');
  }
}

/**
 * Detect if image is from Pocket Option broker
 * Analyzes image characteristics to identify Pocket Option interface
 */
async function detectPocketOption(file: File | Blob): Promise<{ isPocketOption: boolean; confidence: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ isPocketOption: false, confidence: 0 });
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Sample pixels from typical Pocket Option UI areas
      // Top area (balance display, typically dark background)
      const topSample = ctx.getImageData(img.width / 2, 20, 1, 1).data;
      
      // Bottom area (buttons, typically green/red)
      const bottomSample = ctx.getImageData(img.width / 2, img.height - 50, 1, 1).data;
      
      // Check for dark theme (common in Pocket Option)
      const isDarkTheme = topSample[0] < 50 && topSample[1] < 50 && topSample[2] < 50;
      
      // Check aspect ratio (mobile screenshots are typically portrait)
      const aspectRatio = img.height / img.width;
      const isMobileAspect = aspectRatio > 1.5 && aspectRatio < 2.5;
      
      // Calculate confidence based on characteristics
      let confidence = 0;
      if (isDarkTheme) confidence += 0.4;
      if (isMobileAspect) confidence += 0.3;
      
      // Check for typical Pocket Option color scheme
      const hasGreenRed = (bottomSample[1] > 150 && bottomSample[0] < 100) || 
                          (bottomSample[0] > 150 && bottomSample[1] < 100);
      if (hasGreenRed) confidence += 0.3;
      
      const isPocketOption = confidence >= 0.5;
      
      console.log(`[Pocket Option Detection] Dark theme: ${isDarkTheme}, Mobile aspect: ${isMobileAspect}, Confidence: ${(confidence * 100).toFixed(0)}%`);
      
      resolve({ isPocketOption, confidence });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ isPocketOption: false, confidence: 0 });
    };
    
    img.src = url;
  });
}

/**
 * Preprocess image: resize if needed and convert format
 * Enhanced for Pocket Option mobile screenshots
 * Gemini limits: 20MB inline request, max 4096x4096 pixels recommended
 */
async function preprocessImage(file: File | Blob): Promise<Blob> {
  console.log('[Preprocessing] Starting image preprocessing...');
  console.log(`[Preprocessing] Original size: ${(file.size / 1024).toFixed(2)}KB, type: ${file.type}`);
  
  // Check for HEIC format
  const fileName = (file as File).name || '';
  const fileType = file.type || '';
  
  if (fileType === 'image/heic' || fileType === 'image/heif' || 
      fileName.toLowerCase().endsWith('.heic') || fileName.toLowerCase().endsWith('.heif')) {
    throw new AnalysisApiError(ERROR_MESSAGES.HEIC_NOT_SUPPORTED, 'HEIC_NOT_SUPPORTED');
  }

  // Detect Pocket Option interface
  const pocketOptionDetection = await detectPocketOption(file);
  console.log(`[Preprocessing] Pocket Option detected: ${pocketOptionDetection.isPocketOption} (confidence: ${(pocketOptionDetection.confidence * 100).toFixed(0)}%)`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      console.log(`[Preprocessing] Image dimensions: ${img.width}x${img.height}`);
      console.log(`[Preprocessing] Aspect ratio: ${(img.height / img.width).toFixed(2)}`);
      
      // Check if resizing is needed (max 4096x4096)
      const maxDimension = 4096;
      let width = img.width;
      let height = img.height;
      
      if (width <= maxDimension && height <= maxDimension && file.size <= 10 * 1024 * 1024) {
        // Image is within limits, return as-is
        console.log('[Preprocessing] Image within limits, no resize needed');
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
        console.log(`[Preprocessing] Resizing to: ${width}x${height}`);
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
      
      // Draw image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Apply preprocessing for Pocket Option if detected
      if (pocketOptionDetection.isPocketOption) {
        console.log('[Preprocessing] Applying Pocket Option specific preprocessing...');
        
        // Enhance contrast for better candlestick detection
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Simple contrast enhancement
        const factor = 1.2;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * factor);     // R
          data[i + 1] = Math.min(255, data[i + 1] * factor); // G
          data[i + 2] = Math.min(255, data[i + 2] * factor); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        console.log('[Preprocessing] Contrast enhancement applied');
      }
      
      // Convert to JPEG blob with 0.9 quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`[Preprocessing] Complete: ${img.width}x${img.height} -> ${width}x${height}, ${(file.size / 1024).toFixed(2)}KB -> ${(blob.size / 1024).toFixed(2)}KB`);
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
 * Enhanced for Pocket Option mobile screenshots
 */
function getTechnicalAnalysisPrompt(): string {
  return `Você é um especialista em análise técnica de gráficos de trading. Analise esta imagem de gráfico seguindo EXATAMENTE estas 6 etapas objetivas:

IMPORTANTE: Esta imagem pode ser uma captura de tela de celular da corretora Pocket Option. Ignore TODOS os elementos da interface da corretora (saldo, botões, menus, timer, etc.) e foque APENAS no gráfico de candles.

1) PREPROCESSAMENTO DA IMAGEM:
   - Identifique os candles individuais no gráfico
   - Detecte corpo, pavio superior e inferior de cada candle
   - IGNORE completamente: saldo da conta, botões COMPRAR/VENDER, timer, menus, barras de navegação
   - Foque APENAS na área do gráfico com os candles

2) LEITURA DOS CANDLES:
   - Extraia: direção (alta/baixa), tamanho do corpo, tamanho dos pavios, sequência de cores
   - Identifique candles verdes (alta) e vermelhos (baixa)

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
  
  const timestamp = new Date().toISOString();
  const device = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  
  console.log('=== API Request Details ===');
  console.log(`[${timestamp}] Timestamp:`, timestamp);
  console.log(`[${timestamp}] URL:`, redactedUrl);
  console.log(`[${timestamp}] Device:`, device);
  console.log(`[${timestamp}] Image MIME type:`, mimeType);
  console.log(`[${timestamp}] Image size:`, (imageSize / 1024).toFixed(2), 'KB');
  console.log(`[${timestamp}] Base64 data length:`, payload.contents?.[0]?.parts?.[1]?.inline_data?.data?.length || 0, 'chars');
  console.log(`[${timestamp}] User agent:`, navigator.userAgent);
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
 * @param apiKey - Gemini API key from backend
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to API analysis response
 */
export async function analyzeChartImage(
  imageFile: File | Blob,
  apiKey: string | null,
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
      
      const result = await sendAnalysisRequest(imageFile, apiKey, onProgress);
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
  apiKey: string | null,
  onProgress?: (percentage: number) => void
): Promise<ApiAnalysisResponse> {
  const config = getProviderConfig();
  const provider = getActiveProvider();
  
  // Validate API key for Gemini and OpenAI
  if (provider === AI_PROVIDERS.GEMINI) {
    validateApiKey(apiKey);
  } else if (provider === AI_PROVIDERS.OPENAI) {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    validateApiKey(openaiKey);
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    // Track upload progress if supported
    if (onProgress) {
      onProgress(0);
    }
    
    // Log image metadata
    const fileName = (imageFile as File).name || 'unknown';
    const fileSize = imageFile.size;
    const fileType = imageFile.type;
    console.log(`[Image Upload] File: ${fileName}, Size: ${(fileSize / 1024).toFixed(2)}KB, Type: ${fileType}`);
    
    // Preprocess image (resize, format conversion, Pocket Option detection)
    console.log('[Processing] Starting image preprocessing...');
    const processedImage = await preprocessImage(imageFile);
    console.log('[Processing] Image preprocessing complete');
    
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
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new AnalysisApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }
      
      const data = await response.json();
      return data as ApiAnalysisResponse;
    }
    
    // Send request for Gemini/OpenAI
    console.log('[API Request] Sending request to', provider);
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('[API Response] Status:', response.status, response.statusText);
    
    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Error] Response:', errorText);
      
      if (response.status === 403) {
        throw new AnalysisApiError(
          'Erro de autenticação da API (403). Verifique sua chave de API nas configurações',
          'API_AUTH_ERROR'
        );
      } else if (response.status === 401) {
        throw new AnalysisApiError(
          'Chave de API inválida (401). Configure uma chave válida nas configurações',
          'INVALID_API_KEY'
        );
      } else if (response.status === 429) {
        throw new AnalysisApiError(
          'Limite de requisições excedido (429). Tente novamente mais tarde',
          'RATE_LIMIT'
        );
      }
      
      throw new AnalysisApiError(
        `Erro HTTP ${response.status}: ${response.statusText}`,
        'API_ERROR'
      );
    }
    
    const data = await response.json();
    console.log('[API Response] Data received:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Parse response based on provider
    if (provider === AI_PROVIDERS.GEMINI) {
      // Extract text from Gemini response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new AnalysisApiError(ERROR_MESSAGES.INVALID_RESPONSE, 'INVALID_RESPONSE');
      }
      
      // Parse JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AnalysisApiError(ERROR_MESSAGES.INVALID_RESPONSE, 'INVALID_RESPONSE');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      console.log('[API Response] Parsed analysis:', analysisData);
      return analysisData as ApiAnalysisResponse;
      
    } else if (provider === AI_PROVIDERS.OPENAI) {
      // Extract text from OpenAI response
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new AnalysisApiError(ERROR_MESSAGES.INVALID_RESPONSE, 'INVALID_RESPONSE');
      }
      
      // Parse JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AnalysisApiError(ERROR_MESSAGES.INVALID_RESPONSE, 'INVALID_RESPONSE');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      return analysisData as ApiAnalysisResponse;
    }
    
    return data as ApiAnalysisResponse;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof AnalysisApiError) {
      throw error;
    }
    
    if ((error as Error).name === 'AbortError') {
      throw new AnalysisApiError(ERROR_MESSAGES.TIMEOUT, 'TIMEOUT');
    }
    
    throw new AnalysisApiError(ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR');
  }
}
