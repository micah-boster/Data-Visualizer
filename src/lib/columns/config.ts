/**
 * Column configuration for agg_batch_performance_summary.
 *
 * All 61 columns from Snowflake are defined here with types, labels,
 * and identity flags. The schema validator cross-references this against
 * the live Snowflake schema on first request.
 */

export interface ColumnConfig {
  key: string;           // Snowflake column name (uppercase)
  label: string;         // Display name
  type: 'text' | 'currency' | 'percentage' | 'count' | 'date' | 'number';
  defaultVisible: boolean;
  nullDisplay: string;   // Always em dash
  identity: boolean;     // True for columns that appear in every preset
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  // --- Identity columns (appear in every preset) ---
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'LENDER_ID', label: 'Lender ID', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'BATCH', label: 'Batch', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'ACCOUNT_TYPE', label: 'Account Type', type: 'text', defaultVisible: true, nullDisplay: '\u2014', identity: true },
  { key: 'BATCH_AGE_IN_MONTHS', label: 'Batch Age (Mo)', type: 'number', defaultVisible: true, nullDisplay: '\u2014', identity: true },

  // --- Account counts ---
  { key: 'TOTAL_ACCOUNTS', label: 'Total Accounts', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_ACCOUNTS_WITH_PLANS', label: 'Accounts w/ Plans', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'RESOLVED_ACCOUNTS', label: 'Resolved Accounts', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Placed balance / financial ---
  { key: 'TOTAL_AMOUNT_PLACED', label: 'Total Placed', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'AVG_AMOUNT_PLACED', label: 'Avg Placed', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'MEDIAN_AMOUNT_PLACED', label: 'Median Placed', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Balance bands: accounts ---
  { key: 'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_0_TO_500_DOLLAR', label: 'Accts $0-500', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_0_TO_500_DOLLAR', label: 'Placed $0-500', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_500_TO_1000_DOLLAR', label: 'Accts $500-1K', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_500_TO_1000_DOLLAR', label: 'Placed $500-1K', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_1000_TO_2000_DOLLAR', label: 'Accts $1K-2K', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_1000_TO_2000_DOLLAR', label: 'Placed $1K-2K', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_2000_TO_5000_DOLLAR', label: 'Accts $2K-5K', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_BETWEEN_2000_TO_5000_DOLLAR', label: 'Placed $2K-5K', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_GREATER_THAN_5000_DOLLAR', label: 'Accts $5K+', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_AMOUNT_PLACED_WITH_PLACED_BALANCE_GREATER_THAN_5000_DOLLAR', label: 'Placed $5K+', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Timing / days metrics ---
  { key: 'AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT', label: 'Avg Days Chargeoff-Assign', type: 'number', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'AVG_DAYS_BETWEEN_FIRST_DELINQUENCY_AND_ASSIGNMENT', label: 'Avg Days Delinq-Assign', type: 'number', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'AVG_DAYS_BETWEEN_ORIGINATION_AND_ASSIGNMENT', label: 'Avg Days Orig-Assign', type: 'number', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Credit score ---
  { key: 'AVG_EXPERIAN_CA_SCORE', label: 'Avg Experian Score', type: 'number', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Payment / collection ---
  { key: 'TOTAL_ACCOUNTS_WITH_PAYMENT', label: 'Accounts w/ Payment', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'TOTAL_COLLECTED_LIFE_TIME', label: 'Total Collected (Lifetime)', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Collection curves (monthly) ---
  { key: 'COLLECTION_AFTER_1_MONTH', label: 'Collected M1', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_2_MONTH', label: 'Collected M2', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_3_MONTH', label: 'Collected M3', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_4_MONTH', label: 'Collected M4', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_5_MONTH', label: 'Collected M5', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_6_MONTH', label: 'Collected M6', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_7_MONTH', label: 'Collected M7', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_8_MONTH', label: 'Collected M8', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_9_MONTH', label: 'Collected M9', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_10_MONTH', label: 'Collected M10', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_11_MONTH', label: 'Collected M11', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_12_MONTH', label: 'Collected M12', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_15_MONTH', label: 'Collected M15', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_18_MONTH', label: 'Collected M18', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_21_MONTH', label: 'Collected M21', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_24_MONTH', label: 'Collected M24', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_30_MONTH', label: 'Collected M30', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_36_MONTH', label: 'Collected M36', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_48_MONTH', label: 'Collected M48', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'COLLECTION_AFTER_60_MONTH', label: 'Collected M60', type: 'currency', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Penetration / outreach ---
  { key: 'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED', label: 'Penetrated (Poss+Conf)', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PENETRATED_ACCOUNTS_CONFIRMED_ONLY', label: 'Penetrated (Confirmed)', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PENETRATED_ACCOUNTS_POSSIBLE_ONLY', label: 'Penetrated (Possible)', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED', label: 'Penetration Rate (P+C)', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PENETRATION_RATE_CONFIRMED_ONLY', label: 'Penetration Rate (Conf)', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'PENETRATION_RATE_POSSIBLE_ONLY', label: 'Penetration Rate (Poss)', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Conversion ---
  { key: 'TOTAL_CONVERTED_ACCOUNTS', label: 'Converted Accounts', type: 'count', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS', label: 'First-Time Conversion Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },

  // --- Digital channel metrics ---
  { key: 'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED', label: 'SMS Open Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'OUTBOUND_SMS_CLICK_RATE_FROM_OPENED', label: 'SMS Click Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED', label: 'Email Open Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED', label: 'Email Click Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED', label: 'Outbound Phone Verify Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
  { key: 'INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED', label: 'Inbound Phone Verify Rate', type: 'percentage', defaultVisible: false, nullDisplay: '\u2014', identity: false },
];

/** All column keys for the API to fetch */
export const DEFAULT_COLUMNS = COLUMN_CONFIGS.map((c) => c.key);

/** Allow-list for SQL injection prevention */
export const ALLOWED_COLUMNS = new Set(COLUMN_CONFIGS.map((c) => c.key));

/** Identity column keys that appear in every preset */
export const IDENTITY_COLUMNS = COLUMN_CONFIGS
  .filter((c) => c.identity)
  .map((c) => c.key);
