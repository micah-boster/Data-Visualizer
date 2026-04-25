# Phase 39 — Deferred Items

Out-of-scope discoveries logged during plan execution. NOT fixed by this phase.

## Pre-existing `npm run build` CSS compilation failure

- **File:** `src/app/globals.css` (parse error at compiled `line 2:18245`)
- **Error:** `CssSyntaxError: Missed semicolon` from `@tailwindcss/postcss` v4.2.2 inside Turbopack
- **Discovered during:** Phase 39-01 Task 4 checkpoint verify (`npm run build`)
- **Why deferred:** `globals.css` was last touched in Phase 38 (commit `5f6289e`); none of the Phase 39 changes modify CSS. The error originates inside Tailwind's compiled output stream (the source CSS itself parses fine through other tools — `tsc` and the smoke runners). Reproduced with a clean `.next` cache.
- **Impact on Phase 39 verification:** `npx tsc --noEmit` is clean across the repo (excluding the pre-existing `axe-core` test issue), both smoke tests pass (`smoke:pair`, `smoke:additive-drill-product`), and the dev server runs the migration in browser. The production build failure is a Tailwind v4 / globals.css regression that pre-dates Phase 39 work.

## Pre-existing typecheck error in tests/a11y/baseline-capture.spec.ts

- **File:** `tests/a11y/baseline-capture.spec.ts:18`
- **Error:** `error TS2307: Cannot find module 'axe-core' or its corresponding type declarations.`
- **Discovered during:** Phase 39-01 Task 1 (typecheck baseline)
- **Why deferred:** Unrelated to pair migration; the a11y test scaffolding lives under `tests/` (not `src/`) and the missing `axe-core` types are an out-of-tree dependency issue. `@axe-core/playwright` is present in devDependencies but the bare `axe-core` import does not resolve. Rule: only auto-fix issues directly caused by the current task; pre-existing test-infra warnings are not in scope.

## Pre-existing typecheck error in tests/a11y/baseline-capture.spec.ts

- **File:** `tests/a11y/baseline-capture.spec.ts:18`
- **Error:** `error TS2307: Cannot find module 'axe-core' or its corresponding type declarations.`
- **Discovered during:** Phase 39-01 Task 1 (typecheck baseline)
- **Why deferred:** Unrelated to pair migration; the a11y test scaffolding lives under `tests/` (not `src/`) and the missing `axe-core` types are an out-of-tree dependency issue. `@axe-core/playwright` is present in devDependencies but the bare `axe-core` import does not resolve. Rule: only auto-fix issues directly caused by the current task; pre-existing test-infra warnings are not in scope.
