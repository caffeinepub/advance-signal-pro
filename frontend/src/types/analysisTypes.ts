/**
 * Local candle analysis result types.
 * All analysis is performed client-side using Canvas pixel data — no external API calls.
 */

export interface LocalAnalysisResult {
  /** Signal type: COMPRA (buy), VENDA (sell), or SEM ENTRADA (no clear signal) */
  sinal: 'COMPRA' | 'VENDA' | 'SEM ENTRADA';
  /** Trend direction in Portuguese: ALTA (up), BAIXA (down), LATERAL (sideways) */
  tendencia: 'ALTA' | 'BAIXA' | 'LATERAL';
  /** Confidence percentage (0–100) */
  confianca: number;
  /** Probability of upward movement on next candle (0–100). Must sum to 100 with probabilidade_baixa */
  probabilidade_alta: number;
  /** Probability of downward movement on next candle (0–100). Must sum to 100 with probabilidade_alta */
  probabilidade_baixa: number;
  /** Array of detected candlestick pattern names in Portuguese */
  padroes: string[];
  /** Signal/trend strength: 'fraca' = weak, 'média' = moderate, 'forte' = strong */
  forca: 'fraca' | 'média' | 'forte';
  /** One-sentence Portuguese technical explanation of the analysis */
  explicacao: string;
  /** Optional total score from the scoring system */
  pontuacao?: number;
  /** Error message when chart region cannot be detected from pixel data */
  erro?: string;
}
