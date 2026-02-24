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
    endpoint: import.meta.env.VITE_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent',
    headers: {
      'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY || '',
    },
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

// Get active provider from environment or default to custom
export function getActiveProvider(): AIProvider {
  const provider = import.meta.env.VITE_AI_PROVIDER as AIProvider;
  return provider && provider in PROVIDER_CONFIGS ? provider : AI_PROVIDERS.CUSTOM;
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
