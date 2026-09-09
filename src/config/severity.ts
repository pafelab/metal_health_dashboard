import type { Severity } from '@/types'

/** One severity level's display metadata + tooltip content. */
export interface SeverityMetaEntry {
  key: Severity
  label: string
  color: string
  tooltipTitle: string
  tooltipLines: string[]
  /** Marker prepended to each tooltipLines item when rendered. Defaults to '- ' (the old sites'
   *  literal bullet); set to '' for entries whose source text has no bullet at all (Section 2
   *  black's single body line, Section 2 red's intro + arrow lines — see KpiCards.tsx). */
  bullet?: string
}

type SeverityMetaSection = Record<Severity, SeverityMetaEntry>

/**
 * Severity KPI / badge metadata for both sections. Tooltip text copied VERBATIM from
 * docs/BUILD_NOTES.md ("Severity tooltips — VERBATIM from the old sites"), which wins over
 * SPEC.md 6.1/6.2 where the wording differs. Section 1 and Section 2 have different wording.
 */
export const SEVERITY_META: { section1: SeverityMetaSection; section2: SeverityMetaSection } = {
  section1: {
    black: {
      key: 'black',
      label: 'ดำ',
      color: '#1E293B',
      tooltipTitle: 'ระดับสีดำ (รุนแรงมาก – ฉุกเฉินภายใน 1 ชม.)',
      tooltipLines: [
        'เหตุรุนแรงระดับวิกฤต เช่นยิงกราด (Mass shooting)',
        'ก่อการร้าย / จับตัวประกันมีผู้เสียชีวิตจำนวนมาก / เหตุสะเทือนขวัญ',
      ],
    },
    red: {
      key: 'red',
      label: 'แดง',
      color: '#E11D48',
      tooltipTitle: 'ระดับสีแดง (รุนแรงสูง – ตอบสนองภายใน 24 ชม.)',
      tooltipLines: [
        'ก่อเหตุรุนแรงชัดเจน เช่น ฆาตกรรม/ทำร้ายร่างกาย',
        'ฆ่าตัวตายสำเร็จ (โดยเฉพาะคนมีชื่อเสียง / กระทบสังคมสูง)',
        'พฤติกรรมเสี่ยงซ้ำ มีอาวุธ หรือมีแนวโน้มทำร้ายผู้อื่น',
      ],
    },
    yellow: {
      key: 'yellow',
      label: 'เหลือง',
      color: '#F59E0B',
      tooltipTitle: 'ระดับสีเหลือง (รุนแรงปานกลาง – ตอบสนองภายใน 72 ชม.)',
      tooltipLines: [
        'มีแนวโน้มใช้ความรุนแรง (ยังไม่เกิดเหตุหนัก)',
        'ข่มขู่ คุกคาม หรือมีความคิดฆ่าตัวตาย',
        'พยายามฆ่าตัวตายแต่ไม่สำเร็จ',
        'ข่าวเริ่มเป็นกระแส (engagement สูง)',
      ],
    },
    unknown: {
      key: 'unknown',
      label: 'ไม่ระบุ',
      color: '#94A3B8',
      tooltipTitle: 'ไม่ระบุระดับความรุนแรง',
      tooltipLines: [],
    },
  },
  section2: {
    black: {
      key: 'black',
      label: 'ดำ',
      color: '#1E293B',
      tooltipTitle: 'ระดับสีดำ',
      tooltipLines: ['เหตุการณ์ที่ส่งผลกระทบด้านจิตใจในวงกว้าง (ตอบสนองใน 1 ชม.)'],
      bullet: '',
    },
    red: {
      key: 'red',
      label: 'แดง',
      color: '#E11D48',
      tooltipTitle: 'ระดับสีแดง (รุนแรงมาก – ตอบสนองใน 24 ชม.)',
      tooltipLines: [
        'ใช้กับ "อุบัติเหตุคมนาคม/ขนส่ง" เป็นหลัก อุบัติเหตุใหญ่',
        '→ เสียชีวิต ≥ 10 คน  → หรือบาดเจ็บ ≥ 15 คน  → หรือมีผู้สูญหายจำนวนมาก',
      ],
      bullet: '',
    },
    yellow: {
      key: 'yellow',
      label: 'เหลือง',
      color: '#F59E0B',
      tooltipTitle: 'ระดับสีเหลือง (รุนแรงปานกลาง-สูง – ตอบสนองใน 72 ชม.)',
      tooltipLines: [
        'มีผลกระทบต่อสุขภาพหรือความปลอดภัยของประชาชน แล้วมีผู้บาดเจ็บ / ผู้ป่วย / ผู้เสียชีวิต (แต่ยังไม่ถึงขั้นวิกฤตสูงสุด)',
        'เหตุการณ์ขยายวงกว้าง ไม่ใช่เฉพาะจุดเล็ก ๆ อาจมีการอพยพ / ระบบบริการหยุดชะงัก / สิ่งแวดล้อมเสียหาย ต้องมีการเฝ้าระวังและบริหารจัดการอย่างใกล้ชิด',
      ],
    },
    unknown: {
      key: 'unknown',
      label: 'ไม่ระบุ',
      color: '#94A3B8',
      tooltipTitle: 'ไม่ระบุระดับความรุนแรง',
      tooltipLines: [],
    },
  },
}
