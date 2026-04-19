# Phase 37: Metabase SQL Import - Research

**Researched:** 2026-04-19
**Domain:** SQL parsing → ViewSnapshot translation + right-side Sheet wizard UI
**Confidence:** HIGH (stack + codebase integration points) / MEDIUM (parser-edge behavior on Snowflake + Metabase template tags)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dialog & paste flow:**
- Entry point: dedicated sidebar button with an import icon (Lucide `Database` or `FileInput`) and visible label "Import from Metabase" — discoverability matters even though the tool is used occasionally.
- Dialog shape: right-side Sheet (~60% viewport width), keeps the current table/chart visible behind it for context. Uses the app's existing Sheet component (shadcn).
- Layout: two-step wizard — Step 1 is the SQL paste area with a Parse button; Step 2 is the preview with Back / Apply actions.
- Preview trigger: explicit Parse button. No auto-parse on paste, no live parsing on keystroke. Avoids flickering error/success states and pairs naturally with the wizard.

**Preview presentation:**
- Structure: sectioned by category — **Columns / Filters / Sort / Chart** — each section lists matched and skipped items.
- Signaling: color + icon per row (green check = matched, amber warning = skipped, red x = error). Icon + label together — color is never the only signal (accessibility).
- Skipped item detail: name + one-line reason (e.g., `total_collected — column not in schema`, `WHERE status = 'active' — unsupported operator`). One line per item; no expandable panels.
- Chart preview: text description only (e.g., `Line chart — X: batch_month, Y: recovery_rate`). No mini-chart rendering. User tweaks the chart in the chart builder after Apply.

**Apply outcome:**
- Apply target: replaces the current view as an **unsaved working view** in-memory. User saves it via the existing Saved Views flow if they want to keep it. Keeps Import and Save as separate, composable concepts.
- Drill context: **resets to root** on Apply. Any active partner/batch drill is cleared — imported SQL implies a fresh top-level view.
- Original SQL retained: yes — extend `ViewSnapshot` with an optional `sourceQuery` field (SQL string + import timestamp). Research reference: MI-D-2. Creates an audit trail ("this view came from Metabase SQL, imported on X") and paves the way for future re-sync features.
- Post-apply: Sheet auto-closes. Toast shows a summary (e.g., `View imported — 8 columns, 3 filters, 2 skipped`) with an Undo action that restores the previous view state.

**Edge case policy:**
- Unknown columns: **silent skip**, listed in the preview under the relevant section with reason `column not in schema`. No fuzzy matching (explicitly deferred per META-07).
- Unsupported SQL constructs (JOINs, subqueries, CTEs, aggregations, GROUP BY, window functions): **partial import with warnings**. Parse what maps to `ViewSnapshot` (SELECT / WHERE / ORDER BY on the known primary table), skip the rest, list each skipped construct in the preview with a one-line reason. User can still Apply the partial result. Aligns with research's "80% case" guidance.
- Filter translation fidelity: **exact matches only**. Translate `column = value`, `column IN (...)`, `column BETWEEN x AND y`, `column IS NULL`. Skip relative dates (`NOW() - INTERVAL 30 DAY`), nested OR/AND beyond one level, CASE expressions — each listed with a reason. Scope-matches what the app's filter schema already supports; complex filter translation deferred.
- Parse errors: error card replaces the preview area on Step 2 — clear message, SQL snippet with line/column if the parser provides them, "Back to edit" button. Sheet stays open. No modal alerts, no data loss, easy to iterate.

### Claude's Discretion

- Specific SQL parser library choice — research phase should evaluate `node-sql-parser` (flagged in `FEATURES.md`: 1M+ weekly downloads, Snowflake dialect support) vs a regex-based approach for the supported subset. Decision lands in research/planning.
- Exact Lucide icon for the sidebar button (`Database`, `FileInput`, `Import`, or similar).
- Chart type inference heuristic from SQL (e.g., `GROUP BY` → bar, date column on X → line, two numeric columns → scatter). Default rules to be proposed during planning; user said chart config will be tweaked in the builder post-apply, so this is low-risk.
- Axis inference rules (which column becomes X, which column becomes Y).
- Toast duration + exact Undo window.
- Sheet width breakpoints for smaller viewports.
- Keyboard shortcut (if any) to trigger Import from anywhere.
- Behavior if the user has unsaved changes on the current view at Apply time — likely a lightweight confirm prompt, but defer to planning.

### Deferred Ideas (OUT OF SCOPE)

- **MBQL JSON import (META-06)**: explicitly deferred to v4.5+. SQL import lands first because SQL is universal and covers Metabase "native queries" — the higher-value path per research's prioritization.
- **Field-ID mapper (META-07)**: interactive UI for resolving Metabase numeric field IDs to column names. Only needed once MBQL import ships. Deferred with META-06.
- **Metabase URL import (MI-D-1)**: paste a Metabase question URL, app fetches the query via Metabase API. Requires `METABASE_URL` + `METABASE_API_KEY` env vars and network access. Stretch goal; not needed for Phase 37.
- **Fuzzy column matching (MI-D-3)**: suggest close matches when a SQL column name doesn't exactly match `COLUMN_CONFIGS`. Only worth building if the team reports column-mismatch friction in practice.
- **Best-effort complex filter translation**: relative dates, nested OR/AND, CASE expressions. Could come later if exact-match translation proves too restrictive.
- **Side-by-side "current vs imported" preview**: diff-style preview against the active view. Interesting but much more UI; current sectioned preview is sufficient for the import use case.
- **Export current view as SQL**: the inverse operation. Would make the tool bidirectional in a read-only sense. Not in Phase 37 scope.
- **Mini live-chart preview**: rendering an actual small chart in the preview before Apply. Rejected for Phase 37 in favor of a text description; could revisit if users report the text preview doesn't build enough trust.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| META-01 | User can paste Metabase-exported SQL into an import dialog | Right-side shadcn Sheet (same primitive as CreateListDialog — data-[side=right]:sm:max-w-2xl specificity recipe proven in Phase 34-04) + two-step wizard (paste → preview). See **Architecture Patterns → Pattern 1**. |
| META-02 | App parses the SQL and extracts referenced columns, filters, and sort order | `node-sql-parser` v5.x with `{ database: 'Snowflake' }` option. Translates SELECT/WHERE/ORDER BY AST → ParseResult. See **Standard Stack** + **Pattern 2** + **Don't Hand-Roll**. |
| META-03 | User can preview the mapped configuration before applying | Sectioned preview (Columns / Filters / Sort / Chart) with matched + skipped rows, icon+label signaling per CONTEXT lock. See **Pattern 3**. |
| META-04 | Imported SQL maps to a ViewSnapshot (table columns, filters, chart config) | ViewSnapshot mapper converts ParseResult → Partial<ViewSnapshot> consumed by the same `handleLoadView` path used by saved views. `sourceQuery` field appended as additive `.optional()` zod field (mirrors Phase 32-02 `drill` + Phase 34-04 `listId` precedent). See **Pattern 4** + **Code Examples**. |
| META-05 | Imported configuration respects existing column allow-list (no SQL injection) | SQL is never sent to Snowflake — parsed in-browser, only column KEYs extracted, each validated against `ALLOWED_COLUMNS` (existing Set in src/lib/columns/config.ts:107). Unknown columns silently dropped and listed in preview. See **Pattern 5**. |
</phase_requirements>

