# Specification

## Summary
**Goal:** Recreate the Results screen (`Results.tsx`) to exactly match the reference design in image-13.png.

**Planned changes:**
- Redesign the Results page layout with a dark background, structured top-to-bottom as described below
- Add a header row with a back arrow, title "Resultado da Análise", and subtitle "Análise técnica de candles"
- Add two side-by-side dark tiles: left tile shows TEMPO with large white countdown timer and "restante" subtitle; right tile shows ENTRAR ÀS with large cyan entry time and "horário de entrada" subtitle; entry time is computed as current time plus the timeframe duration (M1=60s, M3=180s, M5=300s)
- Add a full-width signal banner: green for COMPRA (↗), red for VENDA (↙), with large bold white signal label on the first line, "Tendência: [value] • Confiança: [XX]%" on the second line, and a centered "Força: [forte/média/fraca]" pill badge on the third line
- Add a 2×2 info grid: Tendência tile with colored arrow (green ↗ ALTA / red ↘ BAIXA), Precisão tile with value in cyan, Volume tile with value in purple, Time Frame tile with value in amber/orange bold and subtitle ("1 min/vela", "3 min/vela", or "5 min/vela")
- Display the uploaded chart image (from `sessionStorage` key `chartImage`) as a full-width section below the grid, rendered via the existing `ChartOverlay` component with green dashed support lines and red dashed resistance lines, plus a directional arrow on the right edge
- Remove any previous small corner thumbnail placement

**User-visible outcome:** The Results screen now matches the reference design — users see a polished dark UI with the timer tiles, prominent signal banner, color-coded info grid, and a large full-width chart with overlay lines all in Portuguese (Brazil).
