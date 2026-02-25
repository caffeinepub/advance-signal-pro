import { LocalAnalysisResult } from '../types/analysisTypes';

/**
 * Local client-side candle analysis engine.
 * Analyzes a chart screenshot using Canvas pixel data.
 * No HTTP requests are made — all logic runs entirely in the browser.
 */

interface CandleData {
  isBullish: boolean;
  bodyHeight: number;
  wickTop: number;
  wickBottom: number;
  centerY: number;
  topY: number;
  bottomY: number;
}

/**
 * Analyze a chart image file and return a LocalAnalysisResult.
 * Uses Canvas pixel data to detect candlestick patterns and predict next-candle direction.
 */
export async function analyzeChartImage(file: File | Blob): Promise<LocalAnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const result = performAnalysis(img);
        resolve(result);
      } catch {
        resolve(buildErrorResult());
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(buildErrorResult());
    };

    img.src = url;
  });
}

function buildErrorResult(): LocalAnalysisResult {
  return {
    sinal: 'SEM ENTRADA',
    tendencia: 'LATERAL',
    confianca: 0,
    probabilidade_alta: 50,
    probabilidade_baixa: 50,
    padroes: [],
    forca: 'fraca',
    explicacao: 'Não foi possível identificar o gráfico corretamente.',
    erro: 'Não foi possível identificar o gráfico corretamente',
  };
}

function performAnalysis(img: HTMLImageElement): LocalAnalysisResult {
  const canvas = document.createElement('canvas');
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return buildErrorResult();

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // Detect chart region by scanning for green/red candle columns
  const chartRegion = detectChartRegion(data, width, height);
  if (!chartRegion) return buildErrorResult();

  const { startX, endX, startY, endY } = chartRegion;
  const chartWidth = endX - startX;
  const chartHeight = endY - startY;

  if (chartWidth < 30 || chartHeight < 30) return buildErrorResult();

  // Extract candles from the chart region
  const candles = extractCandles(data, width, startX, endX, startY, endY);

  if (candles.length < 3) return buildErrorResult();

  // Use last 5–7 candles for analysis
  const analysisCandles = candles.slice(-Math.min(7, candles.length));

  return computeAnalysis(analysisCandles);
}

/**
 * Detect the candlestick chart region by scanning for green/red pixel columns.
 */
function detectChartRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { startX: number; endX: number; startY: number; endY: number } | null {
  const greenRedColumns: number[] = [];

  for (let x = 0; x < width; x++) {
    let greenCount = 0;
    let redCount = 0;

    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (isGreenPixel(r, g, b)) greenCount++;
      else if (isRedPixel(r, g, b)) redCount++;
    }

    if (greenCount + redCount > 2) {
      greenRedColumns.push(x);
    }
  }

  if (greenRedColumns.length < 10) return null;

  const startX = greenRedColumns[0];
  const endX = greenRedColumns[greenRedColumns.length - 1];

  // Find vertical bounds
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = startX; x <= endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (isGreenPixel(r, g, b) || isRedPixel(r, g, b)) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxY - minY < 20) return null;

  // Add padding
  const padX = Math.floor((endX - startX) * 0.02);
  const padY = Math.floor((maxY - minY) * 0.05);

  return {
    startX: Math.max(0, startX - padX),
    endX: Math.min(width - 1, endX + padX),
    startY: Math.max(0, minY - padY),
    endY: Math.min(height - 1, maxY + padY),
  };
}

function isGreenPixel(r: number, g: number, b: number): boolean {
  // Green candle: green channel dominant, not too bright (not white)
  return g > r + 20 && g > b + 20 && g > 60 && r + g + b < 700;
}

function isRedPixel(r: number, g: number, b: number): boolean {
  // Red candle: red channel dominant, not too bright (not white)
  return r > g + 20 && r > b + 20 && r > 60 && r + g + b < 700;
}

/**
 * Extract individual candles from the chart region.
 */
