// Visual design tokens. SPEC 8.
// Deliberately NOT `as const`: ECharts option objects (`color: string[]`, gradient stop arrays,
// etc.) expect plain mutable `string[]`, not readonly tuples, so every array below is typed
// `string[]` rather than inferred as a readonly literal tuple.

export interface Palette {
  background: string
  card: string
  section1: string
  section2: string
  severity: { black: string; red: string; yellow: string; unknown: string }
  gender: { male: string; female: string; other: string }
  suicide: { success: string; fail: string }
  categorical: string[]
  gradients: { section1: string[]; section2: string[] }
}

export const PALETTE: Palette = {
  background: '#F5F7FB',
  card: '#FFFFFF',

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
}
