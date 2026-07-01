/**
 * Date Utilities - Safely parse and format dates without timezone issues
 */

/**
 * Parse a YYYY-MM-DD date string as local time (not UTC)
 * new Date("2026-05-01") interprets as UTC, which causes timezone issues
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a date string (YYYY-MM-DD) to a localized date format
 */
export function formatLocalDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat(
    "en-US",
    options || {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

/**
 * Calculate days remaining until expiry from today (local time)
 */
export function getDaysUntilExpiry(expiryStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = parseLocalDate(expiryStr);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getTodayLocal(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a date X days from today as YYYY-MM-DD in local timezone
 */
export function getDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
