/**
 * API Configuration Module
 *
 * Configures the Gemini Vision API endpoint for basic chart analysis.
 *
 * Correct endpoint format:
 * https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
 *
 * The API key is appended as a query parameter: ?key=YOUR_API_KEY
 * Content-Type must be: application/json
 * Request body uses the contents[].parts[] format with inlineData for images.
 */

import { backendInterface } from '../backend';

/**
 * Builds the complete Gemini API URL with the API key as a query parameter.
 *
 * URL components:
 * (1) Base host:    https://generativelanguage.googleapis.com
 * (2) API version:  /v1beta/
 * (3) Model name:   models/gemini-1.5-flash
 * (4) Method suffix: :generateContent
 * (5) Query param:  ?key=<apiKey>
 *
 * @param apiKey - Gemini API key to append as query parameter
 * @returns Complete URL string ready for fetch()
 */
export function buildGeminiUrl(apiKey: string): string {
  // (1) Base host + (2) API version + (3) model name + (4) method suffix
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  // (5) Append API key as query parameter
  return `${endpoint}?key=${encodeURIComponent(apiKey)}`;
}

/**
 * Returns the Gemini API URL with the key as a query parameter, plus required headers.
 *
 * URL components:
 * (1) Base host:    https://generativelanguage.googleapis.com
 * (2) API version:  /v1beta/
 * (3) Model name:   models/gemini-1.5-flash
 * (4) Method suffix: :generateContent
 * (5) Query param:  ?key=<apiKey>
 */
export function getGeminiConfig(apiKey: string): {
  url: string;
  headers: Record<string, string>;
} {
  // Hardcoded endpoint — do NOT use dynamic construction that could omit any segment
  // (1) Base host: https://generativelanguage.googleapis.com
  // (2) API version: /v1beta/
  // (3) Model name: models/gemini-1.5-flash
  // (4) Method suffix: :generateContent
  const baseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  // (5) API key appended as query parameter: ?key=<apiKey>
  const url = `${baseUrl}?key=${encodeURIComponent(apiKey)}`;

  return {
    url,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Validates the Gemini API key stored in the backend.
 * Returns isValid flag and an optional error message in Portuguese.
 *
 * @param actor - Backend actor instance
 */
export async function validateApiKey(
  actor: backendInterface
): Promise<{ isValid: boolean; errorMessage?: string }> {
  try {
    const apiKey = await actor.getGeminiApiKey();

    if (!apiKey || apiKey.trim() === '') {
      return {
        isValid: false,
        errorMessage:
          'CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações',
      };
    }

    if (!apiKey.startsWith('AIza')) {
      return {
        isValid: false,
        errorMessage:
          'Formato de chave de API inválido. Chaves do Gemini devem começar com "AIza"',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('[API Key Validation] Error:', error);
    return {
      isValid: false,
      errorMessage: 'Erro ao verificar chave da API',
    };
  }
}
