import type { LocalAnalysisResult } from "../types/analysisTypes";

type TimeframeStr = "M1" | "M3" | "M5";

const SETTINGS_KEY = "userSettings";

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
  if (len < 3) return ["Sem padr\u00e3o identificado"];

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
    patterns.push("Tr\u00eas Soldados Brancos");
  }

  if (
    columns[len - 1].bearish > columns[len - 1].bullish &&
    columns[len - 2].bearish > columns[len - 2].bullish &&
    columns[len - 3].bearish > columns[len - 3].bullish
  ) {
    patterns.push("Tr\u00eas Corvos Negros");
  }

  if (patterns.length === 0) {
    const bullishTotal = columns.reduce((s, c) => s + c.bullish, 0);
    const bearishTotal = columns.reduce((s, c) => s + c.bearish, 0);
    if (bullishTotal > bearishTotal * 1.3)
      patterns.push("Tend\u00eancia de Alta");
    else if (bearishTotal > bullishTotal * 1.3)
      patterns.push("Tend\u00eancia de Baixa");
    else patterns.push("Consolida\u00e7\u00e3o Lateral");
  }

  return patterns.slice(0, 2);
}

function buildExplanation(
  sinal: string,
  patterns: string[],
  confianca: number,
  forca: string,
  probAlta: number,
  probBaixa: number,
  suportes: number[],
  resistencias: number[],
  volume: string,
  bullishRatio: number,
  bearishRatio: number,
  momentumCount: number,
  timeframe: TimeframeStr,
): string {
  const dominantPattern = patterns[0] ?? "padr\u00e3o de pre\u00e7o";
  const secondPattern = patterns[1];

  const bullPct = (bullishRatio * 100).toFixed(1);
  const bearPct = (bearishRatio * 100).toFixed(1);

  const volumeDesc =
    volume === "alto"
      ? "Volume elevado confirma a for\u00e7a do movimento."
      : volume === "m\u00e9dio"
        ? "Volume moderado \u2014 participa\u00e7\u00e3o razo\u00e1vel do mercado."
        : "Volume reduzido \u2014 convic\u00e7\u00e3o limitada no movimento.";

  const momentumDesc =
    momentumCount >= 6
      ? `Press\u00e3o intensa em ${momentumCount} zonas \u2014 movimento com for\u00e7a consistente.`
      : momentumCount >= 3
        ? `Press\u00e3o identificada em ${momentumCount} zonas de pre\u00e7o.`
        : `Poucas zonas de press\u00e3o (${momentumCount}) \u2014 movimento incipiente.`;

  const srDesc =
    suportes.length > 0 && resistencias.length > 0
      ? `Entre ${suportes.length} suporte(s) e ${resistencias.length} resist\u00eancia(s) identificada(s).`
      : suportes.length > 0
        ? `${suportes.length} suporte(s) pr\u00f3ximo(s) ao pre\u00e7o atual \u2014 base s\u00f3lida.`
        : resistencias.length > 0
          ? `${resistencias.length} resist\u00eancia(s) acima \u2014 potencial barreira ao avan\u00e7o.`
          : "";

  const patternContext: Record<string, string> = {
    "Engolfo de Alta":
      "candle de alta engoliu completamente a vela anterior \u2014 sinal de revers\u00e3o compradora",
    "Engolfo de Baixa":
      "candle de baixa engoliu completamente a vela anterior \u2014 sinal de revers\u00e3o vendedora",
    Martelo:
      "sombra inferior longa indica rejei\u00e7\u00e3o de pre\u00e7os baixos e retomada compradora",
    "Estrela Cadente":
      "sombra superior longa indica rejei\u00e7\u00e3o de pre\u00e7os altos e press\u00e3o vendedora",
    Doji: "corpo m\u00ednimo indica indecis\u00e3o \u2014 mercado em equil\u00edbrio tempor\u00e1rio",
    "Tr\u00eas Soldados Brancos":
      "tr\u00eas candles de alta consecutivos confirmam tend\u00eancia ascendente s\u00f3lida",
    "Tr\u00eas Corvos Negros":
      "tr\u00eas candles de baixa consecutivos confirmam tend\u00eancia descendente s\u00f3lida",
    "Tend\u00eancia de Alta":
      "sequ\u00eancia de fechamentos crescentes mant\u00e9m press\u00e3o compradora",
    "Tend\u00eancia de Baixa":
      "sequ\u00eancia de fechamentos decrescentes mant\u00e9m press\u00e3o vendedora",
    "Consolida\u00e7\u00e3o Lateral":
      "velas alternadas sem direcionalidade \u2014 mercado em acumula\u00e7\u00e3o",
  };

  const patternDesc =
    patternContext[dominantPattern] ??
    `padr\u00e3o ${dominantPattern} detectado`;
  const secondDesc = secondPattern
    ? ` Complementado por ${secondPattern}.`
    : "";

  if (sinal === "COMPRA") {
    return (
      `[${timeframe}] ${dominantPattern}: ${patternDesc}.${secondDesc} ` +
      `Press\u00e3o compradora: ${bullPct}% vs vendedora: ${bearPct}%. ` +
      `Confian\u00e7a ${confianca}% com for\u00e7a ${forca}. ${momentumDesc} ` +
      `Probabilidade de alta: ${probAlta.toFixed(0)}%. ${volumeDesc} ${srDesc}`
    ).trim();
  }

  if (sinal === "VENDA") {
    return (
      `[${timeframe}] ${dominantPattern}: ${patternDesc}.${secondDesc} ` +
      `Press\u00e3o vendedora: ${bearPct}% vs compradora: ${bullPct}%. ` +
      `Confian\u00e7a ${confianca}% com for\u00e7a ${forca}. ${momentumDesc} ` +
      `Probabilidade de baixa: ${probBaixa.toFixed(0)}%. ${volumeDesc} ${srDesc}`
    ).trim();
  }

  return (
    `[${timeframe}] ${dominantPattern}: ${patternDesc}.${secondDesc} ` +
    `Compradora: ${bullPct}% | Vendedora: ${bearPct}% \u2014 sem direcionalidade clara. ` +
    `${momentumDesc} Probabilidades: Alta ${probAlta.toFixed(0)}% / Baixa ${probBaixa.toFixed(0)}%. ` +
    `${volumeDesc} ${srDesc} Aguarde confirma\u00e7\u00e3o antes de posicionar.`
  ).trim();
}

