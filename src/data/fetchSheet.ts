// The only network I/O in src/data — everything else here is a pure function over already
// downloaded rows. SPEC 3.1.

import Papa from 'papaparse'
import { csvUrl, GID_SHEET2, GID_WIDE, GID_WIDE_FALLBACK } from '@/config'

/** Downloads and parses one sheet tab as an array of raw string rows (row 0 = header). */
export function fetchCsv(gid: number): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(csvUrl(gid), {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err),
    })
  })
}

/**
 * Fetches ชีต2 and the wide tab in parallel. The wide tab falls back to GID_WIDE_FALLBACK
 * (byte-identical CSV, SPEC 3.3) if the primary gid fails.
 */
export async function fetchAllData(): Promise<{ sheet2: string[][]; wide: string[][] }> {
  const [sheet2, wide] = await Promise.all([
    fetchCsv(GID_SHEET2),
    fetchCsv(GID_WIDE).catch(() => fetchCsv(GID_WIDE_FALLBACK)),
  ])
  return { sheet2, wide }
}
