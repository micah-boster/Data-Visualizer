---
phase: 29-component-patterns
plan: 02
subsystem: design-system
tags: [data-panel, section-header, migration, surfaces, phase-28-consumer, phase-27-consumer]
requires:
  - src/components/layout/section-header.tsx (Phase 27-01)
  - Phase 28 surface tokens (rounded-lg, bg-surface-raised, shadow-elevation-raised, p-card-padding, border-border, mt-stack, pt-stack)
provides:
  - src/components/patterns/data-panel.tsx (DataPanel, DataPanelProps)
  - src/components/tokens/patterns-specimen-data-panel.tsx (DataPanelSpecimen)
affects:
  - src/components/cross-partner/comparison-matrix.tsx (shadcn Card → DataPanel)
  - src/components/cross-partner/trajectory-chart.tsx (shadcn Card → DataPanel)
  - src/components/charts/collection-curve-chart.tsx (2 ad-hoc shells → DataPanel)
tech-stack:
  added: []
  patterns:
    - DataPanel composed wrapper — surface chrome + SectionHeader composition + optional footer slot
    - Composition over extension — SectionHeader stays unchanged; gaps are documented inline, not pre-built
key-files:
  created:
    - src/components/patterns/data-panel.tsx
    - src/components/tokens/patterns-specimen-data-panel.tsx
  modified:
    - src/components/cross-partner/comparison-matrix.tsx
    - src/components/cross-partner/trajectory-chart.tsx
    - src/components/charts/collection-curve-chart.tsx
