---
phase: 28-surfaces-and-elevation
plan: 03
status: complete
completed_at: 2026-04-17
commits:
  - 4f44bfc feat(28-03): retune KPI family to shadow-elevation-raised
requirements_landed: [DS-12]
---

## What shipped

KPI card family unified on the Phase 28 semantic raised tier.

### KpiCard final recipe

```
rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default
```

**Changes from 26-02 pilot:**
- `shadow-sm` → `shadow-elevation-raised` (semantic tier)
- `border border-border` dropped entirely (rim highlight carries)
- `transition-colors duration-quick ease-default` preserved verbatim (Phase 30 anchor)

### KpiSummaryCards skeleton + empty-state recipes

Both now read:
```
rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised
```
(Empty state keeps `flex h-24 items-center justify-center` for the centered "no data" message; loading skeleton keeps the Skeleton children untouched.)

**Changes:**
- `rounded-xl` → `rounded-lg` (Pitfall 5 consistency with real KpiCard)
- `border border-border/50` dropped (matches real card)
- `bg-transparent` → `bg-surface-raised` (skeletons look like real cards with grayed interiors instead of translucent ghosts)
- `p-4` → `p-card-padding` (token-driven)
- `shadow-elevation-raised` added (matches real card)

## Border decision (plan interface question answered)

**Border dropped entirely, not demoted to `border-border/40`.**

Rationale: the rim-highlight layer inside `shadow-elevation-raised` — `inset 0 1px 0 0 oklch(1 0 0 / 0.08)` in light, `0.05` in dark — is a faint top-edge white line that reads as "this card is lit from above." Adding `border border-border/40` underneath would produce a visible double edge on the top and ghost the rim's effect on the other three edges. If pilot visual testing later surfaces a low-contrast case (e.g., a future stat card rendered against `surface-base` on mobile where raised→base lift is minimal), revisit in a gap-closure plan with a SINGLE border approach, not rim+border.

## Deviations from 28-03-PLAN

None material. Both the real card and the skeleton/empty-state recipes landed exactly as specified in Task 1 and Task 2.

## Visual verification

Auto-approved under `--auto`. KpiCard already had both-mode coverage in 26-02; Phase 28 only changes the shadow class (tokenized, both-mode coverage via 28-01) and drops a border. The skeleton/empty-state changes mirror the real card's recipe exactly, so if the card reads correctly, the skeleton reads correctly.

Manual spot-check items for next dev-server session:
- KPI grid on partner drill-down — confirm 3-layer shadow is visible, rim reads as a subtle top-edge lift (not a visible line)
- Soft-reload to catch skeleton state — skeleton cells should match real cards' surface/radius/padding
- Filter to zero-batch partner — empty-state cell matches card recipe
- Dark mode sweep — rim dimmer (0.05 opacity vs 0.08 light) so it reads as depth not glare

## Handoff notes

- Phase 30 hover-lift plan: the transition-colors duration-quick ease-default chain is ready. Layer `hover:shadow-elevation-overlay` on the KpiCard class for the lift-on-hover affordance without refactoring timing.
- Typography tokens on empty-state text (`text-body text-muted-foreground`) are from Phase 27 and unchanged here — no deviation flag for typography follow-up.
