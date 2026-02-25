/**
 * Analysis API Service
 *
 * Sends chart images to the Gemini Vision API for basic next-candle prediction.
 *
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
 * Request format: JSON body with contents[0].parts containing text prompt + inlineData image
 * Method: POST
 * Content-Type: application/json
 */

import type { ApiAnalysisResponse } from '../types/apiTypes';
import { getGeminiConfig } from '../config/apiConfig';

export type { ApiAnalysisResponse };

/**
 * Custom error class for analysis API errors.
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
 * - Returns raw base64-encoded image data (no data URI prefix) and MIME type
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
    const base64 = await fileToBase64(file);
    return { base64, mimeType };
  }

  const resized = await resizeImage(file, MAX_SIZE_BYTES);
  return { base64: resized.base64, mimeType: resized.mimeType };
}

/**
 * Converts a File/Blob to a raw base64 string (strips the data URI prefix).
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:[mimetype];base64," prefix — send only raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image to fit within the target byte size using canvas.
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
 * Builds a minimal Gemini Vision API prompt for basic next-candle prediction.
 * Under 200 words, focused on the last 5 candles and overall trend.
 */
function buildAnalysisPrompt(): string {
  return `Você é um analista técnico de gráficos de velas (candlestick).

Nesta imagem há uma captura de tela. Localize a área do gráfico de candles (velas coloridas) e ignore todos os outros elementos da tela (botões, menus, saldo, textos, logotipos).

Analise as últimas 5 velas visíveis no gráfico e a tendência geral. Com base nisso, preveja se a PRÓXIMA vela será de alta (bullish) ou de baixa (bearish).

Retorne APENAS um JSON puro, sem markdown, sem blocos de código, sem texto adicional:
{
  "sinal": "COMPRA" | "VENDA" | "SEM ENTRADA",
  "tendencia": "ALTA" | "BAIXA" | "LATERAL",
  "confianca": <número inteiro de 0 a 100>,
  "padroes": ["<até 3 padrões em português>"],
  "explicacao": "<uma frase em português explicando a previsão>"
}

Regras:
- "COMPRA": próxima vela provavelmente de alta
- "VENDA": próxima vela provavelmente de baixa
- "SEM ENTRADA": indefinido ou mercado lateral
- Se não conseguir identificar o gráfico de candles, retorne: {"erro": "Não foi possível identificar o gráfico corretamente"}

Responda SOMENTE com o JSON, nada mais.`;
}

/**
 * Core function that sends the image to the Gemini Vision API.
 */
async function sendToGemini(
  file: File | Blob,
  apiKey: string
): Promise<ApiAnalysisResponse> {
  const imageData = await preprocessImage(file);
  const { url, headers } = getGeminiConfig(apiKey.trim());
  const prompt = buildAnalysisPrompt();

  // Log mimeType and base64 length for debugging
  console.log('[Gemini] Sending image — mimeType:', imageData.mimeType, '| base64 length:', imageData.base64.length);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64, // raw base64, no data URI prefix
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 512,
    },
  };

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

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = await response.json();
      errorDetail = errorBody?.error?.message || JSON.stringify(errorBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 400) {
      throw new AnalysisApiError(`Requisição inválida (400): ${errorDetail}`, 'API_ERROR', 400);
    } else if (response.status === 401 || response.status === 403) {
      throw new AnalysisApiError(
        'Chave da API inválida ou sem permissão. Verifique sua chave no Google AI Studio.',
        'API_AUTH_ERROR',
        response.status
      );
    } else if (response.status === 404) {
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

  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    throw new AnalysisApiError(
      'Resposta inválida da API Gemini (não é JSON válido).',
      'INVALID_RESPONSE'
    );
  }

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

  // Always log the raw Gemini response for debugging
  console.log('[Gemini] Raw response text:', textContent);

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

  let parsed: ApiAnalysisResponse;

  // Step 1: Strip markdown code fences and try direct parse
  const stripped = textContent
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  try {
    parsed = JSON.parse(stripped);
  } catch {
    // Step 2: Fallback — extract first { ... } block
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new AnalysisApiError(
          'Resposta inválida da IA — tente novamente',
          'INVALID_RESPONSE'
        );
      }
    } else {
      throw new AnalysisApiError(
        'Resposta inválida da IA — tente novamente',
        'INVALID_RESPONSE'
      );
    }
  }

  // If the response contains an 'erro' field, return it as-is for downstream handling
  if (parsed.erro) {
    return parsed;
  }

  // Validate and normalize the parsed response
  const validSignals = ['COMPRA', 'VENDA', 'NEUTRO', 'SEM ENTRADA'];
  const validTrends = ['ALTA', 'BAIXA', 'LATERAL'];

  if (!validSignals.includes(parsed.sinal)) {
    parsed.sinal = 'SEM ENTRADA';
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
 * Validates the API key and sends the image to Gemini for basic next-candle prediction.
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
    if (err instanceof AnalysisApiError) throw err;
    const message = err instanceof Error ? err.message : 'Erro desconhecido na análise';
    throw new AnalysisApiError(message, 'UNKNOWN');
  }
}

/**
 * Alias for analyzeChartImage — kept for any direct usage of the new name.
 */
export const analyzeWithGemini = analyzeChartImage;
