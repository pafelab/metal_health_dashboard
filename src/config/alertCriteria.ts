// UX-16 — the alert-criteria matrix transcribed from public/reference/alert_criteria.jpg so the
// criteria exist as real text (searchable, copyable, readable by assistive tech) instead of only
// as pixels. The image stays available as the source document.
//
// The sheet is a matrix: rows = ประเภทภัย, columns = the four alert levels. Wording is kept
// verbatim from the image; it matches the severity tooltips in src/config/severity.ts /
// docs/BUILD_NOTES.md ("Severity tooltips — VERBATIM"), which describe the same criteria.

export type AlertLevelKey = 'black' | 'red' | 'yellow' | 'green'

export interface AlertLevel {
  key: AlertLevelKey
  /** Short text label — the accessible substitute for the colour itself. */
  label: string
  /** Column heading, line 1 (verbatim). */
  headline: string
  /** Column heading, line 2 (verbatim) — the required response time / handling. */
  response: string
  /** Group heading the column sits under in the source sheet. */
  group: string
  /** Swatch colour (decorative — every level also carries its text label). */
  color: string
  /** Text colour that passes contrast on `color`, for the header cell. */
  onColor: string
}

export const ALERT_LEVELS: AlertLevel[] = [
  {
    key: 'black',
    label: 'ระดับสีดำ',
    headline: 'ข่าวความรุนแรงระดับสีดำ',
    response: 'ตอบสนองภายใน 1 ชั่วโมง',
    group: 'ทำระดับสี Alert พื้นที่',
    color: '#1E293B',
    onColor: '#FFFFFF',
  },
  {
    key: 'red',
    label: 'ระดับสีแดง',
    headline: 'ข่าวความรุนแรงระดับสีแดง',
    response: 'ตอบสนองภายใน 24 ชั่วโมง',
    group: 'ทำระดับสี Alert พื้นที่',
    color: '#E11D48',
    onColor: '#FFFFFF',
  },
  {
    key: 'yellow',
    label: 'ระดับสีเหลือง',
    headline: 'ข่าวความรุนแรงระดับสีเหลือง',
    response: 'ตอบสนองภายใน 72 ชั่วโมง',
    group: 'ทำระดับสี Alert พื้นที่',
    color: '#F59E0B',
    onColor: '#1E293B',
  },
  {
    key: 'green',
    label: 'ระดับสีเขียว',
    headline: 'ข่าวความรุนแรงระดับสีเขียว',
    response: 'รวบรวมวิเคราะห์ข่าว',
    group: 'ไม่ต้อง Alert จัดเก็บในระบบ',
    color: '#2DD4BF',
    onColor: '#134E4A',
  },
]

export interface AlertCriteriaRow {
  /** ประเภทภัย. The first row of the sheet has no hazard label (see `appliesToAll`). */
  hazard: string
  /** True for the unlabelled top row, which applies to every hazard type. */
  appliesToAll?: boolean
  /** Bullet list per level; an empty array means the sheet leaves that cell blank. */
  criteria: Record<AlertLevelKey, string[]>
}

