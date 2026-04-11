/**
 * Domain group definitions mapping all 61 columns into named groups.
 *
 * Groups are derived from the comment sections in config.ts.
 * Used by the column picker sidebar for organized display.
 */

import type { VisibilityState } from '@tanstack/react-table';
import { COLUMN_CONFIGS, IDENTITY_COLUMNS } from './config';

export interface ColumnGroup {
  key: string;
  name: string;
  columns: string[];
}

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    key: 'identity',
    name: 'Identity',
    columns: [
      'PARTNER_NAME',
      'LENDER_ID',
      'BATCH',
      'ACCOUNT_TYPE',
      'BATCH_AGE_IN_MONTHS',
    ],
  },
  {
    key: 'account-counts',
    name: 'Account Counts',
    columns: [
      'TOTAL_ACCOUNTS',
      'TOTAL_ACCOUNTS_WITH_PLANS',
      'RESOLVED_ACCOUNTS',
    ],
  },
  {
    key: 'financials',
    name: 'Financials',
    columns: [
      'TOTAL_AMOUNT_PLACED',
      'AVG_AMOUNT_PLACED',
      'MEDIAN_AMOUNT_PLACED',
    ],
  },
  {
    key: 'balance-bands',
    name: 'Balance Bands',
    columns: [
      'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_0_TO_500_DOLLAR',
      'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_0_TO_500_DOLLAR',
      'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_500_TO_1000_DOLLAR',
      'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_500_TO_1000_DOLLAR',
      'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_1000_TO_2000_DOLLAR',
      'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_1000_TO_2000_DOLLAR',
      'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_2000_TO_5000_DOLLAR',
      'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_2000_TO_5000_DOLLAR',
      'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_GREATER_THAN_5000_DOLLAR',
      'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_GREATER_THAN_5000_DOLLAR',
    ],
  },
  {
    key: 'timing',
    name: 'Timing',
    columns: [
      'AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT',
      'AVG_DAYS_BETWEEN_FIRST_DELINQUENCY_AND_ASSIGNMENT',
      'AVG_DAYS_BETWEEN_ORIGINATION_AND_ASSIGNMENT',
    ],
  },
  {
    key: 'credit',
    name: 'Credit',
    columns: ['AVG_EXPERIAN_CA_SCORE'],
  },
  {
    key: 'payments',
    name: 'Payments',
    columns: ['TOTAL_ACCOUNTS_WITH_PAYMENT', 'TOTAL_COLLECTED_LIFE_TIME'],
  },
  {
    key: 'collection-curves',
    name: 'Collection Curves',
    columns: [
      'COLLECTION_AFTER_1_MONTH',
      'COLLECTION_AFTER_2_MONTH',
      'COLLECTION_AFTER_3_MONTH',
      'COLLECTION_AFTER_4_MONTH',
      'COLLECTION_AFTER_5_MONTH',
      'COLLECTION_AFTER_6_MONTH',
      'COLLECTION_AFTER_7_MONTH',
      'COLLECTION_AFTER_8_MONTH',
      'COLLECTION_AFTER_9_MONTH',
      'COLLECTION_AFTER_10_MONTH',
      'COLLECTION_AFTER_11_MONTH',
      'COLLECTION_AFTER_12_MONTH',
      'COLLECTION_AFTER_15_MONTH',
      'COLLECTION_AFTER_18_MONTH',
      'COLLECTION_AFTER_21_MONTH',
      'COLLECTION_AFTER_24_MONTH',
      'COLLECTION_AFTER_30_MONTH',
      'COLLECTION_AFTER_36_MONTH',
      'COLLECTION_AFTER_48_MONTH',
      'COLLECTION_AFTER_60_MONTH',
    ],
  },
  {
    key: 'penetration',
    name: 'Penetration',
    columns: [
      'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED',
      'PENETRATED_ACCOUNTS_CONFIRMED_ONLY',
      'PENETRATED_ACCOUNTS_POSSIBLE_ONLY',
      'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
      'PENETRATION_RATE_CONFIRMED_ONLY',
      'PENETRATION_RATE_POSSIBLE_ONLY',
    ],
  },
  {
    key: 'conversion',
    name: 'Conversion',
    columns: [
      'TOTAL_CONVERTED_ACCOUNTS',
      'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
    ],
  },
  {
    key: 'digital-channels',
    name: 'Digital Channels',
    columns: [
      'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
      'OUTBOUND_SMS_CLICK_RATE_FROM_OPENED',
      'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
      'OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED',
      'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
      'INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
    ],
  },
];

/** Default visible columns: identity + key metrics (~15 columns) */
const DEFAULT_VISIBLE_EXTRA = new Set([
  'TOTAL_ACCOUNTS',
  'TOTAL_AMOUNT_PLACED',
  'AVG_AMOUNT_PLACED',
  'TOTAL_COLLECTED_LIFE_TIME',
  'TOTAL_ACCOUNTS_WITH_PAYMENT',
  'COLLECTION_AFTER_3_MONTH',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
]);

/**
 * Returns the default visibility state with identity + ~14 key columns visible.
 */
export function getDefaultVisibility(): VisibilityState {
  const identitySet = new Set(IDENTITY_COLUMNS);
  const state: VisibilityState = {};
  for (const col of COLUMN_CONFIGS) {
    state[col.key] = identitySet.has(col.key) || DEFAULT_VISIBLE_EXTRA.has(col.key);
  }
  return state;
}

/**
 * Returns all column keys in their natural config.ts order.
 */
export function getDefaultColumnOrder(): string[] {
  return COLUMN_CONFIGS.map((c) => c.key);
}
