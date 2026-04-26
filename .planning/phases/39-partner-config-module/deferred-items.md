# Phase 39 — Deferred Items

Out-of-scope discoveries logged during plan execution. NOT fixed by this phase.

## ✅ RESOLVED 2026-04-26 — `npm run build` CSS compilation failure

- **File:** `src/app/globals.css` (parse error at compiled `line 2:18245`)
- **Error:** `CssSyntaxError: Missed semicolon` from `@tailwindcss/postcss` v4.2.2 inside Turbopack
- **Root cause:** Tailwind v4's oxide candidate-scanner walks the entire project (not just `src/`), so it picked up the literal string `max-h-[900:48vh]` from `38-03-PLAN.md:298` (a doc example labeled "do NOT do this"), emitted it as a real utility, and Lightning CSS preserved the invalid value `max-height: 900:48vh`. The PostCSS reparse step in the production pipeline then rejected the colon. Dev / typecheck / lint don't run that final reparse, which is why it slipped past those gates.
- **Fix:** Added `@source not "../../.planning";` near the top of `globals.css` to exclude planning markdown from oxide's candidate scan.
- **Verified:** `npm run build` exits clean (5/5 pages, no CSS errors). Dev server renders with brand-green primary, warm cream surface, Inter font — tokens fully resolved, zero console errors, no visual regression.

## Pre-existing typecheck error in tests/a11y/baseline-capture.spec.ts

- **File:** `tests/a11y/baseline-capture.spec.ts:18`
- **Error:** `error TS2307: Cannot find module 'axe-core' or its corresponding type declarations.`
- **Discovered during:** Phase 39-01 Task 1 (typecheck baseline)
- **Why deferred:** Unrelated to pair migration; the a11y test scaffolding lives under `tests/` (not `src/`) and the missing `axe-core` types are an out-of-tree dependency issue. `@axe-core/playwright` is present in devDependencies but the bare `axe-core` import does not resolve. Rule: only auto-fix issues directly caused by the current task; pre-existing test-infra warnings are not in scope.
