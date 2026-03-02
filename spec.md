# Specification

## Summary
**Goal:** Fix the timeframe display bug in the Results screen, update the Results screen layout to match the reference design, fix timeframe persistence in Settings, and make analysis explanation texts unique per analysis.

**Planned changes:**
- Fix `localCandleAnalysis.ts` to read the timeframe from localStorage at call time (not at module load), using the exact same key as `Settings.tsx`, and store the value verbatim (`M1`, `M3`, or `M5`) in the result's `timeframe` field
- Fix the Results screen `Time Frame` tile to display the timeframe from the analysis result (`M1`, `M3`, or `M5`) instead of always defaulting to `M1`
- Update countdown timer initialization so M1=60s, M3=180s, M5=300s based on the selected timeframe
- Update the `Entrar às HH:MM` label to compute entry time as current time at page load plus the correct duration for the selected timeframe
- Redesign the Results screen layout to match the reference (image-11.png / image-12.png): two side-by-side top tiles (TEMPO countdown and ENTRAR ÀS entry time), a full-width green/red signal banner with Tendência, Confiança, and Força badge inline, a 2×2 info grid (Tendência, Precisão, Volume, Time Frame), and a scrollable chart thumbnail section below
- Fix `Settings.tsx` to correctly persist the selected timeframe (`M1`, `M3`, `M5`) to localStorage under the unified key and show the toast `Configuração salva!` after saving; ensure the saved value is restored when returning to Settings
- Update `localCandleAnalysis.ts` to generate unique `explicacao` texts per analysis by dynamically incorporating detected pattern names, trend direction, confidence score, and momentum values into the explanation

**User-visible outcome:** The Results screen correctly shows the user-selected timeframe (M1/M3/M5), displays a countdown matching the selected timeframe duration, shows the correct entry time, matches the reference layout with TEMPO/ENTRAR ÀS tiles and signal banner, and produces unique technical analysis explanations per chart. Settings correctly saves and restores the selected timeframe.
