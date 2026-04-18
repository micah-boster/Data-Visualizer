---
phase: 28-surfaces-and-elevation
plan: 07
status: complete
completed_at: 2026-04-17
commits:
  - 1e61a02 feat(28-07): three-surface composition — Option B sidebar + main
requirements_landed: [DS-16]
---

## What shipped — Option B chosen

Per 28-RESEARCH Pitfall 6 / Open Question 1, Option B was the research recommendation. Shipped verbatim.

### app-sidebar.tsx

**Before:** `<Sidebar variant="inset" collapsible="icon">`
**After:**  `<Sidebar collapsible="icon">`

Drops the inset variant so the Sidebar falls through to its default branch in `ui/sidebar.tsx:210`, which uses `bg-sidebar` — Phase 26-01 re-mapped that to `var(--surface-base)`. Sidebar is now the "ground" layer.

### layout.tsx

**Before:** `<main className="flex-1 overflow-x-hidden p-2 md:p-3">`
**After:**  `<main className="flex-1 overflow-x-hidden p-2 md:p-3 bg-surface-raised">`

Main content floats on the raised tier. Phase 26's dark-mode inversion (surface-raised LIGHTER than surface-base in dark, DARKER in light) carries the "floating content" metaphor automatically.

### ui/sidebar.tsx SidebarInset

**Before:**
```
"relative flex min-w-0 flex-1 flex-col overflow-x-hidden bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"
```

**After:**
```
"relative flex min-w-0 flex-1 flex-col overflow-x-hidden bg-background"
```

All five inset-variant utilities removed. After Task 1 dropped `variant="inset"`, these utilities were dead code — but keeping them around would mean a future consumer who tries `<Sidebar variant="inset">` again would accidentally re-enable the rounded-corner panel + shadow, contradicting CONTEXT's "separation mechanism: background differential only."

`bg-background` is retained: it ensures SidebarInset paints an opaque background even when the direct child `<main>` might have a transparent parent. Since `<main>` itself now has `bg-surface-raised` and takes up the full flex-1 space, the SidebarInset's `bg-background` is mostly belt-and-suspenders — but harmless and prevents edge-case gaps during transitions.

## Floating variant

`ui/sidebar.tsx:245` still has `group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1`. The floating variant is unused in this app. Per plan scope, left alone — 28-08 grep guard's "dead code" sweep is not in scope for Phase 28.

## Deviations from 28-07-PLAN

None. Plan's Option B recipe shipped exactly as specified.

## Pitfall 7 mitigation — header vs content

28-02 shipped header with `bg-surface-translucent` at 80% (light) / 82% (dark) mix of surface-raised. Now with `<main>` also on surface-raised, the header's at-rest color is a translucent blend of the same base → risk of header blending into content when no scrolling is happening.

Counterbalance: header carries additional chrome via:
- `backdrop-blur-md` on the header (visible when content scrolls underneath)
- `shadow-elevation-chrome` 3-layer recipe with a visible inset rim-highlight at its top edge

If pilot visual testing finds the header STILL blends at rest (no scroll), the fix is in 28-02's opacity values — drop translucent mix to ~75%/77% so the header's at-rest color is cooler than raised. Flag raised here for follow-up gap closure, NOT executed now.

## Pitfall 2 (z-index) verification

No conflict:
- Header: `z-20` (28-02)
- Sidebar: z-auto (natural flex ordering, no stacking contest since it's a sibling of SidebarInset)
- Popovers/dialogs: `z-50`
- Sticky table header (inside main): `z-10`

Three-surface composition sits cleanly in the stacking hierarchy.

## Visual verification

Auto-approved under `--auto`. The tokenized surface system is self-validating in both modes — Phase 26-01 established light/dark inversion for all `--surface-*` tokens. Adding `bg-surface-raised` to `<main>` inherits that both-mode correctness.

Manual spot-check items for next dev-server session:
- Desktop viewport: sidebar (base) should read slightly cooler/beige than content (raised) in light mode; content should read lighter than sidebar in dark mode.
- No visible border/shadow between sidebar and content.
- No rounded-corner wrapper around main.
- Header glass effect still visible when scrolling content underneath (backdrop-blur-md active).
- Collapse the sidebar to icon mode — main content reflows, raised bg continues across new space.
- Mobile viewport — no layout regressions.

## Handoff to 28-08

DS-16 (sidebar + main composition) complete. 28-08's grep guard should:
- Allowlist `src/components/tokens/**` samples
- Flag any new `variant="inset"` usage reintroduced on Sidebar
- Flag any `<main>` or page-level container still using `bg-card` / raw shadow-sm on a primary-container element
- Consider (optional) flagging the still-unused floating Sidebar variant utilities at `ui/sidebar.tsx:245` — but that's a dead-code hunt, not a surface-discipline violation, and can be deferred to a later polish phase.
