# Phase 31: Visual Polish Pass - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Final cosmetic refinements that turn a clean app into a crafted one. Six coupled surface-treatment requirements (DS-29 → DS-34): gradient dividers, dark-mode glass highlights, focus glows, a single border-opacity standard, refined table row hover, and themed scrollbars. Nothing structural — every decision here sits on top of the tokens, surfaces, and motion primitives already shipped in Phases 26–28. Component patterns (Phase 29) and motion transitions (Phase 30) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Dividers & border consistency (DS-29, DS-32)
- Gradient-fade dividers apply to **two places only**: horizontal section separators (KPI band ↔ charts ↔ table) and the ToolbarGroup vertical dividers shipped in Phase 29. Everything else keeps hard borders.
- Fade shape: **center-solid, transparent at both ends** — `linear-gradient(to right, transparent, <border>, transparent)` for horizontals; vertical equivalent for ToolbarGroup.
- Single border-opacity standard: **~8%** (very subtle hairline). Cards and the table should read as almost borderless and rely on surface + shadow (Phase 28) to define shape.
- **Same token in both modes** — one `--border-opacity` (or equivalent) variable; no separate dark-mode override.

### Dark mode glass highlight (DS-30)
- Apply **only to `surface-raised`** (KPI cards, chart cards, query cards). Header, sidebar, and overlay/floating surfaces stay untouched.
- Technique: **inset `box-shadow` at the top edge** — e.g. `inset 0 1px 0 0 rgb(255 255 255 / 0.07)`. No border-top changes, no pseudo-elements.
- Intensity: **~6–8% white**. Subtle — noticed only when looked for.
- **Dark mode only.** Light mode gets no analogous treatment; Phase 28 shadows carry the elevation read there.

### Focus glow (DS-31)
- Applies to **form controls + interactive containers**: inputs, selects, comboboxes, buttons, plus `focus-within` on ToolbarGroups and saved-view rows. Does **not** apply to every tab-stop (cells, icon buttons in a row are excluded).
- Color: the existing **`--ring` / accent token**. Do not introduce a new focus color — preserve single focus language across the app.
- Shape: **soft shadow-spread glow** — `box-shadow: 0 0 0 3px rgb(var(--ring) / 0.30)` (or equivalent). Diffused, not a hard outline.
- A11y fallback: **keep a visible hard outline** as fallback when `:focus-visible` isn't honored. Glow is static (no animation), so no `prefers-reduced-motion` concern.

### Hover & scrollbars (DS-33, DS-34)
- Table row hover: **very soft neutral tint (~muted/4)** with `duration-quick` + `ease-default` from the Phase 26 motion tokens. Neutral, not accent-tinted.
- Hover signal is **tint only** — no geometry shift, no leading-edge accent bar, no chevron fade-in. Phase 30 owns any drill-affordance motion; this phase must not animate layout.
- Scrollbars: **thin, always-visible, theme-aware** (8–10px thumb, subtle track, follows light/dark). No overlay/fade-in behavior.
- Scrollbar scope: **only named scroll containers** (table, sidebar, popovers). Document/body scroll stays with the OS/browser default.

### Claude's Discretion
- Exact pixel sizes for scrollbar thumb/track (within the 8–10px band).
- Exact RGB values for the glass highlight and row-hover tint, within the stated intensity ranges.
- CSS token naming and whether to introduce new `--` variables vs. composing existing ones.
- Whether the glass highlight is a new surface token variant or a mixin applied at the surface-raised class level.
- Whether scrollbar styling is centralized in `globals.css` or scoped via a utility class applied per container.

</decisions>

<specifics>
## Specific Ideas

- The "almost borderless" read from the 8% standard should make the surface + shadow work from Phase 28 do the heavy lifting — a cue that if a container needs a stronger border to be visible, the surface choice is wrong, not the opacity.
- Thin, always-visible scrollbars are the Linear/Notion feel the user is reaching for — predictable, themed, visibly present.
- Focus language stays singular: the glow is the `--ring` color in soft form, not a new brand or white halo.

</specifics>

<deferred>
## Deferred Ideas

- Drill-transition motion, hover lifts, press feedback, skeleton-to-content fades — all in Phase 30 (Micro-Interactions & Motion).
- A11y audit (contrast, ARIA, keyboard-nav completeness, reduced-motion) — Phase 33.
- Light-mode analog to the glass highlight (faint top highlight or warm bottom shadow) — explicitly declined for this phase.
- Row hover affordances beyond tint (accent bar, chevron) — available if Phase 30 or a later feature needs them.

</deferred>

---

*Phase: 31-visual-polish-pass*
*Context gathered: 2026-04-18*
