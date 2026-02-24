/**
 * Analysis API Service
 *
 * Sends chart images to the Gemini Vision API for basic technical analysis.
 * Accepts full mobile phone screenshots and automatically identifies the chart area.
 *
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
 * Request format: JSON body with contents[0].parts containing text prompt + inlineData image
 * Method: POST
 * Content-Type: application/json (NOT multipart/form-data or FormData)
 */

import type { ApiAnalysisResponse } from '../types/apiTypes';
import { getGeminiConfig } from '../config/apiConfig';

export type { ApiAnalysisResponse };

/**
 * Custom error class for analysis API errors, preserving backward compatibility.
 */
export class AnalysisApiError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AnalysisApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates that the image is not HEIC/HEIF format (unsupported).
 * Returns the detected MIME type for supported formats.
 */
function detectMimeType(file: File | Blob): { mimeType: string; isSupported: boolean; reason?: string } {
  const name = ((file as File).name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  ) {
    return {
      mimeType: '',
      isSupported: false,
      reason: 'Formato HEIC/HEIF não é suportado. Por favor, converta para JPG ou PNG.',
    };
  }

  if (type === 'image/png') return { mimeType: 'image/png', isSupported: true };
  if (type === 'image/webp') return { mimeType: 'image/webp', isSupported: true };
  // Default to jpeg for jpg/jpeg and unknown types
  return { mimeType: 'image/jpeg', isSupported: true };
}

/**
 * Preprocesses the image:
 * - Rejects HEIC/HEIF formats
 * - Resizes images larger than 4MB to reduce payload size
 * - Accepts full mobile screenshots without any aspect ratio or content validation
 * - Returns base64-encoded image data and MIME type
 */
async function preprocessImage(
  file: File | Blob
): Promise<{ base64: string; mimeType: string }> {
  const { mimeType, isSupported, reason } = detectMimeType(file);

  if (!isSupported) {
    throw new AnalysisApiError(
      reason || 'Formato de imagem não suportado.',
      'HEIC_NOT_SUPPORTED'
    );
  }

  const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

  if (file.size <= MAX_SIZE_BYTES) {
    // File is small enough — convert directly to base64
    const base64 = await fileToBase64(file);
    return { base64, mimeType };
  }

  // File is too large — resize it
  const resized = await resizeImage(file, MAX_SIZE_BYTES);
  return { base64: resized.base64, mimeType: resized.mimeType };
}

/**
 * Converts a File/Blob to a base64 string (without the data URL prefix).
 * Reads the file as a Data URL, then strips the "data:<mimeType>;base64," prefix
 * to extract the raw base64 string for use in inlineData.data.
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:image/xxx;base64," prefix — keep only the raw base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image to fit within the target byte size using canvas.
 * Preserves aspect ratio and reduces quality iteratively.
 */
