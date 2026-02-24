# Specification

## Summary
**Goal:** Fix API key configuration error preventing mobile Pocket Option screenshot analysis and add proper API key management in Settings.

**Planned changes:**
- Add API key validation in frontend/src/config/apiConfig.ts that checks if Gemini API key is configured before allowing analysis
- Display Portuguese error message "CHAVE DE API NÃO CONFIGURADA - Configure a chave da API nas configurações" when key is missing
- Update frontend/src/services/analysisApi.ts to handle mobile Pocket Option screenshots with dark theme and candlestick charts
- Add enhanced logging for mobile screenshot analysis (dimensions, file size, broker detection, preprocessing steps)
- Update frontend/src/pages/ProcessingScreen.tsx to validate API key before starting analysis stages
- Add Gemini API key configuration field to frontend/src/pages/Settings.tsx with secure storage

**User-visible outcome:** Users can configure their Gemini API key in Settings and successfully analyze mobile screenshots from Pocket Option broker. Clear Portuguese error messages guide users to configure the API key when missing, preventing analysis failures.
