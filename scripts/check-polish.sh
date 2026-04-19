#!/usr/bin/env bash
# scripts/check-polish.sh — Phase 31 visual polish token enforcement.
# Mirrors scripts/check-type-tokens.sh / check-surfaces.sh / check-components.sh / check-motion.sh.
# POSIX grep (not ripgrep) — Phase 27-06/28-08/30-05 precedent: not installed on all CI images.
# Per STATE Phase 27-06/28-08/30-05: CI wiring (Vercel / pre-commit / GitHub Actions) is user-owned.
#
# Negative checks for DS-29..DS-34 regressions:
#   1. Raw border hex/rgb/oklch color literals outside allowlist (DS-32)
#   2. Border-opacity overrides on design tokens (DS-32)
#   3. Raw Tailwind palette border colors (DS-32)
#   4. Raw focus-visible ring recipes outside shadcn allowlist (DS-31)
#   5. Unscoped ::-webkit-scrollbar outside globals.css + ui/ allowlist (DS-34)
#   6. Raw linear-gradient(to <dir>, transparent, …) divider patterns outside allowlist (DS-29)
#   7. Raw inset top-edge shadow hardcodes (DS-30, 31-RESEARCH Pitfall 1)
#   8. Bonus: transition-shadow on the same line as .focus-glow / .focus-glow-within (DS-31 Pitfall)
#
# ALLOWLIST NOTES:
#   - src/components/ui/**       — shadcn primitives own their focus-visible ring
#                                   recipes + scrollbar recipes (sidebar uses
#                                   the opt-in .thin-scrollbar via className, not
#                                   raw ::-webkit-scrollbar).
#   - src/components/tokens/**   — /tokens specimen files legitimately render
#                                   "old 15% vs new 8%" border comparisons, raw
#                                   focus-ring demos, and so on as specimens.
#   - src/app/tokens/**          — token reference page.
#   - src/app/globals.css        — DEFINES the utilities + tokens that every
#                                   other check points consumers away from.
set -euo pipefail

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.css' \) \
    -not -path 'src/components/ui/*' \
    -not -path 'src/components/tokens/*' \
    -not -path 'src/app/tokens/*' \
    -not -path 'src/app/globals.css'
}

FAIL=0

echo "Check 1: raw border color literals (hex / rgb / oklch / var) outside allowlist…"
RAW_BORDER_COLOR=$(files_to_check | xargs grep -nE 'border-\[(#|rgb|oklch|var\()' 2>/dev/null || true)
if [ -n "$RAW_BORDER_COLOR" ]; then
  echo "$RAW_BORDER_COLOR"
  echo "❌ Raw border color literals outside allowlist. Use border-border (consumes --border after 31-01 retune)." 1>&2
  FAIL=1
fi

echo ""
echo "Check 2: border-opacity overrides on design tokens…"
BORDER_OPACITY=$(files_to_check | xargs grep -nE 'border-(border|input|sidebar-border)/[0-9]+' 2>/dev/null || true)
if [ -n "$BORDER_OPACITY" ]; then
  echo "$BORDER_OPACITY"
  echo "❌ border-opacity override on a design token. Use the token as-is; retune the token in globals.css if needed." 1>&2
  FAIL=1
fi

echo ""
echo "Check 3: raw Tailwind palette border colors…"
PALETTE_BORDER=$(files_to_check | xargs grep -nE 'border-(red|emerald|amber|blue|green|slate|zinc|gray|yellow|orange|rose|purple|sky|cyan|teal|pink|violet|indigo|lime|fuchsia)-[0-9]+' 2>/dev/null || true)
if [ -n "$PALETTE_BORDER" ]; then
  echo "$PALETTE_BORDER"
  echo "❌ Raw Tailwind palette border color. Use semantic state tokens (border-destructive, border-success, etc.) or border-border." 1>&2
  FAIL=1
fi

echo ""
echo "Check 4: raw focus-visible ring recipes outside shadcn allowlist…"
RAW_FOCUS=$(files_to_check | xargs grep -nE 'focus-visible:ring-\[|focus:ring-[0-9]' 2>/dev/null || true)
if [ -n "$RAW_FOCUS" ]; then
  echo "$RAW_FOCUS"
  echo "❌ Raw focus ring recipe outside shadcn primitives. Use .focus-glow or .focus-glow-within." 1>&2
  FAIL=1
fi

echo ""
echo "Check 5: unscoped ::-webkit-scrollbar outside globals.css + ui/ allowlist…"
RAW_SCROLLBAR=$(files_to_check | xargs grep -nE '::-webkit-scrollbar' 2>/dev/null || true)
if [ -n "$RAW_SCROLLBAR" ]; then
  echo "$RAW_SCROLLBAR"
  echo "❌ Raw ::-webkit-scrollbar outside globals.css. Use .thin-scrollbar utility." 1>&2
  FAIL=1
fi

echo ""
echo "Check 6: raw linear-gradient(to <dir>, transparent, …) divider patterns…"
RAW_GRADIENT_DIVIDER=$(files_to_check | xargs grep -nE 'linear-gradient\(to (right|bottom),\s*transparent,' 2>/dev/null || true)
if [ -n "$RAW_GRADIENT_DIVIDER" ]; then
  echo "$RAW_GRADIENT_DIVIDER"
  echo "❌ Raw gradient divider outside allowlist. Use .divider-horizontal-fade / .divider-vertical-fade utilities or <SectionDivider />." 1>&2
  FAIL=1
fi

echo ""
echo "Check 7: raw inset top-edge shadow hardcodes (DS-30 Pitfall 1)…"
RAW_INSET_SHADOW=$(files_to_check | xargs grep -nE 'inset[_ ]0[_ ]1px[_ ]0[_ ]0[_ ](rgb|oklch)' 2>/dev/null || true)
if [ -n "$RAW_INSET_SHADOW" ]; then
  echo "$RAW_INSET_SHADOW"
  echo "❌ Raw inset top-edge shadow. Glass highlight lives in --shadow-elevation-raised (dark) — do not stack a second shadow utility (Pitfall 1)." 1>&2
  FAIL=1
fi

echo ""
echo "Check 8: transition-shadow stacked on .focus-glow / .focus-glow-within (DS-31 Pitfall)…"
FOCUS_TRANSITION=$(files_to_check | xargs grep -nE 'focus-glow(-within)?[^"]*(transition-shadow|transition-\[box-shadow\])|(transition-shadow|transition-\[box-shadow\])[^"]*focus-glow(-within)?' 2>/dev/null || true)
if [ -n "$FOCUS_TRANSITION" ]; then
  echo "$FOCUS_TRANSITION"
  echo "❌ transition-shadow / transition-[box-shadow] on a .focus-glow site. Focus glow is static (CONTEXT lock) — no transition on shadow." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo ""
echo "✅ Visual polish tokens enforced — no raw border colors, opacity overrides, palette borders, focus-ring recipes, unscoped scrollbars, raw gradient dividers, inset-shadow hardcodes, or focus-glow transition-shadow regressions outside allowlist."
