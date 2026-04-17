---
phase: 27-typography-and-information-hierarchy
plan: 06
subsystem: ci
tags: [typography, enforcement, ci-guard, grep, tokens-reference, section-header, numeric-variants, ds-07, ds-08, ds-09, ds-10, phase-closer]

requires:
  - phase: 26-design-tokens
    provides: "Shipped 6-tier type scale + 3 numeric variants + tokens reference surface at /tokens"
  - phase: 27-02-charts-kpi-matrix-sweep
    provides: "Chart + KPI + matrix surfaces migrated to type tokens"
  - phase: 27-03-tables-sweep
    provides: "Remaining table surfaces migrated to type tokens"
  - phase: 27-04-toolbar-sweep
    provides: "Toolbar + popover + sheet surfaces migrated to type tokens"
  - phase: 27-05-remaining-surfaces-sweep
    provides: "Sidebar + breadcrumb + query + anomaly + empty/error/loading surfaces migrated"

provides:
  - "scripts/check-type-tokens.sh: POSIX-grep CI guard forbidding ad-hoc text-(xs|sm|base|lg|xl|2xl|3xl|4xl) and font-(semibold|medium|bold|light|thin|extrabold|black) outside the allowlist"
  - "package.json check:tokens script — npm run check:tokens invokes the guard"
  - "/tokens type-specimen: SectionHeader (DS-10) live demo + numeric-variants in-situ demo"
  - "Weight-policy gap closures: kpi-card trend delta + trend-indicator arrow no longer pair tokens with font-medium"

affects:
  - phase-27-close
  - future-ci-wiring (user flips Vercel / pre-commit switch separately)

tech-stack:
  added: []
  patterns:
    - "POSIX grep -rE for cross-platform CI guards (BSD/GNU grep works; ripgrep not required). Script runs in <1s on src/."
    - "Per-rule scope expansion: fix documented-exception sites inline when they block a strict-mode guard. Preserves the strict rule (§5 Exception: NONE) over per-site escape hatches."
    - "/tokens dogfoods new primitives: SectionHeader shipped in Plan 27-01 now visible in the reference page, keeping in-app source-of-truth current."

key-files:
  created:
    - "scripts/check-type-tokens.sh"
    - ".planning/phases/27-typography-and-information-hierarchy/27-06-SUMMARY.md"
  modified:
    - "package.json"
    - "docs/TYPE-MIGRATION.md"
    - "src/components/kpi/kpi-card.tsx"
    - "src/components/table/trend-indicator.tsx"
    - "src/components/tokens/type-specimen.tsx"

key-decisions:
  - "POSIX grep -rE over ripgrep: ripgrep is not universally installed (not on this dev machine at script author time, and Vercel build image not guaranteed to ship it). A 63-line bash script with find + grep -rE gives identical behavior, runs in <1s, and needs zero install step in CI."
  - "Scope expansion: dropped font-medium from kpi-card.tsx:117 trend-delta span (text-label-numeric already bakes weight 500 — removal is visually a no-op) and swapped trend-indicator.tsx:83 arrow span from text-caption font-medium to text-label (preserves weight-500 prominence via baked weight, closes the Phase 27-03 exception without reintroducing the rule-violating pair). This honors TYPE-MIGRATION.md §5 Exception: NONE."
  - "CI enablement deferred: the guard ships + package.json wiring is live, but Vercel build step / pre-commit hook wiring is user-owned — not flipped in this plan per plan's project_constraints."
  - "Demo buttons in /tokens SectionHeader actions use plain HTML <button type='button'> (not shadcn <Button>) per plan instruction — the point is the prop contract, not button styling."

requirements-completed: [DS-07, DS-08, DS-09, DS-10]

metrics:
  duration: 55 min
  tasks: 3
  files_created: 2
  files_modified: 5
  commits: 2 (+ checkpoint auto-approved with no commit)
  completed: "2026-04-17"
---

# Phase 27 Plan 06: Enforcement Guard + /tokens Demos Summary

**Shipped the Phase 27 closer — a POSIX grep CI guard (`scripts/check-type-tokens.sh`, wired as `npm run check:tokens`) that prevents regression of the type-token rule, plus live SectionHeader and numeric-variants demos on `/tokens`. Closed two documented-exception weight-policy gaps inline so the strict `§5 Exception: NONE` rule holds.**

## Performance

- **Duration:** ~55 min (wall clock; much of that was context-loading + verifying pre-existing font-medium hits were actually documented exceptions vs. fresh regressions)
- **Started:** 2026-04-17T21:04:40Z
- **Completed:** 2026-04-17T22:00:26Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via `workflow.auto_advance`)
- **Files modified:** 5 (2 created, 5 modified)

## Accomplishments

