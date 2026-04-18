# Phase 33: Accessibility Audit - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Achieve WCAG AA accessibility baseline across the app — axe-core passes with zero critical/serious violations on core user views, all interactive elements have proper ARIA labels and roles, full keyboard navigation works throughout core flows, and color contrast meets WCAG AA in both themes.

**Requirements covered:** A11Y-01, A11Y-02, A11Y-03, A11Y-04
**Already shipped (Phase 30-01):** A11Y-05 (prefers-reduced-motion) — do not re-implement

</domain>

<decisions>
## Implementation Decisions

### Audit scope & pass criteria
- **Scope:** Core user-facing views only — Dashboard, drill-downs, saved views, settings. Excludes `/tokens` reference page and other unlisted/debug routes.
- **Severity cutoff:** Fix only `critical` and `serious` axe-core violations (matches A11Y-01 literally). Moderate and minor go to a deferred backlog, not this phase.
- **Contrast target:** WCAG AA strictly. No stretch toward AAA — data-dense UIs can't reliably meet AAA for chart palettes.
- **Exceptions policy:** Accessibility is non-negotiable. If a design token (brand color, surface) fails AA contrast, **adjust the token value** rather than documenting an exception. Token-based architecture (Phase 26) makes this propagate automatically.

### Complex widget depth
- **Recharts charts:** Concise `aria-label` describing what the chart shows. Chart data is already mirrored in the sibling table, so SR users use the table. **Do not** attempt full keyboard navigation through data points — Recharts doesn't support it natively and ROI is low.
- **Drill-down overlays:** Standard modal dialog pattern — focus trap while open, `Escape` closes, focus **restored to the trigger element** on close. Works with URL-backed nav from Phase 32 (direction-agnostic by design).
- **Dense tables:** Row-level Tab stops. Each interactive row is one tab stop; `Enter` drills in; `Escape` returns. **Not** a full `role="grid"` with cell-by-cell arrow-key nav — overkill for read-only analytical tables.
- **Hover-revealed content:** Anything shown on hover **must also appear on focus**. Chart tooltips fire on data-point focus; popovers open on `Enter`. No hover-only UI for essential info.

### Regression prevention
- **Primary CI gate:** axe-core run inside Playwright E2E against core routes. Catches runtime violations (rendered DOM, dynamic ARIA state), not just static source. Mirrors the Phase 26+ guardrail pattern (e.g., `check:motion`).
- **Enforcement:** **Blocking** after the baseline is green. Once Phase 33 ships, any new critical/serious violation fails CI. No advisory mode — advisory creates tech debt.
- **Manual testing:** Keyboard-only walkthrough of core flows (Dashboard → drill → saved view) as part of verification. Catches focus-order and tab-order issues axe can't detect. No formal VoiceOver pass required (nice-to-have, not blocking).
- **Per-component a11y tests:** Skip for now. Playwright axe on routes + `eslint-plugin-jsx-a11y` (if bundled with CI setup plan) gives enough coverage. Don't add per-component a11y tests — setup weight is too high for marginal gain.

### Remediation strategy
- **Plan grouping:** By violation category. Expected plans: (1) CI/baseline setup, (2) ARIA labels & roles, (3) Keyboard navigation & focus management, (4) Color contrast & token adjustments. Each PR is reviewable and testable on its own. Matches Phase 26–30 structure.
- **Sequence:** Baseline first — plan 1 installs axe-core + Playwright a11y setup and captures the current violation list as the baseline. Subsequent plans work through categories with visible progress.
- **Out-of-scope issues:** If an a11y issue is found outside audit scope (e.g., in `/tokens`), **note it in deferred ideas and do not fix it**. Keep the phase focused.
- **Done signal:** (a) axe-core CI gate green on all core routes **and** (b) a keyboard-only walkthrough of Dashboard → drill → saved view completes end-to-end without a mouse. Both automated and human verification.

### Claude's Discretion
- Exact choice of route list for Playwright axe runs (core routes defined above, specific URLs flexible)
- Whether to include `eslint-plugin-jsx-a11y` alongside Playwright axe (recommended if low-friction)
- Specific focus indicator styling (must meet WCAG 2.4.7 visible focus, exact design up to Claude)
- Component-level ARIA patterns for primitives (follow WAI-ARIA Authoring Practices)
- Token value adjustments if contrast fails — Claude picks new value that meets AA and preserves brand intent

</decisions>

<specifics>
## Specific Ideas

- Charts as `aria-label` + sibling table is the explicit trade-off: chart for sighted users, table for SR users. Both already render in current UI.
- Focus restoration on drill close should use the existing `useDrillDown` URL-backed state (Phase 32) as the anchor for "where did we come from."
- Token adjustments for contrast should update the canonical token in `globals.css` (Phase 26 infra), not per-component overrides.

</specifics>

<deferred>
## Deferred Ideas

- **Moderate/minor axe violations** — track as backlog after Phase 33 ships; not blocking.
- **VoiceOver / screen-reader smoke test** — useful but not required for this phase. Consider for a future polish pass.
- **Per-component a11y unit tests** — deferred; revisit if E2E coverage proves insufficient.
- **`/tokens` reference page a11y** — out of audit scope; fix only if it becomes user-facing.
- **Full `role="grid"` keyboard model for tables** — deferred unless user research shows need.
- **WCAG AAA targets** — out of scope; not pursued.

</deferred>

---

*Phase: 33-accessibility-audit*
*Context gathered: 2026-04-18*
