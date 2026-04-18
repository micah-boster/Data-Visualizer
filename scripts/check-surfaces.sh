#!/usr/bin/env bash
set -euo pipefail

# Phase 28 surface + elevation token enforcement.
# Forbids ad-hoc shadow + card-frame combos on primary containers outside an allowlist.
# Allowlist: shadcn primitives, tokens reference page, layout/header (the one
# legitimate translucent surface in the app).
#
# Uses POSIX grep (BSD/GNU) for portability — ripgrep is not guaranteed in CI.
# Mirrors the check-type-tokens.sh pattern that closed Phase 27.

# Directories excluded from the sweep (allowlist).
EXCLUDE_DIRS=(
  "src/components/ui"        # shadcn primitives own their surface recipes
  "src/app/tokens"            # token reference page
  "src/components/tokens"     # token demos (intentional raw-utility usage)
)

# Files excluded from the sweep (narrow carveouts).
EXCLUDE_FILES=(
  "src/components/layout/header.tsx"  # only legitimate translucent container in the app
)

FAIL=0

# Build the list of files to scan once, applying the allowlist.
files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \) \
    -not -path 'src/components/ui/*' \
    -not -path 'src/app/tokens/*' \
    -not -path 'src/components/tokens/*' \
    -not -path 'src/components/layout/header.tsx'
}

# ---- Check 1: raw shadow utilities that should be semantic elevations ----
# Forbid shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl on app-code
# containers. shadow-xs is still allowed (sticky-header lift, chips, badges).
echo "Checking for ad-hoc raw shadow utilities…"
RAW_SHADOW_HITS=$(files_to_check | xargs grep -nE '(^|[^a-zA-Z0-9-])shadow-(sm|md|lg|xl|2xl)([^a-zA-Z0-9-]|$)' 2>/dev/null || true)
if [ -n "$RAW_SHADOW_HITS" ]; then
  echo "$RAW_SHADOW_HITS"
  echo ""
  echo "❌ Found raw shadow-sm/md/lg/xl/2xl utilities on primary containers." 1>&2
  echo "   Use shadow-elevation-chrome / -raised / -overlay / -floating." 1>&2
  echo "   shadow-xs is still allowed for chips, badges, and sticky-header lifts." 1>&2
  FAIL=1
fi

# ---- Check 2: ad-hoc card-frame combos ----
# Catches `rounded-* border bg-(card|popover|background)` — the precise pattern
# Phase 28 swept away. Form controls pass because they use `border-input`
# (Phase 26 form-control token) rather than plain `border` / `border-border`,
# and we filter those out explicitly here.
echo ""
echo "Checking for ad-hoc card-frame combos (rounded + border + bg-card|popover|background)…"
CARD_FRAME_HITS=$(files_to_check | xargs grep -nE 'rounded-(lg|xl|md)[^"]*\bborder\b[^"]*bg-(card|popover|background)' 2>/dev/null \
  | grep -vE 'border-input' \
  || true)
if [ -n "$CARD_FRAME_HITS" ]; then
  echo "$CARD_FRAME_HITS"
  echo ""
  echo "❌ Found rounded + border + bg-(card|popover|background) container combo." 1>&2
  echo "   Use bg-surface-raised / -overlay / -floating + shadow-elevation-* instead." 1>&2
  FAIL=1
fi

# ---- Check 3: translucent popover regressions ----
# Enforces CONTEXT lock — popovers stay opaque; translucent variant is header-only
# (and header is in EXCLUDE_FILES above).
echo ""
echo "Checking for translucent popover regressions…"
TRANSLUCENT_HITS=$(files_to_check | xargs grep -nE 'bg-(popover|background)/[0-9]+[^"]*backdrop-blur' 2>/dev/null || true)
if [ -n "$TRANSLUCENT_HITS" ]; then
  echo "$TRANSLUCENT_HITS"
  echo ""
  echo "❌ Found translucent popover/dropdown." 1>&2
  echo "   Popovers stay opaque; translucent variant is header-only." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo ""
echo "✅ Surface tokens enforced — no ad-hoc shadow or card-frame combos outside allowlist."
