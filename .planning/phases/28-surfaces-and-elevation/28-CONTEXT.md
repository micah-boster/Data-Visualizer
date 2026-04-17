# Phase 28: Surfaces & Elevation - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply Phase 26's surface + shadow tokens (`surface-base`, `surface-raised`, `surface-inset`, `surface-overlay`, `surface-floating`; `shadow-xs/sm/md/lg`) to every container in the app. Deliverables bound to DS-11 through DS-17:

1. Header uses multi-layer bottom shadow (already at `surface-raised + shadow-xs` from 26-03 — upgrade to multi-layer compound)
2. KPI cards at `surface-raised` + soft shadow (already shipped 26-02 — tune to new elevation scale)
3. Table area uses `surface-inset` — slightly recessed, data-focused
4. Chart containers use `surface-raised` with consistent padding + corner radius
5. Popovers / dropdowns use `surface-overlay` with multi-layer shadows
6. Sidebar has subtle depth separation from main content
7. **All containers use a named surface — zero ad-hoc border/shadow combinations (sweep)**

New semantic elevation tokens and a translucent surface variant land here. Token primitives remain from Phase 26. Micro-interaction timing, gradient dividers, and focus glows belong to Phases 30/31.

</domain>

<decisions>
## Implementation Decisions

### Elevation character
- **Intensity: medium / soft.** Notion-style. Shadows are visible but soft — a noticeable step up from 26-02's current `shadow-sm` subtlety. Expect the semantic elevation recipes (below) to read heavier than today's pilots in isolation; the goal is more dimensional presence while staying restrained.
- **Dark mode primary signal = lighter surface on darker bg.** `surface-raised` already lighter than `surface-base` in dark mode carries the hierarchy. Shadows reinforce but don't do the heavy lifting — they'd look muddy otherwise.
- **Interactive surfaces lift on hover.** KPI cards that drill, table rows that open panels, chart cards — static rest shadow is one notch, hover bumps up one level. Static rest shadows are defined in Phase 28; the timing/transition behavior is Phase 30's job, but the two hover elevation states must be defined here so 30 has something to animate between.
- **Semantic elevation levels introduced.** Call sites never pick `shadow-sm` directly for primary containers — they reach for `elevation-chrome`, `elevation-raised`, `elevation-overlay`, `elevation-floating`. Matches Phase 26's semantic-over-raw ethos.

### Shadow tokens & glass
- **Multi-layer composition: 3-layer (key + ambient + rim).** Every semantic elevation is a compound of: key shadow (directional, ~2-4px), ambient halo (soft, 8-24px), and a rim highlight (1px inner or outer on the top edge to catch light). Reads as physical objects, not drop-shadow decals. The "multi-layer" language in DS-11 + DS-15 means this for all elevations, not just popovers.
- **Semantic elevation catalog (4 levels):**
  - `elevation-chrome` → header, sidebar sticky edges (lowest presence)
  - `elevation-raised` → cards, KPIs, chart containers, hover state of chrome
  - `elevation-overlay` → popovers, dropdowns, tooltips, sticky table column header when scrolled
  - `elevation-floating` → dialogs, modals, command palette (heaviest)
- **Translucent surface variant introduced — header only.** Add a `surface-translucent` token (semi-opaque + `backdrop-blur`) and apply to the sticky header so content blurs underneath on scroll. 26-03 explicitly deferred the blur-glass aesthetic here as "a translucent surface variant rather than hand-rolled blur classes" — this fulfills that. Popovers stay opaque (readability against busy table bgs is a risk).
- **Raw `shadow-xs/sm/md/lg` tokens stay as primitives.** Semantic elevations are recipes that reference the raw tokens (e.g., `elevation-raised = shadow-sm + rim highlight + border`). UI code uses semantic tokens for primary containers; raw tokens remain available for edge cases (badges, chips, tooltips) where a full semantic elevation is overkill.

### Table recession
- **"Inset" = `surface-inset` bg only** — no inner box-shadow, no dashed top border, no extra effects. The beige-recessed color contrast with `surface-base` does the work. Start here; add inner shadow only if pilot testing shows it doesn't read as recessed.
- **Drop the outer border / card wrapper around the DataTable.** The inset bg + padding + rounded corners defines the boundary. Reads as "the data lives in a recessed pane," not "a card containing a table." No nested picture-frame.
- **Row backgrounds are transparent over the inset bg.** No zebra striping. Hover = subtle bg tint (color, not elevation change). Rest rows pick up `surface-inset` by transparency.
- **Sticky column header is slightly raised within the inset pane.** Column header row sits at `surface-base` or `surface-raised` (pilot will pick) with a subtle bottom shadow that appears when the body scrolls underneath. Signals "this stays put" — matches the hover-lift philosophy that elevation marks affordance. Not `elevation-chrome`-heavy — a lighter treatment inside the inset.

