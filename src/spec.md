# Specification

## Summary
**Goal:** Fix the HTTP 403 error that occurs when users upload chart screenshots from mobile devices for AI analysis.

**Planned changes:**
- Investigate and fix the API request format in `frontend/src/services/analysisApi.ts` to ensure mobile screenshots are properly encoded with correct headers and authentication
- Add diagnostic logging to capture request details (headers, payload size, content type) when 403 errors occur
- Verify Google Gemini Vision API key permissions and add validation before sending requests
- Implement image preprocessing to handle mobile screenshot formats (HEIC/HEIF conversion, resizing for API limits) before uploading

**User-visible outcome:** Users can successfully analyze chart screenshots captured from mobile devices without encountering 403 errors, with clear Portuguese error messages when issues occur.
