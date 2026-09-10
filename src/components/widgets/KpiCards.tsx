// SPEC 6.1 #3 and 6.2 #1 — severity KPI cards. Not wrapped in <Card>: it sits directly under the
// section header as its own colored grid, exactly like the old sites (docs/reference/site1,
// lines ~176-241 and ~333-390). Wording on every card is kept verbatim from the old site per
// SPEC ("PDF p.3 says keep the words") and SEVERITY_META in '@/config' supplies the tooltip text,
// which differs between Section 1 and Section 2.
//
// Audit UX-12: the card is no longer one big role="button" that only reveals a definition. The
// definition moved to an explicit info button (SeverityInfoButton) and the card's primary action
// is now a labelled drill-down into the matching event list.

import { Globe, AlertTriangle, ListFilter } from 'lucide-react'
import { SEVERITY_META } from '@/config'
import type { Severity } from '@/types'
import type { SeverityMetaEntry } from '@/config'
import SeverityInfoButton from '@/components/widgets/SeverityInfoButton'

export interface KpiCardsProps {
  section: 1 | 2
  counts: { black: number; red: number; yellow: number; total: number }
  /** Filter the section's event table down to this severity (audit UX-12). */
  onDrillDown?: (sev: Severity) => void
  /** Severity the event table is currently filtered by, so the card can show it as active. */
  activeSeverity?: Severity | null
}

/** SLA line shown under every severity number — identical wording in both sections on the old
 *  sites, independent of the tooltip body text. */
const RESPONSE_TIME: Partial<Record<Severity, string>> = {
  black: 'ตอบสนองใน 1 ชม.',
  red: 'ตอบสนองใน 24 ชม.',
  yellow: 'ตอบสนองใน 72 ชม.',
}

// Text tones are one step darker than the fill they sit on so normal-size text clears 4.5:1
// (audit UX-05): amber-700 on amber-50 ≈ 4.9:1, rose-700 on rose-50 ≈ 5.8:1.
const SEVERITY_STYLE: Record<'black' | 'red' | 'yellow', { bg: string; border: string; text: string; num: string; active: string }> = {
  black: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', num: 'text-slate-800', active: 'bg-slate-800 text-white hover:bg-slate-900' },
  red: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', num: 'text-rose-700', active: 'bg-rose-700 text-white hover:bg-rose-800' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', num: 'text-amber-700', active: 'bg-amber-700 text-white hover:bg-amber-800' },
}

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

function pct(n: number, denom: number): string {
  return denom > 0 ? ((n / denom) * 100).toFixed(1) : '0.0'
}

function SeverityCard({
  entry,
  count,
  total,
  onDrillDown,
  isActive,
}: {
  entry: SeverityMetaEntry
  count: number
  total: number
  onDrillDown?: (sev: Severity) => void
  isActive: boolean
}) {
  const key = entry.key as 'black' | 'red' | 'yellow'
  const style = SEVERITY_STYLE[key]
  const response = RESPONSE_TIME[key]

  return (
    <div className={`relative flex flex-col items-center justify-start rounded-card border ${style.bg} ${style.border} p-5 text-center shadow-card`}>
      <SeverityInfoButton entry={entry} accentBorderClassName={style.border} className="absolute right-1 top-1" />

      <p className={`mb-2 flex items-center gap-2 text-sm font-bold ${style.text}`}>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
        ระดับสี{entry.label}
      </p>
      <h3 className={`my-1 text-kpi font-black ${style.num}`}>
        {fmt(count)}
        {/* Audit UX-11/UX-05: name the base of the percentage and darken it to a readable tone. */}
        <span className="ml-1 text-sm font-bold text-slate-600">({pct(count, total)}% ของทั้งหมด)</span>
      </h3>
      {response && (
        <p className={`mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm ${style.text}`}>{response}</p>
      )}

      {onDrillDown && (
        <button
          type="button"
          aria-pressed={isActive}
          onClick={() => onDrillDown(entry.key)}
          className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
            isActive ? `border-transparent ${style.active}` : `border-current bg-white/80 hover:bg-white ${style.text}`
          }`}
        >
          <ListFilter size={14} aria-hidden="true" />
          {isActive ? `กำลังกรองระดับสี${entry.label}` : `ดู ${fmt(count)} เหตุการณ์ระดับสี${entry.label}`}
        </button>
      )}
    </div>
  )
}

export default function KpiCards({ section, counts, onDrillDown, activeSeverity = null }: KpiCardsProps) {
  const meta = section === 1 ? SEVERITY_META.section1 : SEVERITY_META.section2
  // 700-step fill so white text on it clears 4.5:1 (audit UX-05: white on #EA580C is only 3.56:1).
  const accentBg = section === 1 ? 'bg-s1-700' : 'bg-s2-700'
  const TotalIcon = section === 1 ? Globe : AlertTriangle

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className={`relative flex flex-col justify-center overflow-hidden rounded-card ${accentBg} p-5 text-white shadow-card`}>
        <TotalIcon className="absolute -bottom-4 -right-4 h-28 w-28 opacity-20" strokeWidth={1.5} aria-hidden="true" />
        <p className="z-10 mb-1 text-xs font-bold text-white">เหตุการณ์ตรวจสอบทั้งหมด</p>
        <div className="z-10 flex items-baseline gap-2">
          <h3 className="text-kpi font-black">{fmt(counts.total)}</h3>
          <span className="text-xs font-bold text-white">เหตุการณ์</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-3">
        <SeverityCard entry={meta.black} count={counts.black} total={counts.total} onDrillDown={onDrillDown} isActive={activeSeverity === 'black'} />
        <SeverityCard entry={meta.red} count={counts.red} total={counts.total} onDrillDown={onDrillDown} isActive={activeSeverity === 'red'} />
        <SeverityCard entry={meta.yellow} count={counts.yellow} total={counts.total} onDrillDown={onDrillDown} isActive={activeSeverity === 'yellow'} />
      </div>
    </div>
  )
}
