# Deferred Items — Phase 36

Out-of-scope issues discovered during Phase 36 execution. Not fixed; logged for future phases.

## Pre-existing TypeScript errors (observed during Plan 36-01 execution)

- `tests/a11y/baseline-capture.spec.ts(18,29): error TS2307: Cannot find module 'axe-core' or its corresponding type declarations.`
  - Source: Phase 33-01 a11y baseline capture (commit 780324e installed `@axe-core/playwright` as a runtime dep but the spec imports `axe-core` directly without adding `@types/axe-core` or the `axe-core` package).
  - Scope: Phase 33 accessibility track; not a Phase 36 regression.
