/**
 * Column configuration for master_accounts.
 *
 * Curated subset of ~18 columns that a partnerships lead would care about
 * when drilling into account-level detail for a specific batch.
 * Follows the same ColumnConfig interface as config.ts.
 */

import type { ColumnConfig } from './config';

export const ACCOUNT_COLUMN_CONFIGS: ColumnConfig[] = [
  // --- Identity ---
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'BATCH', label: 'Batch', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'ACCOUNT_TYPE', label: 'Account Type', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'STATUS', label: 'Status', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },

  // --- Financial ---
  { key: 'TOTAL_BALANCE', label: 'Total Balance', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_COLLECTED_ON_ACCOUNT', label: 'Total Collected', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'AMOUNT_PLACED', label: 'Amount Placed', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Payment ---
  { key: 'PAYMENT_PLAN_STATE', label: 'Payment Plan', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_PAYMENTS', label: 'Total Payments', type: 'count', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Timing ---
  { key: 'ASSIGNMENT_DATE', label: 'Assignment Date', type: 'date', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'CHARGEOFF_DATE', label: 'Chargeoff Date', type: 'date', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Demographics ---
  { key: 'US_STATE', label: 'State', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Resolution / contact ---
  { key: 'RESOLUTION_STATUS', label: 'Resolution Status', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'HAS_EMAIL', label: 'Has Email', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'HAS_PHONE', label: 'Has Phone', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Balance band ---
  { key: 'BALANCE_BAND', label: 'Balance Band', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Credit ---
  { key: 'EXPERIAN_CA_SCORE', label: 'Experian Score', type: 'number', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Origination ---
  { key: 'DAYS_SINCE_ASSIGNMENT', label: 'Days Since Assignment', type: 'number', defaultVisible: true, nullDisplay: '\u2014', identity: false },
];

/** All account column keys for the API to fetch */
export const DEFAULT_ACCOUNT_COLUMNS = ACCOUNT_COLUMN_CONFIGS.map((c) => c.key);

/** Allow-list for SQL injection prevention */
export const ACCOUNT_ALLOWED_COLUMNS = new Set(ACCOUNT_COLUMN_CONFIGS.map((c) => c.key));

/** Identity column keys that appear in every view */
export const ACCOUNT_IDENTITY_COLUMNS = ACCOUNT_COLUMN_CONFIGS
  .filter((c) => c.identity)
  .map((c) => c.key);
