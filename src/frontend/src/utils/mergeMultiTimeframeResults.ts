import type {
  LocalAnalysisResult,
  MultiTimeframeEntry,
} from "../types/analysisTypes";
import type { AnalysisResult } from "./mapApiResponse";

/**
 * Merges multiple per-timeframe LocalAnalysisResult objects into a single AnalysisResult.
 * When only one result is provided, returns a standard single-timeframe result without multiTimeframe.
 * When multiple results are provided, uses the highest-confidence result as the primary signal
 * and attaches all results in the multiTimeframe array.
 */
export function mergeMultiTimeframeResults(
  results: Array<{
    timeframe: "M1" | "M3" | "M5";
    result: LocalAnalysisResult;
  }>,
): AnalysisResult {
  if (results.length === 0) {
    throw new Error("Nenhum resultado para mesclar");
  }

  if (results.length === 1) {
    const { result } = results[0];
    return {
      sinal: result.sinal,
      tendencia: result.tendencia,
      confianca: result.confianca,
      probAlta: result.probAlta,
      probBaixa: result.probBaixa,
      padroes: result.padroes,
      forca: result.forca,
      explicacao: result.explicacao,
      precisao: result.precisao,
      volume: result.volume,
      timeframe: result.timeframe,
      suportes: result.suportes,
      resistencias: result.resistencias,
    };
  }

  // Pick the result with the highest confidence as the primary signal
  const primary = results.reduce((best, curr) =>
    curr.result.confianca > best.result.confianca ? curr : best,
  );

  const multiTimeframe: MultiTimeframeEntry[] = results.map(
    ({ timeframe, result }) => ({
      timeframe,
      sinal: result.sinal,
      tendencia: result.tendencia,
      confianca: result.confianca,
      probabilidade_alta: result.probAlta,
      probabilidade_baixa: result.probBaixa,
      padroes: result.padroes,
      forca: result.forca,
      explicacao: result.explicacao,
      precisao: result.precisao,
      volume: result.volume,
      suportes: result.suportes,
      resistencias: result.resistencias,
    }),
  );

  return {
    sinal: primary.result.sinal,
    tendencia: primary.result.tendencia,
    confianca: primary.result.confianca,
    probAlta: primary.result.probAlta,
    probBaixa: primary.result.probBaixa,
    padroes: primary.result.padroes,
    forca: primary.result.forca,
    explicacao: primary.result.explicacao,
    precisao: primary.result.precisao,
    volume: primary.result.volume,
    timeframe: primary.result.timeframe,
    suportes: primary.result.suportes,
    resistencias: primary.result.resistencias,
    multiTimeframe,
  };
}
