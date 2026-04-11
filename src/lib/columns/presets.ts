/**
 * Column preset definitions for the data table.
 *
 * Each preset is a TanStack Table VisibilityState (Record<string, boolean>)
 * that controls which columns are shown. Identity columns are included
 * in every preset automatically.
 */

import { COLUMN_CONFIGS, IDENTITY_COLUMNS } from './config';

type VisibilityState = Record<string, boolean>;

/**
 * Build a visibility state where only identity + specified columns are visible.
 */
function buildPreset(extraColumns: string[]): VisibilityState {
  const visible = new Set([...IDENTITY_COLUMNS, ...extraColumns]);
  const state: VisibilityState = {};
  for (const col of COLUMN_CONFIGS) {
    state[col.key] = visible.has(col.key);
  }
  return state;
}

/**
 * Build the "all visible" preset.
 */
function buildAllPreset(): VisibilityState {
  const state: VisibilityState = {};
  for (const col of COLUMN_CONFIGS) {
    state[col.key] = true;
  }
  return state;
}

export const PRESETS: Record<string, VisibilityState> = {
  finance: buildPreset([
    'TOTAL_ACCOUNTS',
    'TOTAL_AMOUNT_PLACED',
    'AVG_AMOUNT_PLACED',
    'TOTAL_COLLECTED_LIFE_TIME',
    'TOTAL_ACCOUNTS_WITH_PAYMENT',
    'COLLECTION_AFTER_3_MONTH',
    'COLLECTION_AFTER_6_MONTH',
    'COLLECTION_AFTER_12_MONTH',
  ]),
  outreach: buildPreset([
    'TOTAL_ACCOUNTS',
    'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED',
    'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
    'TOTAL_CONVERTED_ACCOUNTS',
    'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
    'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
    'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
    'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
  ]),
  all: buildAllPreset(),
};

/** Ordered preset names for the tab bar */
export const PRESET_NAMES = ['finance', 'outreach', 'all'] as const;

/** Default preset on first load */
export const DEFAULT_PRESET = 'finance';