function extractCandles(
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): CandleData[] {
  const chartWidth = endX - startX;
  const columnSize = Math.max(1, Math.floor(chartWidth / 40));
  const candles: CandleData[] = [];

  for (let col = startX; col < endX - columnSize; col += columnSize) {
    let greenPixels = 0;
    let redPixels = 0;
    let minGreenY = endY;
    let maxGreenY = startY;
    let minRedY = endY;
    let maxRedY = startY;
    let minColorY = endY;
    let maxColorY = startY;

    for (let x = col; x < col + columnSize && x < endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isGreenPixel(r, g, b)) {
          greenPixels++;
          if (y < minGreenY) minGreenY = y;
          if (y > maxGreenY) maxGreenY = y;
          if (y < minColorY) minColorY = y;
          if (y > maxColorY) maxColorY = y;
        } else if (isRedPixel(r, g, b)) {
          redPixels++;
          if (y < minRedY) minRedY = y;
          if (y > maxRedY) maxRedY = y;
          if (y < minColorY) minColorY = y;
          if (y > maxColorY) maxColorY = y;
        }
      }
    }

    const totalColorPixels = greenPixels + redPixels;
    if (totalColorPixels < 3) continue;

    const isBullish = greenPixels >= redPixels;
    const bodyTop = isBullish ? minGreenY : minRedY;
    const bodyBottom = isBullish ? maxGreenY : maxRedY;
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);
    const wickTop = minColorY;
    const wickBottom = maxColorY;
    const centerY = (bodyTop + bodyBottom) / 2;

    candles.push({
      isBullish,
      bodyHeight,
      wickTop,
      wickBottom,
      centerY,
      topY: wickTop,
      bottomY: wickBottom,
    });
  }

  // Merge nearby candles (de-duplicate)
  return mergeCandles(candles);
}

