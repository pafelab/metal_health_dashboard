// Timeliness score levels. SPEC 6.4. Colours resolved to hex (rather than Tailwind family names)
// since tailwind.config.js cannot be edited here and dynamic `text-${color}-600` class names
// would not survive Tailwind's class-detection/purge.

export interface TimelinessLevelDef {
  /** Row applies when percent >= min (rows are checked highest-min-first; the last row, with
   *  min = -Infinity, is the "< 70.00" catch-all). */
  min: number
  level: string
  color: string
  icon: string
}

/** SPEC 6.4 table, ordered highest threshold first. */
export const TIMELINESS_LEVELS: TimelinessLevelDef[] = [
  { min: 90, level: '0.5', color: '#059669', icon: 'Laugh' }, // emerald
  { min: 85, level: '0.4', color: '#2563EB', icon: 'Smile' }, // blue
  { min: 80, level: '0.3', color: '#D97706', icon: 'Meh' }, // amber
  { min: 75, level: '0.2', color: '#EA580C', icon: 'Frown' }, // orange
  { min: 70, level: '0.1', color: '#E11D48', icon: 'Annoyed' }, // rose
  { min: -Infinity, level: '0.0', color: '#DC2626', icon: 'Skull' }, // red, < 70.00
]
