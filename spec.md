# Specification

## Summary
**Goal:** Remove the external Gemini API integration entirely and replace it with a fully client-side local candle analysis engine that reads pixel data from uploaded chart images to generate trading signals.

**Planned changes:**
- Remove `analysisApi.ts`, `apiConfig.ts`, and all API key validation logic from the frontend
- Remove `getGeminiApiKey` and `setGeminiApiKey` functions from `backend/main.mo`
- Create `frontend/src/services/localCandleAnalysis.ts` with a canvas-based pixel analysis engine that detects candles, trends, and patterns locally without any HTTP requests
- Define `LocalAnalysisResult` interface in `frontend/src/types/analysisTypes.ts` with all analysis fields and JSDoc comments
- Update `ProcessingScreen.tsx` to use the local engine with four sequential Portuguese processing stages and appropriate error handling
- Update `frontend/src/utils/mapApiResponse.ts` to map `LocalAnalysisResult` to the internal `AnalysisResult` format
- Update `Results.tsx` to show a small chart thumbnail (~80×60 px) beside the results retrieved from sessionStorage
- Update `Results.tsx` to display a probability sentence ("XX% de probabilidade de ALTA / YY% de BAIXA na próxima vela") with green/red styling and two proportional horizontal bars
- Update `Results.tsx` to display result fields in order: Tendência, Padrões, Força (color-coded badge), Confiança, Sinal (with arrows), Explicação — all in Portuguese (Brazil)
- Update `Settings.tsx` to replace the Gemini API key section with a "Configuração de Análise de Candles" section containing a read-only "Motor de análise: Local (sem API externa)" row plus existing sensitivity, timeframe, and daily limit controls

**User-visible outcome:** Users can upload a chart image and receive a fully local candle analysis (signal, trend, probabilities, patterns, explanation) with no API key required. The Results page shows the chart thumbnail, probability bars, and all analysis fields in Portuguese. Settings no longer contain any API key input.
