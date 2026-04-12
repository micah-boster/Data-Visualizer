/**
 * Formatting module — re-exports all formatters and utilities.
 */

export {
  formatCurrency,
  formatPercentage,
  formatCount,
  formatNumber,
  isNumericType,
  getFormatter,
} from './numbers';

export {
  formatDate,
  formatTimestamp,
} from './dates';

export {
  COLUMN_THRESHOLDS,
  checkThreshold,
  getThreshold,
} from './thresholds';

export type {
  ThresholdConfig,
  ThresholdResult,
} from './thresholds';

export {
  computeDeviation,
  formatDeviationTooltip,
  HEATMAP_COLUMNS,
} from './deviation';

export type {
  DeviationResult,
} from './deviation';
