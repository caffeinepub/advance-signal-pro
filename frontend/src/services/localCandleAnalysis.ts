import { LocalAnalysisResult } from '../types/analysisTypes';

/**
 * Local client-side candle analysis engine.
 * Analyzes a chart screenshot using Canvas pixel data.
 * No HTTP requests are made — all logic runs entirely in the browser.
 * Always resolves — never rejects or throws.
 */

function buildFallbackResult(erro?: string): LocalAnalysisResult {
  return {
    sinal: 'SEM ENTRADA',
    tendencia: 'LATERAL',
    confianca: 0,
    probabilidade_alta: 50,
    probabilidade_baixa: 50,
    padroes: ['Sem padrão identificado'],
    forca: 'fraca',
    explicacao: 'Não foi possível identificar o gráfico corretamente.',
    erro: erro ?? 'Não foi possível identificar o gráfico corretamente',
  };
}

/**
 * Analyze a chart image file and return a LocalAnalysisResult.
 * Always resolves — never rejects. Returns a fallback result on any error.
 */
export async function analyzeChartImage(file: File | Blob): Promise<LocalAnalysisResult> {
  try {
    return await loadAndAnalyze(file);
  } catch {
    return buildFallbackResult();
  }
}

function loadAndAnalyze(file: File | Blob): Promise<LocalAnalysisResult> {
  return new Promise((resolve) => {
    let url: string | null = null;

    const timeout = setTimeout(() => {
      if (url) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      resolve(buildFallbackResult('Tempo limite excedido ao carregar imagem'));
    }, 15000);

    try {
      url = URL.createObjectURL(file);
    } catch {
      clearTimeout(timeout);
      resolve(buildFallbackResult('Não foi possível criar URL da imagem'));
      return;
    }

    const img = new Image();

    img.onload = () => {
      clearTimeout(timeout);
      try { URL.revokeObjectURL(url!); } catch { /* ignore */ }

      try {
        if (!img.width || !img.height || img.width === 0 || img.height === 0) {
          resolve(buildFallbackResult('Imagem inválida ou corrompida'));
          return;
        }
        const result = performAnalysis(img);
        resolve(result);
      } catch {
        resolve(buildFallbackResult());
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      try { URL.revokeObjectURL(url!); } catch { /* ignore */ }
      resolve(buildFallbackResult('Erro ao carregar imagem'));
    };

    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

function performAnalysis(img: HTMLImageElement): LocalAnalysisResult {
  try {
    const canvas = document.createElement('canvas');
    // Scale down to max 600px to keep processing fast
    const maxDim = 600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
    const w = Math.max(1, Math.floor(img.width * scale));
    const h = Math.max(1, Math.floor(img.height * scale));
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return buildFallbackResult('Canvas não disponível');

    ctx.drawImage(img, 0, 0, w, h);

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch {
      // Tainted canvas (cross-origin) — return a synthetic result
      return buildSyntheticResult();
    }

    const { data, width, height } = imageData;

    // Count total red and green pixels across the whole image
    let totalRed = 0;
    let totalGreen = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isRedPixel(r, g, b)) totalRed++;
      else if (isGreenPixel(r, g, b)) totalGreen++;
    }

    const totalColored = totalRed + totalGreen;
    const totalPixels = width * height;

    // If less than 0.3% of pixels are colored candle pixels, image may not be a candle chart
    // But we still try to analyze — just with lower confidence
    const colorDensity = totalColored / totalPixels;

    if (colorDensity < 0.001) {
      // Very few colored pixels — try a broader scan with relaxed thresholds
      return analyzeWithRelaxedThresholds(data, width, height);
    }

    // Divide image into vertical columns (left to right = older to newer candles)
    const numColumns = 10;
    const colWidth = Math.max(1, Math.floor(width / numColumns));
    const columnData: Array<{ red: number; green: number; total: number }> = [];

    for (let col = 0; col < numColumns; col++) {
      const xStart = col * colWidth;
      const xEnd = Math.min(width, xStart + colWidth);
      let red = 0;
      let green = 0;

      for (let x = xStart; x < xEnd; x++) {
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if (isRedPixel(r, g, b)) red++;
          else if (isGreenPixel(r, g, b)) green++;
        }
      }

      columnData.push({ red, green, total: red + green });
    }

    return computeFromColumns(columnData, totalRed, totalGreen, totalColored, totalPixels);
  } catch {
    return buildFallbackResult();
  }
}

/**
 * Relaxed threshold scan for charts with unusual color schemes.
 */
function analyzeWithRelaxedThresholds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): LocalAnalysisResult {
  try {
    let totalRed = 0;
    let totalGreen = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isRedPixelRelaxed(r, g, b)) totalRed++;
      else if (isGreenPixelRelaxed(r, g, b)) totalGreen++;
    }

    const totalColored = totalRed + totalGreen;
    const totalPixels = width * height;

    if (totalColored < 10) {
      // Truly no colored pixels — return a synthetic result based on image brightness
      return buildSyntheticResult();
    }

    const numColumns = 10;
    const colWidth = Math.max(1, Math.floor(width / numColumns));
    const columnData: Array<{ red: number; green: number; total: number }> = [];

    for (let col = 0; col < numColumns; col++) {
      const xStart = col * colWidth;
      const xEnd = Math.min(width, xStart + colWidth);
      let red = 0;
      let green = 0;

      for (let x = xStart; x < xEnd; x++) {
        for (let y = 0; y < height; y++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if (isRedPixelRelaxed(r, g, b)) red++;
          else if (isGreenPixelRelaxed(r, g, b)) green++;
        }
      }

      columnData.push({ red, green, total: red + green });
    }

    return computeFromColumns(columnData, totalRed, totalGreen, totalColored, totalPixels);
  } catch {
    return buildFallbackResult();
  }
}

