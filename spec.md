# Specification

## Summary
**Goal:** Fix screenshot analysis in `analysisApi.ts` so Gemini correctly receives and interprets trading chart images and returns reliable next-candle predictions.

**Planned changes:**
- Rewrite the Gemini API prompt to be short (under 200 words), focused solely on identifying the candlestick chart area, examining the last 5 candles, and predicting the next candle direction; requesting a raw JSON-only response with fields: `sinal`, `tendencia`, `confianca`, `padroes`, `explicacao`
- Update the Gemini response parser to strip markdown code fences, fall back to extracting the first `{...}` block if direct parsing fails, log the raw response to the console, and throw a Portuguese-language `AnalysisApiError` when no valid JSON can be extracted
- Fix the image base64 conversion to strip the data URI prefix before sending to Gemini, correctly set `mimeType` from the actual file type, and log the mimeType and base64 length before the fetch call

**User-visible outcome:** Screenshot analysis will correctly process uploaded chart images and return accurate next-candle predictions without silent failures or parsing errors.
