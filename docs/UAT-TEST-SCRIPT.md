# UAT Test Script — Bounce Data Visualizer v3.0

**Purpose:** Validate every user-facing feature end-to-end.
**Environments:** Test in both static mode (no Snowflake) and live mode (with credentials).
**Browsers:** Chrome (primary), Safari, Firefox. Mobile viewport for responsive tests.

---

## Pre-Flight Checks

### PF-01: App Loads Successfully
1. Navigate to the app URL
2. **Expected:** Page loads without white screen or console errors
3. **Expected:** Data table populates with rows (477 in static mode)
4. **Expected:** No React hydration warnings in console

### PF-02: Health Endpoint
1. Navigate to `/api/health`
2. **Static mode expected:** `{ "status": "ok", "mode": "static" }`
3. **Live mode expected:** `{ "status": "ok", "mode": "live", "latency": <ms> }`

### PF-03: Data Endpoint
1. Navigate to `/api/data`
2. **Expected:** JSON with `data` array, `meta.rowCount`, `meta.fetchedAt`, `meta.columns`
3. **Expected:** No `schemaWarnings` (or warnings are non-critical)

---

## Section 1: Data Table

### T-01: Initial Data Load
1. Open the app
2. **Expected:** Table renders with Partner Name, Lender ID, Batch, Batch Age columns visible
3. **Expected:** Default column preset is applied (Finance)
4. **Expected:** Data freshness indicator shows green dot with timestamp

### T-02: Column Presets
1. Click "Finance" preset button
2. **Expected:** Finance-related columns appear
3. Click "Outreach" preset
4. **Expected:** Columns switch to outreach/engagement metrics
5. Click "All" preset
6. **Expected:** All 61 columns visible, horizontal scroll enabled

### T-03: Column Sorting
1. Click any column header (e.g., "Partner Name")
2. **Expected:** Rows sort ascending, sort indicator arrow appears
3. Click same header again
4. **Expected:** Rows sort descending, arrow flips
5. Click again
6. **Expected:** Sort removed

### T-04: Multi-Column Sort
1. Open the sort rules dialog
2. Add sort on Partner Name (ascending) and Batch Age (descending)
3. **Expected:** Data sorts by partner first, then by batch age within each partner
4. Reorder the sort rules
5. **Expected:** Sort priority changes accordingly

### T-05: Column Resize
1. Hover over a column header border until resize cursor appears
2. Drag to widen the column
3. **Expected:** Column width changes, other columns adjust
4. **Expected:** Width persists on page reload (localStorage)

### T-06: Column Drag Reorder
1. Drag a column header to a new position
2. **Expected:** Column moves to new position
3. **Expected:** Order persists on page reload

### T-07: Column Visibility (Column Picker)
1. Open the column picker sidebar
2. **Expected:** Columns organized by domain groups (12 groups)
3. Uncheck a visible column
4. **Expected:** Column disappears from table
5. Check it back
6. **Expected:** Column reappears
7. **Expected:** Identity columns (Partner, Lender ID, Batch, Batch Age) cannot be hidden

---

## Section 2: Filtering

### F-01: Partner Dimension Filter
1. Click the Partner filter dropdown
2. **Expected:** List of all partner names appears
3. Select one partner (e.g., "Affirm")
4. **Expected:** Table filters to only show that partner's rows
5. **Expected:** URL updates with partner param

### F-02: Account Type Filter
1. Click the Account Type filter
2. Select a type
3. **Expected:** Table filters accordingly
4. **Expected:** Combined with partner filter if one is active

### F-03: Batch Filter
1. Select a partner first
2. Click the Batch filter
3. **Expected:** Only batches for the selected partner appear (cascade logic)
4. Select a batch
5. **Expected:** Table filters to that single batch

### F-04: Filter Cascade Logic
1. Select Partner = "Affirm" and a specific batch
2. Change partner to a different one
3. **Expected:** Batch filter clears (invalid batch for new partner)
4. **Expected:** Table shows all batches for new partner

### F-05: Clear Filters
1. Apply multiple filters
2. Click the clear/reset button for one filter
3. **Expected:** That filter clears, others remain
4. Click "Clear All" (if available)
5. **Expected:** All filters reset, full dataset shown

### F-06: In-Column Text Filter
1. Find a text column with a filter icon
2. Click it and select/deselect values
3. **Expected:** Rows filter by selected values
4. **Expected:** Filter is independent of dimension filters

### F-07: In-Column Numeric Range Filter
1. Find a numeric column with a filter icon
2. Set min and/or max values
3. **Expected:** Rows outside range are hidden

### F-08: URL Persistence
1. Apply partner + batch filters
2. Copy the URL and open in a new tab
3. **Expected:** Same filters applied, same view

---

## Section 3: Drill-Down Navigation

