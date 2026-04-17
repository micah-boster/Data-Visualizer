<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Type tokens (Phase 27)

- App code uses the 6 named type tokens only: text-display, text-heading, text-title, text-body, text-label, text-caption. Do NOT use Tailwind's default text-xs/sm/base/lg/xl/2xl in src/ outside the allowlist.
- Tokens own weight. Do not pair font-semibold/font-medium/font-bold with a type token.
- `uppercase` is for .text-label overline only.
- Numeric displays use .text-display-numeric / .text-body-numeric / .text-label-numeric (never standalone tabular-nums).
- Allowlist: src/components/ui/**, src/app/tokens/**, src/components/tokens/**.
- Full mapping: docs/TYPE-MIGRATION.md.
- SectionHeader: src/components/layout/section-header.tsx. Use for section titles instead of ad-hoc `<h2 className="text-xl">`.
