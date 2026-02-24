# Specification

## Summary
**Goal:** Replace local AI analysis with external REST API integration to separate frontend from AI processing logic.

**Planned changes:**
- Remove all local mock AI analysis generation from ProcessingScreen.tsx
- Create new API service module (analysisApi.ts) to POST chart images to external '/analisar-grafico' endpoint using multipart/form-data
- Define TypeScript interfaces for API response schema (sinal, tendencia, confianca, padroes, explicacao)
- Update ProcessingScreen to call external API and handle real network requests with error handling
- Update Results.tsx to render analysis data from external API response
- Add configuration support for multiple AI providers (OpenAI ChatGPT Vision, Google Gemini Vision, custom Python backend)
- Update backend to accept externally-generated analysis data for history storage
- Implement error handling with Portuguese messages for network failures and timeouts

**User-visible outcome:** Users upload chart images that are sent to an external AI API for analysis. The app displays processing stages during the real API request, then shows analysis results (signal, trend, confidence, patterns, explanation) returned from the external service. Error messages appear in Portuguese if the API connection fails.
