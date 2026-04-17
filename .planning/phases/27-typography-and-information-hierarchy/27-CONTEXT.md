# Phase 27: Typography & Information Hierarchy - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the type scale tokens defined in Phase 26 (`display`, `heading`, `title`, `body`, `label`, `caption`) across every text element in the app. Deliverables bound to DS-07 through DS-10:

1. Every text element uses a named type token — no ad-hoc `text-xs/sm/base/lg/xl/2xl` or raw weight classes
2. All numeric displays use tabular figures (table cells, KPI values, chart axes, trend indicators)
3. KPI card labels use overline style (uppercase, tracked, muted, smaller) distinct from body text
4. Section headers have consistent heading treatment with an optional action slot

New tokens may be added if demand warrants (see Outliers below). Surface/elevation work is Phase 28. Component pattern hardening (StatCard, DataPanel, etc.) is Phase 29 — a minimal `SectionHeader` lands here.

</domain>

<decisions>
## Implementation Decisions

### Token mapping rules
- **Exhaustive migration table first.** Build an upfront ad-hoc-to-token table (e.g., `text-xs → label/caption`, `text-sm → body`, `text-base → title`, `text-lg → title`, `text-xl → heading`, `text-2xl → display`). Apply consistently across the sweep.
- **Tokens own weight and transforms.** Weight (600/500), letter-spacing, and `uppercase` are baked into the token definitions. Drop ad-hoc `font-semibold` / `font-medium` when migrating. `uppercase` lives only on the `label` variant.
- **Outliers: add a token if ≥3 uses.** If the same off-scale size appears in 3+ places (e.g., a giant KPI metric number), introduce a new named token (e.g., `text-metric`). One-offs may stay as documented exceptions, but the default is "promote to a token."
- **Small UI (tooltips, toasts, badges, dialogs, dropdowns) uses standard tokens only.** No separate `ui-small` tier. Dropdown items = `body`, badges/tooltips = `label` or `caption`, dialog titles = `heading`. Keeps the scale tight.

### Overline style
- **Implemented via the existing `--text-label` token** — don't add a separate `overline` token. `.text-label` is the overline utility.
- **Scope:** KPI card labels + optional section-header eyebrows (category text above the title, e.g., `METRICS`, `COLLECTION CURVES`). Not sprayed across the app.
- **Color:** `muted-foreground`. Overline reads as secondary meta vs. the primary value it labels.
- **Tracking:** keep current `0.04em`. Do not touch unless a visual reason surfaces.

### Section header pattern
- **Shared `<SectionHeader>` component** with props: `title`, `eyebrow?` (optional overline string), `description?` (optional), `actions?` (ReactNode slot). Minimal version — Phase 29 formalizes the broader component library.
- **Title uses `text-heading`** (1.125rem / 600). Anchors a section cleanly; display stays reserved for page/KPI-level.
- **Actions: ReactNode slot.** Caller passes whatever (button, button group, dropdown). No structured API.
- **Eyebrow rendered via `.text-label`** (muted, uppercase, tracked) above the title when provided.

### Rollout strategy
- **Pilot → sweep.** Plan 01 delivers the migration table + utilities (tabular-nums helper, updated label semantics, `SectionHeader` skeleton) + one pilot surface (header or KPI cards) to prove the mapping visually. Plan 02+ sweep by surface.
- **Plans grouped by surface, not by token.** One plan per surface: header, KPI cards, table, charts, controls/popovers, remaining. Each plan is independently verifiable visually. Matches Phase 26 cadence.
- **Enforcement: ESLint / grep guard in CI.** After the sweep, a lint rule or simple grep check flags `text-(xs|sm|base|lg|xl|2xl)` and ad-hoc `font-semibold` / `font-medium` outside a short allowlist (e.g., the `/tokens` reference page). Prevents regression mechanically.
- **Tabular figures applied at shared numeric components/classes**, not per-call-site — table body cells, KPI value text, chart axis/tick labels, trend delta text. Single place to verify. Do NOT set tabular-nums globally on `<body>`.

### Claude's Discretion
- Exact surface order inside the sweep plans (pilot choice between header and KPI card can be decided during planning after surveying which has fewer ad-hoc classes).
- Shape of the ESLint rule vs. grep-in-CI (either is fine; pick whichever fits the existing toolchain with least friction).
- Exact migration-table ambiguous cases (e.g., `text-base` → `body` vs. `title`) — resolve with visual diff on the pilot surface, then document the resolution for the rest.
- Whether a `text-metric` outlier token is needed — answer emerges from the audit during the migration-table plan.
- `SectionHeader` internal layout (spacing token, alignment), as long as title/eyebrow/description/actions props hold.

</decisions>

<specifics>
## Specific Ideas

- **Phase 26 rhythm is the reference.** Pilot one surface, verify visually in both light and dark mode, then sweep. Matches `feedback_testing` memory — never ship typography changes blind.
- **Keep the scale tight.** Don't invent "component UI" tiers; stretch the 6 existing tokens to cover 95%+ of cases. Add tokens only when demand is clear.
- **Tokens own their character.** If you have to reach for `font-semibold` next to `text-heading`, the token is wrong, not the call site.
- **`/tokens` reference page (shipped in 26-05) extends here** — add a typography section showing the scale in use so the in-app source of truth stays current.

</specifics>

<deferred>
## Deferred Ideas

- **Component library formalization (StatCard, DataPanel, ToolbarGroup, EmptyState)** — Phase 29. `SectionHeader` lands here as a minimal version and will be reviewed/hardened in 29.
- **Surface/elevation application (cards float, tables recede, header shadow)** — Phase 28.
- **Motion / micro-interactions on typography (hover lifts, transitions)** — Phase 30.
- **Accessibility audit of type contrast, reading order, heading structure** — Phase 33.

</deferred>

---

*Phase: 27-typography-and-information-hierarchy*
*Context gathered: 2026-04-17*
