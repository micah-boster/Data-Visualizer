# Phase 18: Claude Query UI - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can ask natural language questions about their data and receive useful, context-aware narrative answers. This phase builds the UI layer: search bar, suggested prompts, streaming response display, context scoping, and loading/error states. The API route (Phase 17) already exists.

</domain>

<decisions>
## Implementation Decisions

### Search bar placement & style
- Top of main content area, always full-width and visible (not collapsed)
- Prominent visual weight: subtle background card, slight shadow — feels like a feature, not a utility
- Sparkle/AI icon inside the input field to signal AI-powered queries
- Persistent across drill levels

### Response presentation
- Response appears inline directly below the search bar, pushing content down
- Response persists until a new query replaces it
- Data provenance is critical: every data point referenced in the narrative must be traceable back to its source cell/metric. Preserve full attribution for any number the AI surfaces — either the equation or prompt that produced it
- Response area sizing: Claude's discretion based on typical response length (2-4 sentences expected)

### Data point formatting
- Claude's discretion on how to highlight data points within prose (bold, colored pills, etc.)

### Suggested prompts
- Horizontal pill/chip buttons displayed below the search bar
- Visible only when search bar is focused (not always shown)
- Clicking a prompt auto-submits immediately (no editing step)
- Dynamic prompts generated from actual data context, not curated/fixed — e.g., viewing Affirm shows Affirm-specific suggested questions

### Context scoping
- Removable pill/badge inside the search bar showing current scope (e.g., "Affirm > Batch 2024-01")
- User can click X on the pill to remove scope and ask cross-partner questions
- Removing scope enables full cross-partner data queries without warnings
- AI responses explicitly reference the scope context (e.g., "For Affirm's latest batch...")

### Claude's Discretion
- Response area max height / scroll behavior
- Data point formatting within narrative text
- Loading skeleton/spinner design
- Error state messaging and retry UX
- Exact spacing, typography, transitions

</decisions>

<specifics>
## Specific Ideas

- Data provenance is a core principle: "We need to preserve all data transformations — either equations or prompts applied to a specific cell. We need to have full attribution to where any number comes from."
- Scope pill pattern similar to how search engines show filters as removable tags
- Dynamic suggested prompts should reflect the actual data being viewed, not generic templates

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-claude-query-ui*
*Context gathered: 2026-04-13*
