#!/usr/bin/env bash
# scripts/check-motion.sh — Phase 30 motion token enforcement.
# Mirrors scripts/check-type-tokens.sh / check-surfaces.sh / check-components.sh.
# POSIX grep (not ripgrep) — Phase 27-06/28-08 precedent: not installed on all CI images.
# Per STATE Phase 27-06/28-08: CI wiring (Vercel / pre-commit / GitHub Actions) is user-owned.
#
# ALLOWLIST NOTES (Phase 30 close-out):
# - src/components/ui/**  — shadcn primitives carry known motion debt (sheet,
#   popover, dialog hardcoded durations). Plan 30-05 manually retargeted
#   sidebar.tsx to tokens; other primitives stay on shadcn defaults per Phase 28
#   precedent (known-debt allowlist). Future phase can sweep.
# - src/components/tokens/**  — motion-demo.tsx legitimately uses inline style
#   for 9-combo iteration.
# - src/app/tokens/**  — token reference page.
set -euo pipefail

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \) \
    -not -path 'src/components/ui/*' \
    -not -path 'src/components/tokens/*' \
    -not -path 'src/app/tokens/*'
}

FAIL=0

echo "Check 1: arbitrary duration brackets…"
BRACKET_DURATION=$(files_to_check | xargs grep -nE 'duration-\[[0-9]+m?s\]' 2>/dev/null || true)
if [ -n "$BRACKET_DURATION" ]; then
  echo "$BRACKET_DURATION"
  echo "❌ Found duration-[Nms]. Use duration-quick / duration-normal / duration-slow." 1>&2
  FAIL=1
fi

echo ""
echo "Check 2: arbitrary cubic-bezier easing…"
BRACKET_EASE=$(files_to_check | xargs grep -nE 'ease-\[cubic-bezier' 2>/dev/null || true)
if [ -n "$BRACKET_EASE" ]; then
  echo "$BRACKET_EASE"
  echo "❌ Found ease-[cubic-bezier(…)]. Use ease-default / ease-spring / ease-decelerate." 1>&2
  FAIL=1
fi

echo ""
echo "Check 3: inline style transitionDuration / transitionTimingFunction…"
INLINE_STYLE=$(files_to_check | xargs grep -nE '(transitionDuration|transitionTimingFunction)\s*:' 2>/dev/null || true)
if [ -n "$INLINE_STYLE" ]; then
  echo "$INLINE_STYLE"
  echo "❌ Found inline style transitionDuration/transitionTimingFunction. Use Tailwind utilities (duration-quick/normal/slow + ease-default/spring/decelerate)." 1>&2
  FAIL=1
fi

echo ""
echo "Check 4: raw transition: … Nms shorthand…"
RAW_SHORTHAND=$(files_to_check | xargs grep -nE 'transition:\s+[a-z-]+[^"]*[0-9]+m?s' 2>/dev/null || true)
if [ -n "$RAW_SHORTHAND" ]; then
  echo "$RAW_SHORTHAND"
  echo "❌ Found raw 'transition: … Nms' shorthand. Use Tailwind utilities." 1>&2
  FAIL=1
fi

echo ""
echo "Check 5: numeric Tailwind duration defaults…"
NUMERIC_DURATION=$(files_to_check | xargs grep -nE '(^|[^a-zA-Z0-9-])duration-(75|100|150|200|300|500|700|1000)([^a-zA-Z0-9-]|$)' 2>/dev/null || true)
if [ -n "$NUMERIC_DURATION" ]; then
  echo "$NUMERIC_DURATION"
  echo "❌ Found numeric Tailwind duration-N default. Use duration-quick/normal/slow." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo ""
echo "✅ Motion tokens enforced — no raw durations, easings, or inline style timings outside allowlist."