async function resizeImage(
  file: File | Blob,
  targetBytes: number
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if very large
      const MAX_DIMENSION = 1920;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto de canvas.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try reducing quality until under target size
      let quality = 0.85;
      const outputMime = 'image/jpeg';

      const tryCompress = () => {
        const dataUrl = canvas.toDataURL(outputMime, quality);
        const base64 = dataUrl.split(',')[1];
        const byteSize = Math.ceil((base64.length * 3) / 4);

        if (byteSize <= targetBytes || quality <= 0.3) {
          resolve({ base64, mimeType: outputMime });
        } else {
          quality -= 0.1;
          tryCompress();
        }
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem para redimensionamento.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Builds the Gemini Vision API prompt for basic chart analysis.
 * Instructs the model to:
 * 1. Find and isolate the candlestick chart area within the image (ignoring status bars, notifications, broker UI)
 * 2. Identify support and resistance levels
 * 3. Analyze only the last/most recent candle for patterns
 * 4. Determine trend direction
 */
function buildAnalysisPrompt(): string {
  return `Você é um analista técnico especializado em gráficos de velas (candlestick).

A imagem enviada pode ser um print de tela inteira de celular, contendo barras de status, notificações, interface do broker e outros elementos. IGNORE todos esses elementos e foque APENAS na área do gráfico de velas (candlestick chart).

Analise o gráfico de velas identificado e retorne:

1. **Suporte e Resistência**: Identifique os níveis de suporte e resistência mais relevantes visíveis no gráfico. Se não for possível identificar valores numéricos exatos, descreva-os na explicação.

2. **Padrão da Última Vela**: Analise SOMENTE a última vela (a mais recente, à direita do gráfico) e identifique se ela forma algum dos seguintes padrões:
   - Engolfo de Alta (Bullish Engulfing)
   - Engolfo de Baixa (Bearish Engulfing)
   - Martelo (Hammer)
   - Estrela Cadente (Shooting Star)
   - Doji
   - Pin Bar de Alta
   - Pin Bar de Baixa
   - Marubozu de Alta
   - Marubozu de Baixa
   - Nenhum padrão claro

3. **Tendência**: Determine a tendência geral do gráfico (ALTA, BAIXA ou LATERAL).

4. **Sinal**: Com base na análise, determine o sinal de trading (COMPRA, VENDA, NEUTRO ou SEM ENTRADA).

5. **Confiança**: Estime a confiança da análise de 0 a 100.

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "sinal": "COMPRA" | "VENDA" | "NEUTRO" | "SEM ENTRADA",
  "tendencia": "ALTA" | "BAIXA" | "LATERAL",
  "confianca": <número de 0 a 100>,
  "padroes": ["<padrão da última vela em português>"],
  "explicacao": "<breve explicação em português da análise>"
}`;
}

/**
 * Core function that sends the image to the Gemini Vision API.
 *
 * Uses the correct v1beta endpoint:
 *   https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=<apiKey>
 *
 * Request format:
 * - Method: POST
 * - Content-Type: application/json (NOT FormData or multipart)
 * - Body: JSON with contents[0].parts array containing:
 *     [0] text part: { text: <prompt> }
 *     [1] inlineData part: { inlineData: { mimeType: <mimeType>, data: <base64Data> } }
 *
 * The base64 image data is extracted from the File/Blob via FileReader.readAsDataURL(),
 * stripping the "data:<mimeType>;base64," prefix to get the raw base64 string.
 */
async function sendToGemini(
  file: File | Blob,
  apiKey: string
): Promise<ApiAnalysisResponse> {
  // Step 1: Preprocess image (validate format, resize if needed, extract base64)
  const imageData = await preprocessImage(file);

  // Step 2: Build the URL and headers using the hardcoded endpoint
  const { url, headers } = getGeminiConfig(apiKey.trim());
  const prompt = buildAnalysisPrompt();

  // Step 3: Build the Gemini Vision API request body
  // Uses JSON body format — NOT FormData or multipart/form-data
  // contents[0].parts[0] = text prompt
  // contents[0].parts[1] = inlineData with base64-encoded image
  const requestBody = {
    contents: [
      {
        parts: [
          {
            // Text part: the analysis prompt
            text: prompt,
          },
          {
            // Image part: base64-encoded image data with MIME type
            inlineData: {
              mimeType: imageData.mimeType, // e.g. 'image/jpeg', 'image/png', 'image/webp'
              data: imageData.base64,       // raw base64 string (no data URL prefix)
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
    },
  };

  console.log('[Gemini] Sending request to:', url.replace(/key=.*/, 'key=***'));
  console.log('[Gemini] Image MIME type:', imageData.mimeType);
  console.log('[Gemini] Base64 length:', imageData.base64.length, 'chars');

  // Step 4: Send the POST request with JSON body
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr) {
    throw new AnalysisApiError(
      'Erro de rede ao conectar com a API Gemini. Verifique sua conexão.',
      'NETWORK_ERROR'
    );
  }

  // Step 5: Handle HTTP errors
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = await response.json();
      errorDetail = errorBody?.error?.message || JSON.stringify(errorBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    console.error('[Gemini] HTTP error:', response.status, errorDetail);

    if (response.status === 400) {
      throw new AnalysisApiError(`Requisição inválida (400): ${errorDetail}`, 'API_ERROR', 400);
    } else if (response.status === 401 || response.status === 403) {
      throw new AnalysisApiError(
        'Chave da API inválida ou sem permissão. Verifique sua chave no Google AI Studio.',
        'API_AUTH_ERROR',
        response.status
      );
    } else if (response.status === 404) {
      // 404: endpoint not found — URL, model name, or method suffix is wrong
      throw new AnalysisApiError(
        'Endpoint da API não encontrado (404). Verifique se a URL e o modelo estão configurados corretamente nas Configurações.',
        'ENDPOINT_NOT_FOUND',
        404
      );
    } else if (response.status === 429) {
      throw new AnalysisApiError(
        'Limite de requisições atingido (429). Aguarde um momento e tente novamente.',
        'RATE_LIMIT',
        429
      );
    } else {
      throw new AnalysisApiError(
        `Erro da API Gemini (${response.status}): ${errorDetail}`,
        'API_ERROR',
        response.status
      );
    }
  }

  // Step 6: Parse the JSON response
  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    throw new AnalysisApiError(
      'Resposta inválida da API Gemini (não é JSON válido).',
      'INVALID_RESPONSE'
    );
  }

  // Step 7: Extract the text content from the Gemini response
  const geminiResponse = responseData as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      finishReason?: string;
    }>;
    error?: { message: string };
  };

  if (geminiResponse.error) {
    throw new AnalysisApiError(
      `Erro da API Gemini: ${geminiResponse.error.message}`,
      'API_ERROR'
    );
  }

  const textContent = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    const finishReason = geminiResponse.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new AnalysisApiError(
        'A imagem foi bloqueada por filtros de segurança da API. Tente com outra imagem.',
        'SAFETY_BLOCK'
      );
    }
    throw new AnalysisApiError('Resposta vazia da API Gemini. Tente novamente.', 'INVALID_RESPONSE');
  }

  // Step 8: Parse the JSON response from the model
  let parsed: ApiAnalysisResponse;
  try {
    // Remove possible markdown code fences
    const cleaned = textContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the text
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new AnalysisApiError(
          `Não foi possível interpretar a resposta da IA. Resposta: ${textContent.substring(0, 200)}`,
          'INVALID_RESPONSE'
        );
      }
    } else {
      throw new AnalysisApiError(
        `Resposta da IA não está no formato esperado. Resposta: ${textContent.substring(0, 200)}`,
        'INVALID_RESPONSE'
      );
    }
  }

  // Step 9: Validate and normalize the parsed response
  const validSignals = ['COMPRA', 'VENDA', 'NEUTRO', 'SEM ENTRADA'];
  const validTrends = ['ALTA', 'BAIXA', 'LATERAL'];

  if (!validSignals.includes(parsed.sinal)) {
    parsed.sinal = 'NEUTRO';
  }
  if (!validTrends.includes(parsed.tendencia)) {
    parsed.tendencia = 'LATERAL';
  }
  if (typeof parsed.confianca !== 'number' || parsed.confianca < 0 || parsed.confianca > 100) {
    parsed.confianca = 50;
  }
  if (!Array.isArray(parsed.padroes)) {
    parsed.padroes = [];
  }
  if (!parsed.explicacao || typeof parsed.explicacao !== 'string') {
    parsed.explicacao = 'Análise concluída.';
  }

  return parsed;
}

