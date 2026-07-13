/**
 * Currency formatting utilities.
 * All prices are stored in paise (1 INR = 100 paise) to avoid floating-point issues.
 */

const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

/**
 * Format an amount in paise to a display string.
 * Example: 15000 → "₹150.00"
 */
export function formatCurrency(amountInPaise: number): string {
  const amountInRupees = amountInPaise / 100;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInRupees);
}

/**
 * Format a compact currency (no decimals for whole numbers).
 * Example: 15000 → "₹150", 15050 → "₹150.50"
 */
export function formatCurrencyCompact(amountInPaise: number): string {
  const amountInRupees = amountInPaise / 100;
  const hasDecimal = amountInRupees % 1 !== 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amountInRupees);
}

/**
 * Convert rupees to paise.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise to rupees.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