### Sidebar depth
- **Separation mechanism: background differential only.** No right-edge shadow, no vertical divider line. Color contrast between sidebar surface and main content surface is the full depth cue.
- **Surface pair: sidebar = `surface-base`, main content = `surface-raised`.** Content area lifts off the sidebar chrome — content is the focus, sidebar is the ground. Inverts the more common "sidebar-as-panel" pattern.
- **Three-surface interaction with the existing header = Claude's discretion.** Header already shipped at `surface-raised + shadow-xs` in 26-03. Whether Phase 28 (a) keeps header raised with the translucent variant stacked on top, (b) revisits the header surface choice, or (c) makes header/sidebar a unified chrome layer is a planning-time decision based on which combination reads cleanest in both modes after visual test.

### Claude's Discretion
- Content-region scope: whether the whole content pane is one big `surface-raised` plate (with nested cards using their own raised treatment) vs. content-region stays `surface-base` and individual cards raise. Pilot and pick whichever reads cleanest.
- Exact chrome fit: how header + sidebar + content interact given sidebar = base and content = raised. Pilot-driven.
- Exact hover-lift magnitude (one notch up from rest — but "notch" sizing is pilot-tested).
- Exact shadow color values (warm-tinted oklch offsets vs. neutral rgba) and opacity per layer of the 3-layer compounds.
- Sticky table column-header surface choice (`surface-base` vs. `surface-raised` inside the inset pane).
- Pilot surface order and sweep cadence — match Phase 26 / Phase 27 pattern (one plan per surface: header upgrade, KPI cards retune, table, charts, popovers/dropdowns, sidebar, cleanup sweep). Planner picks first pilot.
- Whether `elevation-chrome-hover` needs to be a distinct named token or is handled by `elevation-raised` as the hover target.
- ESLint / grep CI guard to prevent regression onto ad-hoc shadow + border combos post-sweep (mirrors Phase 27's enforcement approach).

</decisions>

<specifics>
## Specific Ideas

- **Phase 26 rhythm is the reference.** Pilot one surface, verify visually in both light and dark mode, then sweep. Matches `feedback_testing` memory — never ship visual changes blind. Phase 26's 5-plan cadence (foundation + KPI pilot + header pilot + table pilot + /tokens page) is the template.
- **Medium/soft intensity is a deliberate step up from current pilots.** 26-02 shipped `shadow-sm` at its current low-intensity values; Phase 28 pilots should recalibrate — the semantic elevation recipes may need heavier compound shadows than a literal `shadow-sm` to hit the "Notion-feel" bar. This is a tuning exercise, not a straight migration.
- **Chrome vs. content visual logic is inverted from convention.** Most apps put chrome on raised and content on base. User chose the opposite: content floats, sidebar is ground. Planner should lean into this — the entire visual metaphor is "content panel floating on chrome rail," which also explains why the translucent header makes sense (you see through it to the content that's floating behind it).
- **`/tokens` reference page (shipped in 26-05) extends here.** Add an elevation section showing each semantic level + the 3-layer compound rendered on every surface token. Keeps the in-app source of truth current.
- **Semantic-over-raw is the discipline to hold.** If a call site reaches for `shadow-md` directly for a card, the semantic elevation is wrong, not the call site. Same rule as Phase 27 typography: tokens own their character.

</specifics>

<deferred>
## Deferred Ideas

- **Hover lift transition timing, press-state de-elevation, drill animation elevation changes** — Phase 30 (Micro-Interactions & Motion). Phase 28 defines the static rest + hover elevation states; Phase 30 animates between them.
- **Translucent variant on popovers/dropdowns/dialogs** — Phase 31 (Visual Polish). Header-only for now; broader glass treatment is polish work.
- **Gradient dividers, dark-mode highlight edges, focus glow rings, border consistency sweep** — Phase 31 (Visual Polish).
- **Component patterns that compose surfaces (StatCard, DataPanel, SectionHeader actions, ToolbarGroup, EmptyState)** — Phase 29. Phase 28 treats raw containers; Phase 29 builds the reusable composed shapes on top.
- **Drilled-in view surfacing per-batch KPI cards at the top** (noted in STATE.md as a UX/future-phase item, candidate for "Phase 28 or a dedicated polish phase") — this is a new *capability* (rendering extra KPI cards in drilled state), not a surface treatment of existing containers. Belongs in its own phase (polish/UX) or as an addition to the existing KPI work, not Phase 28.
- **Zebra striping, row-hover-lifts-to-raised, inner-shadow wells on the table** — rejected for Phase 28 (transparent rows over inset bg was chosen). If the app evolves toward data-dense wide tables later, revisit striping as a table-specific polish phase.

</deferred>

---

*Phase: 28-surfaces-and-elevation*
*Context gathered: 2026-04-17*