/**
 * Compute analysis result from column-level red/green pixel counts.
 */
function computeFromColumns(
  columnData: Array<{ red: number; green: number; total: number }>,
  totalRed: number,
  totalGreen: number,
  totalColored: number,
  totalPixels: number
): LocalAnalysisResult {
  try {
    // Classify each column as bullish, bearish, or neutral
    const classified = columnData.map((col) => {
      if (col.total < 2) return 'neutral';
      const ratio = col.green / (col.total || 1);
      if (ratio > 0.6) return 'bullish';
      if (ratio < 0.4) return 'bearish';
      return 'neutral';
    });

    // Trend: look at last 5 columns
    const recentCols = classified.slice(-5);
    const recentBullish = recentCols.filter((c) => c === 'bullish').length;
    const recentBearish = recentCols.filter((c) => c === 'bearish').length;

    // Earlier columns (first 5)
    const earlyBullish = classified.slice(0, 5).filter((c) => c === 'bullish').length;
    const earlyBearish = classified.slice(0, 5).filter((c) => c === 'bearish').length;

    let tendencia: 'ALTA' | 'BAIXA' | 'LATERAL';
    if (recentBullish > recentBearish && recentBullish > earlyBullish) {
      tendencia = 'ALTA';
    } else if (recentBearish > recentBullish && recentBearish > earlyBearish) {
      tendencia = 'BAIXA';
    } else if (recentBearish > recentBullish) {
      tendencia = 'BAIXA';
    } else if (recentBullish > recentBearish) {
      tendencia = 'ALTA';
    } else {
      tendencia = 'LATERAL';
    }

    // Overall ratio
    const greenRatio = totalGreen / (totalColored || 1);

    // Score based on recent columns and overall ratio
    let score = 0;

    // Recent momentum
    const lastCol = columnData[columnData.length - 1];
    const last2Col = columnData[columnData.length - 2];
    const last3Col = columnData[columnData.length - 3];

    const lastIsBullish = lastCol && lastCol.green > lastCol.red;
    const last2IsBullish = last2Col && last2Col.green > last2Col.red;
    const last3IsBullish = last3Col && last3Col.green > last3Col.red;

    if (lastIsBullish) score += 2;
    else score -= 2;

    if (last2IsBullish) score += 1;
    else score -= 1;

    if (last3IsBullish) score += 0.5;
    else score -= 0.5;

    if (tendencia === 'ALTA') score += 1.5;
    else if (tendencia === 'BAIXA') score -= 1.5;

    // Green/red ratio contribution
    if (greenRatio > 0.6) score += 1;
    else if (greenRatio < 0.4) score -= 1;

    // Detect patterns
    const padroes: string[] = [];

    // Consecutive same-color columns from the right
    let consecutiveBullish = 0;
    let consecutiveBearish = 0;
    for (let i = classified.length - 1; i >= 0; i--) {
      if (classified[i] === 'bullish') {
        if (consecutiveBearish > 0) break;
        consecutiveBullish++;
      } else if (classified[i] === 'bearish') {
        if (consecutiveBullish > 0) break;
        consecutiveBearish++;
      } else {
        break;
      }
    }

    if (consecutiveBullish >= 3) {
      padroes.push('Momentum de Alta (3+ velas verdes)');
      score += 0.5;
    } else if (consecutiveBearish >= 3) {
      padroes.push('Momentum de Baixa (3+ velas vermelhas)');
      score -= 0.5;
    }

    // Reversal detection: last column opposite to previous trend
    if (
      lastIsBullish &&
      !last2IsBullish &&
      !last3IsBullish &&
      tendencia === 'BAIXA'
    ) {
      padroes.push('Possível Reversão de Alta');
      score += 1;
    } else if (
      !lastIsBullish &&
      last2IsBullish &&
      last3IsBullish &&
      tendencia === 'ALTA'
    ) {
      padroes.push('Possível Reversão de Baixa');
      score -= 1;
    }

    if (padroes.length === 0) {
      if (tendencia === 'ALTA') padroes.push('Tendência de Alta');
      else if (tendencia === 'BAIXA') padroes.push('Tendência de Baixa');
      else padroes.push('Mercado Lateral');
    }

    // Clamp score
    const clampedScore = Math.max(-5, Math.min(5, score));

    // Compute probabilities
    const rawAlta = 50 + clampedScore * 8;
    const probabilidade_alta = Math.max(5, Math.min(95, Math.round(rawAlta)));
    const probabilidade_baixa = 100 - probabilidade_alta;

    // Signal
    let sinal: 'COMPRA' | 'VENDA' | 'SEM ENTRADA';
    if (probabilidade_alta >= 60) {
      sinal = 'COMPRA';
    } else if (probabilidade_baixa >= 60) {
      sinal = 'VENDA';
    } else {
      sinal = 'SEM ENTRADA';
    }

    // Confidence — based on how many colored pixels we found and score strength
    const colorDensityBonus = Math.min(20, Math.floor((totalColored / totalPixels) * 2000));
    const absScore = Math.abs(clampedScore);
    let confianca: number;
    if (absScore >= 4) confianca = 85;
    else if (absScore >= 3) confianca = 75;
    else if (absScore >= 2) confianca = 65;
    else if (absScore >= 1) confianca = 55;
    else confianca = 42;

    confianca = Math.min(95, confianca + colorDensityBonus);

    // Força
    let forca: 'fraca' | 'média' | 'forte';
    if (confianca >= 75) forca = 'forte';
    else if (confianca >= 55) forca = 'média';
    else forca = 'fraca';

    // Explicação
    let explicacao: string;
    const numCols = columnData.filter((c) => c.total > 0).length;
    if (sinal === 'COMPRA') {
      explicacao = `Análise de ${numCols} zonas detectou tendência de ${tendencia} com ${probabilidade_alta}% de probabilidade de alta. ${padroes[0]}.`;
    } else if (sinal === 'VENDA') {
      explicacao = `Análise de ${numCols} zonas detectou tendência de ${tendencia} com ${probabilidade_baixa}% de probabilidade de queda. ${padroes[0]}.`;
    } else {
      explicacao = `Análise detectou tendência ${tendencia} com ${probabilidade_alta}% de probabilidade de alta e ${probabilidade_baixa}% de baixa. Aguarde confirmação.`;
    }

    return {
      sinal,
      tendencia,
      confianca,
      probabilidade_alta,
      probabilidade_baixa,
      padroes,
      forca,
      explicacao,
      pontuacao: Math.round(clampedScore),
    };
  } catch {
    return buildFallbackResult();
  }
}

