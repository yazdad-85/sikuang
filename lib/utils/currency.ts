/**
 * Format number to Indonesian Rupiah currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number to Indonesian number format without currency symbol
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Parse Indonesian formatted currency string to number
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}