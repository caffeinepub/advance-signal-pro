/**
 * External API response types for chart analysis
 * 
 * The API must implement a 6-step objective rule-based technical analysis process:
 * 
 * 1. Image preprocessing: auto-detect and isolate only the candlestick chart region,
 *    ignoring all broker UI elements (menus, buttons, balance, sidebar, header, footer,
 *    COMPRAR/VENDER buttons, icons, logos, price labels, text overlays).
 *    Apply contrast enhancement and color binarization to highlight green/red candles.
 * 
 * 2. Candle reading: extract direction, body size, wick size, color sequence, movement strength
 * 
 * 3. Trend identification: ascending tops/bottoms = ALTA, descending = BAIXA, sideways = LATERAL
 * 
 * 4. Price action pattern detection with rule confirmation: engulfing, hammer, shooting star,
 *    doji, pullback, breakout, support/resistance, tops/bottoms
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
 *    -1 to 1 → SEM ENTRADA
 * 
 * 6. Mandatory return structure: trend, patterns, forca, confidence %, signal, technical explanation
 * 
 * IMPORTANT: The API must return 'SEM ENTRADA' for unclear cases rather than fabricating signals.
 * No subjective interpretation - only objective rule-based analysis based on candle patterns.
 * PROHIBITED: using any text, numbers, or values visible in the broker interface.
 */
export interface ApiAnalysisResponse {
  /** Signal type: COMPRA (buy), VENDA (sell), or SEM ENTRADA (no clear signal) */
  sinal: 'COMPRA' | 'VENDA' | 'NEUTRO' | 'SEM ENTRADA';
  /** Trend direction in Portuguese (ALTA, BAIXA, LATERAL) */
  tendencia: string;
  /** Confidence percentage (0-100) */
  confianca: number;
  /** Array of detected pattern names in Portuguese */
  padroes: string[];
  /** Technical explanation of the analysis based only on candle patterns */
  explicacao: string;
  /** Optional total score from the 6-step analysis (-2 to +2 scale) */
  pontuacao?: number;
  /**
   * Signal/trend strength derived from price action analysis.
   * 'fraca' = weak signal, 'média' = moderate signal, 'forte' = strong signal.
   */
  forca?: 'fraca' | 'média' | 'forte';
  /**
   * Error message returned when the AI cannot isolate the candlestick chart region.
   * When present, all other fields should be ignored and this message displayed to the user.
   * Value: 'Não foi possível identificar o gráfico corretamente'
   */
  erro?: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
