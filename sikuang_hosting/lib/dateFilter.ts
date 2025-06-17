/**
 * Utility functions for date filtering based on tanggal_transaksi.
 */

/**
 * Returns the start and end date strings (YYYY-MM-DD) for filtering based on year, month, and optional date range.
 * If tanggalMulai and tanggalAkhir are provided, they take precedence.
 * Otherwise, returns the start and end dates for the given year and month.
 * 
 * @param tahun number - year (e.g., 2024)
 * @param bulan number - month (1-12)
 * @param tanggalMulai string | null - optional start date in YYYY-MM-DD
 * @param tanggalAkhir string | null - optional end date in YYYY-MM-DD
 * @returns { startDate: string, endDate: string }
 */
export function getDateRangeFilter(tahun: number, bulan: number, tanggalMulai?: string | null, tanggalAkhir?: string | null) {
  if (tanggalMulai && tanggalAkhir) {
    return {
      startDate: tanggalMulai,
      endDate: tanggalAkhir,
    };
  }
  const startDate = new Date(tahun, bulan - 1, 1);
  const endDate = new Date(tahun, bulan, 0);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Validates that tanggalMulai is before or equal to tanggalAkhir.
 * Returns true if valid, false otherwise.
 * 
 * @param tanggalMulai string
 * @param tanggalAkhir string
 * @returns boolean
 */
export function validateDateRange(tanggalMulai: string, tanggalAkhir: string) {
  if (!tanggalMulai || !tanggalAkhir) return true;
  const start = new Date(tanggalMulai);
  const end = new Date(tanggalAkhir);
  return start <= end;
}