## Summary

The phase is a client-side SQL → ViewSnapshot translator with a preview wizard. Parsing is pure-function territory (ideal unit-test surface) and the UI sits on already-proven primitives: the shadcn Sheet (dialog.tsx from `@base-ui/react`), the `handleLoadView` apply pipeline in `data-display.tsx`, the `ALLOWED_COLUMNS` allow-list, and the TanStack Table `columnFilters` schema (`string[]` for text checklist, `{min?, max?}` for numeric range). There is no new API surface, no new data store, and no Snowflake round-trip.

The one library decision is the parser. **`node-sql-parser` v5.x is the prescribed choice.** It ships a Snowflake dialect build (`require('node-sql-parser/build/snowflake')`), is under active maintenance (v5.3.x+ added Snowflake-specific fixes like `listagg`, range-expr window frames, quoted table-name refactor), exposes an AST with stable `type`/`columns`/`from`/`where`/`orderby` shape, and has ~1M weekly npm downloads. A regex-only approach is rejected: it cannot correctly handle quoted identifiers, nested predicates, or reliable skip-reason reporting — and the CONTEXT lock already names the 80%-case parser as appropriate scope. The parser is wrapped in a single `parseMetabaseSql(sql: string): ParseResult` module so dialect quirks, error shaping, and Metabase-specific template-tag stripping live in one file. The parser runs in the browser only at paste time; it is ~110 KB min+gz per bundle-phobia snapshots, comfortable inside an already-dynamic client component.

Everything else is composition: the wizard reuses `Sheet`/`SheetContent`/`SheetHeader`/`SheetFooter` (same primitives as `CreateListDialog`), the preview list reuses `lucide-react` icons (`CheckCircle2`, `AlertTriangle`, `XCircle`) alongside one-line reason text, and Apply calls into a thin `applyImportAsWorkingView(partialSnapshot)` helper that writes through the same refs (`tableLoadViewRef`, `chartLoadRef`) used today. The additive `sourceQuery` field on `viewSnapshotSchema` follows the exact precedent set by Phase 32-02 (`drill?`) and Phase 34-04 (`listId?`): optional + default-undefined + legacy snapshots parse cleanly.

**Primary recommendation:** Install `node-sql-parser@^5.3` (Snowflake build), add one pure `parse-metabase-sql.ts` module with a `node --experimental-strip-types` smoke test (matches the existing Phase 35/36 test-infra pattern), extend `viewSnapshotSchema` with `sourceQuery: z.object({ sql: z.string(), importedAt: z.number() }).optional()`, and build the wizard Sheet on top of `CreateListDialog`'s right-side Sheet recipe (data-[side=right]:sm:max-w-2xl specificity override).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node-sql-parser` | `^5.3` (Snowflake build) | SQL → AST parsing; extracts columns/where/orderby | Active maintenance (5.3.x–5.4 added Snowflake-specific fixes Dec 2024/Jan 2025); ~1M weekly downloads; isolated Snowflake build path (`node-sql-parser/build/snowflake`); TypeScript types shipped (`types.d.ts` with `Select`/`BinaryExpr`/`column_ref`/`OrderBy`). CONTEXT.md + FEATURES.md both named it as the research candidate. |
| `@base-ui/react` Dialog (Sheet) | already installed (`^1.3.0`) | Right-side sheet primitive for the two-step wizard | Same primitive `CreateListDialog` uses. Phase 34-04 proved the right-side max-width override recipe. |
| `zod` | already installed (`^4.3.6`) | Extend `viewSnapshotSchema` with optional `sourceQuery` | Additive optional field mirrors Phase 32-02 `drill` + Phase 34-04 `listId` precedent. |
| `lucide-react` | already installed (`^1.8.0`) | Preview signaling icons (`CheckCircle2`/`AlertTriangle`/`XCircle`) + sidebar entry (`Database`) | Consistent with CONTEXT lock "icon + label per row". |
| `sonner` | already installed (`^2.0.7`) | Post-apply "imported — N columns, M skipped" toast with Undo action | Same pattern used by view-load, view-save, view-delete, list-delete toasts. Undo action signature is `{ label, onClick }` — matches `handleDeleteView`/`handleDelete` (partner-lists) precedents. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `COLUMN_CONFIGS` / `ALLOWED_COLUMNS` | in-tree | Column allow-list enforcement; label + type lookup | Every parsed column reference — case-normalized, then `ALLOWED_COLUMNS.has(key)`. Already the canonical source for every column-touching surface. |
| `axis-eligibility.ts` | in-tree | Chart-type → eligible X/Y columns gate | When inferring chart config from a parsed SELECT — use `isColumnEligible(chartType, axis, columnKey)` so inferred axis cannot violate what Phase 36's builder will accept. |
| `migrateChartState` | in-tree (`src/lib/views/migrate-chart.ts`) | Chart definition defaults / fallback | After chart inference, run the candidate through the same migration function to guarantee shape validity before placing it on a `ViewSnapshot`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node-sql-parser` | Hand-rolled regex parser | Cannot reliably handle: quoted identifiers (`"Column Name"`), identifier case-folding, nested predicates, multi-line comments, string-literal-containing commas, or Metabase `{{var}}` template tags. Does not provide location info for error-card line/col reporting. CONTEXT already flagged that "full SQL parsing requires a parser library". **REJECTED.** |
| `node-sql-parser` | `sql-parser-cst` | CST (lossless) parser — more detail than we need, larger bundle, no dedicated Snowflake dialect. Overkill for extract-intent-only. |
| `node-sql-parser` | `@casual-simulation/sql-parser` / `pgsql-parser` | PostgreSQL-focused or single-purpose forks; neither has Snowflake dialect nor the install base of node-sql-parser. |
| zod schema evolution (additive optional) | Bump `viewSnapshotSchema` version | Unnecessary — Phase 32-02 (`drill?`) and Phase 34-04 (`listId?`) both added optional fields with no version bump and zero localStorage migration pain. Follow the same pattern. |

**Installation:**
```bash
npm install node-sql-parser@^5.3
```

> Import path for the Snowflake-only build: `import { Parser } from 'node-sql-parser/build/snowflake';`
> Smaller bundle than the combined build that ships every dialect. Verified: the Snowflake build is a separate entry in the package's `exports` map (GitHub README "Create AST for Snowflake").

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── metabase-import/              # NEW — phase home
│       ├── parse-metabase-sql.ts     # SQL → ParseResult (pure)
│       ├── parse-metabase-sql.smoke.ts # node --experimental-strip-types
│       ├── map-to-snapshot.ts        # ParseResult → Partial<ViewSnapshot>
│       ├── map-to-snapshot.smoke.ts
│       ├── chart-inference.ts        # ParseResult → ChartDefinition | null
│       ├── types.ts                  # ParseResult, MatchedItem, SkippedItem
│       └── fixtures/                 # Sample Metabase SQL for golden tests
│           ├── simple-select.sql
│           ├── with-where-in.sql
│           ├── quoted-identifiers.sql
│           ├── group-by-bar.sql
│           └── unsupported-join.sql
├── components/
│   └── metabase-import/              # NEW — wizard UI
│       ├── import-sheet.tsx          # Sheet shell + step router
│       ├── paste-step.tsx            # Step 1: textarea + Parse button
│       ├── preview-step.tsx          # Step 2: sections + Apply
│       ├── preview-section.tsx       # Columns / Filters / Sort / Chart section
│       └── preview-row.tsx           # icon + label + one-line reason
├── lib/views/
│   ├── schema.ts                     # EXTEND: add sourceQuery z.optional
│   └── types.ts                      # EXTEND: ViewSnapshot.sourceQuery?
└── components/layout/
    └── app-sidebar.tsx               # EXTEND: add Import entry + Sheet mount
```

