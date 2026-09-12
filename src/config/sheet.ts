// Google Sheet identifiers and CSV export URL builder. SPEC 3.1.
// Network I/O itself lives only in src/data/fetchSheet.ts — this module is pure config.

export const SHEET_ID = '1BZahLYr5A1t4SIcLmg6fiHA74-3PPBWU7IWp_lMyy_U'

/** สำเนาของ ชีต2 — Section 1 (Social Listening) source tab. */
export const GID_SHEET2 = 842224166

/** Wide tab — Section 2 (ภัยอื่นๆ) + MCATT directory source, used by site 2. SPEC 3.3. */
export const GID_WIDE = 842224166

/**
 * Legacy tab used by site 1; fetched only if GID_WIDE fails.
 *
 * NOT a duplicate of GID_WIDE any more. SPEC 3.3 called the two "byte-identical"; that claim is
 * stale (docs/BUILD_NOTES.md → "The fallback gid is NO LONGER a duplicate"). This gid still serves
 * the OLD 84-column schema, so a fallback fetch DEGRADES rather than substitutes:
 *   · col 14 (สถานะผู้ก่อเหตุ) offers only 2 values instead of the 5-way patientStatus;
 *   · cols 74-76 (ปัจจัยเสี่ยง) are free text, and the risk factor 'มีการใช้สารเสพติดร่วมด้วย'
 *     has NO column at all in that layout — it counts 0 and parseSheet2's resolver console.warns
 *     (see RISK_KEYWORDS in config/keywords.ts, which deliberately gives it no keyword fallback
 *     rather than let it borrow a neighbouring column).
 * Parsers therefore resolve columns by HEADER NAME with the old names kept as aliases, and refuse
 * an index fallback that would land on a column another field owns.
 */
export const GID_WIDE_FALLBACK = 1523955266

/** Direct CSV export URL for a given sheet gid. SPEC 3.1. */
export function csvUrl(gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
}
