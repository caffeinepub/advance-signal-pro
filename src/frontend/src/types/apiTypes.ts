// External API response types for chart analysis
export interface ApiAnalysisResponse {
  sinal: 'COMPRA' | 'VENDA';
  tendencia: string;
  confianca: number;
  padroes: string[];
  explicacao: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