### Pattern 1: Two-Step Wizard inside a Right-Side Sheet

**What:** A single `<Sheet>` primitive with two conditionally-rendered step bodies. Step 1 is the paste surface with a `Parse` button. Step 2 is the preview with `Back` / `Apply` actions. No nested dialogs.

**When to use:** CONTEXT lock — explicit Parse button (no live parsing), sectioned preview before commit.

**Example:** See `src/components/partner-lists/create-list-dialog.tsx` — the existing right-side Sheet with multi-step internal state proves the recipe. Note the width override uses `className="data-[side=right]:sm:max-w-2xl"` to defeat the primitive's hardcoded `data-[side=right]:sm:max-w-sm` (Phase 34-04 gotcha).

```typescript
// Skeleton (illustrative)
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

export function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [sql, setSql] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Phase 34-04 specificity-override: defeat data-[side=right]:sm:max-w-sm */}
      <SheetContent className="data-[side=right]:sm:max-w-2xl md:max-w-[60vw]">
        <SheetHeader>
          <SheetTitle className="text-heading">Import from Metabase</SheetTitle>
        </SheetHeader>
        {step === 'paste' && <PasteStep sql={sql} onSqlChange={setSql} onParse={(r) => { setParseResult(r); setStep('preview'); }} />}
        {step === 'preview' && parseResult && (
          <PreviewStep
            result={parseResult}
            onBack={() => setStep('paste')}
            onApply={() => { applyImport(parseResult, sql); onOpenChange(false); }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
```

### Pattern 2: Pure-Function Parser Module (`parseMetabaseSql`)

**What:** A single exported function `parseMetabaseSql(sql: string): ParseResult` that (a) strips Metabase template tags, (b) runs `node-sql-parser` with `{ database: 'Snowflake' }`, (c) walks the AST once to produce a normalized `ParseResult`.

**When to use:** Every SQL input. Keeps the parser library boundary at a single module — same isolation pattern `migrateChartState` uses for `chartDefinitionSchema.safeParse`.

**ParseResult shape (proposed):**
```typescript
export interface ParseResult {
  matchedColumns: Array<{ key: string; alias?: string; label: string }>;
  skippedColumns: Array<{ raw: string; reason: string }>;
  matchedFilters: Array<{ columnKey: string; operator: 'eq' | 'in' | 'between' | 'isNull'; value: unknown }>;
  skippedFilters: Array<{ raw: string; reason: string }>;
  matchedSort: Array<{ columnKey: string; desc: boolean }>;
  skippedSort: Array<{ raw: string; reason: string }>;
  inferredChart: ChartInferenceResult; // { chartType, x?, y?, skipped: Array<{ reason: string }> }
  unsupportedConstructs: Array<{ kind: 'join' | 'cte' | 'subquery' | 'aggregate' | 'groupby' | 'window'; reason: string }>;
  parseError?: { message: string; line?: number; column?: number };
}
```

**Why this shape:** Every section of the preview maps to one `matched*` + one `skipped*` array. The UI is a dumb renderer. `unsupportedConstructs` surfaces JOINs/CTEs/subqueries etc. as a section-agnostic banner.

### Pattern 3: Sectioned Preview with Icon+Label Rows

**What:** Four fixed-order sections (Columns, Filters, Sort, Chart) each rendering `matched*` rows with `CheckCircle2` (green) and `skipped*` rows with `AlertTriangle` (amber). A parse error replaces the whole sections block with a single error card.

**When to use:** Step 2 body.

**Icon+label convention (CONTEXT lock):**
- matched → `<CheckCircle2 />` + `text-success-fg` + label
- skipped → `<AlertTriangle />` + `text-warning-fg` + label + one-line reason (muted)
- parse error → `<XCircle />` + `text-error-fg` + message

Reuse existing semantic tokens: `text-success-fg`, `text-warning-fg`, `text-error-fg` (shipped in Phase 26-02 palette). Do NOT hand-roll Tailwind `text-green-*` / `text-amber-*` — that would violate the state-color token discipline established in Phase 26.

### Pattern 4: Apply Path = Existing `handleLoadView` Pipeline

**What:** `applyImportAsWorkingView(partial: Partial<ViewSnapshot>, sourceSql: string)` assembles a full `ViewSnapshot` using the mapper output + current-view defaults, then calls the same code path that `handleLoadView` uses. **Drill resets to root** (CONTEXT lock): before calling into `tableLoadViewRef`, clear drill URL params (mirror `handleLoadView` at `data-display.tsx:370-383` but with `snapshot.drill` absent, so drillParams get cleared unconditionally). The new view is NOT pushed into `useSavedViews` — unsaved working view is just direct state application.

**When to use:** Apply button click in preview step.

**Key detail:** `handleLoadView` is a `useCallback` bound inside `DataDisplay`. The import Sheet lives in the sidebar (mount point in `app-sidebar.tsx` matches `CreateListDialog`), so the apply handler needs to reach `handleLoadView`. Two options:

