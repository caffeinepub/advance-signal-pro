/**
 * External API response types for chart analysis
 * 
 * The API must implement a 6-step objective rule-based technical analysis process:
 * 
 * 1. Image preprocessing: contrast enhancement, high sharpness conversion, candle detection,
 *    wick/body/high/low identification, broker UI element filtering
 * 
 * 2. Candle reading: extract direction, body size, wick size, color sequence, movement strength
 * 
 * 3. Trend identification: ascending tops/bottoms = ALTA, descending = BAIXA, sideways = LATERAL
 * 
 * 4. Price action pattern detection with rule confirmation: engulfing, hammer, shooting star,
 *    doji, pullback, breakout, support/resistance
 * 
 * 5. Signal scoring system:
 *    +2 points = strong trend
 *    +1 point = favorable pattern
 *    -1 point = resistance against
 *    -2 points = contrary pattern
 *    
 *    Signal thresholds:
 *    >= 2 → COMPRA
 *    <= -2 → VENDA
 *    -1 to 1 → NEUTRO
 * 
 * 6. Mandatory return structure: trend, patterns, score, confidence %, signal, technical explanation
 * 
 * IMPORTANT: The API must return 'SEM ENTRADA' for unclear cases rather than fabricating signals.
 * No subjective interpretation - only objective rule-based analysis.
 */
export interface ApiAnalysisResponse {
  /** Signal type: COMPRA (buy), VENDA (sell), NEUTRO (neutral), or SEM ENTRADA (no clear signal) */
  sinal: 'COMPRA' | 'VENDA' | 'NEUTRO' | 'SEM ENTRADA';
  /** Trend direction in Portuguese (ALTA, BAIXA, LATERAL) */
  tendencia: string;
  /** Confidence percentage (0-100) */
  confianca: number;
  /** Array of detected pattern names in Portuguese */
  padroes: string[];
  /** Technical explanation of the analysis */
  explicacao: string;
  /** Optional total score from the 6-step analysis (-2 to +2 scale) */
  pontuacao?: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
