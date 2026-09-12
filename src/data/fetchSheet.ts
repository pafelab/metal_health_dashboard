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
 * Fetches ชีต2 and the wide tab in parallel, falling back to GID_WIDE_FALLBACK if the primary
 * gid fails.
 *
 * The fallback is a DEGRADED source, not an equivalent one: SPEC 3.3's "byte-identical" claim is
 * stale — that gid still serves the OLD 84-column schema (see GID_WIDE_FALLBACK in config/sheet.ts
 * and docs/BUILD_NOTES.md). On that layout col 14 collapses to 2 values and the risk factor
 * 'มีการใช้สารเสพติดร่วมด้วย' has no column at all, so it counts 0 and parseSheet2 console.warns.
 * Note GID_SHEET2 === GID_WIDE today, so the branch below means one failed fetch degrades BOTH
 * datasets, not just Section 2.
 */
export async function fetchAllData(): Promise<{ sheet2: string[][]; wide: string[][] }> {
  if (GID_SHEET2 === GID_WIDE) {
    const data = await fetchCsv(GID_WIDE).catch(() => fetchCsv(GID_WIDE_FALLBACK))
    return { sheet2: data, wide: data }
  }
  const [sheet2, wide] = await Promise.all([
    fetchCsv(GID_SHEET2),
    fetchCsv(GID_WIDE).catch(() => fetchCsv(GID_WIDE_FALLBACK)),
  ])
  return { sheet2, wide }
}
