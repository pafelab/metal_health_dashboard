// Google Sheet identifiers and CSV export URL builder. SPEC 3.1.
// Network I/O itself lives only in src/data/fetchSheet.ts — this module is pure config.

export const SHEET_ID = '1BZahLYr5A1t4SIcLmg6fiHA74-3PPBWU7IWp_lMyy_U'

/** สำเนาของ ชีต2 — Section 1 (Social Listening) source tab. */
export const GID_SHEET2 = 842224166

/** Wide tab — Section 2 (ภัยอื่นๆ) + MCATT directory source, used by site 2. SPEC 3.3. */
export const GID_WIDE = 842224166

/** Same CSV as GID_WIDE (byte-identical), used by site 1; fetched as a fallback if GID_WIDE fails. */
export const GID_WIDE_FALLBACK = 1523955266

/** Direct CSV export URL for a given sheet gid. SPEC 3.1. */
export function csvUrl(gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
}
