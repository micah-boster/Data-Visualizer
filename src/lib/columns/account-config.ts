/**
 * Column configuration for master_accounts.
 *
 * Curated subset of columns that a partnerships lead would care about
 * when drilling into account-level detail for a specific batch.
 * Column names match the actual Snowflake master_accounts schema.
 */

import type { ColumnConfig } from './config';

export const ACCOUNT_COLUMN_CONFIGS: ColumnConfig[] = [
  // --- Identity ---
  { key: 'ACCOUNT_PUBLIC_ID', label: 'Account ID', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'BATCH', label: 'Batch', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'ACCOUNT_TYPE', label: 'Account Type', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'STATUS', label: 'Status', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },

  // --- Financial ---
  { key: 'TOTAL_BALANCE', label: 'Total Balance', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AT_PLACEMENT', label: 'Amount Placed', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AT_CHARGEOFF', label: 'Amount at Chargeoff', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_COLLECTED_ON_ACCOUNT', label: 'Total Collected', type: 'currency', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_PENDING_ON_ACCOUNT', label: 'Pending Amount', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Payment Plan ---
  { key: 'PAYMENT_PLAN_STATE', label: 'Payment Plan', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'ACTIVE_PAYMENT_PLAN', label: 'Active Plan', type: 'text', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PAYMENT_PLAN_COLLECTED_AMOUNT', label: 'Plan Collected', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PAYMENT_PLAN_REMAINING_BALANCE', label: 'Plan Remaining', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Timing ---
  { key: 'ASSIGNMENT_DATE', label: 'Assignment Date', type: 'date', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'CHARGE_OFF_DATE', label: 'Chargeoff Date', type: 'date', defaultVisible: true, nullDisplay: '\u2014', identity: false },
  { key: 'ORIGINATION_DATE', label: 'Origination Date', type: 'date', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'LAST_PAYMENT_DATE', label: 'Last Payment', type: 'date', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Demographics ---
  { key: 'US_STATE', label: 'State', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: false },

  // --- Status flags ---
  { key: 'ACTIVELY_COLLECTING', label: 'Actively Collecting', type: 'text', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'ACTIVE_DISPUTE', label: 'Active Dispute', type: 'text', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'CEASE_AND_DESIST', label: 'Cease & Desist', type: 'text', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Credit ---
  { key: 'CA_SCORE_1', label: 'Credit Score', type: 'number', defaultVisible: true, nullDisplay: '\u2014', identity: false },
];

/** All account column keys for the API to fetch */
export const DEFAULT_ACCOUNT_COLUMNS = ACCOUNT_COLUMN_CONFIGS.map((c) => c.key);

/** Allow-list for SQL injection prevention */
export const ACCOUNT_ALLOWED_COLUMNS = new Set(ACCOUNT_COLUMN_CONFIGS.map((c) => c.key));

/** Identity column keys that appear in every view */
export const ACCOUNT_IDENTITY_COLUMNS = ACCOUNT_COLUMN_CONFIGS
  .filter((c) => c.identity)
  .map((c) => c.key);
