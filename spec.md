# Specification

## Summary
**Goal:** Fix the Gemini API 404 error by correcting the endpoint URL, request format, and error handling in the frontend.

**Planned changes:**
- Update `apiConfig.ts` to hardcode the correct Gemini Vision API endpoint (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`) and ensure `buildGeminiUrl` appends `?key=<apiKey>` as a query parameter, with inline comments documenting each URL component
- Update `analysisApi.ts` to send Gemini requests using `fetch` with `Content-Type: application/json` and a JSON body containing `contents[0].parts` with a text part and an `inlineData` part (base64-encoded image), removing any FormData/multipart approach
- Update `ProcessingScreen.tsx` to detect HTTP 404 responses from the Gemini API and display a Portuguese error message with an "Ir para Configurações" button that navigates to the Settings page

**User-visible outcome:** When a Gemini API call is made, it reaches the correct endpoint successfully. If a 404 error still occurs, the user sees a clear Portuguese error message and a button to navigate to Settings for correction.
