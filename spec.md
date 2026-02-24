# Specification

## Summary
**Goal:** Fix the Settings page so all controls are fully functional and correctly wired to the backend.

**Planned changes:**
- Fix the Gemini API key input to load the stored key from the backend on page open and save it on submit, showing Portuguese success/error toasts ("Chave salva com sucesso!" on success)
- Fix the default timeframe selector (M1/M5/M10) to load the persisted value and update it via the backend mutation
- Fix the AI sensitivity slider to load and save the current value from/to the backend
- Fix the theme toggle to apply dark/light theme immediately via ThemeContext and persist the preference
- Fix the daily operation limit selector (3/4/6/8) to load the current value and call the setDailyOperationLimit mutation on change
- Add loading states to all settings controls while fetching data from the backend
- Audit and fix `useSettings.ts` and `useQueries.ts` hooks to ensure backend actor calls for `getSettings`, `updateSettings`, `getGeminiApiKey`, `setGeminiApiKey`, `getDailyOperationProgress`, and `setDailyOperationLimit` are correctly wired
- Fix any mismatches between Motoko function signatures in `backend/main.mo` and frontend call signatures

**User-visible outcome:** All settings on the Settings page load their current values from the backend and save changes correctly, with Portuguese feedback toasts on all save actions.