function mergeCandles(candles: CandleData[]): CandleData[] {
  if (candles.length === 0) return [];

  const merged: CandleData[] = [candles[0]];

  for (let i = 1; i < candles.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = candles[i];
    const centerDiff = Math.abs(curr.centerY - prev.centerY);

    // If very similar center and direction, merge
    if (centerDiff < 5 && curr.isBullish === prev.isBullish) {
      prev.bodyHeight = Math.max(prev.bodyHeight, curr.bodyHeight);
      prev.topY = Math.min(prev.topY, curr.topY);
      prev.bottomY = Math.max(prev.bottomY, curr.bottomY);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Compute the analysis result from extracted candle data.
 */
function computeAnalysis(candles: CandleData[]): LocalAnalysisResult {
  const n = candles.length;
  const padroes: string[] = [];
  let score = 0;

  // ── 1. Trend detection ──
  // Check if tops and bottoms are ascending or descending
  const tops = candles.map((c) => c.topY); // lower Y = higher price
  const bottoms = candles.map((c) => c.bottomY); // higher Y = lower price

  let ascendingTops = 0;
  let descendingTops = 0;
  let ascendingBottoms = 0;
  let descendingBottoms = 0;

  for (let i = 1; i < n; i++) {
    // In canvas coords: lower Y = higher price
    if (tops[i] < tops[i - 1]) ascendingTops++; // price going up
    else if (tops[i] > tops[i - 1]) descendingTops++;

    if (bottoms[i] < bottoms[i - 1]) ascendingBottoms++;
    else if (bottoms[i] > bottoms[i - 1]) descendingBottoms++;
  }

  let tendencia: 'ALTA' | 'BAIXA' | 'LATERAL';
  if (ascendingTops > descendingTops && ascendingBottoms > descendingBottoms) {
    tendencia = 'ALTA';
    score += 2;
  } else if (descendingTops > ascendingTops && descendingBottoms > ascendingBottoms) {
    tendencia = 'BAIXA';
    score -= 2;
  } else {
    tendencia = 'LATERAL';
  }

  // ── 2. Momentum: consecutive same-color candles ──
  const lastCandle = candles[n - 1];
  const prevCandle = n >= 2 ? candles[n - 2] : null;
  const prev2Candle = n >= 3 ? candles[n - 3] : null;

  let consecutiveBullish = 0;
  let consecutiveBearish = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (candles[i].isBullish) {
      if (consecutiveBearish > 0) break;
      consecutiveBullish++;
    } else {
      if (consecutiveBullish > 0) break;
      consecutiveBearish++;
    }
  }

  if (consecutiveBullish >= 3) {
    padroes.push('Momentum de Alta (3+ velas verdes)');
    score += 1;
  } else if (consecutiveBearish >= 3) {
    padroes.push('Momentum de Baixa (3+ velas vermelhas)');
    score -= 1;
  }

  // ── 3. Pattern detection on last candle ──
  const totalWick = lastCandle.bottomY - lastCandle.topY;
  const bodyRatio = totalWick > 0 ? lastCandle.bodyHeight / totalWick : 1;
  const upperWick = lastCandle.topY - lastCandle.wickTop;
  const lowerWick = lastCandle.wickBottom - lastCandle.bottomY;

  // Doji: very small body relative to total range
  if (bodyRatio < 0.15 && totalWick > 5) {
    padroes.push('Doji');
    // Doji is indecision — slight negative for trend continuation
    score -= 1;
  }

  // Hammer: small body at top, long lower wick (bullish reversal)
  if (
    lowerWick > lastCandle.bodyHeight * 2 &&
    upperWick < lastCandle.bodyHeight * 0.5 &&
    lastCandle.bodyHeight > 2
  ) {
    padroes.push('Martelo (Hammer)');
    score += 1;
  }

  // Shooting Star: small body at bottom, long upper wick (bearish reversal)
  if (
    upperWick > lastCandle.bodyHeight * 2 &&
    lowerWick < lastCandle.bodyHeight * 0.5 &&
    lastCandle.bodyHeight > 2
  ) {
    padroes.push('Estrela Cadente (Shooting Star)');
    score -= 1;
  }

  // Pin Bar: long wick on one side (>3x body)
  if (lowerWick > lastCandle.bodyHeight * 3 && upperWick < lastCandle.bodyHeight) {
    padroes.push('Pin Bar de Alta');
    score += 1;
  } else if (upperWick > lastCandle.bodyHeight * 3 && lowerWick < lastCandle.bodyHeight) {
    padroes.push('Pin Bar de Baixa');
    score -= 1;
  }

  // Engulfing: last candle body larger than previous candle body and opposite color
  if (prevCandle && lastCandle.bodyHeight > prevCandle.bodyHeight * 1.3) {
    if (lastCandle.isBullish && !prevCandle.isBullish) {
      padroes.push('Engolfo de Alta (Bullish Engulfing)');
      score += 2;
    } else if (!lastCandle.isBullish && prevCandle.isBullish) {
      padroes.push('Engolfo de Baixa (Bearish Engulfing)');
      score -= 2;
    }
  }

  // Inside bar: last candle body smaller than previous (consolidation)
  if (prevCandle && lastCandle.bodyHeight < prevCandle.bodyHeight * 0.5) {
    padroes.push('Inside Bar (Consolidação)');
  }

  // Three white soldiers / three black crows
  if (
    prev2Candle &&
    prevCandle &&
    lastCandle.isBullish &&
    prevCandle.isBullish &&
    prev2Candle.isBullish
  ) {
    padroes.push('Três Soldados Brancos');
    score += 1;
  } else if (
    prev2Candle &&
    prevCandle &&
    !lastCandle.isBullish &&
    !prevCandle.isBullish &&
    !prev2Candle.isBullish
  ) {
    padroes.push('Três Corvos Negros');
    score -= 1;
  }

  // ── 4. Determine signal ──
  let sinal: 'COMPRA' | 'VENDA' | 'SEM ENTRADA';
  let probabilidade_alta: number;
  let probabilidade_baixa: number;

  // Base probability from score
  const baseScore = Math.max(-4, Math.min(4, score));
  const rawAlta = 50 + baseScore * 10;
  probabilidade_alta = Math.max(5, Math.min(95, Math.round(rawAlta)));
  probabilidade_baixa = 100 - probabilidade_alta;

  if (probabilidade_alta >= 60) {
    sinal = 'COMPRA';
  } else if (probabilidade_baixa >= 60) {
    sinal = 'VENDA';
  } else {
    sinal = 'SEM ENTRADA';
  }

  // ── 5. Confidence ──
  const absScore = Math.abs(score);
  let confianca: number;
  if (absScore >= 4) confianca = 90;
  else if (absScore >= 3) confianca = 80;
  else if (absScore >= 2) confianca = 70;
  else if (absScore >= 1) confianca = 58;
  else confianca = 45;

  // Add some variation based on candle count
  confianca = Math.min(95, confianca + Math.floor(n * 1.5));

  // ── 6. Força ──
  let forca: 'fraca' | 'média' | 'forte';
  if (confianca >= 75) forca = 'forte';
  else if (confianca >= 58) forca = 'média';
  else forca = 'fraca';

  // ── 7. Explicação ──
  const candleCount = n;
  let explicacao = '';

  if (sinal === 'COMPRA') {
    explicacao = `Análise de ${candleCount} velas detectou tendência de ${tendencia} com ${probabilidade_alta}% de probabilidade de alta na próxima vela. ${padroes.length > 0 ? `Padrão identificado: ${padroes[0]}.` : 'Momentum favorável para compra.'}`;
  } else if (sinal === 'VENDA') {
    explicacao = `Análise de ${candleCount} velas detectou tendência de ${tendencia} com ${probabilidade_baixa}% de probabilidade de queda na próxima vela. ${padroes.length > 0 ? `Padrão identificado: ${padroes[0]}.` : 'Momentum favorável para venda.'}`;
  } else {
    explicacao = `Análise de ${candleCount} velas não identificou sinal claro. Tendência ${tendencia} com ${probabilidade_alta}% de probabilidade de alta e ${probabilidade_baixa}% de baixa. Aguarde confirmação.`;
  }

  return {
    sinal,
    tendencia,
    confianca,
    probabilidade_alta,
    probabilidade_baixa,
    padroes: padroes.length > 0 ? padroes : ['Sem padrão específico identificado'],
    forca,
    explicacao,
    pontuacao: score,
  };
}
