# Type Token Migration Table (Phase 27)

Canonical mapping from ad-hoc Tailwind text-size / font-weight classes to the Phase 26 type tokens. This is the single source of truth that sweep plans 27-02..27-05 reference verbatim. If you find a case not covered here, resolve it and append to §10 before continuing.

## The 6 tokens

Shipped in Phase 26 (see `src/app/globals.css:48-71`):

- **`text-display`** — `1.5rem` / `line-height 1.2` / `font-weight 600`. Page / KPI-level hero values. Pair with `.text-display-numeric` when the content is digits.
- **`text-heading`** — `1.125rem` / `line-height 1.35` / `font-weight 600`. Section titles, dialog titles. Prefer `<SectionHeader>` for section-anchoring headings.
- **`text-title`** — `0.9375rem` / `line-height 1.4` / `font-weight 500`. Sub-section titles, emphasized labels, card headers.
- **`text-body`** — `0.875rem` / `line-height 1.5` / inherited weight (400). Default body copy, table text cells, menu items, dropdown items.
- **`text-label`** — `0.75rem` / `line-height 1.4` / `font-weight 500` / `letter-spacing 0.04em`. Overline (ALWAYS pair with `uppercase` + `text-muted-foreground`). KPI labels, eyebrow text, pill captions.
- **`text-caption`** — `0.75rem` / `line-height 1.4` / inherited weight (400). Helper text, timestamps, fine print, tooltip body, secondary meta.

## The 3 numeric variants

Shipped in Phase 26 (see `src/app/globals.css:488-508`). Extend `--text-*` with `font-variant-numeric: tabular-nums lining-nums` + an explicit family:

- **`.text-display-numeric`** — Inter (sans) + tabular-nums + lining-nums + weight 600. KPI hero values where the visual-hierarchy win of sans outweighs mono's tight digits.
- **`.text-body-numeric`** — JetBrains Mono + tabular-nums + lining-nums. Table data cells, inline metrics, trend deltas inside body copy.
- **`.text-label-numeric`** — JetBrains Mono + tabular-nums + lining-nums + 0.04em tracking. Chart axis ticks (via custom Recharts tick), footer totals, micro-metrics.

## Ad-hoc → token

| Current class(es) | → Token | Notes |
|---|---|---|
| `text-2xl font-semibold` | `text-display` | Weight baked (600); drop `font-semibold`. Page titles, hero values. |
| `text-xl font-semibold` | `text-heading` | Section titles. Prefer `<SectionHeader>` for section-anchoring headings. |
| `text-lg font-medium` | `text-heading` | Resolved: anchoring-a-section size = heading tier. |
| `text-lg` (no weight) | `text-title` | Emphasized label without section anchor. |
| `text-base` / `text-base font-medium` | `text-title` | **Resolved on pilot:** default to `text-title`. Read-through prose → `text-body`. |
| `text-sm` | `text-body` | Most common migration. |
| `text-sm font-medium` | `text-body` (drop weight) or `text-title` if emphasized | Weight dropped by default. Escalate to `text-title` only if visual hierarchy demands. |
| `text-sm font-semibold` | `text-title` | Resolved on pilot (severity header at top of AnomalyDetail). Title tier gives 500 weight baked + 0.9375rem size, reading as a prominent meta-header without a scale jump. |
| `text-xs` (plain) | `text-caption` | Helper/secondary text. |
| `text-xs font-medium` (not uppercase) | `text-label` (drop weight) | Pilot resolution: a bold small label with no uppercase is the `label` tier without the `uppercase` modifier. The token carries weight 500 + 0.04em tracking; the rendered letterforms still read mixed-case. |
| `text-xs font-medium uppercase` | `text-label uppercase` | Overline. Weight + tracking baked. |
| `text-xs tabular-nums` | `text-label-numeric` (context-dependent) | Use `.text-label-numeric` for chart ticks / footer totals; `.text-caption` + font-mono otherwise. |
| `text-[10px]` | `text-caption` OR custom axis tick | On Recharts XAxis/YAxis use `tick={{ fontSize, fontFamily }}` or custom tick component — className on axis does not propagate. |
| standalone `tabular-nums` on a digit element | swap parent class to `text-body-numeric` / `text-label-numeric` / `text-display-numeric` | Numeric variants bake tabular + lining. Remove standalone `tabular-nums`. |
| standalone `font-medium` on inline emphasis | drop the class and rely on the surrounding token, OR promote the element to `text-title` if it anchors its row | Tokens own weight. Inline emphasis should use semantic wrapping (e.g. `<strong>`) or re-tier to `text-title`. |

## Weight policy

Tokens own weight. Never pair `font-semibold` / `font-medium` / `font-bold` with a type token.

- `text-display` bakes 600.
- `text-heading` bakes 600.
- `text-title` bakes 500.
- `text-body` inherits (400).
- `text-label` bakes 500.
- `text-caption` inherits (400).

**Exception: NONE.** If you feel a call site needs a different weight than its token, pick a different token.

## Uppercase policy

`uppercase` is for `.text-label` overline only. Other tokens render mixed-case. The `.text-label` token is the uppercase utility — it bakes `letter-spacing: 0.04em` + `font-weight: 500` + `size 0.75rem` — pairing it with any other token (e.g. `text-caption uppercase`) defeats its purpose.

## Numeric policy

Apply at the shared component level — never per-call-site, never global on `<body>`.

