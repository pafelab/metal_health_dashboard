// Fixed category display orders. SPEC 3.2 "Observed value sets" + SPEC 4.5 ("Category order
// follows the PDF list for each chart. Values in the data that are not in the list are appended
// after the fixed ones, never dropped."). countBy()/topN() (src/data/aggregate.ts) take one of
// these arrays as their optional `order` parameter.

export interface CategoryOrders {
  /** ระดับความรุนแรง (SLEvent.severityRaw / HazardEvent.severityRaw). Black listed first even
   *  though SPEC 3.2 observed no black rows yet — "black must still be supported". */
  /** Note: the wide tab (Section 2) has been observed with a typo variant 'สีีแดง' (extra ี)
   *  for at least one row — src/data/normalize.ts's severityOf() should match by substring
   *  (`.includes('ดำ')` / `.includes('แดง')` / `.includes('เหลือง')`, checked in that order so
   *  'ดำ' can't match inside another word) rather than exact string equality, the way the old
   *  site's own parsers do it. This order array is for a raw-text categorical count, if one is
   *  ever needed; severityCounts() should use the already-normalized `severity` enum field, not
   *  this array, and is unaffected by the typo either way. */
  severity: string[]
  /** ผู้ป่วยจิตเวช/อื่นๆ — SLEvent.patientGroup, 5 groups. */
  patientGroup: string[]
  /** การวินิจฉัยโรค psychiatric subset — SLEvent.diagnosis, 3 groups. */
  diagnosis: string[]
  /** การจำแนกผู้ป่วย — SLEvent.patientClass. */
  patientClass: string[]
  /** ประวัติการรักษา — SLEvent.treatmentHistory, 5 categories + 1 appended extra. */
  treatmentHistory: string[]
  /** การฆ่าตัวตาย, suicide subset only ('-' excluded as non-suicide) — SLEvent.suicide. */
  suicide: string[]
  /**
   * ประเภทผู้ป่วย — SLEvent.patientStatus (col 14 after the 2026-09-12 restructure), 5 statuses.
   * SEPARATE from `patientClass`, which stays the raw 2-value pre-refresh column.
   */
  patientStatus5: string[]
  /**
   * การประเมินกลุ่มผู้ป่วย — SLEvent.diagnosis (col 12) as the deck's slide-15 SEVEN groups, in
   * SHORT display form. SEPARATE from `diagnosis`, which is the 3-value psychiatric subset that
   * psychiatricDiagnosisCounts() pre-filters against: growing that array would silently turn its
   * 3-slice chart into a 7-slice one.
   */
  patientGroup7: string[]
  /**
   * ช่วงอายุวัย — SLEvent.suicideAgeGroup. The raw data spells the under-18 value without 'ปี';
   * normalize.ts's normSuicideAgeGroup() adds it so display and ordering agree (deck slide 20).
   */
  suicideAgeGroup: string[]
}

export const CATEGORY_ORDERS: CategoryOrders = {
  severity: ['สีดำ', 'สีแดง', 'สีเหลือง'],
  patientGroup: [
    'ไม่พบประวัติ',
    'มีประวัติใช้สารเสพติด',
    'ผู้ป่วยจิตเวช',
    'ผู้ป่วย SMI-V',
    'ข้อมูลไม่เพียงพอต่อการตรวจสอบ',
  ],
  diagnosis: [
    'ผู้ป่วยจิตเวช (Dx. F00-F99 ยกเว้น F10-F19)',
    'ผู้ป่วยจิตเวชใช้สารเสพติด (ยังไม่ได้รับ Dx. F10.XX-19.XX)',
    // Verified against docs/data/1683387958.csv col 12: the real cell has a double space
    // between "F10-F19" and "ยกเว้น" that survives a plain .trim() (it is not a leading/
    // trailing run) — SPEC 3.2's single-space transcription does not match the live data.
    'ผู้ป่วยจิตเวชจากการใช้สารเสพติด (ได้รับ Dx. F10-F19  ยกเว้น F17)',
  ],
  patientClass: ['ผู้ป่วยรายเก่า', 'ผู้ป่วยรายใหม่'],
  treatmentHistory: [
    'ไม่มีประวัติการรักษา',
    'มีประวัติการรักษาแต่ไม่มีข้อมูล',
    'โรงพยาบาลสังกัดกรมสุขภาพจิต',
    'โรงพยาบาลนอกสังกัดกรมสุขภาพจิต',
    'ข้อมูลไม่เพียงพอต่อการตรวจสอบข้อเท็จจริง',
    'อื่น ๆ',
  ],
  suicide: ['ฆ่าตัวตายสำเร็จ', 'ฆ่าตัวตายไม่สำเร็จ'],
  // Deck slide 13's denominator rule keys off the first FOUR of these; the fifth is excluded.
  // Order matches the deck's own listing (จิตเวช เก่า→ใหม่, สารเสพติด เก่า→ใหม่, then neither).
  patientStatus5: [
    'ผู้ป่วยจิตเวชรายเก่า',
    'ผู้ป่วยจิตเวชรายใหม่',
    'ผู้ใช้สารเสพติดรายเก่า',
    'ผู้ใช้สารเสพติดรายใหม่',
    'ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด',
  ],
  patientGroup7: [
    'ผู้ป่วยจิตเวช',
    'ผู้ป่วยจิตเวชใช้สารเสพติด',
    'ผู้ป่วยจิตเวชจากการใช้สารเสพติด',
    'ผู้ป่วย SMI-V',
    'มีประวัติใช้สารเสพติด',
    'ข้อมูลไม่เพียงพอต่อการตรวจสอบ',
    'ไม่พบประวัติ',
  ],
  suicideAgeGroup: ['ต่ำกว่า 18 ปี', '≥ 18 ปี'],
}

/**
 * The four ประเภทผู้ป่วย statuses that CAN carry a risk factor — the denominator for the risk
 * chart (deck slide 13: "จะหารแค่ ผู้ป่วยจิตเวชรายเก่า จิตเวชรายใหม่ ผู้ใช้สารเสพติดรายเก่า
 * ผู้ใช้สารเสพติดรายใหม่ จะไม่เอา ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด มาคิด"). 417 rows on
 * the 2026-09-12 fixture. Derived from patientStatus5 so the two can never drift apart.
 */
export const RISK_DENOMINATOR_STATUSES: string[] = CATEGORY_ORDERS.patientStatus5.slice(0, 4)

/**
 * Raw col-12 spellings → the deck's short display label. Only the three long `(Dx. …)` forms need
 * an entry; the other four are already short. Keys are written with SINGLE spaces and looked up
 * whitespace-insensitively (collapseWs), because the real cell for the third one carries a DOUBLE
 * space before 'ยกเว้น' (see the `diagnosis` note above — that double space is real data, not a
 * typo to fix). Any value missing from this map falls back to "text before the first ' ('".
 */
export const PATIENT_GROUP7_ALIASES: Record<string, string> = {
  'ผู้ป่วยจิตเวช (Dx. F00-F99 ยกเว้น F10-F19)': 'ผู้ป่วยจิตเวช',
  'ผู้ป่วยจิตเวชใช้สารเสพติด (ยังไม่ได้รับ Dx. F10.XX-19.XX)': 'ผู้ป่วยจิตเวชใช้สารเสพติด',
  'ผู้ป่วยจิตเวชจากการใช้สารเสพติด (ได้รับ Dx. F10-F19 ยกเว้น F17)': 'ผู้ป่วยจิตเวชจากการใช้สารเสพติด',
}
