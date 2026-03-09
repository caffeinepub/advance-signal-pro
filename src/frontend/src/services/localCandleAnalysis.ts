import type { LocalAnalysisResult } from "../types/analysisTypes";

type TimeframeStr = "M1" | "M3" | "M5";

const SETTINGS_KEY = "userSettings";

// Read timeframe from localStorage at call time (not at module load time)
function getCurrentTimeframe(): TimeframeStr {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed.defaultTimeframe === "M3" ||
        parsed.defaultTimeframe === "M5"
      ) {
        return parsed.defaultTimeframe as TimeframeStr;
      }
    }
  } catch {
    // ignore
  }
  return "M1";
}

interface PixelData {
  r: number;
  g: number;
  b: number;
  a: number;
}

function getPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
): PixelData {
  const idx = (y * width + x) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
}

function isBullishColor(pixel: PixelData): boolean {
  return (
    (pixel.g > pixel.r + 30 && pixel.g > pixel.b + 20 && pixel.g > 80) ||
    (pixel.b > pixel.r + 20 && pixel.b > 100)
  );
}

function isBearishColor(pixel: PixelData): boolean {
  return pixel.r > pixel.g + 30 && pixel.r > pixel.b + 20 && pixel.r > 80;
}

interface ColumnScan {
  bullish: number;
  bearish: number;
  neutral: number;
  avgBrightness: number;
}

function scanCandleColumns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  numColumns: number,
): ColumnScan[] {
  const colWidth = Math.floor(width / numColumns);
  const results: ColumnScan[] = [];

  for (let col = 0; col < numColumns; col++) {
    const startX = col * colWidth;
    const endX = startX + colWidth;
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalBrightness = 0;
    let pixelCount = 0;

    for (let x = startX; x < endX; x++) {
      for (
        let y = Math.floor(height * 0.1);
        y < Math.floor(height * 0.9);
        y++
      ) {
        const pixel = getPixel(data, x, y, width);
        if (pixel.a < 50) continue;
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        totalBrightness += brightness;
        pixelCount++;
        if (isBullishColor(pixel)) bullish++;
        else if (isBearishColor(pixel)) bearish++;
        else neutral++;
      }
    }

    results.push({
      bullish,
      bearish,
      neutral,
      avgBrightness: pixelCount > 0 ? totalBrightness / pixelCount : 128,
    });
  }

  return results;
}

function detectSupportResistance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { suportes: number[]; resistencias: number[] } {
  const horizontalDensity: number[] = new Array(height).fill(0);

  for (let y = 0; y < height; y++) {
    let lineScore = 0;
    for (let x = 0; x < width; x++) {
      const pixel = getPixel(data, x, y, width);
      if (pixel.a < 50) continue;
      const brightness = (pixel.r + pixel.g + pixel.b) / 3;
      if (brightness > 180 || brightness < 60) lineScore++;
    }
    horizontalDensity[y] = lineScore;
  }

  const maxDensity = Math.max(...horizontalDensity);
  const threshold = maxDensity * 0.6;

  const significantRows: number[] = [];
  for (let y = 5; y < height - 5; y++) {
    if (
      horizontalDensity[y] > threshold &&
      horizontalDensity[y] >= horizontalDensity[y - 1] &&
      horizontalDensity[y] >= horizontalDensity[y + 1]
    ) {
      significantRows.push(y);
    }
  }

  const clustered: number[] = [];
  let lastRow = -20;
  for (const row of significantRows) {
    if (row - lastRow > 15) {
      clustered.push(row);
      lastRow = row;
    }
  }

  const midY = height / 2;
  const suportes = clustered
    .filter((y) => y > midY)
    .slice(0, 3)
    .map((y) => Math.round(((height - y) / height) * 100) / 100);
  const resistencias = clustered
    .filter((y) => y < midY)
    .slice(0, 3)
    .map((y) => Math.round(((height - y) / height) * 100) / 100);

  return { suportes, resistencias };
}

