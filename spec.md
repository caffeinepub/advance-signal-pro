# Specification

## Summary
**Goal:** Fix the Gemini API integration to resolve 404 errors caused by incorrect endpoint URL construction and improper request formatting.

**Planned changes:**
- Hardcode the correct Gemini Vision API endpoint URL (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`) in `apiConfig.ts`, with `buildGeminiUrl(apiKey)` appending the API key as a `?key=<apiKey>` query parameter and inline comments documenting the URL structure
- Update `analysisApi.ts` to send Gemini requests via `fetch` POST with `Content-Type: application/json` and a `contents[].parts[]` JSON body containing the text prompt and base64 inline image data (with data URI prefix stripped and dynamic mimeType); remove all FormData/multipart code paths for the Gemini provider
- Update `ProcessingScreen.tsx` to detect HTTP 404 responses from Gemini and display a Portuguese error message with a button labeled "Ir para Configurações" that navigates to the Settings page

**User-visible outcome:** Image analysis requests to the Gemini API no longer return 404 errors. If a 404 does occur, users see a clear Portuguese error message and a button to navigate to Settings for configuration review.
