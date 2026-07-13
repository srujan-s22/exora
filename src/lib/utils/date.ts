/**
 * Date formatting utilities.
 * All dates are displayed in IST (Asia/Kolkata) by default.
 */

const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a date to a human-readable string.
 * Example: "29 May 2026, 10:30 AM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  });
}

/**
 * Format a date only.
 * Example: "29 May 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
  });
}

/**
 * Format a time only.
 * Example: "10:30 AM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  });
}

/**
 * Get a relative time string.
 * Example: "2 hours ago", "in 3 days"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

/**
 * Get the start of today in the default timezone.
 */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