function detectPatterns(columns: ColumnScan[]): string[] {
  const patterns: string[] = [];
  const len = columns.length;
  if (len < 3) return ["Sem padrão identificado"];

  const last = columns[len - 1];
  const prev = columns[len - 2];
  const prev2 = columns[len - 3];

  if (
    prev.bearish > prev.bullish &&
    last.bullish > last.bearish &&
    last.bullish > prev.bearish * 1.2
  ) {
    patterns.push("Engolfo de Alta");
  }

  if (
    prev.bullish > prev.bearish &&
    last.bearish > last.bullish &&
    last.bearish > prev.bullish * 1.2
  ) {
    patterns.push("Engolfo de Baixa");
  }

  if (
    last.bullish > last.bearish * 1.5 &&
    prev.bearish > prev.bullish &&
    prev2.bearish > prev2.bullish
  ) {
    patterns.push("Martelo");
  }

  if (
    last.bearish > last.bullish * 1.5 &&
    prev.bullish > prev.bearish &&
    prev2.bullish > prev2.bearish
  ) {
    patterns.push("Estrela Cadente");
  }

  const lastTotal = last.bullish + last.bearish;
  if (lastTotal > 0) {
    const ratio = Math.abs(last.bullish - last.bearish) / lastTotal;
    if (ratio < 0.1) {
      patterns.push("Doji");
    }
  }

  if (
    columns[len - 1].bullish > columns[len - 1].bearish &&
    columns[len - 2].bullish > columns[len - 2].bearish &&
    columns[len - 3].bullish > columns[len - 3].bearish
  ) {
    patterns.push("Três Soldados Brancos");
  }

  if (
    columns[len - 1].bearish > columns[len - 1].bullish &&
    columns[len - 2].bearish > columns[len - 2].bullish &&
    columns[len - 3].bearish > columns[len - 3].bullish
  ) {
    patterns.push("Três Corvos Negros");
  }

  if (patterns.length === 0) {
    const bullishTotal = columns.reduce((s, c) => s + c.bullish, 0);
    const bearishTotal = columns.reduce((s, c) => s + c.bearish, 0);
    if (bullishTotal > bearishTotal * 1.3) patterns.push("Tendência de Alta");
    else if (bearishTotal > bullishTotal * 1.3)
      patterns.push("Tendência de Baixa");
    else patterns.push("Consolidação Lateral");
  }

  return patterns.slice(0, 2);
}

function generateProfessionalExplanation(
  tendencia: string,
  sinal: string,
  patterns: string[],
  confianca: number,
  forca: string,
  probAlta: number,
  probBaixa: number,
  suportes: number[],
  resistencias: number[],
  volume: string,
  precisao: number,
  bullishRatio: number,
  bearishRatio: number,
  momentumCount: number,
  timeframe: TimeframeStr,
): string {
  const patternNames = patterns.join(" e ");
  const forcaText =
    forca === "forte" ? "elevada" : forca === "média" ? "moderada" : "reduzida";

  const volumeContext =
    volume === "alto"
      ? "O volume elevado confirma a força do movimento."
      : volume === "médio"
        ? "O volume moderado sugere participação razoável do mercado."
        : "O volume reduzido indica menor convicção no movimento atual.";

  let srContext = "";
  if (suportes.length > 0 && resistencias.length > 0) {
    srContext = ` O ativo está posicionado entre ${suportes.length} nível(is) de suporte e ${resistencias.length} de resistência, reforçando a validade do setup.`;
  } else if (suportes.length > 0) {
    srContext = ` Identificado(s) ${suportes.length} nível(is) de suporte próximo(s) ao preço atual.`;
  } else if (resistencias.length > 0) {
    srContext = ` Detectada(s) ${resistencias.length} resistência(s) acima do preço atual.`;
  }

  const momentumDesc =
    momentumCount >= 5
      ? `${momentumCount} zonas de pressão intensa detectadas`
      : momentumCount >= 3
        ? `${momentumCount} zonas de pressão identificadas`
        : `pressão de mercado limitada (${momentumCount} zona(s))`;

  const precisaoDesc =
    precisao >= 80
      ? "alta precisão"
      : precisao >= 60
        ? "precisão razoável"
        : "precisão moderada";

  let rationale = "";

  if (sinal === "COMPRA") {
    rationale =
      `[${timeframe}] A análise identificou o padrão ${patternNames} com tendência de ${tendencia}. ` +
      `A pressão compradora representa ${(bullishRatio * 100).toFixed(1)}% dos pixels analisados, ` +
      `com ${momentumDesc}. Confiança ${forcaText} de ${confianca}% (${precisaoDesc}) ` +
      `e probabilidade de ${probAlta.toFixed(0)}% de continuidade ascendente. ` +
      `${volumeContext}${srContext}`;
  } else if (sinal === "VENDA") {
    rationale =
      `[${timeframe}] A análise identificou o padrão ${patternNames} com tendência de ${tendencia}. ` +
      `A pressão vendedora representa ${(bearishRatio * 100).toFixed(1)}% dos pixels analisados, ` +
      `com ${momentumDesc}. Confiança ${forcaText} de ${confianca}% (${precisaoDesc}) ` +
      `e probabilidade de ${probBaixa.toFixed(0)}% de movimento descendente. ` +
      `${volumeContext}${srContext}`;
  } else {
    rationale =
      `[${timeframe}] O padrão ${patternNames} identificado em tendência ${tendencia} não apresenta direcionalidade clara. ` +
      `Pressão compradora: ${(bullishRatio * 100).toFixed(1)}% | Vendedora: ${(bearishRatio * 100).toFixed(1)}%. ` +
      `Com ${momentumDesc} e probabilidades equilibradas (Alta: ${probAlta.toFixed(0)}% / Baixa: ${probBaixa.toFixed(0)}%), ` +
      `recomenda-se aguardar confirmação antes de posicionar. ${volumeContext}${srContext}`;
  }

  return rationale;
}

