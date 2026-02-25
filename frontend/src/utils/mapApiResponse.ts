import { ApiAnalysisResponse } from '../types/apiTypes';
import { AnalysisDirection, CandlestickPattern, ExternalBlob } from '../backend';

/**
 * Map external API response to internal AnalysisResult format.
 * Handles COMPRA, VENDA, NEUTRO, SEM ENTRADA signals.
 * When the response contains an 'erro' field, returns a special error result structure.
 */
export function mapApiResponseToAnalysisResult(
  apiResponse: ApiAnalysisResponse,
  imageBlob: ExternalBlob
): any {
  // Handle chart detection error — return a special error result
  if (apiResponse.erro) {
    return {
      isChartDetectionError: true,
      erroMessage: apiResponse.erro,
      direction: AnalysisDirection.sideways,
      resistanceLevels: [],
      candlestickPatterns: [CandlestickPattern.none],
      pullbacks: false,
      breakouts: false,
      trendStrength: BigInt(0),
      confidencePercentage: BigInt(0),
      timestamp: BigInt(Date.now() * 1000000),
      image: imageBlob,
      explicacao: apiResponse.erro,
      sinalOriginal: 'SEM ENTRADA',
      forca: undefined,
    };
  }

  // Map signal to direction
  let direction: AnalysisDirection;

  if (apiResponse.sinal === 'COMPRA') {
    direction = AnalysisDirection.bullish;
  } else if (apiResponse.sinal === 'VENDA') {
    direction = AnalysisDirection.bearish;
  } else {
    // Both NEUTRO and SEM ENTRADA map to sideways
    direction = AnalysisDirection.sideways;
  }

  // Map trend string to direction if needed (overrides signal mapping)
  const trendDirection = mapTrendToDirection(apiResponse.tendencia);

  // Map pattern strings to CandlestickPattern enum
  const candlestickPatterns = apiResponse.padroes
    .map(mapPatternString)
    .filter((p): p is CandlestickPattern => p !== null);

  // Generate mock resistance levels (API doesn't provide these)
  const resistanceLevels = [
    { price: 45000 + Math.random() * 5000, strength: BigInt(Math.floor(Math.random() * 100)) },
    { price: 42000 + Math.random() * 3000, strength: BigInt(Math.floor(Math.random() * 100)) },
  ];

  // Calculate trend strength from confidence
  const trendStrength = BigInt(Math.floor(apiResponse.confianca * 0.8));

  return {
    direction: trendDirection || direction,
    resistanceLevels,
    candlestickPatterns: candlestickPatterns.length > 0 ? candlestickPatterns : [CandlestickPattern.none],
    pullbacks: apiResponse.padroes.some(p => p.toLowerCase().includes('retra') || p.toLowerCase().includes('pullback')),
    breakouts: apiResponse.padroes.some(p => p.toLowerCase().includes('rompimento') || p.toLowerCase().includes('breakout')),
    trendStrength,
    confidencePercentage: BigInt(Math.floor(apiResponse.confianca)),
    timestamp: BigInt(Date.now() * 1000000),
    image: imageBlob,
    explicacao: apiResponse.explicacao,
    pontuacao: apiResponse.pontuacao,
    sinalOriginal: apiResponse.sinal,
    /** forca field from price action analysis: 'fraca' | 'média' | 'forte' */
    forca: apiResponse.forca,
    /** Raw padroes array from API for display in Results */
    padroesRaw: apiResponse.padroes,
    /** Raw tendencia string from API */
    tendenciaRaw: apiResponse.tendencia,
  };
}

/**
 * Map trend string to AnalysisDirection
 */
function mapTrendToDirection(tendencia: string): AnalysisDirection | null {
  const lower = tendencia.toLowerCase();

  if (lower.includes('alta') || lower.includes('bullish') || lower.includes('up')) {
    return AnalysisDirection.bullish;
  }

  if (lower.includes('baixa') || lower.includes('bearish') || lower.includes('down')) {
    return AnalysisDirection.bearish;
  }

  if (lower.includes('lateral') || lower.includes('sideways') || lower.includes('neutro')) {
    return AnalysisDirection.sideways;
  }

  return null;
}

/**
 * Map pattern string to CandlestickPattern enum
 */
function mapPatternString(pattern: string): CandlestickPattern | null {
  const lower = pattern.toLowerCase();

  if (lower.includes('envolvente') || lower.includes('engulfing') || lower.includes('engolfo')) {
    return CandlestickPattern.engulfing;
  }

  if (lower.includes('martelo') || lower.includes('hammer')) {
    return CandlestickPattern.hammer;
  }

  if (lower.includes('doji')) {
    return CandlestickPattern.doji;
  }

  if (lower.includes('estrela') || lower.includes('shooting') || lower.includes('star')) {
    return CandlestickPattern.shootingStar;
  }

  return null;
}
