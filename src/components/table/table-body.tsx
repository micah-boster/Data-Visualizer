'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getCommonPinningStyles } from './pinning-styles';
import { isNumericType } from '@/lib/formatting';
import type { TableDrillMeta } from '@/lib/columns/definitions';
import { getPartnerName, getBatchName } from '@/lib/utils';
import { useDrillDown, type DrillLevel } from '@/hooks/use-drill-down';

interface TableBodyProps {
  table: Table<Record<string, unknown>>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

// A11Y-03 Virtualized row focus is preserved by TanStack Virtual's overscan
// window (default 10) — a focused row goes out-of-view the browser scrolls
// but remains mounted until it passes the overscan boundary. axe runs only
// against mounted DOM (33-RESEARCH §Data surfaces), so off-screen row coverage
// is out of scope here. Reference: react-virtual v3 docs, "Keeping focused
// rows rendered".

export function TableBody({ table, tableContainerRef }: TableBodyProps) {
  // A11Y-03: read the same URL-backed drill contract the toolbar/breadcrumb
  // use so the Escape key pops exactly one level via router.push (Phase 32-01).
  // Reading useDrillDown directly here avoids threading a new prop through
  // data-table.tsx (Plan 02 file-ownership lock).
  const { navigateToLevel } = useDrillDown();

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    // Dense default — matches --table-row-height-dense (32px). Sparse (40px)
    // would need dynamic estimate wired to the container's data-density attr;
    // deferred to the density-toggle UI phase (see 26-CONTEXT Deferred Ideas).
    estimateSize: () => 32,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  // A11Y-03: drill handlers + current level are threaded through TanStack's
  // `meta` (same channel DrillableCell reads from). Keyboard binding is
  // additive to the mouse path; both end up calling the same callback.
  const meta = table.options.meta as TableDrillMeta | undefined;
  const drillLevel = meta?.drillLevel ?? 'root';

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr>
          <td style={{ height: paddingTop }} />
        </tr>
      )}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];

        // A11Y-03 row-level drill target + up-level target derived from the
        // current drill level:
        //   root    → Enter drills into the row's partner
        //   partner → Enter drills into the row's batch; Escape pops to root
        //   batch   → rows are read-only; Escape pops to partner
        // Matches the same drill handler DrillableCell already invokes; this
        // keyboard path is additive and does NOT replace the cell button.
        let onRowDrill: (() => void) | undefined;
        let parentLevel: DrillLevel | null = null;
        if (drillLevel === 'root' && meta?.onDrillToPartner) {
          const partner = getPartnerName(row.original);
          if (partner) onRowDrill = () => meta.onDrillToPartner!(partner);
          // No parent — root is top-level.
        } else if (drillLevel === 'partner' && meta?.onDrillToBatch) {
          const batch = getBatchName(row.original);
          const partner = getPartnerName(row.original) ?? undefined;
          if (batch) onRowDrill = () => meta.onDrillToBatch!(batch, partner);
          parentLevel = 'root';
        } else if (drillLevel === 'batch') {
          // Read-only rows — no drill, but Escape pops back to partner.
          parentLevel = 'partner';
        }

        const isDrillable = Boolean(onRowDrill);
        const hasParent = parentLevel !== null;
        const isKeyboardTarget = isDrillable || hasParent;

        return (
          <tr
            key={row.id}
            tabIndex={isKeyboardTarget ? 0 : undefined}
            onKeyDown={
              isKeyboardTarget
                ? (e) => {
                    // A11Y-03: only fire on direct <tr> focus — ignore when
                    // focus is inside a child button (DrillableCell's inner
                    // <button> already handles Enter). This guard is what
                    // prevents double-firing when a keyboard user lands on
                    // the inner link instead of the row chrome.
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' && onRowDrill) {
                      e.preventDefault();
                      onRowDrill();
                    } else if (e.key === 'Escape' && parentLevel) {
                      e.preventDefault();
                      navigateToLevel(parentLevel);
                    }
                  }
                : undefined
            }
            className="focus-glow-within h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg"
          >
            {row.getVisibleCells().map((cell) => {
              const pinningStyles = getCommonPinningStyles(cell.column);
              const cellMeta = cell.column.columnDef.meta as { type?: string } | undefined;
              const isNumeric = cellMeta?.type ? isNumericType(cellMeta.type) : false;
              return (
                <td
                  key={cell.id}
                  style={{
                    ...pinningStyles,
                    width: cell.column.getSize(),
                    minWidth: cell.column.getSize(),
                  }}
                  className={`overflow-hidden text-ellipsis whitespace-nowrap px-[var(--row-padding-x)] py-[var(--row-padding-y)] ${isNumeric ? 'text-body-numeric text-right' : 'text-body'}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? '\u2014'}
                </td>
              );
            })}
          </tr>
        );
      })}
      {paddingBottom > 0 && (
        <tr>
          <td style={{ height: paddingBottom }} />
        </tr>
      )}
    </tbody>
  );
}