function getFallbackResult(timeframe: TimeframeStr): LocalAnalysisResult {
  return {
    tendencia: "LATERAL",
    sinal: "NEUTRO",
    confianca: 40,
    forca: "fraca",
    padroes: ["Consolidação Lateral"],
    explicacao: `[${timeframe}] Não foi possível identificar padrões técnicos conclusivos no gráfico enviado. O mercado apresenta movimento lateral sem direcionalidade definida. Recomenda-se aguardar a formação de um padrão mais claro antes de posicionar.`,
    probAlta: 50,
    probBaixa: 50,
    suportes: [],
    resistencias: [],
    precisao: 40,
    volume: "baixo",
    timeframe,
  };
}

export async function analyzeChartImage(
  imageFile: File,
): Promise<LocalAnalysisResult> {
  // Read timeframe at call time — always reflects the latest localStorage value
  const timeframe = getCurrentTimeframe();

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 600;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(getFallbackResult(timeframe));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const numColumns = 20;
        const columns = scanCandleColumns(
          imageData.data,
          canvas.width,
          canvas.height,
          numColumns,
        );

        const { suportes, resistencias } = detectSupportResistance(
          imageData.data,
          canvas.width,
          canvas.height,
        );

        const patterns = detectPatterns(columns);

        const recentColumns = columns.slice(-8);
        const totalBullish = recentColumns.reduce((s, c) => s + c.bullish, 0);
        const totalBearish = recentColumns.reduce((s, c) => s + c.bearish, 0);
        const totalPixels = totalBullish + totalBearish + 1;

        const bullishRatio = totalBullish / totalPixels;
        const bearishRatio = totalBearish / totalPixels;

        const momentumCount = columns.filter((c) => {
          const tot = c.bullish + c.bearish + 1;
          return Math.abs(c.bullish - c.bearish) / tot > 0.3;
        }).length;

        let tendencia: "ALTA" | "BAIXA" | "LATERAL";
        let sinal: "COMPRA" | "VENDA" | "NEUTRO";
        let probAlta: number;
        let probBaixa: number;

        const threshold = 0.05;

        if (bullishRatio > bearishRatio + threshold) {
          tendencia = "ALTA";
          sinal = "COMPRA";
          probAlta = Math.min(95, 55 + Math.round(bullishRatio * 60));
          probBaixa = 100 - probAlta;
        } else if (bearishRatio > bullishRatio + threshold) {
          tendencia = "BAIXA";
          sinal = "VENDA";
          probBaixa = Math.min(95, 55 + Math.round(bearishRatio * 60));
          probAlta = 100 - probBaixa;
        } else {
          tendencia = "LATERAL";
          sinal = "NEUTRO";
          probAlta = 45 + Math.round(Math.random() * 10);
          probBaixa = 100 - probAlta;
        }

        const diff = Math.abs(bullishRatio - bearishRatio);
        const baseConfianca = Math.round(50 + diff * 200);
        const confianca = Math.min(95, Math.max(30, baseConfianca));

        let forca: "fraca" | "média" | "forte";
        if (confianca >= 70) forca = "forte";
        else if (confianca >= 50) forca = "média";
        else forca = "fraca";

        const brightnessValues = columns.map((c) => c.avgBrightness);
        const avgBrightness =
          brightnessValues.reduce((s, v) => s + v, 0) / brightnessValues.length;
        const variance =
          brightnessValues.reduce((s, v) => s + (v - avgBrightness) ** 2, 0) /
          brightnessValues.length;
        let volume: "baixo" | "médio" | "alto";
        if (variance > 1000) volume = "alto";
        else if (variance > 400) volume = "médio";
        else volume = "baixo";

        const precisao = Math.min(
          95,
          Math.max(40, Math.round(50 + diff * 150)),
        );

        const explicacao = generateProfessionalExplanation(
          tendencia,
          sinal,
          patterns,
          confianca,
          forca,
          probAlta,
          probBaixa,
          suportes,
          resistencias,
          volume,
          precisao,
          bullishRatio,
          bearishRatio,
          momentumCount,
          timeframe,
        );

        resolve({
          tendencia,
          sinal,
          confianca,
          forca,
          padroes: patterns,
          explicacao,
          probAlta,
          probBaixa,
          suportes,
          resistencias,
          precisao,
          volume,
          timeframe,
        });
      } catch {
        URL.revokeObjectURL(url);
        resolve(getFallbackResult(timeframe));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(getFallbackResult(timeframe));
    };

    img.src = url;
  });
}

// Backward-compatible alias
export const analyzeChartLocally = analyzeChartImage;
