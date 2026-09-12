// Visual design tokens. SPEC 8.
// Deliberately NOT `as const`: ECharts option objects (`color: string[]`, gradient stop arrays,
// etc.) expect plain mutable `string[]`, not readonly tuples, so every array below is typed
// `string[]` rather than inferred as a readonly literal tuple.

export interface Palette {
  background: string
  card: string
  /** Secondary text on white — #475569, ~7.5:1 (UX-05; slate-400 fails 4.5:1). */
  textSecondary: string
  /** Lightest text still passing 4.5:1 on white — #64748B (UX-05). */
  textMuted: string
  section1: string
  section2: string
  severity: { black: string; red: string; yellow: string; unknown: string }
  gender: { male: string; female: string; other: string }
  suicide: { success: string; fail: string }
  categorical: string[]
  gradients: { section1: string[]; section2: string[] }
  /** 5-way ประเภทผู้ป่วย donut, in CATEGORY_ORDERS.patientStatus5 order (= STATUS5_COLORS). */
  patientStatus5: string[]
  /** 7-group การประเมินกลุ่มผู้ป่วย bar, in CATEGORY_ORDERS.patientGroup7 order (= GROUP7_COLORS). */
  patientGroup7: string[]
  /** 5-step light→dark map legend ramps (= MAP_TIERS_SECTION1 / MAP_TIERS_SECTION2). */
  mapTiers: { section1: string[]; section2: string[] }
}

/**
 * ประเภทผู้ป่วย (5-way donut), in CATEGORY_ORDERS.patientStatus5 order. Deliberately SHADE-PAIRED
 * rather than five unrelated hues: the two จิตเวช statuses share a violet and the two
 * สารเสพติด statuses share the Section-1 orange, with the lighter tone for รายเก่า and the
 * stronger one for รายใหม่, so the เก่า/ใหม่ split reads as a split and not as four categories.
 * The fifth (ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด) is a deliberate neutral — it is excluded
 * from the risk denominator and should not compete for attention.
 */
export const STATUS5_COLORS: string[] = [
  '#C4B5FD', // ผู้ป่วยจิตเวชรายเก่า — violet-300
  '#7C3AED', // ผู้ป่วยจิตเวชรายใหม่ — violet-600
  '#FDBA74', // ผู้ใช้สารเสพติดรายเก่า — orange-300
  '#EA580C', // ผู้ใช้สารเสพติดรายใหม่ — orange-600 (Section-1 primary)
  '#CBD5E1', // ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด — slate-300, neutral
]

/**
 * การประเมินกลุ่มผู้ป่วย (7-group bar), in CATEGORY_ORDERS.patientGroup7 order. The three
 * psychiatric groups are one violet ramp (they are variants of the same thing), SMI-V takes the
 * severity rose, the substance-history group the Section-1 orange, "ข้อมูลไม่เพียงพอ" a neutral
 * slate and "ไม่พบประวัติ" a teal — so the two "no psychiatric finding" bars never read as
 * severity colours. All seven are used as bar/slice FILLS, not as text.
 */
export const GROUP7_COLORS: string[] = [
  '#7C3AED', // ผู้ป่วยจิตเวช — violet-600
  '#A78BFA', // ผู้ป่วยจิตเวชใช้สารเสพติด — violet-400
  '#C4B5FD', // ผู้ป่วยจิตเวชจากการใช้สารเสพติด — violet-300
  '#E11D48', // ผู้ป่วย SMI-V — rose-600 (same red as ระดับสีแดง)
  '#EA580C', // มีประวัติใช้สารเสพติด — orange-600
  '#94A3B8', // ข้อมูลไม่เพียงพอต่อการตรวจสอบ — slate-400
  '#0D9488', // ไม่พบประวัติ — teal-600
]

/**
 * Map legend ramp, Section 1 (5 tiers, light → dark).
 *
 * Tier 1 is a SATURATED light tint (orange-200), not a near-white wash. It used to be #FFF1E6,
 * which measured ~1.1:1 against the map's zero/no-data grey #EDF1F6 — and on the live data ~68 of
 * 77 provinces sit in that 1-15 tier, so the map's single most common distinction ("some events"
 * vs "none") was invisible and the legend showed two all-but-identical swatches. The separation
 * from the zero grey is now carried by chroma as much as by lightness: every tier is a real
 * orange, while zero stays the neutral slate base and remains the LIGHTEST fill on the map, so
 * "darker = more" still holds across the whole scale.
 */
export const MAP_TIERS_SECTION1: string[] = ['#FED7AA', '#FDBA74', '#FB923C', '#EA580C', '#9A3412']

/** Map legend ramp, Section 2 (5 tiers, light → dark). Same tier semantics — and the same reason
 *  for starting at blue-200 rather than a near-white blue-50 — as SECTION1. */
export const MAP_TIERS_SECTION2: string[] = ['#BFDBFE', '#93C5FD', '#60A5FA', '#2563EB', '#1E3A8A']

export const PALETTE: Palette = {
  background: '#F5F7FB',
  card: '#FFFFFF',

  // Text tokens (UX-05). Any TEXT drawn in slate-400 (#94A3B8) misses the 4.5:1 minimum on
  // white; these two are the replacements. Icons may still use the lighter slate.
  textSecondary: '#475569',
  textMuted: '#64748B',

  // Section 1 (Social Listening) primary — orange family.
  section1: '#EA580C',
  // Section 2 (ภัยอื่นๆ) primary — blue family.
  section2: '#2563EB',

  severity: {
    black: '#1E293B',
    red: '#E11D48',
    yellow: '#F59E0B',
    unknown: '#94A3B8',
  },

  gender: {
    male: '#2563EB', // ชาย
    female: '#EC4899', // หญิง
    other: '#94A3B8', // อื่นๆ / ไม่ระบุ
  },

  suicide: {
    success: '#FCA5A5', // ฆ่าตัวตายสำเร็จ
    fail: '#6EE7B7', // ฆ่าตัวตายไม่สำเร็จ
  },

  // Pastel categorical set for pies/donuts/roses with several slices.
  categorical: [
    '#FDBA74', // orange-300
    '#93C5FD', // blue-300
    '#6EE7B7', // emerald-300
    '#FCA5A5', // red-300
    '#C4B5FD', // violet-300
    '#FDE68A', // amber-300
    '#67E8F9', // cyan-300
    '#F9A8D4', // pink-300
    '#A5B4FC', // indigo-300
    '#BEF264', // lime-300
  ],

  // Gradient stops for the trend area fill and "มีมิติ" donuts.
  gradients: {
    section1: ['#FDBA74', '#EA580C'],
    section2: ['#93C5FD', '#2563EB'],
  },

  // One source of truth: these reference the standalone consts above, so importing either
  // PALETTE.patientStatus5 or STATUS5_COLORS can never give two different ramps.
  patientStatus5: STATUS5_COLORS,
  patientGroup7: GROUP7_COLORS,
  mapTiers: {
    section1: MAP_TIERS_SECTION1,
    section2: MAP_TIERS_SECTION2,
  },
}
