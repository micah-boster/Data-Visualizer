# Phase 7: Export - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can download the current filtered and formatted table view as a CSV file. The downloaded CSV contains only the rows visible after active filters are applied and only the columns currently visible in the table (hidden columns are excluded).

</domain>

<decisions>
## Implementation Decisions

### Export trigger & placement
- Export button lives in the table toolbar, right end (after existing controls like preset tabs and sort)
- Button shows a download icon + "Export" label (icon + text, not icon-only)
- Static label — always says "Export", no dynamic row count in the button itself
- Button is disabled when: zero rows after filtering, or data is still loading/fetching

### CSV content & formatting
- Values are formatted as displayed in the table (e.g., $1,234.56, 12.3%, 1,234) — WYSIWYG approach
- Column headers use human-readable display names (e.g., "Partner Name", "Total Placed Amount")
- Metadata rows at the top of the CSV before the data: source table name, export date/time, any active filters — makes data provenance very easy to trace back to the source
- Row order matches the current table sort order

### Filename & download behavior
- Auto-generated filename: `bounce-batch-performance-YYYY-MM-DD.csv`
- No filter info in filename — filter context lives in the metadata rows inside the file
- Instant browser download (no save dialog) — click Export, file appears in downloads
- Client-side CSV generation — data is already in the browser from TanStack Table, no extra API call needed

### Feedback & edge cases
- Toast notification after export: "Exported 127 rows to CSV" (includes row count as sanity check)
- Export button disabled (greyed out) when zero rows exist — tooltip explains why
- Export button disabled while data is fetching — prevents exporting stale or incomplete data

### Claude's Discretion
- Toast duration and positioning
- Exact metadata row format in the CSV
- CSV encoding details (UTF-8 BOM for Excel compatibility, etc.)
- Button disabled state tooltip wording
- How display name to DB column mapping is communicated in metadata rows

</decisions>

<specifics>
## Specific Ideas

- Traceability is important: the team needs to easily understand where exported data came from and how display names map to the underlying Snowflake columns
- WYSIWYG principle throughout: what users see in the table is what they get in the CSV (formatting, sort order, visible columns, filtered rows)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-export*
*Context gathered: 2026-04-11*
