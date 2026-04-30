/**
 * Starter view configurations for the partnerships use case.
 *
 * Seeded on first load to give users immediate value without
 * manual configuration. Each view targets a common analysis pattern.
 */

import type { VisibilityState } from '@tanstack/react-table';
import type { SavedView } from './types';
import { COLUMN_CONFIGS } from '@/lib/columns/config';

/** Build a visibility map with only the specified columns visible. */
function buildVisibility(visibleKeys: string[]): VisibilityState {
  const visibleSet = new Set(visibleKeys);
  const state: VisibilityState = {};
  for (const col of COLUMN_CONFIGS) {
    state[col.key] = visibleSet.has(col.key);
  }
  return state;
}

/** Identity columns shared across all starter views. */
const IDENTITY = [
  'PARTNER_NAME',
  'LENDER_ID',
  'BATCH',
  'ACCOUNT_TYPE',
  'BATCH_AGE_IN_MONTHS',
];

/**
 * Returns the 3 default starter views.
 *
 * Uses hardcoded UUIDs for reproducibility across sessions.
 */
export function getDefaultViews(): SavedView[] {
  const now = Date.now();

  return [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Financial Overview',
      createdAt: now,
      isDefault: true,
      snapshot: {
        sorting: [{ id: 'TOTAL_AMOUNT_PLACED', desc: true }],
        columnVisibility: buildVisibility([
          ...IDENTITY,
          'TOTAL_ACCOUNTS',
          'TOTAL_AMOUNT_PLACED',
          'AVG_AMOUNT_PLACED',
          'MEDIAN_AMOUNT_PLACED',
          'TOTAL_ACCOUNTS_WITH_PAYMENT',
          'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
          'TOTAL_COLLECTED_LIFE_TIME',
          'COLLECTION_AFTER_3_MONTH',
          'COLLECTION_AFTER_6_MONTH',
          'COLLECTION_AFTER_12_MONTH',
        ]),
        columnOrder: [
          ...IDENTITY,
          'TOTAL_ACCOUNTS',
          'TOTAL_AMOUNT_PLACED',
          'AVG_AMOUNT_PLACED',
          'MEDIAN_AMOUNT_PLACED',
          'TOTAL_ACCOUNTS_WITH_PAYMENT',
          'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
          'TOTAL_COLLECTED_LIFE_TIME',
          'COLLECTION_AFTER_3_MONTH',
          'COLLECTION_AFTER_6_MONTH',
          'COLLECTION_AFTER_12_MONTH',
        ],
        columnFilters: {},
        dimensionFilters: {},
        columnSizing: {},
        chartsExpanded: true,
        comparisonVisible: false,
        activePreset: 'finance',
        chartState: {
          type: 'collection-curve',
          version: 2,
          metric: 'amount',
          hiddenBatches: [],
          showAverage: true,
          showAllBatches: false,
        },
      },
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Outreach Performance',
      createdAt: now - 1, // Slightly earlier so Financial Overview sorts first
      isDefault: true,
      snapshot: {
        sorting: [{ id: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED', desc: true }],
        columnVisibility: buildVisibility([
          ...IDENTITY,
          'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED',
          'PENETRATED_ACCOUNTS_CONFIRMED_ONLY',
          'PENETRATED_ACCOUNTS_POSSIBLE_ONLY',
          'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
          'PENETRATION_RATE_CONFIRMED_ONLY',
          'PENETRATION_RATE_POSSIBLE_ONLY',
          'TOTAL_CONVERTED_ACCOUNTS',
          'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
          'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
          'OUTBOUND_SMS_CLICK_RATE_FROM_OPENED',
          'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
          'OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED',
          'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
          'INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
        ]),
        columnOrder: [
          ...IDENTITY,
          'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED',
          'PENETRATED_ACCOUNTS_CONFIRMED_ONLY',
          'PENETRATED_ACCOUNTS_POSSIBLE_ONLY',
          'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
          'PENETRATION_RATE_CONFIRMED_ONLY',
          'PENETRATION_RATE_POSSIBLE_ONLY',
          'TOTAL_CONVERTED_ACCOUNTS',
          'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
          'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
          'OUTBOUND_SMS_CLICK_RATE_FROM_OPENED',
          'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
          'OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED',
          'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
          'INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
        ],
        columnFilters: {},
        dimensionFilters: {},
        columnSizing: {},
        chartsExpanded: false,
        comparisonVisible: false,
        activePreset: 'outreach',
      },
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'New Batches',
      createdAt: now - 2, // Slightly earlier
      isDefault: true,
      snapshot: {
        sorting: [{ id: 'BATCH_AGE_IN_MONTHS', desc: false }],
        columnVisibility: buildVisibility([
          ...IDENTITY,
          'TOTAL_ACCOUNTS',
          'TOTAL_ACCOUNTS_WITH_PLANS',
          'RESOLVED_ACCOUNTS',
          'TOTAL_AMOUNT_PLACED',
          'AVG_AMOUNT_PLACED',
          'AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT',
          'AVG_DAYS_BETWEEN_FIRST_DELINQUENCY_AND_ASSIGNMENT',
          'AVG_DAYS_BETWEEN_ORIGINATION_AND_ASSIGNMENT',
        ]),
        columnOrder: [
          ...IDENTITY,
          'TOTAL_ACCOUNTS',
          'TOTAL_ACCOUNTS_WITH_PLANS',
          'RESOLVED_ACCOUNTS',
          'TOTAL_AMOUNT_PLACED',
          'AVG_AMOUNT_PLACED',
          'AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT',
          'AVG_DAYS_BETWEEN_FIRST_DELINQUENCY_AND_ASSIGNMENT',
          'AVG_DAYS_BETWEEN_ORIGINATION_AND_ASSIGNMENT',
        ],
        columnFilters: {},
        dimensionFilters: {},
        columnSizing: {},
        chartsExpanded: false,
        comparisonVisible: false,
        activePreset: 'finance',
        chartState: {
          type: 'collection-curve',
          version: 2,
          metric: 'recoveryRate',
          hiddenBatches: [],
          showAverage: false,
          showAllBatches: false,
        },
      },
    },
  ];
}
