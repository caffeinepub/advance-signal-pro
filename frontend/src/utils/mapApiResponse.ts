import { LocalAnalysisResult } from '../types/analysisTypes';
import { AnalysisDirection, CandlestickPattern, ExternalBlob } from '../backend';

/**
 * Map LocalAnalysisResult (from local candle engine) to internal AnalysisResult format.
 * All analysis is performed client-side — no external API calls.
 */
export function mapApiResponseToAnalysisResult(
  localResult: LocalAnalysisResult,
  imageBlob: ExternalBlob
): any {
  // Handle chart detection error
  if (localResult.erro) {
    return {
      isChartDetectionError: true,
      erroMessage: localResult.erro,
      direction: AnalysisDirection.sideways,
      resistanceLevels: [],
      candlestickPatterns: [CandlestickPattern.none],
      pullbacks: false,
      breakouts: false,
      trendStrength: BigInt(0),
      confidencePercentage: BigInt(0),
      timestamp: BigInt(Date.now() * 1000000),
      image: imageBlob,
      explicacao: localResult.erro,
      sinalOriginal: 'SEM ENTRADA',
      forca: undefined,
      probabilidade_alta: 50,
      probabilidade_baixa: 50,
    };
  }

  // Map signal to direction
  let direction: AnalysisDirection;
  if (localResult.sinal === 'COMPRA') {
    direction = AnalysisDirection.bullish;
  } else if (localResult.sinal === 'VENDA') {
    direction = AnalysisDirection.bearish;
  } else {
    direction = AnalysisDirection.sideways;
  }

  // Map tendencia to direction
  const trendDirection = mapTendenciaToDirection(localResult.tendencia);

  // Map pattern strings to CandlestickPattern enum
  const candlestickPatterns = localResult.padroes
    .map(mapPatternString)
    .filter((p): p is CandlestickPattern => p !== null);

  // Generate mock resistance levels
  const resistanceLevels = [
    { price: 45000 + Math.random() * 5000, strength: BigInt(Math.floor(Math.random() * 100)) },
    { price: 42000 + Math.random() * 3000, strength: BigInt(Math.floor(Math.random() * 100)) },
  ];

  const trendStrength = BigInt(Math.floor(localResult.confianca * 0.8));

  return {
    direction: trendDirection || direction,
    resistanceLevels,
    candlestickPatterns: candlestickPatterns.length > 0 ? candlestickPatterns : [CandlestickPattern.none],
    pullbacks: localResult.padroes.some(
      (p) => p.toLowerCase().includes('retra') || p.toLowerCase().includes('pullback')
    ),
    breakouts: localResult.padroes.some(
      (p) => p.toLowerCase().includes('rompimento') || p.toLowerCase().includes('breakout')
    ),
    trendStrength,
    confidencePercentage: BigInt(Math.floor(localResult.confianca)),
    timestamp: BigInt(Date.now() * 1000000),
    image: imageBlob,
    explicacao: localResult.explicacao,
    pontuacao: localResult.pontuacao,
    sinalOriginal: localResult.sinal,
    forca: localResult.forca,
    /** Raw padroes array for display in Results */
    padroesRaw: localResult.padroes,
    /** Raw tendencia string for display */
    tendenciaRaw: localResult.tendencia,
    /** Probability fields */
    probabilidade_alta: localResult.probabilidade_alta,
    probabilidade_baixa: localResult.probabilidade_baixa,
  };
}

function mapTendenciaToDirection(tendencia: string): AnalysisDirection | null {
  const lower = tendencia.toLowerCase();
  if (lower.includes('alta')) return AnalysisDirection.bullish;
  if (lower.includes('baixa')) return AnalysisDirection.bearish;
  if (lower.includes('lateral')) return AnalysisDirection.sideways;
  return null;
}

function mapPatternString(pattern: string): CandlestickPattern | null {
  const lower = pattern.toLowerCase();
  if (lower.includes('engolfo') || lower.includes('engulfing')) return CandlestickPattern.engulfing;
  if (lower.includes('martelo') || lower.includes('hammer')) return CandlestickPattern.hammer;
  if (lower.includes('doji')) return CandlestickPattern.doji;
  if (lower.includes('estrela') || lower.includes('shooting')) return CandlestickPattern.shootingStar;
  return null;
}
