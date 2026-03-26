/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Format a number with ordinal suffix (e.g., 1 -> "1st", 2 -> "2nd")
 */
export function formatOrdinal(n: number): string {
  return `${n}${getOrdinalSuffix(n)}`;
}
