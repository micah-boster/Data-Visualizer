#!/usr/bin/env bash
set -euo pipefail

# Phase 27 type-token enforcement.
# Forbids ad-hoc Tailwind text-size and font-weight classes outside an allowlist.
# Allowlist: shadcn primitives + tokens reference page (see docs/TYPE-MIGRATION.md §8).
#
# Uses POSIX grep (BSD/GNU) for portability — ripgrep is not guaranteed in CI.

# Directories excluded from the sweep (allowlist).
EXCLUDE_DIRS=(
  "src/components/ui"
  "src/app/tokens"
  "src/components/tokens"
)

# File extensions we want to check (code + markup only; exclude css/md).
INCLUDE_EXTS='\.(ts|tsx|js|jsx|mjs|cjs)$'

FAIL=0

# Build the list of files to scan once, applying the allowlist.
files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \) \
    -not -path 'src/components/ui/*' \
    -not -path 'src/app/tokens/*' \
    -not -path 'src/components/tokens/*'
}

echo "Checking for ad-hoc text-size classes…"
# text-(xs|sm|base|lg|xl|2xl|3xl|4xl) followed by a non-[a-zA-Z0-9-] boundary
# (not "text-smallprint", but yes "text-sm ", "text-sm\"", "text-sm}", etc.)
TEXT_HITS=$(files_to_check | xargs grep -nE 'text-(xs|sm|base|lg|xl|2xl|3xl|4xl)([^a-zA-Z0-9-]|$)' 2>/dev/null || true)
if [ -n "$TEXT_HITS" ]; then
  echo "$TEXT_HITS"
  echo ""
  echo "❌ Found ad-hoc text-size classes. Use text-display / text-heading / text-title / text-body / text-label / text-caption." 1>&2
  echo "   See docs/TYPE-MIGRATION.md for the mapping." 1>&2
  FAIL=1
fi

echo ""
echo "Checking for ad-hoc font-weight classes…"
# \bfont-(semibold|medium|bold|light|thin|extrabold|black)\b — use GNU/BSD-safe boundaries.
# Leading boundary: start-of-line or non-[a-zA-Z0-9-].
# Trailing boundary: non-[a-zA-Z0-9-] or end-of-line.
# NOTE: font-mono is explicitly NOT forbidden (valid family selector).
FONT_HITS=$(files_to_check | xargs grep -nE '(^|[^a-zA-Z0-9-])font-(semibold|medium|bold|light|thin|extrabold|black)([^a-zA-Z0-9-]|$)' 2>/dev/null || true)
if [ -n "$FONT_HITS" ]; then
  echo "$FONT_HITS"
  echo ""
  echo "❌ Found ad-hoc font-weight classes. Type tokens own weight — drop the utility." 1>&2
  echo "   See docs/TYPE-MIGRATION.md §5 for the weight policy." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo ""
echo "✅ Type tokens enforced — no ad-hoc classes outside allowlist."