### D-01: Root to Partner Drill
1. Start at root level (no filters, all partners)
2. Click a partner row (e.g., click on "Affirm")
3. **Expected:** View drills into partner level
4. **Expected:** Breadcrumb shows: Root > Affirm
5. **Expected:** KPI cards appear with partner-level aggregates
6. **Expected:** Table shows all batches for Affirm

### D-02: Partner to Batch Drill
1. From partner level, click a specific batch row
2. **Expected:** View drills into batch level
3. **Expected:** Breadcrumb shows: Root > Affirm > AFRM_MAR_26_PRI
4. **Expected:** Table shows account-level detail (18 columns)

### D-03: Breadcrumb Navigation
1. From batch level, click "Affirm" in breadcrumb
2. **Expected:** Returns to partner level
3. Click "Root" in breadcrumb
4. **Expected:** Returns to root level with all partners

### D-04: Row Count in Breadcrumb
1. At each drill level, check the breadcrumb
2. **Expected:** Shows row count (e.g., "Root (477 rows)")

### D-05: Drill State Independence
1. Apply a dimension filter at root level
2. Drill into a partner
3. **Expected:** Drill context is independent of URL filter state
4. Navigate back to root
5. **Expected:** Original filter still applied

---

## Section 4: KPI Cards

### K-01: KPI Cards Display (Partner Level)
1. Drill into any partner
2. **Expected:** 6 KPI cards visible:
   - Total Batches
   - Total Accounts
   - Weighted Penetration Rate
   - 6-Month Collection Rate
   - 12-Month Collection Rate
   - Total Collected
3. **Expected:** Values are formatted (currency with $, percentages with %)

### K-02: Trend Indicators
1. View KPI cards at partner level
2. **Expected:** Cards show trend arrows (up/down/flat) with delta %
3. **Expected:** Up arrows are green, down arrows are red (or contextually appropriate)
4. **Expected:** Cards with insufficient history show indicator instead of trend

### K-03: KPI Accuracy Spot Check
1. At partner level for a known partner
2. Manually verify Total Batches matches row count in table
3. Manually verify Total Accounts sums correctly
4. **Expected:** KPI values are consistent with visible data

---

## Section 5: Charts & Visualizations

### V-01: Collection Curve Chart
1. Drill into a partner
2. **Expected:** Collection curve chart renders with monthly data points
3. Hover over a data point
4. **Expected:** Tooltip shows month and collection rate value
5. **Expected:** Multiple batches shown as separate lines with legend

### V-02: Metric Toggle on Curves
1. On the collection curve chart, find the metric toggle
2. Switch between available metrics
3. **Expected:** Chart updates to show selected metric
4. **Expected:** Y-axis label and scale update accordingly

### V-03: Solo Batch Curve
1. Drill into a specific batch
2. **Expected:** Chart shows single batch curve
3. **Expected:** Data points match the batch's monthly collection columns

### V-04: Cross-Partner Trajectory
1. At root level, view the trajectory chart
2. **Expected:** Multiple partner curves plotted for comparison
3. **Expected:** Interactive legend to show/hide partners

### V-05: Partner Comparison Matrix
1. Find the comparison matrix component
2. **Expected:** 3 view modes available: Heatmap, Bar, Table
3. Switch between modes
4. **Expected:** Each mode renders correctly with appropriate data

### V-06: Heatmap Coloring
1. In heatmap view mode
2. **Expected:** Cells colored by deviation from mean
3. **Expected:** Color scale is intuitive (green = good, red = bad, or similar)

### V-07: Sparklines
1. At root or partner level, check for sparkline columns
2. **Expected:** Small inline charts render in cells
3. **Expected:** Sparklines reflect the underlying data trend

---

## Section 6: Anomaly Detection

### A-01: Anomaly Summary Panel (Root Level)
1. At root level, find the anomaly summary panel
2. **Expected:** Collapsible panel showing flagged partners
3. **Expected:** Top 5 flagged partners shown by severity score
4. Click to expand/collapse
5. **Expected:** Smooth animation, content shows/hides

### A-02: Anomaly Flagging Logic
1. View anomaly panel
2. **Expected:** Only partners with 2+ metrics deviating >2 SD are flagged
3. **Expected:** Severity score displayed per partner
4. **Expected:** Flagged batch count vs total batch count shown

### A-03: Anomaly Details
1. Click on a flagged partner in the anomaly panel
2. **Expected:** Shows which metrics are anomalous
3. **Expected:** Metric groups shown (Funnel, Collection, Portfolio Quality, Engagement)

### A-04: Portfolio Fallback
1. Find a partner with fewer than 3 batches
2. **Expected:** Anomaly detection uses portfolio-wide norms as fallback
3. **Expected:** Fallback indicator shown if applicable

---

