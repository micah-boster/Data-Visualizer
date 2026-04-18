---
phase: 28-surfaces-and-elevation
plan: 08
status: complete
completed_at: 2026-04-17
commits:
  - (see parent) feat(28-08): POSIX grep guard for surface + elevation discipline
requirements_landed: [DS-17]
---

## What shipped

`scripts/check-surfaces.sh` — a POSIX grep guard that enforces Phase 28's surface + elevation discipline across the src/ tree.

### Three rules, scoped to an allowlist

1. **No raw shadow-sm/md/lg/xl/2xl on primary containers.** Semantic elevations are the API for container surfaces. `shadow-xs` remains legal (chips, badges, sticky-header lifts).
2. **No ad-hoc card-frame combos.** The pattern `rounded-* + border + bg-(card|popover|background)` is what Phase 28 systematically swept away. Form controls (which use `border-input`, the Phase 26 shadcn-mapped form-control border token) are filtered out so the guard doesn't false-positive on inputs/selects/combobox triggers.
3. **No translucent popover regressions.** CONTEXT-locked: popovers stay opaque, translucent is header-only. The sole legitimate carveout is `src/components/layout/header.tsx`, explicitly excluded.

### Allowlist

Mirrors the 27-06 check-type-tokens.sh pattern:

```
EXCLUDE_DIRS=(
  "src/components/ui"        # shadcn primitives own their surface recipes
  "src/app/tokens"            # token reference page
  "src/components/tokens"     # token demos (intentional raw-utility usage)
)
EXCLUDE_FILES=(
  "src/components/layout/header.tsx"  # only legitimate translucent container
)
```

### npm script

```json
"check:surfaces": "bash scripts/check-surfaces.sh"
```

Wired alongside existing `check:tokens`. They are complementary, not competing.

### Runtime

~54ms on this src/ tree (cold). Fast enough for pre-commit / CI.

## Straggler closure (Task 2)

**None needed.** The guard reported exactly one hit on first run:

```
src/components/filters/filter-combobox.tsx:37: Combobox.Trigger className with
rounded-md border border-input bg-background
```

This is a form-control trigger (input-like field), NOT a primary container. The plan's 28-06 Interfaces explicitly preserved this line: "line ~37 trigger is a form control, leave."

**Resolution chosen:** tune the guard regex rather than allowlist the file, because `border-input` is the canonical Phase 26 form-control border token and the distinction between "form control with border" vs. "container with border" should be codified in the guard's logic, not one-off exclusions. The regex now pipes through `grep -vE 'border-input'` after the main card-frame pattern — zero false positives on the current tree and a clear policy for any future form controls in app code.

After the regex tune, the guard exits 0 on the clean tree. `npm run build` still passes. No Phase 28 gap closure required.

## Deviations from 28-08-PLAN

1. **Guard's Check 2 filters border-input in a post-pipeline grep**, not a single ERE pattern. POSIX grep extended regex has no negative-lookahead, so a two-step pipeline is the cleanest way to exclude form-control hits without allowlisting individual files.
2. **Task 2 is a no-op.** Waves 2-3 landed clean — table-footer, data-display bare wrapper, sort-dialog nested cards, view-item, matrix-*.tsx all pass the guard without migration. This is a better outcome than the plan's "expected stragglers" list anticipated.

## Verification

- `scripts/check-surfaces.sh` exists, `chmod +x` applied ✅
- `package.json` has `check:surfaces` script entry ✅
- `bash scripts/check-surfaces.sh` exits 0 on clean tree ✅
- `npm run build` still passes ✅
- Phase 27's `check:tokens` still passes (no typography regressions) ✅
- Guard runtime: ~54ms (well under 1s) ✅

## Phase 28 closure

Eight plans land:

| Req | Plan | Scope |
|---|---|---|
| DS-11 | 28-01, 28-02 | Translucent header glass + 4 elevation tokens |
| DS-12 | 28-03 | KPI family on shadow-elevation-raised |
| DS-13 | 28-04 | Table as recessed pane, sticky header lift, zebra gone |
| DS-14 | 28-05 | Chart shells + query cards + anomaly panel on raised recipe |
| DS-15 | 28-06 | Overlay family on semantic elevations (tooltip preserved) |
| DS-16 | 28-07 | Three-surface composition — sidebar base, main raised |
| DS-17 | 28-01 (tokens), 28-08 (guard) | Discipline enforcement |

The semantic tier is live. Every primary container in the app reaches for `shadow-elevation-*` instead of raw shadow utilities. The guard prevents regression.
