---
phase: 25-code-health-bug-fixes
plan: 02
subsystem: resilience
tags: [error-boundary, react, react-error-boundary, resilience, ui-safety-net]

# Dependency graph
requires:
  - phase: 24-stabilization
    provides: baseline KNOWN-ISSUES.md catalog with KI-16 flagged (Medium, Performance)
  - library: react-error-boundary v6 (new dependency)
provides:
  - SectionErrorBoundary component + SectionFallback UI
  - Two mount sites (chart section, table section) in data-display.tsx
  - KI-16 / HEALTH-02 closed
affects:
  - "Any future render-time error in chart or table subtrees now renders a compact inline fallback instead of crashing the app"
  - "Plan 25-03 (HEALTH-01 dimension filter) — its render paths now get crash insulation for free"
  - "Future per-card granularity requests are now cheap — SectionErrorBoundary can be mounted anywhere"

# Tech tracking
tech-stack:
  added:
    - "react-error-boundary ^6 (production dependency)"
  patterns:
    - "Per-section error boundary granularity (NOT per-card, NOT app-wide) — chart section + table section each isolated"
    - "resetKeys={[data]} — pass the stable TanStack Query result reference; auto-resets on new query result without coupling to refetch"
    - "Fallback shape: compact Alert card with AlertTriangle icon + 'Try again' button + <details> reveal for message-only (never stack trace)"
    - "Defensive error message extraction (instanceof Error / string / JSON.stringify fallback) to handle non-Error throws"
    - "Generic copy 'This section couldn't load.' works for both mount sites; avoids per-section prop for minimal diff"

key-files:
  created:
    - src/components/section-error-boundary.tsx
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/components/data-display.tsx
    - docs/KNOWN-ISSUES.md

key-decisions:
  - "Used react-error-boundary v6 instead of hand-rolled class boundary — ~1KB, battle-tested, ships resetKeys and FallbackComponent matching the locked UX contract exactly"
  - "Generic fallback copy ('This section couldn't load.') instead of per-section prop — works for both chart and table mount sites, keeps API surface minimal"
  - "resetKeys={[data]} at both mount sites — top-level TanStack Query reference; auto-resets when query result identity changes; NOT JSON.stringify, NOT a computed memo"
  - "Added defensive getErrorMessage() helper beyond the original plan — handles non-Error throws (strings, objects) without crashing the fallback renderer itself"
  - "Message-only in <details> (never stack trace) per locked CONTEXT.md decision"
  - "Zero telemetry / structured logging — KI-20 and KI-11 remain explicitly deferred"

patterns-established:
  - "SectionErrorBoundary can be mounted anywhere in the tree — signature is (children, resetKeys?) and the fallback is self-contained"
  - "Resolution block convention in KNOWN-ISSUES.md: date + phase/plan reference + brief description of semantics; summary counts reconciled in same commit"

requirements-completed: [HEALTH-02]

# Metrics
duration: ~45 min (including human verification checkpoint)
completed: 2026-04-16
---

# Phase 25 Plan 02: Section Error Boundaries (KI-16) Summary

**Added per-section error boundaries around chart and table subtrees in `data-display.tsx` using `react-error-boundary` v6, containing render-time crash blast radius to the failing section without affecting siblings.**

## Performance

- **Duration:** ~45 min (Tasks 1-2: ~8 min; Task 3 human verification: ~30 min; Task 4 docs: ~2 min)
- **Started:** 2026-04-16 (earlier session — Tasks 1-2 committed at `336e884` and `242b4ee`)
- **Completed:** 2026-04-16 (this session — Task 4 at `d5ea410`)
- **Tasks:** 4 (2 auto + 1 human-verify checkpoint + 1 auto)
- **Files modified:** 4 (1 created + 3 modified, plus pnpm-lock.yaml)

## Accomplishments

- Installed `react-error-boundary@^6` as a production dependency (not dev)
- Created `src/components/section-error-boundary.tsx` exporting `SectionErrorBoundary` and `SectionFallback` with the locked UX shape
- Wrapped the chart section (around `CrossPartnerTrajectoryChart` / `PartnerComparisonMatrix` / `KpiSummaryCards` / `CollectionCurveChart` / `RootSparkline` / `PartnerSparkline`) at `data-display.tsx:401-438`
- Wrapped the table section (around `CrossPartnerDataTable`) at `data-display.tsx:442-489`
- Verified blast radius via manual injection: chart throws -> chart fallback, table still works; table throws -> table fallback, chart still works (user-confirmed in Task 3)
- Closed KI-16 in `docs/KNOWN-ISSUES.md` with a Resolved block; reconciled summary table (Performance 2->1, Medium 9->8, Total 21->20)

## Task Commits

1. **Task 1: Install dependency + create component** — `336e884` (feat)
2. **Task 2: Wrap chart and table sections in data-display.tsx** — `242b4ee` (feat)
3. **Task 3: Visual + manual verification of error boundary behavior** — human-verify checkpoint, approved by user after injection tests in both sections
4. **Task 4: Close KI-16 in KNOWN-ISSUES.md** — `d5ea410` (docs)

## Component API

`SectionErrorBoundary` — thin wrapper over `react-error-boundary`'s `ErrorBoundary` that pre-configures the project's locked fallback UI.

```tsx
type SectionErrorBoundaryProps = {
  children: React.ReactNode;
  /**
   * Stable reference(s) that, when changed, auto-reset the boundary.
   * Pass e.g. [data] — NOT JSON.stringify(data) or a freshly computed object.
   */
  resetKeys?: unknown[];
};

export function SectionErrorBoundary({ children, resetKeys }: SectionErrorBoundaryProps): JSX.Element;
export { SectionFallback };  // exported for potential reuse / storybook
```

