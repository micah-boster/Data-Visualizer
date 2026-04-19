#!/usr/bin/env bash
# scripts/check-a11y.sh — sixth guard in the 5→6 parity series
# (tokens / surfaces / components / motion / polish / a11y).
#
# Runs the Playwright axe-core route × theme matrix. Returns non-zero on any
# critical/serious violation once the Plan 01 advisory fixmes are removed by
# Plans 02-05. CI wire-on is user-owned per Phase 27-06 / 28-08 / 29-05 /
# 30-05 / 31-06 precedent — guard lives here as an npm script; user flips
# Vercel build command when ready.
set -euo pipefail
exec npx playwright test tests/a11y --reporter=list
