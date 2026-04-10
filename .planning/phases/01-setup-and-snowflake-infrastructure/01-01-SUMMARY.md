---
phase: 01-setup-and-snowflake-infrastructure
plan: 01
subsystem: ui, infra
tags: [nextjs, shadcn-ui, tailwind, tanstack-query, next-themes, dark-mode]

requires:
  - phase: none
    provides: first plan in project
provides:
  - Next.js 16 project scaffold with App Router and TypeScript
  - shadcn/ui component library (button, card, skeleton, alert, sidebar, separator)
  - Sidebar + header layout shell
  - Dark mode toggle via next-themes
  - TanStack Query client singleton with 5min staleTime
  - .env.example with Snowflake credential placeholders
affects: [01-02, 02, all-future-phases]

tech-stack:
  added: [next@16.2.3, react@19, snowflake-sdk@2.4.0, @tanstack/react-query@5.97.0, next-themes@0.4.6, zod@4.3.6, shadcn-ui, lucide-react, tailwindcss@4]
  patterns: [singleton-query-client, theme-provider-wrapper, sidebar-layout-shell]

key-files:
  created:
    - src/app/providers.tsx
    - src/lib/query-client.ts
    - src/components/theme-toggle.tsx
    - src/components/layout/app-sidebar.tsx
    - src/components/layout/header.tsx
    - .env.example
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - package.json
    - .gitignore

key-decisions:
  - "Used Geist font (ships with create-next-app) instead of Inter for distinctive look"
  - "Sidebar uses variant='inset' with collapsible='icon' for clean collapse behavior"
  - "Added custom scrollbar styling and subtle transitions for distinctive feel"

patterns-established:
  - "Provider stacking: QueryClientProvider > ThemeProvider > TooltipProvider in providers.tsx"
  - "Layout composition: SidebarProvider > AppSidebar + SidebarInset > Header + main"
  - "Theme: suppressHydrationWarning on html element, resolvedTheme for toggle logic"

requirements-completed: [DEPL-02]

duration: 8min
completed: 2026-04-10
---

# Plan 01-01: Project Scaffold Summary

**Next.js 16 app with shadcn/ui sidebar layout, dark mode, TanStack Query, and Snowflake credential management**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Next.js 16 project scaffolded with TypeScript, Tailwind CSS v4, and App Router
- shadcn/ui initialized with sidebar, button, card, skeleton, alert, separator, tooltip, sheet components
- Layout shell with collapsible sidebar (Bounce branding), header with theme toggle, and main content area
- Dark mode toggle working via next-themes with system preference detection
- TanStack Query client configured with 5min staleTime and 30min gcTime
- .env.example committed with all 7 SNOWFLAKE_ credential placeholders

## Task Commits

1. **Task 1: Scaffold Next.js project and install dependencies** - `df0e6e3` (feat)
2. **Task 2: Build layout shell with sidebar, header, dark mode, and providers** - `c55dae2` (feat)

## Files Created/Modified
- `src/app/providers.tsx` - QueryClientProvider + ThemeProvider + TooltipProvider wrapper
- `src/lib/query-client.ts` - TanStack Query client singleton with staleTime/gcTime
- `src/components/theme-toggle.tsx` - Sun/Moon toggle using resolvedTheme
- `src/components/layout/app-sidebar.tsx` - Sidebar with Bounce branding and Dashboard nav
- `src/components/layout/header.tsx` - Top bar with title, data freshness placeholder, theme toggle
- `src/app/layout.tsx` - Root layout with providers, sidebar, and header composition
- `src/app/page.tsx` - Placeholder card confirming layout works
- `src/app/globals.css` - Enhanced with custom scrollbar and theme transition styles
- `.env.example` - Snowflake credential template (committed)
- `.gitignore` - Added !.env.example exception

## Decisions Made
- Used Geist font from create-next-app instead of importing Inter separately
- Sidebar uses inset variant with icon collapse for a clean, professional feel
- Added custom scrollbar styling for a more polished, non-stock appearance

## Deviations from Plan

### Auto-fixed Issues

**1. SidebarMenuButton asChild prop not supported in shadcn/ui v4**
- **Found during:** Task 2 (sidebar implementation)
- **Issue:** Latest shadcn/ui sidebar component no longer supports asChild prop
- **Fix:** Removed asChild and nested content directly inside SidebarMenuButton
- **Verification:** Build passes with no TypeScript errors
- **Committed in:** c55dae2

---

**Total deviations:** 1 auto-fixed (API mismatch)
**Impact on plan:** Minor API difference, no functional impact.

## Issues Encountered
None beyond the asChild prop fix above.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Layout shell is complete and ready for data layer integration
- Header has placeholder area for data freshness timestamp (Plan 02 will wire it)
- TanStack Query provider is ready for useQuery hooks
- .env.example documents the Snowflake credentials Plan 02 needs

---
*Phase: 01-setup-and-snowflake-infrastructure*
*Completed: 2026-04-10*
