# Stack Research

**Domain:** Within-partner comparison and visualization additions to existing data table app
**Researched:** 2026-04-11
**Confidence:** HIGH

> This is a v2.0 addendum. The existing validated stack (Next.js 16, TanStack Table 8, React Query 5, Tailwind 4, shadcn/ui, Snowflake connector, Zod 4) is not re-researched here. This focuses exclusively on what NEW libraries/approaches are needed for collection curve charts, conditional formatting, batch-over-batch trending, and KPI summary cards.

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Recharts | ^3.8.1 | Collection curve charts, trending line charts, area charts | shadcn/ui's official chart component is built on Recharts. React 19 support confirmed in peer deps (`react: ^19.0.0`). SVG-based rendering integrates with Tailwind theming via CSS variables. Declarative JSX API matches existing component patterns. |
| react-is | ^19.2.0 | Required peer dependency of Recharts 3.x | Recharts 3.x lists `react-is` as a peer dependency supporting `^19.0.0`. Must be installed explicitly since it does not ship with React 19 core. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Chart component | N/A (copy-paste) | Pre-styled ChartContainer, ChartTooltip, ChartLegend wrappers around Recharts | Use for all charts. Provides consistent theming via `--chart-1` through `--chart-5` CSS variables and accessible tooltip/legend components. |

### No New Libraries Needed For

| Feature | Approach | Why No Library |
|---------|----------|----------------|
| **Conditional formatting** | Pure Tailwind + `cn()` utility | Already have `cn()` in `src/lib/utils.ts`. Cell background/text colors driven by threshold logic in cell renderer functions. No library can do this better than inline conditional classes. |
| **KPI summary cards** | Existing shadcn Card component | `Card`, `CardHeader`, `CardTitle`, `CardContent` already in `src/components/ui/card.tsx`. KPI cards are Card + formatted number + delta indicator. |
| **Batch-over-batch trending** | Recharts LineChart + computation utils | Trending is a data transformation (compute deltas between batches) rendered as a chart. No separate trending library needed. |
| **Delta/change indicators** | Lucide React icons (already installed) | `ArrowUp`, `ArrowDown`, `Minus` icons from `lucide-react` (already at ^1.8.0) for trend direction indicators on KPI cards. |

## Installation

```bash
# New dependencies (only 2 packages)
npm install recharts@^3.8.1 react-is@^19.2.0
```

That's it. Two packages. Everything else is already in the project or built with existing tools.

## Chart CSS Variable Update Required

The existing `globals.css` has chart variables defined but they are all grayscale:

```css
--chart-1: oklch(0.87 0 0);   /* light gray */
--chart-2: oklch(0.556 0 0);  /* medium gray */
```

These MUST be updated to distinguishable colors for collection curve overlays where 3-8 batch lines appear on the same chart. Recommended update:

```css
/* Light mode */
--chart-1: oklch(0.65 0.19 252);  /* blue */
--chart-2: oklch(0.63 0.17 145);  /* green */
--chart-3: oklch(0.63 0.19 25);   /* orange */
--chart-4: oklch(0.55 0.19 325);  /* purple */
--chart-5: oklch(0.60 0.17 15);   /* red */
```

