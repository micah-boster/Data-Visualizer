# Phase 38 — Deferred Items

Issues discovered during execution that are out-of-scope for the current plan.

## Pre-existing

### Production build fails with Tailwind v4 / Turbopack CSS parse error
**Discovered:** Plan 38-01 execution (2026-04-24)
**Trigger:** `npm run build`
**Symptom:** `CssSyntaxError: tailwindcss: src/app/globals.css:2:18124: Missed semicolon`
**Cause:** Tailwind v4 (v4.2.2) + Turbopack production-build emits a CSS chunk with a parse error around column 18124 of the compiled output. `globals.css` is unchanged from HEAD (commit df0d49f), so this was already broken before 38-01 touched anything.
**Scope:** Unrelated to sidebar (POL-01/POL-02). Build pipeline / dependency-level issue.
**Action:** `npm run dev` works (confirmed below). Visual verification for POL-01/POL-02 performed via dev server. Production-build fix should land in a dedicated build-pipeline plan, likely upgrading Tailwind v4 patch version or tweaking turbopack postcss config.

### collection-curve-chart.tsx duplicate `maxAge` binding
**Discovered:** Plan 38-01 execution (2026-04-24)
**Trigger:** `npm run build` (before globals.css error surfaced)
**Symptom:** `the name \`maxAge\` is defined multiple times` at collection-curve-chart.tsx:221
**Cause:** In-flight uncommitted edits for a sibling plan (CHT-01 visible-curves work) left a duplicate `maxAge` declaration in the working tree. Not present on HEAD.
**Scope:** Belongs to Phase 38 CHT-01 plan (Plan 02 or later), not 38-01 (sidebar-only).
**Action:** Left in stash `stash@{1}` (other-wip). The CHT-01 executor agent owns finishing + committing those edits.