- Marked `'use client'` (Next.js 16 requirement — error boundaries must be client components)
- Internally uses `<ErrorBoundary FallbackComponent={SectionFallback} resetKeys={resetKeys}>`
- `SectionFallback` renders: `Alert` (shadcn) + `AlertTriangle` icon + "This section couldn't load." + `Button` "Try again" (wires to `resetErrorBoundary`) + `<details>` with message-only `<pre>`
- Event-handler and async errors are NOT caught (React error boundary contract — documented in file header comment)

## Mount Sites

| Section | File | Lines | Children | resetKeys |
|---------|------|-------|----------|-----------|
| Chart   | `src/components/data-display.tsx` | 401-438 | CrossPartnerTrajectoryChart, PartnerComparisonMatrix, KpiSummaryCards, CollectionCurveChart (partner + batch), RootSparkline, PartnerSparkline | `[data]` |
| Table   | `src/components/data-display.tsx` | 442-489 | CrossPartnerDataTable | `[data]` |

Both boundaries pass `resetKeys={[data]}` — the top-level TanStack Query result reference. Per research Pitfall 3, this is a stable referentially compared value, NOT a computed memo or `JSON.stringify` output.

## Copy Decision

Used **generic** fallback copy — `"This section couldn't load."` — identical at both mount sites. Rationale: the sentence reads naturally for both chart and table contexts, avoids an extra `title` prop on the component API, and keeps the diff minimal. Per-section copy can be added later as a `title?: string` prop if UX decides it matters; the current shape supports it trivially.

## Verification Results (Task 3 — human-verify)

User manually injected render-time throws (`throw new Error('test ...')`) into both sections and confirmed:

- **Chart throw:** chart section rendered compact fallback card; **table section continued to render normally** (blast radius contained).
- **Table throw:** table section rendered compact fallback card; **chart section continued to render normally** (blast radius contained).
- **Show details** reveal displayed the thrown message; no stack trace leaked.
- **Try again** button re-rendered the section cleanly once the injected throw was removed.
- **No layout shift** on the success path — fallback footprint matches the working component's.
- All test throws cleaned up before resumption; lint + typecheck expected clean.

User response to the checkpoint: **approved**.

## Decisions Made

- **Library vs hand-roll:** Chose `react-error-boundary` v6. Ships `resetKeys` and `FallbackComponent` matching the locked contract; ~1KB; widely battle-tested. A hand-rolled class boundary would reproduce the same code with more surface area.
- **Granularity:** Per-section (chart + table) as locked by CONTEXT.md. NOT per-card (too granular, UX noise), NOT app-wide (too coarse, doesn't match "contain blast radius" goal).
- **resetKeys value:** `[data]` — the TanStack Query `data` reference. Per research Pitfall 3, do NOT pass `JSON.stringify(data)` (thrashes) or a newly computed memo (unstable identity).
- **Fallback detail level:** Message-only in `<details>`; no stack trace; no telemetry; no structured logger. KI-20 and KI-11 remain explicitly deferred.
- **Copy:** Generic "This section couldn't load." — reused verbatim at both mount sites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Defensive error message extraction**
- **Found during:** Task 1 (component authoring)
- **Issue:** Plan's example code referenced `error.message` directly, which would itself throw if `error` were not an `Error` instance (e.g., if code threw a string or plain object). The fallback component itself must never throw.
- **Fix:** Added a local `getErrorMessage(error: unknown): string` helper that handles `Error`, `string`, and falls back to `JSON.stringify(error)` with a final catch to `'Unknown error'`.
- **Files modified:** `src/components/section-error-boundary.tsx` (lines 25-33)
- **Verification:** Typechecks clean; fallback renders a safe string for any thrown value. Manual injection tests used `throw new Error(...)` so the happy path was confirmed by user in Task 3.
- **Committed in:** `336e884`

---

**Total deviations:** 1 auto-fixed (Rule 2 — defensive correctness improvement; plan-equivalent in scope, more robust in implementation)
**Impact on plan:** Zero scope creep — still the same component, same exports, same fallback UX shape. The helper is 8 lines of internal safety and does not leak into the API surface.

## Deferred Issues

None.

## Issues Encountered

- **Human-verify checkpoint paused execution** between Tasks 3 and 4 (by design). Resumed cleanly in a fresh agent after user approval; continuation context carried the commit hashes and progress state without rework.

## User Setup Required

None — library auto-installed; no env vars or service config.

## Next Phase Readiness

- `SectionErrorBoundary` is available for any future surface that wants render-time crash isolation. Signature is minimal (`children`, optional `resetKeys`) — mount anywhere.
- Plan 25-03 (HEALTH-01 dimension filter fix) will inherit this safety net for free since it touches `data-display.tsx`.
- Plan 25-04 is already in flight (two of its commits — `1973191`, `222dd33`, `9320c03` — landed concurrently); no conflicts with this plan's files.
- KI-16 is now closed; `docs/KNOWN-ISSUES.md` summary counts reconciled.

## Self-Check

Verified:
- `src/components/section-error-boundary.tsx` exists on disk
- `src/components/data-display.tsx` contains `SectionErrorBoundary` (1 import + 2 wrapper usages = 5 occurrences including closing tags, confirmed via grep)
- `package.json` contains `react-error-boundary` in dependencies
- `docs/KNOWN-ISSUES.md` KI-16 entry contains `Resolved: 2026-04-16 in Phase 25 Plan B` block
- Commits `336e884`, `242b4ee`, `d5ea410` all exist in `git log`
- Summary table in KNOWN-ISSUES.md reconciled to Performance 1, Medium 8, Total 20

## Self-Check: PASSED

---
*Phase: 25-code-health-bug-fixes*
*Completed: 2026-04-16*