decisions:
  - DataPanel ships as server-renderable (no 'use client', no hooks) — matches SectionHeader's contract so future RSC adopters have a clean path.
  - SectionHeader NOT extended — single gap surfaced during migration (inline title-adjacent meta cluster in comparison-matrix) resolved with a content-slot workaround per CONTEXT rule "extend only on concrete need".
  - Orientation-toggle inline divider (mx-1 h-4 w-px bg-border) in comparison-matrix LEFT IN PLACE for Plan 29-04 (ToolbarDivider) to replace cross-wave-safely.
  - EmptyState (Plan 29-03) NOT imported here — cross-plan coupling would break parallel-wave execution; TODO comment marks the future integration point.
  - Query-surface panels (query-search-bar.tsx, query-response.tsx) explicitly left as-is (resolved decision #3 — headerless shells, not titled panels). Verified: 1 + 3 ad-hoc shells still present in those files, as intended.
  - collection-curve-chart empty-state keeps the "Collection Curves" title (same chrome as populated state) for a consistent user experience across data/no-data paths.
metrics:
  duration: ~3 min 23 sec
  completed: 2026-04-18
requirements:
  - DS-19
  - DS-20
---

# Phase 29 Plan 02: DataPanel Migration Summary

## One-liner

DataPanel composed wrapper (surface chrome + SectionHeader + optional footer) ships at `src/components/patterns/data-panel.tsx` and absorbs three ad-hoc chart/matrix panel shells (Partner Comparison, Collection Trajectories, Collection Curves — both populated and empty states).

## What shipped

### Pattern component

**`src/components/patterns/data-panel.tsx`** — 75 LOC. Props:

```ts
interface DataPanelProps {
  title: string;                // required — flows to SectionHeader.title
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;          // required content slot
  footer?: ReactNode;           // optional — renders bordered row only when defined
  className?: string;
  contentClassName?: string;
}
```

Server-renderable. Composes the existing `SectionHeader` verbatim — no fork, no duplication. Footer slot is not reserved when absent (no `border-t`, no `mt/pt` padding). Content sizing is consumer-owned per CONTEXT.md lock — DataPanel is pure visual chrome.

### /tokens specimen

**`src/components/tokens/patterns-specimen-data-panel.tsx`** — renders four slot combinations for the Plan 29-05 /tokens Component Patterns section:

1. Header + content only
2. Full header (eyebrow + description + actions) + footer metadata caption
3. Header + footer (right-aligned action cluster)
4. Header + footer (aggregate/totals row with `text-body-numeric`)

Not yet wired into token-browser.tsx — Plan 29-05 does the wiring.

### Migrations

| File | Before | After |
|------|--------|-------|
| `src/components/cross-partner/comparison-matrix.tsx` | shadcn `<Card>` + `<CardHeader>` + `<CardTitle>` + `<CardContent>` | `<DataPanel title="Partner Comparison" actions={<view-toggles + orientation>}>` — info-tooltip + partner-count meta cluster moved into content top (SectionHeader gap noted inline) |
| `src/components/cross-partner/trajectory-chart.tsx` | shadcn `<Card>` shell | `<DataPanel title="Collection Trajectories" actions={<$ Weighted / Equal Weight>} contentClassName="space-y-2">` |
| `src/components/charts/collection-curve-chart.tsx` (empty-state branch) | Raw `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` | `<DataPanel title="Collection Curves">` with BarChart3 + copy (TODO(29-03) marker for future EmptyState) |
| `src/components/charts/collection-curve-chart.tsx` (main shell) | Raw `<div className="rounded-lg...">` + inline `<h3>` + metric toggles | `<DataPanel title="Collection Curves" actions={<Recovery/Dollars toggles>} contentClassName="space-y-2">` |

Post-migration grep confirms zero `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding` matches across `src/components/cross-partner` and `src/components/charts/collection-curve-chart.tsx`. Query-surface panels (intentional non-targets) retain their shells: 1 in `query-search-bar.tsx`, 3 in `query-response.tsx` — matches research expectation.

## SectionHeader gaps surfaced

**One gap** appeared during `comparison-matrix.tsx` migration:

- **Title-adjacent meta slot.** The original header rendered an info-tooltip + partner-count span inline next to the CardTitle. SectionHeader's current slot inventory (title / eyebrow / description / actions) has no title-adjacent meta slot. Eyebrow is not appropriate (not categorical-enum text); actions is not appropriate (that slot is the right-aligned toolbar cluster).
- **Resolution:** Rendered the meta cluster at the top of the content slot (above the matrix views) via a `flex items-center gap-1.5 mb-stack` wrapper. Inline `// DataPanel gap noted for 29-SUMMARY:` comment placed in the source.
- **SectionHeader NOT extended.** Per CONTEXT.md rule: "Extend only as concrete gaps appear during DataPanel migration. Don't speculate." Single-file workaround is cheaper than adding a fifth slot to SectionHeader for one call site. If a second concrete need appears (future plan, future feature), revisit.

No other gaps surfaced. Trajectory-chart and collection-curve-chart both mapped cleanly to `title` + `actions`.

## Deviations from Plan

None. Plan executed exactly as written.

All deviation rules dormant — no bugs, missing critical functionality, or blocking issues surfaced during execution. Build passed on first run for all three tasks; both token/surface guards stayed green throughout.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (filtered to touched files) | clean |
| `npm run build` | pass (all 5 static pages generated) |
| `npm run check:surfaces` | pass |
| `npm run check:tokens` | pass |
| `grep -rE "rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding" src/components/cross-partner src/components/charts/collection-curve-chart.tsx` | 0 matches |
| Query-surface panels untouched | confirmed (1 + 3 shells remain) |

## Commits

- `5d0c4b9` feat(29-02): add DataPanel pattern + /tokens specimen
- `6ecb9c1` refactor(29-02): migrate comparison-matrix + trajectory-chart to DataPanel
- `c80e3eb` refactor(29-02): migrate collection-curve-chart shells to DataPanel

## TODOs emitted for follow-on plans

- **Plan 29-03 (EmptyState):** `collection-curve-chart.tsx` empty-state branch carries a `TODO(29-03): consider replacing empty body with <EmptyState variant="no-data" />` marker. Inline BarChart3 + copy will be swapped when EmptyState ships.
- **Plan 29-04 (ToolbarDivider):** `comparison-matrix.tsx` retains the `<span className="mx-1 h-4 w-px bg-border" />` orientation divider. Will be replaced when ToolbarDivider ships, cross-wave-safely.

## Self-Check: PASSED

- `src/components/patterns/data-panel.tsx` — FOUND
- `src/components/tokens/patterns-specimen-data-panel.tsx` — FOUND
- `src/components/cross-partner/comparison-matrix.tsx` — MODIFIED (DataPanel import present)
- `src/components/cross-partner/trajectory-chart.tsx` — MODIFIED (DataPanel import present)
- `src/components/charts/collection-curve-chart.tsx` — MODIFIED (DataPanel import present, zero ad-hoc shells)
- Commit `5d0c4b9` — FOUND in git log
- Commit `6ecb9c1` — FOUND in git log
- Commit `c80e3eb` — FOUND in git log
