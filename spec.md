# Specification

## Summary
**Goal:** Enable multi-timeframe chart analysis by allowing users to upload up to 3 chart screenshots (M1, M3, M5) in the AnalyzeChart page, process each independently, and display a per-timeframe breakdown in the Results page.

**Planned changes:**
- Replace the single upload area in `AnalyzeChart.tsx` with three distinct vertically-arranged upload slots labeled "M1 — 1 minuto", "M3 — 3 minutos", and "M5 — 5 minutos", each supporting file picker, camera capture, clipboard paste, and drag-and-drop; each slot shows a preview thumbnail with an "X" remove button once filled
- The "Analisar Gráfico" button remains disabled until at least one slot is filled
- Update sessionStorage logic in `AnalyzeChart.tsx` to store each filled slot under `chartImage_M1`, `chartImage_M3`, `chartImage_M5` keys plus a `chartImages_count` key; clear legacy `chartImage` key; show a Portuguese error toast and block navigation if storage fails
- Update `ProcessingScreen.tsx` to read all three sessionStorage image keys on mount, run the local analysis engine sequentially for each present image, then merge results into a combined object stored under `analysisResult` before navigating to Results; single-image flow remains unchanged
- Extend `LocalAnalysisResult` (in `analysisTypes.ts`) and `AnalysisResult` (in `mapApiResponse.ts`) with an optional `multiTimeframe` array field, each entry containing the timeframe label and all standard analysis fields
- Update `Results.tsx` to show a horizontal scrollable row of compact timeframe cards (M1, M3, M5) below the main signal banner when `multiTimeframe` contains more than one entry; each card displays timeframe label, signal, trend, and confidence; the card matching the user's default timeframe is visually highlighted; section is hidden for single-image results

**User-visible outcome:** Users can upload up to three chart images at once (one per timeframe: M1, M3, M5), have each analyzed automatically, and see a side-by-side multi-timeframe summary on the Results screen — while the existing single-image flow continues to work unchanged.
