/**
 * Conditional Formatting Utilities
 *
 * Provides functions to evaluate formatting rules and apply styles to cells/rows
 */

export interface FormattingRule {
  id: string;
  name: string;
  column_name: string;
  is_active: boolean;
  priority: number;
  condition_type: ConditionType;
  condition_value: any;
  format_config: FormatConfig;
  apply_to_row: boolean;
}

export type ConditionType =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'between'
  | 'in_list';

export interface FormatConfig {
  background?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  icon?: string;
}

/**
 * Evaluates a condition against a cell value
 *
 * @param value - The cell value to check
 * @param conditionType - Type of condition to evaluate
 * @param conditionValue - Value to compare against
 * @returns Whether the condition is met
 */
export function evaluateCondition(
  value: any,
  conditionType: ConditionType,
  conditionValue: any
): boolean {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return conditionType === 'is_empty';
  }

  const stringValue = String(value).toLowerCase();
  const numValue = Number(value);

  switch (conditionType) {
    case 'equals':
      return String(value) === String(conditionValue);

    case 'not_equals':
      return String(value) !== String(conditionValue);

    case 'greater_than':
      return !isNaN(numValue) && numValue > Number(conditionValue);

    case 'less_than':
      return !isNaN(numValue) && numValue < Number(conditionValue);

    case 'greater_or_equal':
      return !isNaN(numValue) && numValue >= Number(conditionValue);

    case 'less_or_equal':
      return !isNaN(numValue) && numValue <= Number(conditionValue);

    case 'contains':
      return stringValue.includes(String(conditionValue).toLowerCase());

    case 'not_contains':
      return !stringValue.includes(String(conditionValue).toLowerCase());

    case 'starts_with':
      return stringValue.startsWith(String(conditionValue).toLowerCase());

    case 'ends_with':
      return stringValue.endsWith(String(conditionValue).toLowerCase());

    case 'is_empty':
      return stringValue === '' || stringValue === 'null' || stringValue === 'undefined';

    case 'is_not_empty':
      return stringValue !== '' && stringValue !== 'null' && stringValue !== 'undefined';

    case 'between':
      if (!conditionValue?.min || !conditionValue?.max) return false;
      return !isNaN(numValue) &&
             numValue >= Number(conditionValue.min) &&
             numValue <= Number(conditionValue.max);

    case 'in_list':
      if (!Array.isArray(conditionValue)) return false;
      return conditionValue.some(v => String(v).toLowerCase() === stringValue);

    default:
      return false;
  }
}

/**
 * Applies formatting rules to a row of data
 *
 * @param row - The data row
 * @param rules - Array of formatting rules
 * @returns Object mapping column names to their formatting
 */
export function applyFormattingRules(
  row: Record<string, any>,
  rules: FormattingRule[]
): {
  cellFormats: Record<string, FormatConfig>;
  rowFormat: FormatConfig | null;
} {
  const cellFormats: Record<string, FormatConfig> = {};
  let rowFormat: FormatConfig | null = null;

  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules]
    .filter(r => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const value = row[rule.column_name];

    if (evaluateCondition(value, rule.condition_type, rule.condition_value)) {
      if (rule.apply_to_row) {
        // Apply to entire row (only first matching rule)
        if (!rowFormat) {
          rowFormat = rule.format_config;
        }
      } else {
        // Apply to specific cell (only first matching rule per column)
        if (!cellFormats[rule.column_name]) {
          cellFormats[rule.column_name] = rule.format_config;
        }
      }
    }
  }

  return { cellFormats, rowFormat };
}

/**
 * Converts FormatConfig to React inline styles
 *
 * @param format - The format configuration
 * @returns React CSSProperties object
 */
export function formatToStyles(format: FormatConfig): React.CSSProperties {
  return {
    backgroundColor: format.background,
    color: format.text,
    fontWeight: format.bold ? 'bold' : undefined,
    fontStyle: format.italic ? 'italic' : undefined,
  };
}

/**
 * Generates CSS class names from FormatConfig
 *
 * @param format - The format configuration
 * @returns Space-separated CSS class names
 */
export function formatToClassNames(format: FormatConfig): string {
  const classes: string[] = [];

  if (format.bold) classes.push('font-bold');
  if (format.italic) classes.push('italic');

  return classes.join(' ');
}
