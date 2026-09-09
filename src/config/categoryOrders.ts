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
}