Canonical application points:
- Table data cells — branch on `isNumeric` inside the cell renderer (`src/components/table/table-body.tsx:65`).
- KPI values — on the single value element (`src/components/kpi/kpi-card.tsx:130`).
- KPI trend deltas — on the delta span (`kpi-card.tsx:117`).
- Chart axis ticks — via Recharts `tick={{ fontFamily, fontSize }}` or a custom tick component.
- Chart tooltip values — on the tooltip value span.
- Footer aggregates — on the cell.

Never set `tabular-nums` on `<body>` or on prose containers — it forces even spacing on read-through text and degrades legibility.

## Allowlist

Files in these directories are exempt from the Phase 27 type-token enforcement (Plan 27-06 grep check). They embed classes from upstream shadcn primitives or are dedicated token-reference surfaces:

- `src/components/ui/**` — shadcn primitives (copied upstream; migrating them risks drift on `shadcn add`).
- `src/app/tokens/**` — the `/tokens` reference page (dogfoods tokens but may reference the raw scale for documentation purposes).
- `src/components/tokens/**` — in-app token specimens (palette swatches, type samples, spacing rulers).

Any file outside the allowlist must pass the Plan 27-06 grep check:
```
rg -n 'text-(xs|sm|base|lg|xl|2xl|3xl|4xl)' src/
rg -n '\bfont-(semibold|medium|bold|light|thin|extrabold|black)\b' src/
```

Zero hits outside the allowlist = enforcement passes.

## Outlier token audit (run on pilot)

**Audit method:** grepped `src/` for `text-\[[0-9]+(rem|px)\]` looking for sites using an arbitrary size ≥ 2rem (larger than the shipped `text-display` at 1.5rem).

**Result:** **No — `text-metric` is NOT added.** Zero sites use an arbitrary size ≥ `text-display`. The only arbitrary-size hits are `text-[10px]` and `text-[11px]` (sidebar pill counts, Recharts axis ticks, toolbar badge counts, sort-indicator chips, anomaly-toolbar-trigger badge), all of which are SMALLER than the standard scale — they belong to the `text-caption` / `text-label-numeric` / Recharts-tick domains, not a new hero tier. All hero values in the app fit inside `text-display-numeric` (1.5rem).

Decision-locked: do not reopen `text-metric` until a future surface demands ≥ 3 off-scale uses of a size strictly larger than 1.5rem.

## Ambiguous cases resolved during pilot

Resolutions discovered while migrating `src/components/anomaly/anomaly-detail.tsx` (6 `text-xs` + `text-sm font-semibold` header + 4 `font-medium`):

1. **`text-sm font-semibold` (severity label, line 41).** Resolved to **`text-title`**. Rationale: the severity header is a prominent inline meta-label that anchors the popover's visual hierarchy. `text-body font-semibold` would break the "tokens own weight" rule; `text-heading` (18px) jumps too large for a popover constrained to `max-w-xs`. `text-title` (0.9375rem, weight 500) reads as prominent-but-not-section-anchoring, matching the severity-header role. Appended to the `text-sm font-semibold` row of §4.

2. **`text-xs text-muted-foreground` (flag count, line 44; entity name, line 49).** Resolved to **`text-caption text-muted-foreground`**. Rationale: plain helper / secondary-meta text with no uppercase, no emphasis — the `text-caption` slot is literally this role.

3. **`text-xs font-medium text-muted-foreground` (group label, line 56).** Resolved to **`text-label text-muted-foreground`** (mixed-case, no `uppercase`). Rationale: group labels ("LIQUIDITY METRICS") are conceptually overline-adjacent but the source text is already capitalized at data layer (`group.label`). Dropping `font-medium` and promoting to `text-label` bakes weight 500 + 0.04em tracking that reads as a label tier without forcing uppercase transformation. Added `text-xs font-medium` (non-uppercase) row to §4.

4. **`text-xs` on list items with inline `font-medium` spans (lines 64/65, 92/93).** Resolved to **list item → `text-caption`**, **inline emphasis span → drop `font-medium`** (tokens own weight). Rationale: the list item carries a mix of metric-label + formatted value + expected-range suffix. The whole line reads as tight caption-tier fine print; the `font-medium` inline span was a micro-emphasis that the `text-caption`'s inherited 400 does not produce, but the adjacent severity-colored span and the colon separator already give enough visual anchoring. If post-pilot verification shows the metric name reads too flat, escalate that specific span to `text-title` rather than re-introducing `font-medium`. Added standalone `font-medium` row to §4.

5. **Inline numeric values inside the list items (formatted values from `formatter(flag.value)`).** Not swapped to `.text-body-numeric` in the pilot because they are (a) surrounded by non-numeric prose within the same line and (b) tightly embedded inside the caption-tier list item. Attempting to upgrade just the numeric span would mix `text-caption` (0.75rem) with `text-body-numeric` (0.875rem) on the same inline, creating a visible size bump. Deferred: a future pass can wrap the popover in a denser numeric-aware grid layout; for now, caption-tier tabular alignment is good enough at this row height. This resolution is specific to prose-mixed numeric display — pure-numeric cells (table body, KPI value) still use numeric variants per §7.

6. **`text-sm font-semibold` severity header re-evaluated post SectionHeader adoption.** See Task 2: if the severity header relocates under a `<SectionHeader title={...}>`, it may collapse into the header's `text-heading` slot or remain as a `text-title` sibling. Both options are acceptable; the pilot chooses whichever preserves the current visual rhythm.
