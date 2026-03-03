# Specification

## Summary
**Goal:** Make each individual upload slot (M1, M3, M5) on the Analisar Gráfico page independently clipboard-paste-active when clicked, so that Ctrl+V pastes only into the selected slot.

**Planned changes:**
- Add a slot-level active/focused state to `TimeframeUploadSlot` component; clicking the slot rectangle sets it as the active paste target
- Display a visible focus indicator (highlighted border or subtle glow) on the currently active slot
- Replace the existing global paste listener with a per-slot paste handler that routes Ctrl+V only to the active slot
- Ensure only one slot can be active at a time — clicking a new slot deactivates the previous one
- Clicking outside all slots clears the active paste target
- Existing file picker, camera capture, and drag-and-drop functionality remain unchanged for all three slots

**User-visible outcome:** Users can click on any individual M1, M3, or M5 upload slot rectangle to make it the active paste target (shown by a highlighted border), then press Ctrl+V to paste a clipboard image exclusively into that slot, giving precise control over which timeframe receives the pasted chart image.