1. **Lift a new callback** `handleApplyImport(partial: Partial<ViewSnapshot>, sourceSql: string)` next to `handleLoadView` in `data-display.tsx`, and thread it to the sidebar via `useSidebarData` context (same pattern as `onLoadView`/`onDeleteView`/`onSaveView`).
2. **Mount ImportSheet in data-display.tsx** instead of app-sidebar.tsx (like `CreateListDialog` — portaled overlay position is DOM-location-agnostic per Phase 34-04 Pitfall 7). The sidebar button then flips a context boolean that `DataDisplay` reads.

**Recommendation:** Option 1. The sidebar already consumes `onLoadView`/`onDeleteView`/`onSaveView` from `useSidebarData` — adding `onImportSql: (result: ParseResult, sourceSql: string) => void` continues the established pattern and keeps `DataDisplay` the single owner of the apply pipeline. ImportSheet itself can still mount in `app-sidebar.tsx` (matches `CreateListDialog` placement, shared with the sidebar trigger) — it just receives the `onImportSql` callback as a prop.

### Pattern 5: Allow-List Enforcement at the Column-Name Boundary

**What:** Every SELECT column and every WHERE/ORDER BY column reference is:
1. Case-normalized (`key.toUpperCase()`) — Snowflake + `COLUMN_CONFIGS` both uppercase.
2. Quoted-identifier stripped of wrapping `"..."`.
3. Alias-resolved (if `ast.from[0]` has an alias, strip it: `t.PARTNER_NAME` → `PARTNER_NAME`).
4. Checked against `ALLOWED_COLUMNS` (existing `Set<string>` at `src/lib/columns/config.ts:107`).
5. Unknown keys → dropped + added to `skippedColumns` / `skippedFilters` / `skippedSort` with reason `column not in schema`.

Because the SQL is never executed, injection is impossible **by construction**. The allow-list is a user-facing safety net, not a security boundary — but it is what META-05 explicitly requires.

### Anti-Patterns to Avoid

- **Executing parsed SQL.** Never send the input SQL to Snowflake. Phase 37 is an intent-extractor, not a query executor.
- **Hand-rolled regex parser.** CONTEXT discretion includes this as a comparison point — documented here as rejected. The parser library cost is tiny and the correctness benefit is enormous.
- **Sending the SQL over a server API.** Not needed — parse happens in the browser at paste-time. No API routes, no network round-trip.
- **Tailwind color literals for signaling** (e.g., `text-green-600`, `text-amber-500`). Use the semantic state-color tokens (`text-success-fg`, `text-warning-fg`, `text-error-fg`) shipped in Phase 26. The project has an allowlist guard (`scripts/check-polish.sh`) covering literal colors; new code should not add violations.
- **Raw ad-hoc typography** (`text-sm`, `text-base`). Outside `src/components/ui/**`, Phase 27's `check:tokens` guard forbids this. Use `text-body`, `text-title`, `text-label`, `text-caption`, etc.
- **Mutating the current ViewSnapshot in place.** Apply should produce a new snapshot and drive the existing `handleLoadView`-equivalent flow. The working view is unsaved — it lives in component state, not in `useSavedViews`.
- **Writing to `useSavedViews` on Apply.** CONTEXT explicitly separates Import from Save. The save flow (existing `handleSaveView` popover) is the only path that persists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL → AST parsing | Regex-based tokenizer | `node-sql-parser` (Snowflake build) | Quoted identifiers, escaped strings, nested parens, comment handling, case-folding, multiline — all error-prone and all solved. |
| Metabase template tag stripping | Regex with lookaheads for every variant | A one-liner regex `sql.replace(/\{\{[^}]+\}\}/g, 'NULL').replace(/\[\[[^\]]+\]\]/g, '')` applied before parse | Straightforward when documented, but the correct stripping (convert `{{var}}` to a parseable literal, drop `[[...]]` optional clauses entirely) must happen BEFORE the parser sees the SQL. Keep it in one place: the top of `parseMetabaseSql`. |
| ViewSnapshot schema evolution | Schema migration functions | Additive `.optional()` field | Phase 32-02 `drill?` and Phase 34-04 `listId?` both proved legacy views load without zod errors. |
| Apply → drill reset | New URL orchestration code | Reuse the drill-clear block from `handleLoadView` (`data-display.tsx:370-383`), just with `snapshot.drill` undefined so `router.push` clears `?p=&b=` | Already the canonical mechanism. |
| Allow-list check | Case-by-case `if` ladder | `ALLOWED_COLUMNS.has(key.toUpperCase())` | One Set lookup, O(1), imported from `src/lib/columns/config.ts`. |
| Parser library dialect detection | Custom dialect probing | `import { Parser } from 'node-sql-parser/build/snowflake'` | Library ships per-dialect builds. Smaller bundle than combined build. |
| Error card line/column info | Custom error position tracking | Parser throws a `Error` with `.location` (`{ start: { line, column } }`) on malformed SQL; catch and surface | Already provided by the library. |
| Section coloring | `border-l-4 border-green-500` literals | `text-success-fg` / `text-warning-fg` / `text-error-fg` on icon + label | Semantic tokens, theme-aware, audited by Phase 26/31 guards. |

**Key insight:** The parser library is the only real dependency added for this phase. Everything else is existing primitives (Sheet, sonner, zod, allow-list Set, handleLoadView pipeline). This is a composition-heavy feature on top of an already-matured platform.

## Common Pitfalls

