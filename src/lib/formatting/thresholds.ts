/**
 * Threshold configuration for conditional formatting / outlier detection.
 *
 * Defines low and high bounds for key percentage columns. When a value
 * falls outside these bounds, the FormattedCell component applies a
 * subtle background tint and shows a tooltip with the reason.
 */

export interface ThresholdConfig {
  low?: { value: number; reason: string };
  high?: { value: number; reason: string };
}

export interface ThresholdResult {
  isLow: boolean;
  isHigh: boolean;
  reason: string | null;
}

/**
 * Threshold definitions keyed by Snowflake column name.
 * Values are in 0-1 range to match raw Snowflake data (e.g. 0.05 = 5%).
 */
export const COLUMN_THRESHOLDS: Record<string, ThresholdConfig> = {
  PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: {
    low: { value: 0.05, reason: 'Penetration rate below 5% threshold' },
    high: { value: 0.50, reason: 'Penetration rate above 50% — unusually high' },
  },
  PENETRATION_RATE_CONFIRMED_ONLY: {
    low: { value: 0.05, reason: 'Confirmed penetration rate below 5% threshold' },
    high: { value: 0.50, reason: 'Confirmed penetration rate above 50% — unusually high' },
  },
  OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED: {
    low: { value: 0.10, reason: 'SMS open rate below 10% threshold' },
    high: { value: 0.60, reason: 'SMS open rate above 60% — unusually high' },
  },
  OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED: {
    low: { value: 0.05, reason: 'Email open rate below 5% threshold' },
    high: { value: 0.40, reason: 'Email open rate above 40% — unusually high' },
  },
  RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: {
    low: { value: 0.03, reason: 'First-time conversion rate below 3% threshold' },
    high: { value: 0.25, reason: 'First-time conversion rate above 25% — unusually high' },
  },
  OUTBOUND_SMS_CLICK_RATE_FROM_OPENED: {
    low: { value: 0.02, reason: 'SMS click rate below 2% threshold' },
    high: { value: 0.30, reason: 'SMS click rate above 30% — unusually high' },
  },
  OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED: {
    low: { value: 0.01, reason: 'Email click rate below 1% threshold' },
    high: { value: 0.20, reason: 'Email click rate above 20% — unusually high' },
  },
  OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED: {
    low: { value: 0.10, reason: 'Outbound phone verify rate below 10% threshold' },
    high: { value: 0.50, reason: 'Outbound phone verify rate above 50% — unusually high' },
  },
  INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED: {
    low: { value: 0.10, reason: 'Inbound phone verify rate below 10% threshold' },
    high: { value: 0.50, reason: 'Inbound phone verify rate above 50% — unusually high' },
  },
};

/** Check a value against a threshold config and return the result */
export function checkThreshold(value: number, config: ThresholdConfig): ThresholdResult {
  if (config.low && value < config.low.value) {
    return { isLow: true, isHigh: false, reason: config.low.reason };
  }

  if (config.high && value > config.high.value) {
    return { isLow: false, isHigh: true, reason: config.high.reason };
  }

  return { isLow: false, isHigh: false, reason: null };
}

/** Look up a threshold config by column key */
export function getThreshold(columnKey: string): ThresholdConfig | undefined {
  return COLUMN_THRESHOLDS[columnKey];
}
