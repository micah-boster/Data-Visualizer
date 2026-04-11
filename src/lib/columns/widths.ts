/**
 * Default column widths by data type.
 * Used by the ColumnDef builder to set initial column sizes.
 */

export const WIDTH_BY_TYPE: Record<string, number> = {
  text: 180,
  currency: 130,
  percentage: 100,
  count: 100,
  date: 120,
  number: 110,
};

/** Width for pinned identity columns */
export const IDENTITY_WIDTH = 160;