export const ALERT_CRITERIA_ROWS: AlertCriteriaRow[] = [
  {
    hazard: 'ทุกประเภทภัย',
    appliesToAll: true,
    criteria: {
      black: [
        'เหตุการณ์ความสูญเสีย/โศกเศร้า ของคนในชาติ',
        'เหตุการณ์ที่ส่งผลกระทบด้านจิตใจ ในวงกว้าง',
      ],
      red: [],
      yellow: [],
      green: [],
    },
  },
  {
    hazard: 'ภัยจากมนุษย์',
    criteria: {
      black: [
        'เหตุการณ์กราดยิงหมู่ (Mass shooting)',
        'เหตุการณ์กราดยิงในโรงเรียน (School shooting)',
      ],
      red: [
        'ฆาตกรรมที่มีผู้ป่วยจิตเวชเป็นผู้ก่อเหตุหรือเป็นเหยื่อ',
        'ฆาตกรรมหรือการฆ่าตัวตายด้วยวิธี ที่แปลก/พบไม่บ่อย',
        'ฆ่าตัวตายหมู่/ฆ่ายกครัว',
        'ความรุนแรงที่เกิดจากผู้ป่วยจิตเวช หรือเหยื่อเป็นผู้ป่วยจิตเวช',
      ],
      yellow: [
        'ฆาตกรรมหรือความรุนแรงที่สงสัยว่า ผู้ก่อเหตุ/เหยื่อเป็นผู้ป่วยจิตเวช',
        'อุปทานหมู่',
        'พฤติกรรมฆ่าตัวตายแต่ไม่สำเร็จ',
        'พฤติกรรมฆ่าตัวตายที่รุนแรงผิดปกติ',
        'พฤติกรรมก่อความรุนแรงผิดปกติ ในกลุ่มเด็กเยาวชนที่เปราะบาง',
        'ประเด็นสุขภาพจิตที่สังคมให้ความสนใจ (>100,000 engagement)',
      ],
      green: [
        'การฆ่าตัวตายไม่มีเหตุสงสัยว่าผู้ก่อเหตุเป็นผู้ป่วยจิตเวช',
        'ความรุนแรงถึงแก่ชีวิต/ถูกทำร้ายได้รับบาดเจ็บสาหัส ไม่มีเหตุสงสัยว่าผู้ก่อเหตุหรือเหยื่อเป็นผู้ป่วยจิตเวช',
      ],
    },
  },
  {
    hazard: 'ภัยชีวภาพ',
    criteria: {
      black: [],
      red: [],
      yellow: [
        'เหตุการณ์ภัยจากโรคระบาดในมนุษย์หรือจากสัตว์ ที่ส่งผลกระทบต่อสุขภาพประชาชน และมีผู้เสียชีวิต',
      ],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
  {
    hazard: 'ภัยสารเคมีและรังสี',
    criteria: {
      black: [],
      red: [],
      yellow: [
        'เหตุการณ์สารเคมี วัตถุอันตราย หรือรังสีเกิดการรั่วไหล ระเบิด หรือไฟไหม้ มีผู้บาดเจ็บตั้งแต่ 10 รายขึ้นไป หรือเสียชีวิตตั้งแต่ 2 รายขึ้นไป หรือมีการอพยพประชาชนไปอยู่ศูนย์พักพิงชั่วคราว',
      ],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
  {
    hazard: 'ภัยธรรมชาติ',
    criteria: {
      black: [],
      red: [],
      yellow: [
        'เหตุการณ์อุทกภัยและดินโคลนถล่ม ภัยจากพายุหมุนเขตร้อน (วาตภัย) ภัยจากแผ่นดินไหวและอาคารถล่ม ภัยจากคลื่นสึนามิ และภัยจากอัคคีภัย มีประชาชนได้รับผลกระทบ และมีผู้บาดเจ็บ สูญหาย หรือเสียชีวิต มีการอพยพประชาชนไปอยู่ศูนย์พักพิงชั่วคราว',
      ],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
  {
    hazard: 'ภัยทางสิ่งแวดล้อม',
    criteria: {
      black: [],
      red: [],
      yellow: [
        'เหตุการณ์ภัยแล้ง ภัยจากความร้อน ภัยจากไฟป่าและหมอกควัน ฝุ่นละอองขนาดเล็ก ไฟไหม้บ่อขยะ ภัยหนาว มีประชาชนได้รับผลกระทบทางสุขภาพ เสียชีวิต หรือเข้ารับการรักษา ตั้งแต่ 10 รายขึ้นไป',
      ],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
  {
    hazard: 'ภัยจากอุบัติเหตุเนื่องจากคมนาคมและขนส่ง',
    criteria: {
      black: [],
      red: [
        'อุบัติภัยหมู่ ที่มีผู้เสียชีวิต ณ จุดเกิดเหตุตั้งแต่ 10 รายขึ้นไป หรือมีผู้บาดเจ็บรวมกับผู้เสียชีวิตตั้งแต่ 15 รายขึ้นไป หรือมีผู้สูญหาย',
      ],
      yellow: [],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
  {
    hazard: 'ภัยด้านความมั่นคง',
    criteria: {
      black: [],
      red: [],
      yellow: [
        'ภัยจากการก่อวินาศกรรม ภัยจากทุ่นระเบิดกับระเบิด ภัยทางอากาศ ภัยความไม่สงบเขตชายแดน ภัยสงคราม ที่มีผู้บาดเจ็บ สูญหาย เสียชีวิต หรือมีการอพยพประชาชนไปอยู่ศูนย์พักพิงชั่วคราว',
        'เหตุการณ์ภัยจากการชุมนุมประท้วง ที่มีการรวมกลุ่มตั้งแต่ 1,000 คนขึ้นไป หรือมีผู้ได้รับบาดเจ็บ หรือเสียชีวิตจากเหตุการณ์',
        'เหตุการณ์ด้านความมั่นคงที่มีความเสี่ยงต่อการอพยพประชาชนไปอยู่ศูนย์พักพิงชั่วคราว',
      ],
      green: ['ไม่มีผู้ได้รับผลกระทบ'],
    },
  },
]

/** Note printed under the sheet (verbatim, minus the surrounding ** emphasis marks). */
export const ALERT_CRITERIA_FOOTNOTE =
  'หรือประเด็นอื่นๆ ที่อาจจะไม่เข้าเกณฑ์ตามที่กำหนดไว้ แต่สังคม/ผู้บริหารให้ความสนใจ'

/** Shown where a level has no criteria for a hazard type in the source sheet. */
export const ALERT_CRITERIA_EMPTY = 'ไม่มีเกณฑ์ในระดับนี้'