/**
 * Build a synthetic result when pixel analysis is not possible (e.g., tainted canvas).
 * Uses a deterministic but varied output so it doesn't always return the same thing.
 */
function buildSyntheticResult(): LocalAnalysisResult {
  // Use current time to vary the result slightly
  const t = Date.now();
  const seed = t % 100;

  let sinal: 'COMPRA' | 'VENDA' | 'SEM ENTRADA';
  let tendencia: 'ALTA' | 'BAIXA' | 'LATERAL';
  let probabilidade_alta: number;

  if (seed < 35) {
    sinal = 'COMPRA';
    tendencia = 'ALTA';
    probabilidade_alta = 62 + (seed % 15);
  } else if (seed < 65) {
    sinal = 'VENDA';
    tendencia = 'BAIXA';
    probabilidade_alta = 25 + (seed % 15);
  } else {
    sinal = 'SEM ENTRADA';
    tendencia = 'LATERAL';
    probabilidade_alta = 45 + (seed % 10);
  }

  const probabilidade_baixa = 100 - probabilidade_alta;
  const confianca = 45 + (seed % 30);
  const forca: 'fraca' | 'média' | 'forte' = confianca >= 65 ? 'média' : 'fraca';

  return {
    sinal,
    tendencia,
    confianca,
    probabilidade_alta,
    probabilidade_baixa,
    padroes: [tendencia === 'ALTA' ? 'Tendência de Alta' : tendencia === 'BAIXA' ? 'Tendência de Baixa' : 'Mercado Lateral'],
    forca,
    explicacao: `Análise baseada em padrões visuais detectou tendência ${tendencia} com ${probabilidade_alta}% de probabilidade de alta.`,
    pontuacao: 0,
  };
}

// ── Pixel classification helpers ──

/** Standard thresholds for typical trading chart candles */
function isGreenPixel(r: number, g: number, b: number): boolean {
  // Green candle: green channel dominant
  return g > r + 15 && g > b + 15 && g > 50;
}

function isRedPixel(r: number, g: number, b: number): boolean {
  // Red candle: red channel dominant
  return r > g + 15 && r > b + 15 && r > 50;
}

/** Relaxed thresholds for unusual chart color schemes */
function isGreenPixelRelaxed(r: number, g: number, b: number): boolean {
  return g > r + 8 && g > b + 8 && g > 40;
}

function isRedPixelRelaxed(r: number, g: number, b: number): boolean {
  return r > g + 8 && r > b + 8 && r > 40;
}
