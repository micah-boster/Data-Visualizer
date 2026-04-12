/**
 * Default column widths by data type.
 * Used by the ColumnDef builder to set initial column sizes.
 */

export const WIDTH_BY_TYPE: Record<string, number> = {
  text: 180,
  currency: 150,
  percentage: 150,
  count: 140,
  date: 130,
  number: 140,
};

/** Width for pinned identity columns */
export const IDENTITY_WIDTH = 160;