## Section 7: Claude AI Query Interface

### Q-01: Query Bar Visibility
1. Locate the AI query input bar
2. **Expected:** Input with sparkle icon visible
3. **Expected:** Placeholder text or suggested prompts shown

### Q-02: Suggested Prompts
1. View the suggested prompts
2. **Expected:** 3 context-aware suggestions displayed
3. **Expected:** Suggestions change based on drill level (root vs partner vs batch)

### Q-03: Scope Pill
1. At root level, check the scope indicator
2. **Expected:** Shows current scope context
3. Drill into a partner
4. **Expected:** Scope pill updates to show partner name
5. Drill into a batch
6. **Expected:** Scope pill updates to show partner + batch

### Q-04: Submit a Query (Root Level)
1. Type "Which partner has the highest collection rate?" and submit
2. **Expected:** Loading/thinking state appears
3. **Expected:** Streaming response begins within a few seconds
4. **Expected:** Response references actual partner data
5. **Expected:** Response ONLY references data that exists in the dataset (no hallucinations)

### Q-05: Submit a Query (Partner Level)
1. Drill into a partner
2. Ask "How is this partner performing compared to the portfolio average?"
3. **Expected:** Response is scoped to the drilled-in partner
4. **Expected:** References cross-partner percentile rankings if available

### Q-06: Submit a Query (Batch Level)
1. Drill into a specific batch
2. Ask "What's notable about this batch?"
3. **Expected:** Response references batch-specific metrics
4. **Expected:** Includes parent partner context

### Q-07: AI Response States
1. Submit a query and observe transitions:
   - **Thinking:** Spinner or loading indicator
   - **Streaming:** Text appears incrementally
   - **Done:** Full response visible, input re-enabled
2. **Expected:** All transitions are smooth, no flickering

### Q-08: AI Error Handling
1. (If testable) Trigger an error condition (e.g., disconnect network briefly)
2. **Expected:** Error state shown with message
3. **Expected:** User can retry

### Q-09: AI Timeout
1. (If testable) Submit a complex query
2. **Expected:** If response takes >30 seconds, timeout message appears

---

## Section 8: Saved Views

### SV-01: Save a View
1. Customize the table (change columns, apply filters, set sort, resize columns)
2. Click "Save View" (or equivalent)
3. Enter a name (e.g., "My Finance View")
4. **Expected:** View saved successfully, appears in saved views list

### SV-02: Load a Saved View
1. Make changes to the current view (different columns, filters)
2. Select a previously saved view
3. **Expected:** All settings restore: column visibility, order, widths, filters, sorts

### SV-03: Delete a Saved View
1. Find a saved view in the list
2. Click delete
3. **Expected:** View removed from list
4. **Expected:** Confirmation dialog before deletion (if implemented)

### SV-04: Restore Defaults
1. Customize the table extensively
2. Click "Restore Defaults"
3. **Expected:** Table returns to default column preset, no filters, default sort

### SV-05: Persistence Across Sessions
1. Save a custom view
2. Close the browser tab completely
3. Reopen the app
4. **Expected:** Saved views still available (localStorage)

---

## Section 9: CSV Export

### E-01: Export All Data
1. At root level with no filters, click Export/CSV
2. **Expected:** CSV file downloads
3. Open the CSV
4. **Expected:** All visible columns present as headers
5. **Expected:** All rows included
6. **Expected:** Data matches what's shown in the table

### E-02: Export Filtered Data
1. Apply filters (e.g., Partner = "Affirm")
2. Export CSV
3. **Expected:** Only filtered rows in the CSV
4. **Expected:** Filename includes filter context (e.g., "Affirm_export.csv")

### E-03: Export at Drill Level
1. Drill into a partner, then a batch (account level)
2. Export CSV
3. **Expected:** Account-level data exported
4. **Expected:** Column headers match the 18 account columns

---

## Section 10: Theme & Appearance

### TH-01: Light/Dark Mode Toggle
1. Find the theme toggle
2. Click to switch to dark mode
3. **Expected:** All elements update — backgrounds, text, borders, charts
4. **Expected:** No elements remain in light mode styling
5. Switch back to light mode
6. **Expected:** Clean switch back, no artifacts

### TH-02: Theme Persistence
1. Set dark mode
2. Reload the page
3. **Expected:** Dark mode persists (localStorage)

### TH-03: Chart Theme Consistency
1. In dark mode, view charts
2. **Expected:** Chart backgrounds, gridlines, labels match dark theme
3. **Expected:** Legend text is readable

---

## Section 11: Responsive / Mobile

### R-01: Mobile Viewport (375px)
1. Resize browser to 375px width (or use DevTools mobile view)
2. **Expected:** Sidebar collapses to icon-only mode
3. **Expected:** Table is horizontally scrollable
4. **Expected:** KPI cards stack vertically
5. **Expected:** Query bar is usable

