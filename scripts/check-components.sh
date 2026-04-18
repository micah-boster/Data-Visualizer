#!/usr/bin/env bash
set -euo pipefail

# Phase 29 component-pattern enforcement.
# Asserts:
#   1. Zero imports of legacy components deleted in Plans 29-01 and 29-03
#      (kpi-card, empty-state, filter-empty-state).
#   2. Zero raw `h-4 w-px bg-border` dividers outside src/components/patterns/**
#      (Plan 29-04 canonicalized this recipe on ToolbarDivider).
#
# Mirrors the check-type-tokens.sh / check-surfaces.sh POSIX pattern.
# Per STATE Phase 27-06 / 28-08: ripgrep is NOT used (unavailable on some CI images).
# Per STATE Phase 27-06 / 28-08: CI wiring (Vercel / pre-commit / GitHub Actions) is user-owned.

FAIL=0

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \)
}

# ---- Check 1: imports of deleted legacy components ----
echo "Checking for imports of deleted legacy components (Plan 29-01, 29-03)…"
LEGACY_HITS=$(files_to_check | xargs grep -nE \
  "from ['\"]@/components/(kpi/kpi-card|empty-state|filters/filter-empty-state)['\"]" \
  2>/dev/null || true)
if [ -n "$LEGACY_HITS" ]; then
  echo "$LEGACY_HITS"
  echo ""
  echo "❌ Found imports of deleted legacy components." 1>&2
  echo "   Use StatCard / EmptyState from @/components/patterns/." 1>&2
  FAIL=1
fi

# ---- Check 2: ad-hoc vertical dividers outside patterns/ + tokens/ ----
# Allowlist: src/components/patterns (owns ToolbarDivider's recipe)
#            src/components/tokens  (demo surfaces legitimately reference the
#                                    recipe as documentation text in <code>)
#            src/app/tokens         (token reference page)
# Check both the mx-0.5 variant (unified-toolbar lineage) and the mx-1 variant
# (comparison-matrix lineage). Either outside the allowlist is a regression.
echo ""
echo "Checking for ad-hoc vertical dividers outside patterns/ (Plan 29-04)…"
DIVIDER_HITS=$(files_to_check \
  | grep -v '^src/components/patterns/' \
  | grep -v '^src/components/tokens/' \
  | grep -v '^src/app/tokens/' \
  | xargs grep -nE '(mx-0\.5|mx-1) h-4 w-px bg-border' 2>/dev/null || true)
if [ -n "$DIVIDER_HITS" ]; then
  echo "$DIVIDER_HITS"
  echo ""
  echo "❌ Found ad-hoc vertical dividers." 1>&2
  echo "   Use <ToolbarDivider /> from @/components/patterns/toolbar-divider." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo ""
echo "✅ Component patterns enforced — no legacy imports, no ad-hoc toolbar dividers."
