# Specification

## Summary
**Goal:** Implement rule-based technical analysis system with 6-step objective process for chart analysis.

**Planned changes:**
- Update API integration documentation to specify 6-step technical analysis process (image preprocessing, candle reading, trend identification, pattern detection, signal scoring, mandatory return format)
- Extend TypeScript interfaces to support new signal types (NEUTRO, SEM ENTRADA) and scoring field (pontuacao)
- Update response mapping logic to handle NEUTRO and SEM ENTRADA signals
- Modify SignalCard component to display all four signal types with distinct visual styles and show total score
- Update Results page to handle NEUTRO and SEM ENTRADA signals with appropriate Portuguese messaging
- Update analysisApi service to include objective analysis requirements in API communication
- Modify History page and list items to display NEUTRO and SEM ENTRADA signals with proper labels and styling

**User-visible outcome:** Users will see more precise trading signals (COMPRA, VENDA, NEUTRO, SEM ENTRADA) based on objective technical rules, with a scoring system that shows confidence level. When the system cannot detect a clear signal, it will explicitly state "Sem entrada" instead of forcing a recommendation.