- **`scripts/check-type-tokens.sh` shipped** — 63 lines, POSIX-grep based, exits 0 on the current tree. Exit 1 with file:line output if any src file outside the allowlist introduces `text-(xs|sm|base|lg|xl|2xl|3xl|4xl)` or `font-(semibold|medium|bold|light|thin|extrabold|black)`.
- **`npm run check:tokens`** wired via `package.json` scripts block.
- **Allowlist documented** both in the script's `find -not -path` arguments and in `docs/TYPE-MIGRATION.md §8`: `src/components/ui/**`, `src/app/tokens/**`, `src/components/tokens/**`.
- **Script portability**: uses `find … -not -path` + `grep -rE` — BSD/GNU compatible. No ripgrep dependency.
- **`/tokens` SectionHeader demo** — three live examples (title-only, title+eyebrow+description, title+eyebrow+description+actions) each inside a `bg-surface-raised rounded-lg` card with `p-card-padding`. Users browsing `/tokens` now see the SectionHeader component shipped in Plan 27-01.
- **`/tokens` numeric-variants in-situ demo** — a KPI-style card (text-label overline + text-display-numeric value + text-label-numeric success delta) and a three-row inset block demonstrating tabular-nums column alignment across `1,234,567.89` / `987,654.32` / `4,321.10`.
- **Weight-policy gap closures**:
  - `src/components/kpi/kpi-card.tsx:117` — removed `font-medium` from `text-label-numeric font-medium` trend-delta span (label tier bakes 500, so `font-medium` was redundant).
  - `src/components/table/trend-indicator.tsx:83` — swapped `text-caption font-medium` to `text-label` on the trend-arrow span (closes Phase 27-03's glyph-arrow exception; `text-label` bakes weight 500 + 0.04em tracking, preserving prominence).
- **`docs/TYPE-MIGRATION.md §8`** updated to (a) document the ripgrep-vs-grep portability choice and (b) record the two scope-expansion fixes.
- **`npm run build` passes** after all changes.

## Task Commits

1. **Task 1: Author `check-type-tokens.sh` + wire `package.json` + close weight-policy gaps** — `6e0af1b` (feat)
2. **Task 2: Add SectionHeader + numeric-variants demos to /tokens type-specimen** — `f9d5ea2` (feat)
3. **Task 3: Human-verify checkpoint** — auto-approved via `workflow.auto_advance=true` (no commit; no screenshots captured per auto-mode policy)

## Files Created/Modified

- `scripts/check-type-tokens.sh` (created, 63 lines, chmod +x) — POSIX grep CI guard
- `.planning/phases/27-typography-and-information-hierarchy/27-06-SUMMARY.md` (this file)
- `package.json` (modified) — added `check:tokens` script entry
- `docs/TYPE-MIGRATION.md` (modified) — §8 portability note + scope-expansion log
- `src/components/kpi/kpi-card.tsx` (modified) — dropped `font-medium` from trend-delta span
- `src/components/table/trend-indicator.tsx` (modified) — `text-caption font-medium` → `text-label` on arrow span
- `src/components/tokens/type-specimen.tsx` (modified) — added SectionHeader demo + numeric-variants in-situ demo sections

## Decisions Made

### POSIX grep over ripgrep

The plan's Task 1 literal contents used `rg` (ripgrep). Investigation surfaced that ripgrep is NOT installed as a binary on this dev machine (only a shell function in the agent's sandbox that routes back to Claude). CI environments (Vercel's build image) don't guarantee ripgrep either — adding it as a dependency would require either a `brew install` step in CI or a dev-dependency install. A 63-line bash script using `find … -not -path` + `grep -rE 'pattern'` delivers identical behavior, is BSD/GNU compatible, runs in <1s on `src/`, and has zero install footprint.

Word-boundary handling required extra care with BSD grep (which doesn't reliably support `\b` in POSIX regex). The final patterns use explicit `([^a-zA-Z0-9-]|$)` trailing boundaries and `(^|[^a-zA-Z0-9-])` leading boundaries. Verified on the current tree: `text-` false-positives (e.g., `text-muted-foreground`, `text-success-fg`) do not match; real hits (`text-sm`, `font-medium`) do match.

### Scope expansion: close documented weight-policy exceptions

The first clean-tree run of the guard surfaced two hits: `kpi-card.tsx:117` (`text-label-numeric font-medium`) and `trend-indicator.tsx:83` (`text-caption font-medium`). Both were documented exceptions from earlier plans:
- 26-02 pilot paired `font-medium` with `text-label-numeric` on the trend delta span before Phase 27's strict weight policy existed.
- 27-03 explicitly granted an exception to `font-medium` on the trend-arrow glyph span.

Per the plan's Task 1 Step C — *"If the hit is in a file that should have been migrated, fix it here (scope expansion is justified — Phase 27 cannot close with un-swept files)"* — and per TYPE-MIGRATION.md §5 *"Exception: NONE"*, both sites were fixed inline rather than adding them to the allowlist:
- kpi-card: `font-medium` removed; `text-label-numeric` already bakes weight 500.
- trend-indicator: promoted `text-caption font-medium` → `text-label` (same size, baked weight 500, plus 0.04em tracking — tolerable on a unicode arrow glyph).

The alternative (adding `kpi-card.tsx` + `trend-indicator.tsx` to the allowlist) would have defeated the guard's purpose on two of the most-visible numeric-display files in the app.

### Demo buttons as plain HTML

Plan explicitly scoped the SectionHeader demo's `actions` slot to plain `<button type="button">` elements rather than wiring shadcn `<Button>`. The point of the demo is the SectionHeader prop contract (title + eyebrow + description + actions: ReactNode), not button styling.

### CI enablement deferred

The guard is live + the `npm run check:tokens` alias is wired, but the plan explicitly scoped *"Do NOT enable the script in Vercel's build step in this plan — leave that to the user's next CI wiring session."* Recommended follow-ups (flagged for the user):
- Add to Vercel's build command: `npm run check:tokens && npm run build`.
- OR add as a pre-commit hook via Husky or a simpler `.git/hooks/pre-commit` shell script.
- OR add as a GitHub Actions step.

All three options are one-line additions; the guard itself is ready.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Script required rewrite from ripgrep to POSIX grep**
- **Found during:** Task 1 (before writing the script)
- **Issue:** Plan's literal Task 1 contents used `rg` (ripgrep). Investigation via `command -v rg` + `find / -name rg` confirmed ripgrep is not installed as a binary on this system (only a shell function in the agent sandbox). A script depending on `rg` would fail when users ran it locally or when CI tried to execute it.
- **Fix:** Rewrote the script using POSIX `find` + `grep -rE` with explicit character-class boundaries. Word boundaries (`\b`) replaced with `([^a-zA-Z0-9-]|$)` anchors for BSD grep compatibility.
- **Files modified:** `scripts/check-type-tokens.sh` (new), `docs/TYPE-MIGRATION.md` §8 (documents the choice)
- **Commit:** `6e0af1b`

**2. [Rule 3 - Blocking] Weight-policy hits in non-allowlisted files**
- **Found during:** Task 1 Step C (first clean-tree run of the guard)
- **Issue:** Guard flagged `src/components/kpi/kpi-card.tsx:117` and `src/components/table/trend-indicator.tsx:83`. Both were documented per-prior-plan exceptions but violate TYPE-MIGRATION.md §5 *"Exception: NONE"*. Phase 27 could not close with the guard either (a) failing or (b) broadly allowlisting critical numeric-display files.
- **Fix:** Dropped `font-medium` from kpi-card trend span (label-numeric already bakes 500); swapped `text-caption font-medium` → `text-label` on trend-indicator arrow span (same weight 500, preserves prominence).
- **Files modified:** `src/components/kpi/kpi-card.tsx`, `src/components/table/trend-indicator.tsx`, `docs/TYPE-MIGRATION.md`
- **Commit:** `6e0af1b` (bundled with Task 1 since the guard can't land green without these fixes)

## Deferred Issues

None.

## Authentication Gates

None.

## User Setup Required

- **Enable the guard in CI.** The `npm run check:tokens` script is wired but not yet part of the Vercel build command or any pre-commit hook. To activate enforcement:
  - Vercel: change the build command to `npm run check:tokens && npm run build`, OR
  - Pre-commit: add a Husky hook or `.git/hooks/pre-commit` wrapper invoking the script, OR
  - GitHub Actions: add a step `run: npm run check:tokens` before the build step.
  All three options are one-line changes; the underlying script and package.json alias are already in place.

## Next Phase Readiness

- **Phase 27 closes here.** All six plans (27-01 pilot, 27-02..27-05 sweeps, 27-06 enforcement) shipped. 131 ad-hoc `text-*` hits across 55 files at phase start → 0 hits outside allowlist at phase close.
- **Guard is the durable win.** Without enforcement, a future commit could silently reintroduce `text-sm` or `font-medium`. With `npm run check:tokens` wired (and once enabled in CI), regression is mechanically impossible.
- **`/tokens` is now a complete typography reference** — 6 type tokens + 3 numeric variants + SectionHeader live demo + numeric-variants in-situ demo, all dogfooded.
- **No blockers.** Ready for Phase 28 (Surfaces & Elevation) or any other milestone-v1 phase.

## Self-Check: PASSED

- `scripts/check-type-tokens.sh` exists on disk and is executable
- `package.json` contains `"check:tokens"` entry
- `docs/TYPE-MIGRATION.md` §8 updated with portability + scope-expansion notes
- `src/components/kpi/kpi-card.tsx` no longer pairs `text-label-numeric` with `font-medium`
- `src/components/table/trend-indicator.tsx` no longer pairs `text-caption` with `font-medium`
- `src/components/tokens/type-specimen.tsx` imports SectionHeader and contains >=3 live SectionHeader usages + >=5 numeric-variant utility class references
- Commit `6e0af1b` (Task 1) found in `git log --oneline --all`
- Commit `f9d5ea2` (Task 2) found in `git log --oneline --all`
- `bash scripts/check-type-tokens.sh` exits 0 on the post-plan tree
- `npm run check:tokens` exits 0 on the post-plan tree
- `npm run build` succeeds after Task 2 changes

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
