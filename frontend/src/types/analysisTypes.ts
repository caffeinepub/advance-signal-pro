/**
 * Result returned by the local candle analysis engine.
 * All fields are computed client-side from pixel analysis of the uploaded chart image.
 */
export interface LocalAnalysisResult {
  /** Overall market trend direction */
  tendencia: 'ALTA' | 'BAIXA' | 'LATERAL';

  /** Trading signal for the next candle */
  sinal: 'COMPRA' | 'VENDA' | 'NEUTRO' | 'SEM ENTRADA';

  /** Confidence percentage (0–100) */
  confianca: number;

  /** Signal strength classification */
  forca: 'fraca' | 'média' | 'forte';

  /** Detected candlestick patterns (up to 2, in Portuguese) */
  padroes: string[];

  /** Professional Portuguese explanation of the analysis */
  explicacao: string;

  /** Probability of upward movement (0–100) */
  probAlta: number;

  /** Probability of downward movement (0–100) */
  probBaixa: number;

  /** Detected support price levels (normalized 0–1) */
  suportes: number[];

  /** Detected resistance price levels (normalized 0–1) */
  resistencias: number[];

  /** Analysis precision percentage (0–100) */
  precisao: number;

  /** Volume classification */
  volume: 'baixo' | 'médio' | 'alto';

  /**
   * User-selected timeframe at the time of analysis.
   * M1 = 1 minute, M3 = 3 minutes, M5 = 5 minutes
   */
  timeframe: 'M1' | 'M3' | 'M5';
}
