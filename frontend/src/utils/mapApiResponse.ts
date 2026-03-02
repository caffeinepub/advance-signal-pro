import { LocalAnalysisResult } from '../types/analysisTypes';

/**
 * Internal AnalysisResult shape used by the Results page (stored in sessionStorage).
 * This is a plain serialisable object derived from LocalAnalysisResult.
 */
export interface AnalysisResult {
  sinal: string;
  tendencia: string;
  confianca: number;
  probAlta: number;
  probBaixa: number;
  padroes: string[];
  forca: string;
  explicacao: string;
  precisao: number;
  volume: string;
  timeframe: string;
  suportes: number[];
  resistencias: number[];
}

export function mapLocalAnalysisResult(local: LocalAnalysisResult): AnalysisResult {
  return {
    sinal: local.sinal,
    tendencia: local.tendencia,
    confianca: local.confianca,
    probAlta: local.probAlta,
    probBaixa: local.probBaixa,
    padroes: local.padroes,
    forca: local.forca,
    explicacao: local.explicacao,
    precisao: local.precisao,
    volume: local.volume,
    timeframe: local.timeframe,
    suportes: local.suportes,
    resistencias: local.resistencias,
  };
}
