# SEC-06: Dependency Security Baseline

**Phase:** 42a (Security Review — OAuth-independent)
**Date:** 2026-04-30
**Auditor:** Claude (gsd-executor) for Bounce eng team
**Status:** Closed — all 9 moderate advisories cleared via pnpm overrides; zero remaining

## Scope

Dependency security baseline for the `bounce-data-visualizer` app at the v4.5 close. The npm registry (via pnpm) is the only ecosystem in scope — no Python dependencies, no Docker base images, no Homebrew taps. The app ships a single Next.js 16.2.3 / React 19.2.4 SSR surface deployed to Vercel; all runtime deps come from `package.json` + `pnpm-lock.yaml`.

Lockfile reality: this project uses **pnpm**, not npm — `pnpm-lock.yaml` is the canonical lockfile (no `package-lock.json` exists). `pnpm audit` is the audit tool; `pnpm audit --fix` writes overrides to `pnpm-workspace.yaml` rather than `package.json`.

## Baseline `pnpm audit` state (before this phase)

Captured to `/tmp/sec06-audit-before.{json,txt}` on 2026-04-30:

```
9 vulnerabilities found
Severity: 9 moderate
```

Breakdown (7 distinct advisories; some appear via multiple dependency paths, inflating the count to 9):

| Package | Severity | Advisory | Path | Reachable from app? |
| --- | --- | --- | --- | --- |
| `esbuild` | moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev-server can reflect requests | `vitest > vite > esbuild` | **Dev only.** Vitest is dev-dep, esbuild is its transitive bundler. Not in production bundle. |
| `vite` | moderate | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — path traversal in `.map` handling | `vitest > vite` | **Dev only.** Same dev-only reach as esbuild — Vitest test infra only. |
| `follow-redirects` | moderate | [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — leaks auth headers on cross-domain redirect | `snowflake-sdk > axios > follow-redirects` | **Theoretical.** Snowflake-sdk uses axios for the warehouse REST control plane; redirects to attacker-controlled cross-domain hosts would require Snowflake's API to issue them, which it doesn't. Low reachability in our usage; advisory still patched. |
| `hono` | moderate | [GHSA-458j-xx4x-4375](https://github.com/advisories/GHSA-458j-xx4x-4375) — JSX attribute name HTML injection in `hono/jsx` SSR | `shadcn > @modelcontextprotocol/sdk > hono` | **Build-time CLI only.** `shadcn` is a code-gen CLI invoked manually; runtime app never touches `hono/jsx`. Not in production bundle. |
| `fast-xml-parser` | moderate | [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6) — XML comment/CDATA injection in builder | `snowflake-sdk > @aws-sdk/client-s3 > … > fast-xml-parser`; `snowflake-sdk > fast-xml-parser` | **Inbound-only / unreachable.** Affects XMLBuilder (output), not the parse path; snowflake-sdk uses fast-xml-parser to read Snowflake's stage manifests, never to build. Patched defensively. |
| `uuid` | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — missing buffer bounds in v3/v5/v6 with `buf` provided | `snowflake-sdk > uuid` | **Theoretical.** snowflake-sdk uses `uuid` v9 (random ID generation, no `buf` arg). Advisory affects v3/v5/v6 paths we don't take. Patched defensively. |
| `postcss` | moderate | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via unescaped `</style>` in stringify output | `@tailwindcss/postcss > postcss`; `next > postcss` | **Build-time only.** PostCSS runs at build to compile Tailwind/CSS modules; output is static CSS files, no user input flows through. Patched defensively. |

**Key fact:** zero high/critical findings — none of the 9 advisories block phase close per the severity gate in `42a-CONTEXT.md`. All are moderate, and most are theoretical or dev-only when traced through the actual code paths the app exercises.

## Safe updates applied in this phase

`pnpm audit --fix` writes overrides to `pnpm-workspace.yaml` (modern pnpm convention — `package.json#overrides` is the npm-equivalent). Seven overrides were added, covering all 9 advisories:

```yaml
# pnpm-workspace.yaml (delta)
overrides:
  esbuild@<=0.24.2: '>=0.25.0'
  fast-xml-parser@<5.7.0: '>=5.7.0'
  follow-redirects@<=1.15.11: '>=1.16.0'
  hono@<4.12.14: '>=4.12.14'
  postcss@<8.5.10: '>=8.5.10'
  uuid@<14.0.0: '>=14.0.0'
  vite@<=6.4.1: '>=6.4.2'
```

After `pnpm install`, the lockfile resolved 16 packages added / 17 removed (net `-1`, mostly transitive dedupe).

**Note on `uuid@>=14.0.0`:** this crosses a major-version boundary on the transitive `uuid` package — but it's an override on a dep we don't directly depend on (only `snowflake-sdk` does, and via internal random-ID paths that don't use the vulnerable `buf` argument). pnpm's override mechanism is the appropriate tool here because the alternative — bumping `snowflake-sdk` itself — would be a cross-major upgrade of a direct dep and out-of-scope for this phase per CONTEXT.

**Direct `package.json` deps unchanged.** No direct dep was bumped; only transitive resolution changed via the override mechanism. Major-upgrade candidates (TanStack v9, Vitest v4, etc.) are deferred to v5.5 DEBT — see backlog below.

## Post-fix `pnpm audit` state

Captured to `/tmp/sec06-audit-after.{json,txt}` immediately after `pnpm install`:

```
No known vulnerabilities found
```

JSON metadata:

```json
{
  "vulnerabilities": {
    "info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0
  },
  "dependencies": 984,
  "devDependencies": 0,
  "totalDependencies": 984
}
```

Build + smoke verification gates (all green post-override):

| Check | Result |
| --- | --- |
| `npm run build` | ✅ Compiled successfully in 9.4s; all 5 routes generated |
| `npm run smoke:parse-batch-row` | ✅ `parse-batch-row smoke OK (sentinel-fields=7)` |
| `npm run smoke:scope-rollup` | ✅ `scope-rollup smoke OK (multi-product partners checked: 2 — Happy Money, Zable)` |
| `npm run smoke:metabase-import` | ✅ `metabase-import parse smoke test passed (11 fixtures / cases)` |

## Deferred findings

**None remaining.** All 9 moderate advisories from baseline were patched via overrides. No findings of any severity are deferred from this phase.

Per `42a-CONTEXT.md` skunkworks rule: any future findings stay in-repo (in this doc or `.planning/NEXT-STEPS.md`) — no Notion / Linear tickets are filed.

## Major upgrade backlog (for v5.5 DEBT phase)

The following major-version bumps are forward-looking polish / forward-looking advisory bait — not driven by current advisories. Captured here so v5.5 planning can pull these straight in.

| Package | Current | Target major | Breaking changes | Estimated effort | Blocking advisory? |
| --- | --- | --- | --- | --- | --- |
| `@tanstack/react-table` | `^8.21.3` | v9 | New row-pinning API, column-resize defaults changed, removed deprecated `getCoreRowModel` shape, `flexRender` shape tightened. Per TanStack v9 announcement, primarily a TypeScript-strictness pass + ergonomic improvements; visual behavior largely preserved. | ~4–8h (one large table component + tests; column-def builder pattern in `definitions.ts` / `root-columns.ts` likely needs touch-up) | No |
| `@tanstack/react-query` | `^5.97.0` | v6 (when released — currently still on v5 latest) | TBD — v6 not yet shipped at audit time. v5 → v5.100 path is patch/minor only. | TBD | No |
| `vitest` | `^2.1.9` | v4 (currently 4.1.5 latest) | v3: snapshot format changes, removed deprecated APIs. v4: Vite 6 baseline, Node 20+ required. Test files (`young-batch-censoring.test.ts` is the only one today) likely need minimal touch-up. | ~2h | No (the v2 esbuild/vite advisories are fixed via the override above) |
| `eslint` | `^9.39.4` | v10 | Flat config required; some legacy rule removals. `eslint.config.js` already exists in the project so the migration cost is already paid; v10 should drop in. | ~1h | No |
| `typescript` | `^5.9.3` | v6 | TBD — v6 ships with stricter type emit defaults. Project is already strict; expected minimal regressions. | ~2–4h | No |
| `@types/node` | `^20` | v25 (latest, follows Node release cadence) | Node 22+ types vs Node 20 types. Node 22 is what we actually run; bumping types catches up to runtime. Should be a no-op for app code. | ~30min | No |
| `lucide-react` | `^1.8.0` | v1 minor bumps to v1.14 are non-major | (No major bump; included for completeness — patch/minor backlog only) | ~15min | No |
| `@base-ui/react` | `^1.3.0` | v1.4 (minor) | (No major bump; minor only) | ~15min | No |
| `shadcn` | `^4.2.0` | v4.6 (minor) | CLI-only; v5 not yet shipped | ~15min | No |
| `zod` | `^4.3.6` | v4.4 (minor) | (No major bump; minor only — already on v4 line) | ~15min | No |

**TanStack v9 is the headline candidate per the requirements.** None of the others are advisory-driven; they're forward-looking polish that pairs naturally with the v5.5 DEBT phase's test-pyramid expansion (DEBT-09) and lint surface cleanup.

**Not on this list (intentional):** `next` and `react` — both are on their respective majors' latest minor lines (Next 16.2.x, React 19.2.x) and continue receiving patch releases. Bumping the major requires Vercel's runtime support to land first.

## Dependabot config rationale

`.github/dependabot.yml` is configured for security advisories only. Key settings:

- `package-ecosystem: "npm"` — pnpm uses the npm registry, so the npm ecosystem is the right hook. Dependabot reads `package.json` for advisory matching; pnpm-specific lockfile resolution is handled at install time.
- `open-pull-requests-limit: 0` — suppresses **regular weekly version-bump PRs**. Without this, Dependabot would file a PR for every minor / patch update across 1000+ transitive deps, flooding the repo. With it set to 0, no version-update PRs are filed.
- **Security advisories ignore the `open-pull-requests-limit` setting.** When GitHub's advisory database flags a CVE on any dep in `pnpm-lock.yaml`, Dependabot files a PR regardless of the limit — this is the intended behavior.
- `labels: [security]` — every Dependabot-filed PR gets the `security` label, routing them through GitHub's advisory UI for triage.

This shape was chosen per `42a-CONTEXT.md` skunkworks rule: minimize PR noise, surface real CVEs only.

## Re-running this audit

Quarterly cadence (or whenever a high-severity advisory lands):

```bash
# 1. Run audit
pnpm audit --json > /tmp/sec06-audit.json
pnpm audit                                # human-readable

# 2. Check what's outdated (forward-looking)
pnpm outdated

# 3. Check Dependabot tab on GitHub for any auto-filed advisory PRs
#    https://github.com/{org}/{repo}/security/dependabot

# 4. If new moderate-or-below advisories exist, attempt patch:
pnpm audit --fix
pnpm install
npm run build                              # must pass
npm run smoke:parse-batch-row              # must pass
npm run smoke:scope-rollup                 # must pass
npm run smoke:metabase-import              # must pass

# 5. If a high/critical lands and the fix needs a major upgrade, ESCALATE
#    to a 42a.X (or future v5.5 DEBT) decimal phase — do NOT silently defer.
```

Per CONTEXT severity gate: **only high/critical findings on actually-reachable paths block phase close.** Theoretical CVEs in dev-only or unreachable paths are documented and deferred. Today (2026-04-30) the gate is fully clear.

---

*Phase: 42a-security-review-oauth-independent*
*Audit completed: 2026-04-30*