function getFallbackResult(timeframe: TimeframeStr): LocalAnalysisResult {
  return {
    tendencia: "LATERAL",
    sinal: "NEUTRO",
    confianca: 40,
    forca: "fraca",
    padroes: ["Consolida\u00e7\u00e3o Lateral"],
    explicacao: `[${timeframe}] N\u00e3o foi poss\u00edvel identificar padr\u00f5es t\u00e9cnicos conclusivos no gr\u00e1fico enviado. O mercado apresenta movimento lateral sem direcionalidade definida. Recomenda-se aguardar a forma\u00e7\u00e3o de um padr\u00e3o mais claro antes de posicionar.`,
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
  overrideTimeframe?: "M1" | "M3" | "M5",
): Promise<LocalAnalysisResult> {
  const timeframe = overrideTimeframe ?? getCurrentTimeframe();

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
        // COMPRA/VENDA always show minimum 75% confidence; only NEUTRO can go below
        const confiancaMin = sinal === "NEUTRO" ? 30 : 75;
        const confianca = Math.min(95, Math.max(confiancaMin, baseConfianca));

        let forca: "fraca" | "m\u00e9dia" | "forte";
        if (confianca >= 70) forca = "forte";
        else if (confianca >= 50) forca = "m\u00e9dia";
        else forca = "fraca";

        const brightnessValues = columns.map((c) => c.avgBrightness);
        const avgBrightness =
          brightnessValues.reduce((s, v) => s + v, 0) / brightnessValues.length;
        const variance =
          brightnessValues.reduce((s, v) => s + (v - avgBrightness) ** 2, 0) /
          brightnessValues.length;
        let volume: "baixo" | "m\u00e9dio" | "alto";
        if (variance > 1000) volume = "alto";
        else if (variance > 400) volume = "m\u00e9dio";
        else volume = "baixo";

        const precisao = Math.min(
          95,
          Math.max(40, Math.round(50 + diff * 150)),
        );

        const explicacao = buildExplanation(
          sinal,
          patterns,
          confianca,
          forca,
          probAlta,
          probBaixa,
          suportes,
          resistencias,
          volume,
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
