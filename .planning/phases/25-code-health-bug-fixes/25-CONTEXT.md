# Phase 25: Code Health & Bug Fixes - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Close six tracked items from `docs/KNOWN-ISSUES.md` that landed in the v4.0 milestone's Code Health bucket:

- **HEALTH-01 (KI-07)** — Fix the root-level dimension filter so it actually reduces table rows
- **HEALTH-02 (KI-16)** — Wrap chart and table sections in error boundaries so one render crash doesn't take down the app
- **HEALTH-03 (KI-13)** — Refactor 5 `setState`-in-effect instances to derived state or event-driven patterns
- **HEALTH-04 (KI-14)** — Refactor 3 ref-access-during-render instances to effects or event handlers
- **HEALTH-05 (KI-12)** — Resolve the 3 React Compiler memoization warnings (fix deps or explicitly opt out)
- **HEALTH-06 (KI-22)** — Remove unused imports/variables across the 7 flagged files

Scope is strictly these six items. No new features, no unrelated refactors, no broader design system work — design tokens, typography, surfaces, and the rest of v4.0 live in later phases.

</domain>

<decisions>
## Implementation Decisions

### Root filter bug (HEALTH-01 / KI-07)
- When a dimension filter is applied at the root level, the table **filters rows in place** — only rows matching the filter are shown
- **Chart and KPIs recompute** from the filtered dataset too, not just the table — filter applies consistently across all downstream computations
- Root-level dimension filters **cascade into drilldowns** — drilling in preserves the filter, treating it as a persistent constraint rather than a level-scoped one
- When the filter matches zero rows, the table shows its **standard empty state with a contextual 'No rows match the filter' hint + one-click 'Clear filter' action**

### Error boundary UX (HEALTH-02 / KI-16)
- **Per-section granularity** — one boundary around the chart section, one around the table section. Not per-chart-card, not app-wide
- **Compact inline fallback card** — same footprint as the working component (no layout shift), alert icon, short message ('Chart couldn't load'), and a 'Try again' button
- **Expandable error details** — short message by default; 'Show details' toggle reveals the error message (not a full stack trace) for debugging context
- **'Try again' resets the boundary and re-renders** with the same props/data; transient errors recover without a page reload. No automatic data refetch on retry

### Memoization & refactor stance (HEALTH-03, HEALTH-04, HEALTH-05)
- **Pragmatic, behavior-preserving default** — fix patterns where it's safe; opt out / defer where a rewrite risks changing observable UX
- For the 3 React Compiler warnings (KI-12): **fix dep arrays where safe, add `'use no memo'` with a one-line comment explaining the intentional manual memoization where a rewrite would change behavior**
- Behavior-preservation trumps Compiler correctness when they conflict — this is a health phase, not a refactor-everything phase. Claude decides per-site which path to take
- For the 5 setState-in-effect (KI-13) and 3 ref-access-during-render (KI-14) sites: same pragmatic rule — refactor when the anti-pattern can be removed cleanly, stop and flag when the rewrite would shift UX
- Every opt-out or deferred site gets a brief inline comment (why it's intentional) so future passes don't re-litigate the decision

### Verification approach
- **Per-fix targeted regression tests** for behavior-changing items: KI-07 (filter predicate), KI-16 (error boundary render/reset), KI-13 / KI-14 (hook behavior where the refactor changed the shape). Skip tests for purely mechanical work (KI-12 opt-outs, KI-22 import deletions)
- **Use whatever test infrastructure already exists in the repo** — if none exists, flag it to the user and let planner decide; don't slip test-infrastructure setup into this phase
- **Run tests locally only this phase** — CI wiring is a separate concern, out of scope here
- Tests pair with visual preview verification, not replace it — visual check the affected area after each behavior-changing fix
- **Escalation rule when a refactor turns risky mid-plan: stop and ask the user** — don't try-then-revert, don't silently punt. Surface the risk and options explicitly
- **KNOWN-ISSUES.md is updated per fix**, not batched at the end — each closed KI gets marked closed in the doc in the same commit as the fix

### Shipping strategy
- **Group plans by risk, not by KI number:**
  - Plan A — safe cleanups: unused imports (KI-22)
  - Plan B — additive: error boundaries (KI-16)
  - Plan C — behavior change: root filter bug (KI-07) — needs visual + test verification
  - Plan D — internal refactors: setState-in-effect, ref-during-render, memoization (KI-12, KI-13, KI-14) — grouped because they're similar-risk cleanup with per-site pragmatism
- Ordering lets the planner ship low-risk wins first and isolates the behavior-changing fix in its own plan

### Claude's Discretion
- Exact wording of fallback-card copy, empty-state hint text, opt-out comments
- Which of the 3 memoization sites get fixed vs opted-out (decided per site based on the behavior tradeoff)
- Which of the 8 refactor sites (KI-13 + KI-14) are clean rewrites vs deferred (stop-and-ask when risky)
- Exact test names, assertion style, and file layout within the repo's existing test conventions
- Whether to extract a shared `<SectionErrorBoundary>` component or use react-error-boundary's defaults directly

</decisions>

<specifics>
## Specific Ideas

- Error boundary fallback should feel like the rest of the app's "something went wrong" surfaces — not jarring, not alarming; the user should understand they can keep using the app
- The root filter fix should match the mental model established by drilldown filters — if drill filters reduce rows, root filters should too (consistency is the real bug)
- Opt-out comments matter for future-Claude and future-team — don't let `'use no memo'` sit there as an unexplained incantation

</specifics>

<deferred>
## Deferred Ideas

- Full accessibility audit (KI-17) — separate phase (Phase 33)
- Structured logging for console.error/warn sites (KI-20 / KI-11) — out of scope, separate concern
- Snowflake retry logic (KI-03) — out of scope, separate concern
- Zod validation for live Snowflake responses (KI-01) — out of scope
- CI wiring for the new tests — noted, punt to a later phase
- Test-infrastructure setup if repo lacks it — flag to user, don't absorb into this phase

</deferred>

---

*Phase: 25-code-health-bug-fixes*
*Context gathered: 2026-04-16*
