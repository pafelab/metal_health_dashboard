// Age bands. SPEC 4.3 (agreed design — overrides the PDF's overlapping "25-45"/"45-60" wording,
// per docs/BUILD_NOTES.md "Age bands").

export interface AgeBandDef {
  key: string
  label: string
  color: string
  test: (age: number | null) => boolean
}

/**
 * Six bands, in display order. ไม่ระบุอายุ is last and grey — every other event falls into
 * exactly one of the numeric bands, so all six sum to the total events (SPEC 4.3).
 */
export const AGE_BANDS: AgeBandDef[] = [
  { key: 'under18', label: 'ต่ำกว่า 18', color: '#38BDF8', test: (age) => age !== null && age < 18 },
  { key: '18-25', label: '18–25', color: '#2563EB', test: (age) => age !== null && age >= 18 && age <= 25 },
  { key: '26-45', label: '26–45', color: '#7C3AED', test: (age) => age !== null && age >= 26 && age <= 45 },
  { key: '46-60', label: '46–60', color: '#DB2777', test: (age) => age !== null && age >= 46 && age <= 60 },
  { key: 'over60', label: 'มากกว่า 60', color: '#EA580C', test: (age) => age !== null && age > 60 },
  { key: 'unknown', label: 'ไม่ระบุอายุ', color: '#94A3B8', test: (age) => age === null },
]
