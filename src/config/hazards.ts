// Section 2 hazard types (wide-tab cols 41-46) and the ประเภทภัย filter dropdown. SPEC 3.3, 5.2.

export type HazardTypeKey =
  | 'biological'
  | 'chemical'
  | 'natural'
  | 'environmental'
  | 'transport'
  | 'security'

export interface HazardTypeDef {
  key: HazardTypeKey
  label: string
  colIndex: number
}

/** The 6 hazard-type flag columns, wide tab indexes 41..46. Order = pie/legend order. */
export const HAZARD_TYPES: HazardTypeDef[] = [
  { key: 'biological', label: 'ภัยทางชีวภาพ', colIndex: 41 },
  { key: 'chemical', label: 'ภัยสารเคมีและรังสี', colIndex: 42 },
  { key: 'natural', label: 'ภัยธรรมชาติ', colIndex: 43 },
  { key: 'environmental', label: 'ภัยทางสิ่งแวดล้อม', colIndex: 44 },
  { key: 'transport', label: 'ภัยจากอุบัติเหตุ (ขนส่ง)', colIndex: 45 },
  { key: 'security', label: 'ด้านความมั่นคง', colIndex: 46 },
]

/** Label used when a Section-2 row carries none of the 6 hazard flags. SPEC 3.3. */
export const HAZARD_UNSPECIFIED_LABEL = 'ภัยอื่นๆ (ไม่ระบุ)'

/**
 * ประเภทภัย filter dropdown values, in display order. SPEC 5.2.
 *
 * Labels are already Thai-only (review deck slide 10 — no English in any dropdown); FilterBar
 * keeps the English names as search aliases instead. 'Social Listening' stays as-is: it is the
 * proper name of the data source and of the section heading it filters to, not a gloss.
 *
 * Any change to the `key`s here MUST be made in the same commit as VALID_HAZARD_KEYS in
 * src/hooks/useFilterUrlSync.ts, or a shared link's '?type=' is silently dropped on restore.
 */
export const HAZARD_FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'social', label: 'Social Listening' },
  { key: 'hazards', label: 'ภัยอื่นๆ (รวม)' },
  { key: 'biological', label: 'ภัยชีวภาพ' },
  { key: 'chemical', label: 'ภัยเคมีและรังสี' },
  { key: 'natural', label: 'ภัยธรรมชาติ' },
  { key: 'environmental', label: 'ภัยสิ่งแวดล้อม' },
  { key: 'transport', label: 'อุบัติเหตุขนส่ง' },
  { key: 'security', label: 'ความมั่นคง' },
]