This is a config change, not a library addition. Use oklch for perceptual uniformity so lines are equally visible.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Recharts 3.x | Recharts 2.x (^2.15.4) | Never for this project. 2.x pins `react-is: ^18.3.1` which conflicts with React 19.2.4. The `react-is` mismatch causes blank chart rendering (documented in recharts issue #6857). 3.x properly peers React 19. |
| Recharts 3.x | Tremor | If you want pre-built KPI card + chart combos. But Tremor wraps Recharts anyway, adds another abstraction layer, and locks you into their component API. Since we already have shadcn Card components, Tremor adds weight without value. |
| Recharts 3.x | Chart.js / react-chartjs-2 | Never for this project. Canvas-based rendering means tooltips and legends exist outside React's component tree. Custom tooltips require portal hacks. SVG (Recharts) integrates naturally with React and is inspectable in devtools. |
| Recharts 3.x | Nivo | If you need very specific chart types (heatmaps, waffle charts). Nivo is heavier and more opinionated. For line/area/bar charts, Recharts is simpler and better documented. |
| Recharts 3.x | visx (Airbnb) | If you need D3-level control with React primitives. visx is lower-level than Recharts -- you build charts from graphic primitives. Overkill when Recharts' LineChart/AreaChart components do exactly what collection curves need. |
| Recharts 3.x | Observable Plot | If you need statistical visualization (distributions, regressions). Collection curves are standard multi-series line charts. Observable Plot's React integration is also less mature. |
| Pure Tailwind conditional formatting | react-data-grid / AG Grid conditional formatting | Never. These replace TanStack Table entirely. We already have a working TanStack Table with 61 columns. Conditional formatting is cell-level CSS, not a table engine concern. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Recharts 2.x** | `react-is: ^18.3.1` hard dep conflicts with React 19.2.4. Known blank rendering issue. | Recharts 3.x |
| **Tremor** | Wraps Recharts + adds another component system alongside shadcn. Redundant abstraction for a project that already has shadcn Card/Tooltip. | Recharts directly via shadcn Chart component |
| **Chart.js** | Canvas rendering breaks React component model. Tooltip/legend customization requires imperative workarounds. | Recharts (SVG, declarative) |
| **A "conditional formatting library"** | No such thing exists that is worth using. Conditional formatting is `cn()` + threshold logic. Any library would be more complex than the 5 lines of code needed. | `cn()` with Tailwind classes |
| **Redux / state management additions** | Recharts 3.x pulls in `@reduxjs/toolkit` as its own internal dependency. Do NOT add Redux to your app code. Let Recharts manage its own Redux internals. Your app state stays in React Query + React state. | Existing React Query + useState/useReducer |
| **Separate KPI/dashboard component library** | Libraries like `react-dashboard` or dashboard templates add coupling. KPI cards are Card + number + icon. Build them in 30 minutes. | shadcn Card + Lucide icons |

## Integration Points with Existing Stack

### Recharts + shadcn/ui
shadcn provides a `chart` component (via `npx shadcn@latest add chart`) that wraps Recharts with:
- `ChartContainer` -- handles responsive sizing and CSS variable theming
- `ChartTooltip` + `ChartTooltipContent` -- styled tooltips matching shadcn design
- `ChartLegend` + `ChartLegendContent` -- styled legends

Install via: `npx shadcn@latest add chart` (copies source into `src/components/ui/chart.tsx`)

### Recharts + Tailwind CSS Variables
Recharts fill/stroke colors reference CSS variables: `fill="var(--color-chart-1)"`. This means dark mode works automatically when CSS variables switch. No Recharts config changes needed for theme switching.

### Recharts + React Query
Chart data comes from the same React Query hooks that power the table. Pattern:
```typescript
const { data: batchData } = useQuery({ queryKey: ['batches', partnerId], ... });
// Same data feeds both table AND charts
// No duplicate API calls
```

### Conditional Formatting + TanStack Table
TanStack Table's cell renderer functions already receive the cell value. Add threshold logic:
```typescript
cell: ({ getValue }) => {
  const value = getValue<number>();
  const deviation = computeDeviation(value, partnerAverage);
  return (
    <span className={cn(
      deviation > 0.1 && 'text-green-600 bg-green-50',
      deviation < -0.1 && 'text-red-600 bg-red-50',
    )}>
      {formatPercent(value)}
    </span>
  );
}
```

### KPI Cards + Existing Card Component
The existing `Card` component in `src/components/ui/card.tsx` supports a `size="sm"` variant. KPI cards compose:
```
Card > CardHeader > CardTitle (metric name)
Card > CardContent > big number + delta badge
```

## Recharts 3.x Dependency Note

Recharts 3.x internally depends on `@reduxjs/toolkit`, `react-redux`, `immer`, `reselect`, and `es-toolkit`. These are Recharts internals for its own state management and will be tree-shaken by Next.js bundler for any parts not used by Recharts. This adds ~150-200KB to the client bundle (gzipped). For an internal tool with 2-3 users, this is acceptable. Do NOT refactor your app to use Redux just because Recharts brings it in.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| recharts@3.8.1 | react@19.2.4 | Officially supported via `peerDependencies: { react: "^19.0.0" }` |
| recharts@3.8.1 | react-is@19.2.0+ | Must install explicitly. Recharts peers `react-is: "^19.0.0"` |
| recharts@3.8.1 | next@16.2.3 | No known issues. Recharts is a client component (needs `"use client"` directive). |
| recharts@3.8.1 | tailwindcss@4.x | No conflict. Recharts uses SVG attributes for styling. CSS variables bridge the two. |
| shadcn chart component | recharts@3.x | shadcn docs provide Recharts v3 migration guide. Uses `var(--chart-N)` not `hsl(var(--chart-N))`. |

## Sources

- [recharts npm](https://www.npmjs.com/package/recharts) -- version 3.8.1, peer deps verified via `npm view` (HIGH confidence)
- [recharts GitHub issue #6857](https://github.com/recharts/recharts/issues/6857) -- React 19.2.3 blank rendering with v2.x (HIGH confidence)
- [recharts GitHub issue #4558](https://github.com/recharts/recharts/issues/4558) -- React 19 support tracking (HIGH confidence)
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/radix/chart) -- built on Recharts, theming via CSS variables (HIGH confidence)
- [shadcn/ui Recharts v3 issue #7669](https://github.com/shadcn-ui/ui/issues/7669) -- v3 support confirmed (MEDIUM confidence)
- [Tremor](https://www.tremor.so/) -- evaluated and rejected; wraps Recharts, redundant with shadcn (MEDIUM confidence)

---
*Stack research for: Bounce Data Visualizer v2.0 within-partner comparison features*
*Researched: 2026-04-11*
