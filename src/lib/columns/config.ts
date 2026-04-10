/**
 * Column configuration for agg_batch_performance_summary.
 *
 * Column list will be expanded after first Snowflake connection reveals full schema.
 * These starter columns are based on known fields from research.
 * After connecting, run schema validation to discover the actual 61+ columns.
 */

export interface ColumnConfig {
  key: string;           // Snowflake column name (uppercase)
  label: string;         // Display name
  type: 'text' | 'currency' | 'percentage' | 'count' | 'date' | 'number';
  defaultVisible: boolean;
  nullDisplay: string;   // Always em dash
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'BATCH_NAME', label: 'Batch', type: 'text', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'TOTAL_BALANCE', label: 'Total Balance', type: 'currency', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'RECOVERY_RATE', label: 'Recovery Rate', type: 'percentage', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'ACCOUNT_COUNT', label: 'Accounts', type: 'count', defaultVisible: true, nullDisplay: '\u2014' },
  // Additional columns will be added here after schema discovery.
  // The schema validator will report unexpected columns from Snowflake
  // that should be added to this config.
];

export const DEFAULT_COLUMNS = COLUMN_CONFIGS
  .filter((c) => c.defaultVisible)
  .map((c) => c.key);

export const ALLOWED_COLUMNS = new Set(COLUMN_CONFIGS.map((c) => c.key));