### Pitfall 1: Metabase Template Tags Crash the Parser
**What goes wrong:** Metabase exported SQL often contains `{{variable_name}}` placeholders and `[[ ... {{var}} ... ]]` optional clauses. `node-sql-parser` does not know these are Metabase-specific — it throws `SyntaxError` on `{{` / `}}`.
**Why it happens:** Metabase native queries embed template variables for filter widgets; users paste them verbatim.
**How to avoid:** In `parseMetabaseSql`, as the FIRST preprocessing step:
1. Drop every `[[ ... ]]` optional block entirely (it's a parametric clause — if we don't have the param, the user wasn't relying on it).
2. Replace every `{{var}}` with a neutral literal like `NULL` (the resulting WHERE clause will reference an un-resolvable value, so the filter will land in `skippedFilters` with a reason — user understands they need to fill in a constant).
3. Document the transformation inline; the Sheet's Step 1 can show an info note "Template variables like `{{date}}` are replaced with NULL for parsing; set concrete values before importing".
**Warning signs:** `SyntaxError: Expected ... but "{" found` on paste of otherwise-valid queries.

### Pitfall 2: Snowflake Dialect is Still Young
**What goes wrong:** `node-sql-parser`'s Snowflake build has seen active fixes in the last 12 months (e.g., quoted-table-name refactor, LISTAGG, range-expr window frames). Edge-case SQL can still produce surprising ASTs or outright throw.
**Why it happens:** GitHub README lists Snowflake as a supported dialect with recent Snowflake-specific commits; the community generally considers it maintained but not as battle-tested as MySQL/PostgreSQL.
**How to avoid:**
1. Wrap `parser.astify(sql, { database: 'Snowflake' })` in try/catch → ParseError with `line`/`column` from `err.location?.start` when available.
2. Ship a fixture suite in `parse-metabase-sql.smoke.ts` that covers the app's realistic shapes (see **Validation Architecture** below). Run in CI via existing `smoke:*` npm-script pattern.
3. Treat any AST walk as defensive: guard with `if (ast.type !== 'select')` at the top; fall through to `unsupportedConstructs` with a friendly message (`"Only SELECT statements are supported"`).
**Warning signs:** Specific Metabase SQL patterns (e.g., CTE followed by a pivot) throw unhelpfully; user sees "Parse error" with no useful context.

### Pitfall 3: Quoted Identifiers Break Case-Insensitive Match
**What goes wrong:** Snowflake folds unquoted identifiers to uppercase (matching `COLUMN_CONFIGS.key`), but preserves case on quoted identifiers — so `"partner_name"` stays lowercase in the AST and fails the allow-list check.
**Why it happens:** Snowflake SQL spec: double-quoted identifiers are case-sensitive; unquoted identifiers are upper-folded. `node-sql-parser` surfaces the original-case string in `column_ref.column`.
**How to avoid:**
1. Normalize EVERY column reference with `key.toUpperCase()` before hitting `ALLOWED_COLUMNS.has(...)`.
2. In the preview, render the matched row using `COLUMN_CONFIGS.find(c => c.key === upperKey)?.label` so the user sees the app's display label ("Partner") not the raw SQL identifier.
3. If the `column_ref.column` came out quoted (`AST includes `type: 'double_quote_string'` wrappers or an explicit `quoted` flag on some dialects`), strip the quotes before uppercasing.
**Warning signs:** SQL that works in Metabase produces an import that silently drops every column.

### Pitfall 4: FROM Clause References the Wrong Table
**What goes wrong:** Metabase queries often reference a specific Snowflake table (`agg_batch_performance_summary` or similar) or a fully-qualified path (`DB.SCHEMA.TABLE`). The app is bound to one specific table via `COLUMN_CONFIGS`; an imported query against a different table is semantically nonsense even if columns overlap.
**Why it happens:** Metabase doesn't know about the app's data model.
**How to avoid:**
1. Treat the FROM table name as informational only: read `ast.from[0].table`, case-normalize, and compare against a well-known list (or at minimum log it).
2. If there's no existing SOURCE_TABLE constant, this phase introduces one (a single string constant in `src/lib/columns/config.ts`, e.g., `SOURCE_TABLE = 'AGG_BATCH_PERFORMANCE_SUMMARY'`, already implied by how the Snowflake API fetches data).
3. On table mismatch: do NOT hard-fail. Treat as a warning in `unsupportedConstructs` (`"Query references a different table: X — columns are matched by name against app schema"`). User still gets partial import; CONTEXT lock says "partial import with warnings".
**Warning signs:** Users import queries from random dashboards and columns all mismatch — a warning banner explains why.

### Pitfall 5: WHERE Clause AST Is Deep-Recursive
**What goes wrong:** `node-sql-parser` represents `WHERE a = 1 AND b IN (2,3) AND c BETWEEN 0 AND 10` as a left-leaning binary-tree of `binary_expr` nodes (`AND` / `OR` at inner nodes, leaf `binary_expr` for the actual predicates). A naive walker either misses leaves or recurses through OR branches it shouldn't touch.
**Why it happens:** Parser preserves logical grouping.
**How to avoid:**
1. Write a `flattenConjunction(expr)` helper: given a `binary_expr` with `operator === 'AND'`, recurse into `left` and `right` and concatenate leaf predicates. Stop at non-AND nodes.
2. Anything under an `OR` → `skippedFilters` with reason `OR conditions not supported`. CONTEXT lock: "nested OR/AND beyond one level".
3. Leaf predicates: translate by `operator` to the four supported kinds:
   - `=` → `{ operator: 'eq', value }` → maps to TanStack `columnFilters[col] = [value]` (checklist filter with single item)
   - `IN (…)` → `{ operator: 'in', value: [values] }` → `columnFilters[col] = values`
   - `BETWEEN x AND y` → `{ operator: 'between', value: { min: x, max: y } }` → `columnFilters[col] = { min, max }` (range filter)
   - `IS NULL` → `{ operator: 'isNull', value: null }` → flag in `skippedFilters` for v1 (app's `checklistFilter`/`rangeFilter` don't model a null-bucket).
4. Everything else (`LIKE`, `<`, `>`, `NOT IN`, `CASE`, function calls) → `skippedFilters`.
**Warning signs:** Imports silently succeed but filter counts in the preview are way lower than the user expects.

### Pitfall 6: Filter Shape Mismatch Between Parser and TanStack Table
**What goes wrong:** The app's TanStack Table `columnFilters` schema is:
- text columns (`checklistFilter`): `string[]` where empty array = no filter
- numeric columns (`rangeFilter`): `{ min?: number; max?: number }` where both undefined = no filter

Parser emits structured operators — these must be normalized to the above shapes before writing to `ViewSnapshot.columnFilters`.
**Why it happens:** Two different schemas (intent-level vs TanStack storage).
**How to avoid:** `map-to-snapshot.ts` owns the translation:
- `eq` on text col → `[value]`
- `in` on text col → `values`
- `between` on numeric col → `{ min, max }`
- `eq` on numeric col → `{ min: value, max: value }` (tight-range equivalent)
- `in` on numeric col → skip (the range filter doesn't model a discrete set; put in `skippedFilters` with reason `IN on numeric column requires discrete filter — not supported`)
- text/numeric mismatch (`eq` on numeric col with non-numeric literal) → skip with type-mismatch reason
**Warning signs:** Applied view renders but filter chips in the toolbar don't match what was imported.

### Pitfall 7: Sheet Width Specificity Gotcha
**What goes wrong:** Adding `className="md:max-w-[60vw]"` to `<SheetContent>` gets overridden by the primitive's internal `data-[side=right]:sm:max-w-sm` because the data-attribute selector wins on specificity.
**Why it happens:** shadcn Sheet hardcodes the max-width via a compound data-attribute selector.
**How to avoid:** Match the variant selector: `className="data-[side=right]:sm:max-w-2xl md:max-w-[60vw]"`. This is the exact recipe proven in Phase 34-04 (`CreateListDialog`). Reference: `src/components/partner-lists/create-list-dialog.tsx` usage pattern + `.planning/phases/34-partner-lists/34-04-PLAN.md` decision log.
**Warning signs:** Sheet renders at the default `sm:max-w-sm` regardless of the override class.

### Pitfall 8: Chart Inference Violates Phase 36 Axis Eligibility
**What goes wrong:** Inference rules (e.g., `GROUP BY category → bar chart with X=category, Y=count`) produce a `ChartDefinition` whose `x` or `y` column isn't eligible for that chart type per `axis-eligibility.ts`. The chart then refuses to render once Phase 36 lands.
**Why it happens:** Bar X must be categorical (`isCategorical(c) === true` → `c.type === 'text'`); line X accepts time OR numeric OR identity-categorical; scatter X/Y both numeric. Easy to get wrong when mechanically mapping SQL.
**How to avoid:** After inference, validate with `isColumnEligible(chartType, 'x', xKey)` + `isColumnEligible(chartType, 'y', yKey)`. If either fails, downgrade:
1. Either change chart type to one where both pass (e.g., bar → scatter if both numeric; line → bar if X is categorical).
2. Or set axes to `null` and let the user pick in the builder. The `{ x: null, y: null }` shape is explicitly allowed by the v1 line/scatter/bar variant schemas.
Run the inferred chart through `migrateChartState` as a final validity gate; on failure, fall back to `DEFAULT_COLLECTION_CURVE` (matches how every other codepath in the app handles malformed chart definitions).
**Warning signs:** Preview shows "Bar chart — X: TOTAL_COLLECTED_LIFE_TIME, Y: PARTNER_NAME" (inverted axes, or both numeric on a bar).

### Pitfall 9: Aggregate Functions Produce Synthetic Column Names
**What goes wrong:** `SELECT SUM(amount) AS total FROM t GROUP BY partner` produces columns with `type: 'aggr_func'` in the AST — not `column_ref`. The alias `total` is a synthetic name with no counterpart in `COLUMN_CONFIGS`.
**Why it happens:** Metabase GROUP BY queries commonly use aggregates.
**How to avoid:**
1. Walk `ast.columns` — for each entry, check `expr.type`. Only accept `column_ref`; everything else (`aggr_func`, `case`, `function`) → `skippedColumns` with reason (e.g., `aggregate functions not supported — use raw columns`).
2. Also add an entry to `unsupportedConstructs` with `kind: 'aggregate'` so the preview can surface a section-level warning ("GROUP BY / aggregate functions are not applied — imported as raw rows").
**Warning signs:** User imports a dashboard query, sees zero columns match, doesn't know why.

### Pitfall 10: Bundle Size Impact of node-sql-parser
**What goes wrong:** The combined node-sql-parser build (`require('node-sql-parser')`) pulls in every dialect grammar → large bundle.
**Why it happens:** Default import is the omnibus build.
**How to avoid:** Always import from the Snowflake-only build path: `import { Parser } from 'node-sql-parser/build/snowflake';`. The library's `package.json` exports map exposes per-dialect entry points. This is already documented in their README.
**Warning signs:** Client bundle jumps noticeably after install; webpack-bundle-analyzer shows node-sql-parser grammar files in the main chunk.

## Code Examples

Verified patterns from official sources + existing codebase.

### Parse SQL with Snowflake Dialect
```typescript
// Source: https://github.com/taozhi8833998/node-sql-parser README
// "Create AST for Snowflake"
import { Parser } from 'node-sql-parser/build/snowflake';

const parser = new Parser();
const sql = 'SELECT partner_name, batch FROM agg_batch_performance_summary WHERE account_type = \'Consumer\' ORDER BY batch_age_in_months ASC';
// { database: 'Snowflake' } redundant when importing the snowflake build,
// but harmless and self-documenting.
const ast = parser.astify(sql, { database: 'Snowflake' });
// ast.type === 'select'
// ast.columns: Array<{ expr: { type: 'column_ref', column: 'partner_name' }, as: null }>
// ast.from: [{ table: 'agg_batch_performance_summary', as: null }]
// ast.where: { type: 'binary_expr', operator: '=', left: {...column_ref}, right: {...value} }
// ast.orderby: [{ type: 'ASC', expr: {...column_ref} }]
```

### AST Walk for SELECT Columns
```typescript
// Source: node-sql-parser types.d.ts + README examples
import { ALLOWED_COLUMNS, COLUMN_CONFIGS } from '@/lib/columns/config';

const labelByKey = new Map(COLUMN_CONFIGS.map(c => [c.key, c.label]));

function extractColumns(ast: Select): {
  matched: Array<{ key: string; label: string }>;
  skipped: Array<{ raw: string; reason: string }>;
} {
  const matched: Array<{ key: string; label: string }> = [];
  const skipped: Array<{ raw: string; reason: string }> = [];

  for (const col of ast.columns ?? []) {
    if (col.expr.type !== 'column_ref') {
      skipped.push({
        raw: JSON.stringify(col),
        reason: col.expr.type === 'aggr_func'
          ? 'aggregate functions not supported — use raw columns'
          : `expression type "${col.expr.type}" not supported`,
      });
      continue;
    }
    const raw = typeof col.expr.column === 'string' ? col.expr.column : '';
    const key = raw.replace(/^"(.*)"$/, '$1').toUpperCase();
    if (!ALLOWED_COLUMNS.has(key)) {
      skipped.push({ raw, reason: 'column not in schema' });
      continue;
    }
    matched.push({ key, label: labelByKey.get(key) ?? key });
  }
  return { matched, skipped };
}
```

### Additive Zod Schema Evolution for `sourceQuery`
```typescript
// Source: src/lib/views/schema.ts (existing precedent from Phase 32-02 drill, Phase 34-04 listId)
// NEW addition at end of viewSnapshotSchema:
export const viewSnapshotSchema = z.object({
  // ...existing fields...
  /**
   * Phase 37 — optional audit field. Captures the original Metabase SQL
   * that produced this snapshot. Mirrors the additive-optional evolution
   * used for drill (32-02) and listId (34-04). Legacy views parse cleanly
   * with sourceQuery: undefined.
   */
  sourceQuery: z.object({
    sql: z.string(),
    importedAt: z.number(),
  }).optional(),
});
```

### ViewSnapshot Field
```typescript
// src/lib/views/types.ts — extend ViewSnapshot:
export interface ViewSnapshot {
  // ...existing fields...
  /**
   * Phase 37 — optional audit of the Metabase SQL import that produced
   * this snapshot. Absent on hand-built views.
   */
  sourceQuery?: {
    sql: string;
    importedAt: number;
  };
}
```

### Apply Path (Thin Helper)
```typescript
// src/components/data-display.tsx — new callback bound next to handleLoadView:
const handleApplyImport = useCallback(
  (partial: Partial<ViewSnapshot>, sourceSql: string) => {
    // Drill reset: clear ?p=&b= (CONTEXT lock).
    const drillParams = new URLSearchParams(window.location.search);
    drillParams.delete('p');
    drillParams.delete('b');
    const qs = drillParams.toString();
    router.push(qs ? `?${qs}` : window.location.pathname, { scroll: false });

    // Assemble a full ViewSnapshot from the parsed partial + current defaults.
    // Re-use tableSnapshotRef.current() to capture current shape as the baseline,
    // then overlay the imported slice. Import does NOT push into useSavedViews.
    if (!tableSnapshotRef.current) return;
    const base = tableSnapshotRef.current();
    const imported: ViewSnapshot = {
      ...base,
      ...partial,
      sourceQuery: { sql: sourceSql, importedAt: Date.now() },
      drill: undefined, // explicit root
    };

    // Route through the same code path loadView uses — synthesized SavedView.
    const workingView: SavedView = {
      id: 'working:import',
      name: 'Imported View (unsaved)',
      snapshot: imported,
      createdAt: Date.now(),
    };
    handleLoadView(workingView);

    toast('View imported', {
      description: `${partial.columnOrder?.length ?? 0} columns, ${
        Object.keys(partial.columnFilters ?? {}).length
      } filters applied`,
      action: {
        label: 'Undo',
        onClick: () => handleLoadView(previousViewSnapshot), // capture pre-import snapshot for undo
      },
      duration: 5000,
    });
  },
  [router, handleLoadView],
);
```

> The Undo mechanism captures the pre-import snapshot via `tableSnapshotRef.current()` **before** the apply and feeds it into a second `handleLoadView` call. Same "capture for restore" pattern as `handleDeleteView` (which captures the deleted view for its restoreView undo).

### Import Sheet Sidebar Entry
```typescript
// src/components/layout/app-sidebar.tsx — new group action (mirrors PartnerListsSidebarGroup layout):
<SidebarMenuItem>
  <SidebarMenuButton
    tooltip="Import from Metabase"
    onClick={() => setImportOpen(true)}
  >
    <Database className="h-4 w-4" />
    <span>Import from Metabase</span>
  </SidebarMenuButton>
</SidebarMenuItem>

{/* Mount the Sheet at the sidebar level, same pattern as CreateListDialog */}
<ImportSheet
  open={importOpen}
  onOpenChange={setImportOpen}
  onImport={onImportSql /* threaded from useSidebarData */}
/>
```

### Smoke Test Pattern (existing convention)
```typescript
// src/lib/metabase-import/parse-metabase-sql.smoke.ts
// Run via: npm run smoke:metabase-import
// (new script in package.json mirroring smoke:migrate-chart)
import assert from 'node:assert/strict';
import { parseMetabaseSql } from './parse-metabase-sql.ts';

// Test 1: simple SELECT with WHERE eq
const r1 = parseMetabaseSql(
  `SELECT partner_name, batch FROM agg_batch_performance_summary WHERE account_type = 'Consumer'`,
);
assert.equal(r1.matchedColumns.length, 2, 'partner_name + batch matched');
assert.equal(r1.matchedFilters.length, 1, 'WHERE eq translates');

// Test 2: unknown column silently skipped
const r2 = parseMetabaseSql(
  `SELECT partner_name, total_collected_lifetime, bogus_col FROM t`,
);
assert.equal(r2.matchedColumns.length, 2);
assert.equal(r2.skippedColumns[0]?.reason, 'column not in schema');

// Test 3: Metabase template tag stripped
const r3 = parseMetabaseSql(
  `SELECT partner_name FROM t WHERE account_type = {{type}}`,
);
assert.ok(r3.parseError === undefined, 'template tag stripped before parse');
// Filter lands in skippedFilters with type-mismatch reason (NULL substitute)

// Test 4: Quoted identifier case-folds correctly
const r4 = parseMetabaseSql(
  `SELECT "PARTNER_NAME" FROM t WHERE "BATCH" = '2024-01'`,
);
assert.equal(r4.matchedColumns.length, 1);
assert.equal(r4.matchedFilters.length, 1);

// Test 5: JOIN / CTE / GROUP BY lands in unsupportedConstructs
const r5 = parseMetabaseSql(
  `SELECT partner_name, SUM(total_collected_lifetime) FROM t GROUP BY partner_name`,
);
assert.ok(r5.unsupportedConstructs.some(c => c.kind === 'groupby'));
assert.ok(r5.unsupportedConstructs.some(c => c.kind === 'aggregate'));

console.log('✓ metabase-import parser smoke test passed');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-based SQL extraction | Parser-library AST walk | 2023-2024 — node-sql-parser matured into a 1M-downloads default | Eliminates entire classes of false-positive / false-negative edge cases (quoted identifiers, nested predicates, comment handling). |
| Fuzzy column matching via Levenshtein | Exact uppercase match against allow-list | Scope-reduced via CONTEXT + META-07 deferral | Simpler v1; fuzzy matching is a natural follow-up when pain manifests. |
| Live/keystroke parsing | Explicit Parse button | CONTEXT lock | Removes flicker, avoids rate-limiting parser calls, pairs naturally with two-step wizard. |
| Mini chart preview | Text description only | CONTEXT lock | Keeps preview rendering cheap; chart is tweaked in builder post-apply. |

**Deprecated/outdated:**
- Auto-parsing as user types — rejected per CONTEXT (flickering error states).
- Writing imported SQL to `useSavedViews` on Apply — explicitly separated per CONTEXT (Import ≠ Save).
- URL-based Metabase API import — deferred (MI-D-1); not in Phase 37 scope.

## Open Questions

1. **Should `sourceQuery.importedAt` be captured on every re-apply (Undo → re-Apply), or locked to the first import?**
   - What we know: the field is an audit trail per CONTEXT; mirror Phase 32-02/34-04 additive-optional pattern.
   - What's unclear: Undo semantics — if the user undoes then re-does the import, does `importedAt` update?
   - Recommendation: capture once on the original Apply. Undo restores the pre-import snapshot (no `sourceQuery`); Redo would require re-clicking Apply in the Sheet, at which point `importedAt` naturally refreshes. Keeps the field semantically "when this import came in", not "when the user last re-triggered it".

2. **Should a SOURCE_TABLE constant be introduced for the FROM-clause check?**
   - What we know: the app queries one table; `COLUMN_CONFIGS` is bound to its columns. No constant exists today.
   - What's unclear: is the canonical table name `AGG_BATCH_PERFORMANCE_SUMMARY`? (matches the file-name reference in `src/lib/columns/config.ts` comment).
   - Recommendation: introduce `SOURCE_TABLE = 'AGG_BATCH_PERFORMANCE_SUMMARY'` as an exported constant in `src/lib/columns/config.ts`. Keeps the allow-list surface centralized. If the name is wrong, it's a one-line fix. Treat FROM-table mismatch as a warning, not a hard fail (CONTEXT policy: partial import with warnings).

3. **Does Apply-time unsaved-changes detection need a confirm prompt?**
   - What we know: CONTEXT leaves this as discretion — "likely a lightweight confirm prompt, but defer to planning".
   - What's unclear: how the app detects "unsaved changes" today. There's no explicit dirty-flag in `data-display.tsx`; the working view is whatever state the table is in.
   - Recommendation: ship v1 without a confirm prompt. Import already offers Undo via the post-apply toast (5s window). If user friction emerges, add a `sonner` toast with "Cancel" action at Apply time — but don't introduce new state-tracking for this edge case.

4. **Does `node-sql-parser` expose `.loc` for error line/column?**
   - What we know: the types file shows `LocationRange` on every AST node. Errors thrown by the parser typically carry `.location` (per PEG.js-style parsers).
   - What's unclear: the exact error-object shape when `astify` fails on malformed SQL.
   - Recommendation: plan to defensively read `err.location?.start?.line` and `err.location?.start?.column`. Fall back to showing the full error message without position if unavailable. Confirm shape during Task 1 implementation.

5. **Should the imported view carry the `activePreset` field?**
   - What we know: `activePreset` is a string key into `PRESETS` (e.g., `'finance'`, `'outreach'`, `'all'`) that seeds column visibility. Imported SQL provides explicit column visibility; there's no natural preset it matches.
   - What's unclear: whether unsetting `activePreset` + providing explicit `columnOrder`/`columnVisibility` breaks anything.
   - Recommendation: leave `activePreset` undefined on the imported snapshot. The preset selector in the toolbar will read as "Custom" (or equivalent) which is semantically correct for a just-imported view. Verify in the manual Apply test.

## Sources

### Primary (HIGH confidence)
- **In-tree code** (SSOT for every integration point):
  - `src/lib/views/schema.ts` + `src/lib/views/types.ts` — ViewSnapshot schema + type, additive-optional precedent
  - `src/lib/views/defaults.ts` — default views + ChartDefinition shape
  - `src/lib/views/migrate-chart.ts` + `src/lib/views/migrate-chart.smoke.ts` — migration pattern + smoke-test pattern
  - `src/lib/columns/config.ts` — `COLUMN_CONFIGS`, `ALLOWED_COLUMNS`, `IDENTITY_COLUMNS`
  - `src/lib/columns/filter-functions.ts` — `checklistFilter`, `rangeFilter` shapes
  - `src/lib/columns/axis-eligibility.ts` — `getEligibleColumns`, `isColumnEligible`
  - `src/components/ui/sheet.tsx` — Sheet primitive + width-specificity recipe
  - `src/components/partner-lists/create-list-dialog.tsx` — right-side Sheet with multi-step state (reference implementation)
  - `src/components/layout/app-sidebar.tsx` — SidebarMenuItem + SidebarMenuAction + Sheet mount pattern
  - `src/components/partner-lists/partner-lists-sidebar-group.tsx` — sonner toast + Undo action recipe
  - `src/components/data-display.tsx` — `handleLoadView`, `handleSaveView`, `handleDeleteView`, `tableLoadViewRef`, `chartLoadRef`, drill-reset URL recipe
  - `src/hooks/use-saved-views.ts` — sanitization pattern for additive-optional fields
- **Phase 32-02 & 34-04 decision logs** (STATE.md) — additive zod `.optional()` proved across two prior phases
- **Phase 34-04 decision log** — Sheet specificity override (`data-[side=right]:sm:max-w-2xl`)

### Secondary (MEDIUM confidence)
- [node-sql-parser GitHub README](https://github.com/taozhi8833998/node-sql-parser) — current version, Snowflake dialect support (listed as actively maintained; "alpha" label dropped in recent README versions), API surface
- [node-sql-parser types.d.ts](https://raw.githubusercontent.com/taozhi8833998/node-sql-parser/master/types.d.ts) — AST type shape (Select, BinaryExpr, column_ref, OrderBy, LocationRange)
- [node-sql-parser Releases](https://github.com/taozhi8833998/node-sql-parser/releases) — Snowflake-specific fixes in 5.3.x / 5.4 (quoted table name refactor Jan 2025, LISTAGG Dec 2024, range-expr window frames)
- [Metabase Docs: Basic SQL parameters](https://www.metabase.com/docs/latest/questions/native-editor/basic-sql-parameters) — `{{variable}}` template tag syntax
- [Metabase Docs: Optional variables](https://www.metabase.com/docs/latest/questions/native-editor/optional-variables) — `[[ ... ]]` optional clause syntax
- [Snowflake Identifier syntax docs](https://docs.snowflake.com/en/sql-reference/identifiers-syntax) — quoted-identifier case-preservation rule

### Tertiary (LOW confidence — flagged for Task-1 validation)
- Bundle size estimate for Snowflake-only build: ~110 KB min+gz (rough order-of-magnitude from bundlephobia-style snapshots; not independently measured in this project). **Action:** confirm via webpack bundle analyzer after install, before closing the plan.
- Exact `.location` shape on parser errors: documented in types.d.ts but error-throwing behavior not verified. **Action:** confirm in Task 1 by catching a malformed-SQL parse and inspecting the thrown object.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — `node-sql-parser` verified via GitHub README + types + releases; every other library already in-tree and battle-tested in recent phases.
- Architecture: **HIGH** — every integration point (Sheet, sonner toast, additive zod, handleLoadView pipeline, allow-list) has a direct precedent in Phase 32-02 / 34-04 / 35-01 / 36-02.
- Pitfalls: **MEDIUM-HIGH** — Pitfalls 1–3 (template tags, Snowflake dialect maturity, quoted identifiers) are real and documented upstream; Pitfalls 5–6 (WHERE recursion, filter-shape mismatch) follow mechanically from the parser's AST contract + the app's filter schema; Pitfalls 7–8 (Sheet width + chart eligibility) are direct re-applications of Phase 34-04 / 36-01 decisions.

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — node-sql-parser is stable; in-tree references are pinned)

## RESEARCH COMPLETE
