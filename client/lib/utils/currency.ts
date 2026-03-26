/**
 * Currency formatting utilities.
 */

/**
 * Format a number as Indian Rupee currency
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Format a number as Indian Rupee currency with fallback for null/undefined
 */
export function formatCurrencyOrNA(amount: number | null | undefined): string {
  if (amount == null) return "N/A";
  return formatCurrency(amount);
}

/**
 * Parse a string to a number (for form inputs)
 */
export function parseCurrency(value: string): number {
  const parsed = Number(value.replace(/\D/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}
