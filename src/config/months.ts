// Thai month names and lookup table. SPEC 4.1.
// Same set of forms recognised by the old site's getMonthNum (docs/reference/site1/index.html:470-480):
// full name, abbreviated-with-dots, and the bare prefix used in `.includes()` checks there.
// Numeric forms ('1'..'12', '01'..'12') are handled by src/data/normalize.ts's parseMonth, not here.

/** Full Thai month names, index 0 = เดือน 1 (มกราคม). */
export const THAI_MONTHS: string[] = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

/** Abbreviated Thai month names ('ม.ค.'..'ธ.ค.'), used for trend labels ('ต.ค. 68'). */
export const MONTH_ABBR: string[] = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

/** Short un-dotted prefixes as used in the old site's substring match, e.g. s.includes('มกรา'). */
const MONTH_SHORT_PREFIX: string[] = [
  'มกรา',
  'กุมภา',
  'มีนา',
  'เมษา',
  'พฤษภา',
  'มิถุนา',
  'กรกฎา',
  'สิงหา',
  'กันยา',
  'ตุลา',
  'พฤศจิกา',
  'ธันวา',
]

/**
 * Full + abbreviated Thai month name -> 1..12. Exact-match dictionary; a normalizer
 * that needs the old site's substring / numeric fallback behaviour builds it on top of this.
 */
export const MONTH_LOOKUP: Record<string, number> = (() => {
  const lookup: Record<string, number> = {}
  THAI_MONTHS.forEach((name, i) => (lookup[name] = i + 1))
  MONTH_ABBR.forEach((name, i) => (lookup[name] = i + 1))
  MONTH_SHORT_PREFIX.forEach((name, i) => (lookup[name] = i + 1))
  return lookup
})()
