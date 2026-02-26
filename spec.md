# Specification

## Summary
**Goal:** Redesign the ProcessingScreen layout, add animated black-and-white progress bars with percentage counters, simplify the upload interface, minimize the chart image on the Results screen, and apply premium dark visual polish throughout.

**Planned changes:**
- **ProcessingScreen.tsx**: Redesign layout to match reference (image-7.png) — place app logo above the "Analisando Gráfico" heading, add subtitle "Detectando padrões de velas localmente...", display four processing stages (Carregando imagem, Processando dados, Detectando padrões de candle, Gerando resultado) in a dark elevated card panel, with circular status icons (pending = dim gray, active = spinning ring, complete = filled green checkmark) and matching text colors
- **ProcessingScreen.tsx**: Replace stage status indicators with animated horizontal progress bars in black-and-white; active bar animates from 0% to 100% with a white fill and CSS glow/shine effect on a dark track; a small live percentage counter (e.g., "47%") appears beside each bar; completed bars stay at 100% white; pending bars are dark/empty
- **ProcessingScreen.tsx**: Add footer line "Análise local — sem envio de dados externos" at the bottom of the screen; apply fully dark background (#000 or near-black), large bold heading typography, and premium spacing/proportions
- **AnalyzeChart.tsx**: Simplify the upload UI to a single minimal upload area with Portuguese labels; support file picker (PNG, JPG, JPEG, WebP, and all common screenshot types), camera capture, clipboard paste (Ctrl+V), and drag-and-drop; remove any file format rejection logic for common image types
- **Results.tsx**: Display the uploaded chart image as a small thumbnail (~80×60px) in a corner (top-right or bottom-right) retrieved from sessionStorage key `chartImage`, styled with subtle border and rounded corners matching the active theme

**User-visible outcome:** The processing screen now shows a polished dark layout with the app logo, animated black-and-white glowing progress bars with live percentage counters, and a privacy footer. The upload page accepts any image input method without errors. The results screen shows the analyzed chart as a small corner thumbnail without dominating the view.
