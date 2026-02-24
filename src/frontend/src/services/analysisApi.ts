import { ApiAnalysisResponse, ApiError } from '../types/apiTypes';
import { getProviderConfig, API_TIMEOUT, MAX_RETRIES, RETRY_DELAY } from '../config/apiConfig';

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Error messages in Portuguese
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro ao conectar com o servidor',
  TIMEOUT: 'Tempo esgotado',
  ANALYSIS_ERROR: 'Erro na análise',
  INVALID_RESPONSE: 'Resposta inválida do servidor',
  UNKNOWN: 'Erro desconhecido',
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
 * Send chart image to external AI API for analysis
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
      
      // Don't retry on validation errors
      if (error instanceof AnalysisApiError && error.code === 'INVALID_RESPONSE') {
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
 */
async function sendAnalysisRequest(
  imageFile: File | Blob,
  onProgress?: (percentage: number) => void
): Promise<ApiAnalysisResponse> {
  const config = getProviderConfig();
  
  // Create FormData with image
  const formData = new FormData();
  formData.append('imagem', imageFile, 'chart.jpg');
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    // Track upload progress if supported
    if (onProgress) {
      onProgress(0);
    }
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      body: formData,
      headers: config.headers || {},
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (onProgress) {
      onProgress(100);
    }
    
    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new AnalysisApiError(
        `${ERROR_MESSAGES.ANALYSIS_ERROR}: ${response.status}`,
        'HTTP_ERROR'
      );
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Validate response structure
    if (!isValidApiResponse(data)) {
      throw new AnalysisApiError(
        ERROR_MESSAGES.INVALID_RESPONSE,
        'INVALID_RESPONSE'
      );
    }
    
    return data as ApiAnalysisResponse;
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
 * Validate API response structure
 */
function isValidApiResponse(data: any): data is ApiAnalysisResponse {
  return (
    data &&
    typeof data === 'object' &&
    (data.sinal === 'COMPRA' || data.sinal === 'VENDA') &&
    typeof data.tendencia === 'string' &&
    typeof data.confianca === 'number' &&
    Array.isArray(data.padroes) &&
    typeof data.explicacao === 'string'
  );
}
