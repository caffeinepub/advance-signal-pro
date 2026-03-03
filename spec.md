# Specification

## Summary
**Goal:** Fix the timeframe propagation bug so that the timeframe selected in Settings is correctly reflected throughout the app — in localStorage, in analysis results, and in the Results screen UI.

**Planned changes:**
- Unify the localStorage key for timeframe between `Settings.tsx` and `localCandleAnalysis.ts` using a single shared constant (e.g., `'settings_timeframe'`)
- Fix `Settings.tsx` timeframe selector so selecting M1, M3, or M5 immediately updates the UI, persists to localStorage, calls the `updateSettings` mutation, and shows a `'Configuração salva!'` toast; restores the saved value on page reload
- Fix `localCandleAnalysis.ts` to read the timeframe from localStorage at the moment `analyzeChartImage()` is called (not at module load time), and populate `LocalAnalysisResult.timeframe` accordingly
- Fix `Results.tsx` countdown timer to use the timeframe from the analysis result: M1 = 60s, M3 = 180s, M5 = 300s
- Fix the Time Frame tile in the 2×2 info grid to display the value from the analysis result's timeframe field (e.g., `'M5'`) with the correct subtitle (`'5 min/vela'`, `'3 min/vela'`, `'1 min/vela'`)
- Fix `'Entrar às HH:MM'` entry time to be computed as current time plus the correct timeframe duration
- Update `useCountdownTimer.ts` to accept the timeframe-derived duration correctly

**User-visible outcome:** After selecting M5 (or M3) in Settings, the Results screen will show the correct countdown timer (5:00 or 3:00), the correct Time Frame tile value, and the correct entry time — matching whatever timeframe the user configured.
