/**
 * API configuration for multiple AI providers
 * 
 * MANDATORY ANALYSIS REQUIREMENTS:
 * 
 * All external APIs must implement a 6-step objective rule-based technical analysis process:
 * 
 * 1) Image preprocessing:
 *    - Increase contrast
 *    - Convert to high sharpness
 *    - Detect individual candles
 *    - Identify wick, body, high, and low
 *    - Ignore broker visual elements
 * 
 * 2) Candle reading:
 *    Extract: direction (bullish/bearish), body size, wick size, color sequence, movement strength
 * 
 * 3) Trend identification:
 *    Rules:
 *    - Ascending tops and bottoms = ALTA (bullish)
 *    - Descending tops and bottoms = BAIXA (bearish)
 *    - Sideways = LATERAL
 * 
 * 4) Price action pattern detection:
 *    Only if rules are confirmed:
 *    - Engulfing (bullish/bearish)
 *    - Hammer
 *    - Shooting star
 *    - Doji
 *    - Pullback
 *    - Breakout
 *    - Support and resistance
 * 
 * 5) Signal scoring system:
 *    Create score:
 *    +2 points = strong trend
 *    +1 point = favorable pattern
 *    -1 point = resistance against
 *    -2 points = contrary pattern
 *    
 *    Result:
 *    >= 2 → COMPRA
 *    <= -2 → VENDA
 *    between -1 and 1 → NEUTRO
 * 
 * 6) Mandatory return:
 *    Show: trend, detected patterns, total score, confidence (%), final signal, short technical explanation
 * 
 * CRITICAL: Never fabricate signals if there is no confirmation.
 * If there is no clarity → return "SEM ENTRADA" (no entry signal).
 * 
 * NO SUBJECTIVE INTERPRETATION - Follow objective technical rules step by step.
 */

export interface ProviderConfig {
  name: string;
  endpoint: string;
  headers?: Record<string, string>;
}

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  PYTHON: 'python',
  CUSTOM: 'custom',
} as const;

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

/**
 * ============================================================================
 * HOW TO CONFIGURE GOOGLE GEMINI VISION API
 * ============================================================================
 * 
 * STEP 1: Get your API key from Google AI Studio
 * -----------------------------------------------
 * Visit: https://aistudio.google.com/app/apikey
 * Click "Create API Key" and copy the key
 * 
 * STEP 2: Configure the API key in the app
 * -----------------------------------------
 * Go to Settings page in the app and enter your Gemini API key
 * The key will be stored securely in the backend
 * 
 * STEP 3: Verify API permissions
 * -------------------------------
 * The Gemini API should work immediately with the free tier.
 * If you get 403 errors, check:
 * 
 * a) API key is valid and not expired
 * b) Generative Language API is enabled in Google Cloud Console
 *    Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
 * c) If using API restrictions, ensure your domain/IP is allowed
 * d) Check quota limits at: https://aistudio.google.com/app/apikey
 * 
 * STEP 4: Test your API key
 * --------------------------
 * You can test with curl:
 * 
 * curl -H 'Content-Type: application/json' \
 *   -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
 *   "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
 * 
 * COMMON 403 ERROR CAUSES:
 * ------------------------
 * 1. Missing or invalid API key
 * 2. API key in wrong location (must be in URL query parameter, not header)
 * 3. Generative Language API not enabled in Google Cloud Console
 * 4. API key restrictions (HTTP referrers, IP restrictions)
 * 5. Quota exceeded (check usage at AI Studio)
 * 6. Billing not enabled (required for some models, but gemini-1.5-flash is free)
 * 
 * SUPPORTED IMAGE FORMATS:
 * ------------------------
 * - JPEG (recommended for photos)
 * - PNG (recommended for graphics)
 * - WebP
 * - HEIC/HEIF (supported but may have compatibility issues)
 * 
 * IMAGE SIZE LIMITS:
 * ------------------
 * - Maximum inline request size: 20MB (total including text + image)
 * - Recommended max dimensions: 4096x4096 pixels
 * - Images are automatically resized if they exceed limits
 * 
 * IMPORTANT NOTES:
 * ----------------
 * - The API key must be in the URL query parameter (?key=YOUR_KEY)
 * - Do NOT use x-goog-api-key header (this is for different Google APIs)
 * - Free tier has rate limits (check AI Studio for current limits)
 * - For production, consider Google Cloud Console for higher quotas
 * 
 * Configure your API key in the Settings page of the app
 * ============================================================================
 */

// Provider configurations with placeholder endpoints
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI ChatGPT Vision',
    endpoint: import.meta.env.VITE_OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || ''}`,
    },
  },
  gemini: {
    name: 'Google Gemini Vision',
    // Note: API key is added to URL query parameter in analysisApi.ts, not in headers
    endpoint: import.meta.env.VITE_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  },
  python: {
    name: 'Python Backend',
    endpoint: import.meta.env.VITE_PYTHON_ENDPOINT || 'http://localhost:8000/analisar-grafico',
  },
  custom: {
    name: 'Custom Endpoint',
    endpoint: import.meta.env.VITE_CUSTOM_ENDPOINT || '/analisar-grafico',
  },
};

// Get active provider from environment or default to Gemini
export function getActiveProvider(): AIProvider {
  const provider = import.meta.env.VITE_AI_PROVIDER as AIProvider;
  return provider && provider in PROVIDER_CONFIGS ? provider : AI_PROVIDERS.GEMINI;
}

// Get configuration for active provider
export function getProviderConfig(): ProviderConfig {
  const provider = getActiveProvider();
  return PROVIDER_CONFIGS[provider];
}

// Request timeout in milliseconds
export const API_TIMEOUT = 30000; // 30 seconds

// Maximum retry attempts
export const MAX_RETRIES = 2;

// Retry delay in milliseconds (exponential backoff)
export const RETRY_DELAY = 1000;

/**
 * Validate API key configuration
 * Returns validation result with error message if key is missing
 */
export interface ApiKeyValidation {
  isValid: boolean;
  errorMessage?: string;
}

export async function validateApiKey(actor: any): Promise<ApiKeyValidation> {
  try {
    if (!actor) {
      return {
        isValid: false,
        errorMessage: 'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações',
      };
    }

    const apiKey = await actor.getGeminiApiKey();
    
    if (!apiKey || apiKey.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating API key:', error);
    return {
      isValid: false,
      errorMessage: 'Erro ao validar chave da API',
    };
  }
}
