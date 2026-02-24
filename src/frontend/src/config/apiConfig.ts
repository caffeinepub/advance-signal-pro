// API configuration for multiple AI providers
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