/**
 * Public API: analyzeChartImage
 * Validates the API key and sends the image to Gemini for analysis.
 * Accepts full mobile screenshots — the AI will isolate the chart area automatically.
 *
 * @param imageFile - Image file or blob to analyze
 * @param apiKey - Gemini API key from backend
 * @param onProgress - Optional progress callback (kept for backward compatibility)
 */
export async function analyzeChartImage(
  imageFile: File | Blob,
  apiKey: string | null,
  onProgress?: (percentage: number) => void
): Promise<ApiAnalysisResponse> {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY_HERE') {
    throw new AnalysisApiError(
      'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações',
      'API_KEY_MISSING'
    );
  }

  if (onProgress) onProgress(10);

  try {
    const result = await sendToGemini(imageFile, apiKey);
    if (onProgress) onProgress(100);
    return result;
  } catch (err) {
    // Re-throw AnalysisApiError as-is
    if (err instanceof AnalysisApiError) throw err;
    // Wrap unknown errors
    const message = err instanceof Error ? err.message : 'Erro desconhecido na análise';
    throw new AnalysisApiError(message, 'UNKNOWN');
  }
}

/**
 * Alias for analyzeChartImage — kept for any direct usage of the new name.
 */
export const analyzeWithGemini = analyzeChartImage;