### R-02: Tablet Viewport (768px)
1. Resize to 768px
2. **Expected:** Layout adjusts — fewer KPI cards per row
3. **Expected:** Table still functional with scroll

### R-03: Large Desktop (1920px+)
1. Resize to full desktop
2. **Expected:** Content uses available space efficiently
3. **Expected:** KPI cards in 3 or 6 column grid

---

## Section 12: Data Freshness & Loading States

### LS-01: Initial Loading
1. Hard refresh the page (Cmd+Shift+R)
2. **Expected:** Skeleton/loading placeholders shown while data fetches
3. **Expected:** Table appears once data arrives, no layout jump

### LS-02: Data Freshness Indicator
1. After data loads, check the freshness indicator in the header
2. **Expected:** Green dot + timestamp (e.g., "Data as of 2:30 PM")
3. Wait 5+ minutes (or adjust staleTime for testing)
4. **Expected:** Dot changes to amber when stale

### LS-03: Error State
1. (If testable) Block the `/api/data` request via DevTools network tab
2. Reload the page
3. **Expected:** Error state with message displayed
4. **Expected:** Retry button present
5. Unblock the request and click Retry
6. **Expected:** Data loads successfully

### LS-04: Empty State
1. Apply filters that match zero rows
2. **Expected:** Empty state message shown (not a blank table)

---

## Section 13: Edge Cases & Negative Tests

### N-01: Special Characters in Filters
1. If a partner name contains special characters, verify it filters correctly
2. **Expected:** No SQL injection or rendering issues

### N-02: Rapid Filter Switching
1. Quickly toggle between different partners
2. **Expected:** No race conditions, final state matches last selection
3. **Expected:** No stale data flash

### N-03: Rapid Drill Navigation
1. Quickly drill in and out (root → partner → batch → root)
2. **Expected:** Each level renders correctly, no stale state

### N-04: Multiple AI Queries
1. Submit a query, then immediately submit another before first completes
2. **Expected:** First query cancels or second waits appropriately
3. **Expected:** No overlapping responses

### N-05: Large Number Formatting
1. Check currency values in the millions/billions
2. **Expected:** Proper formatting with commas and $ sign
3. Check percentages
4. **Expected:** Displayed as "XX.X%" not "0.XXX"

### N-06: Null/Missing Data
1. Look for rows with missing values
2. **Expected:** Null values display as "—" or configured null display
3. **Expected:** No "null", "undefined", or "NaN" text visible

### N-07: Browser Back/Forward
1. Navigate through drill levels
2. Use browser back button
3. **Expected:** Returns to previous drill level (if URL-managed)
4. Use forward button
5. **Expected:** Returns to next level

---

## Section 14: Snowflake-Specific Tests (Live Mode Only)

### SF-01: Live Data Fetch
1. With Snowflake credentials configured, load the app
2. **Expected:** Data loads from Snowflake (not static cache)
3. **Expected:** `/api/health` shows `"mode": "live"` with latency

### SF-02: Schema Validation
1. Check the `/api/data` response
2. **Expected:** No `schemaWarnings` if Snowflake schema matches config
3. If there are warnings, verify they are non-blocking

### SF-03: Account Drill-Down (Live)
1. Drill into a partner and batch
2. **Expected:** Account data fetches from `master_accounts` table
3. **Expected:** Parameterized query (check no SQL in URL params)

### SF-04: Query Timeout Behavior
1. (If testable) Slow down the Snowflake warehouse
2. **Expected:** After 45 seconds, timeout error with descriptive message
3. **Expected:** App doesn't hang indefinitely

### SF-05: Connection Pool Recovery
1. Load the app successfully
2. (If testable) Briefly interrupt Snowflake connectivity
3. Trigger a new data fetch
4. **Expected:** Connection pool recovers, subsequent requests succeed

---

## Test Completion Checklist

| Section | Tests | Pass | Fail | Skip |
|---------|-------|------|------|------|
| Pre-Flight | 3 | | | |
| Data Table | 7 | | | |
| Filtering | 8 | | | |
| Drill-Down | 5 | | | |
| KPI Cards | 3 | | | |
| Charts | 7 | | | |
| Anomaly Detection | 4 | | | |
| AI Query | 9 | | | |
| Saved Views | 5 | | | |
| CSV Export | 3 | | | |
| Theme | 3 | | | |
| Responsive | 3 | | | |
| Data States | 4 | | | |
| Edge Cases | 7 | | | |
| Snowflake Live | 5 | | | |
| **TOTAL** | **76** | | | |

---

**Tested by:** ___________________
**Date:** ___________________
**Environment:** Static / Live (circle one)
**Browser:** ___________________
**Notes:**
