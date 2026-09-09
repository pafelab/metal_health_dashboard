// SPEC 6.1 #3 and 6.2 #1 — severity KPI cards. Not wrapped in <Card>: it sits directly under the
// section header as its own colored grid, exactly like the old sites (docs/reference/site1,
// lines ~176-241 and ~333-390). Wording on every card is kept verbatim from the old site per
// SPEC ("PDF p.3 says keep the words") and SEVERITY_META in '@/config' supplies the tooltip text,
// which differs between Section 1 and Section 2.

import { useId, useState } from 'react'
import { Globe, AlertTriangle } from 'lucide-react'
import { SEVERITY_META } from '@/config'
import type { Severity } from '@/types'
import type { SeverityMetaEntry } from '@/config'

export interface KpiCardsProps {
  section: 1 | 2
  counts: { black: number; red: number; yellow: number; total: number }
}

/** SLA line shown under every severity number — identical wording in both sections on the old
 *  sites, independent of the tooltip body text. */
const RESPONSE_TIME: Partial<Record<Severity, string>> = {
  black: 'ตอบสนองใน 1 ชม.',
  red: 'ตอบสนองใน 24 ชม.',
  yellow: 'ตอบสนองใน 72 ชม.',
}

const SEVERITY_STYLE: Record<'black' | 'red' | 'yellow', { bg: string; border: string; text: string; num: string }> = {
  black: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', num: 'text-slate-800' },
  red: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', num: 'text-rose-600' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', num: 'text-amber-500' },
}

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

function pct(n: number, denom: number): string {
  return denom > 0 ? ((n / denom) * 100).toFixed(1) : '0.0'
}

function SeverityCard({ entry, count, total }: { entry: SeverityMetaEntry; count: number; total: number }) {
  const [open, setOpen] = useState(false)
  const key = entry.key as 'black' | 'red' | 'yellow'
  const style = SEVERITY_STYLE[key]
  const response = RESPONSE_TIME[key]

  const tooltipId = useId()

  return (
    <div
      tabIndex={0}
      role="button"
      aria-describedby={entry.tooltipLines.length > 0 ? tooltipId : undefined}
      className={`relative flex flex-col items-center justify-center rounded-card border ${style.bg} ${style.border} p-5 text-center shadow-card outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400`}
      // Hover (mouse) and touch (tap) both need to open this, but a touch tap in most browsers
      // also synthesizes mouseenter + focus + click right after pointerdown; toggling from BOTH
      // onPointerDown and a follow-up onClick would flip it straight back shut. So there's no
      // onClick handler at all — real pointer hover opens/closes on enter/leave, a touch
      // pointerdown toggles by itself, and keyboard focus/blur (Tab) is the remaining way in.
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setOpen(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setOpen(false)
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') setOpen((o) => !o)
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      {open && entry.tooltipLines.length > 0 && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-3 w-72 -translate-x-1/2 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-cardHover"
        >
          <div className={`mb-2 flex items-center gap-2 border-b pb-2 ${style.border}`}>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <h4 className="text-sm font-bold text-slate-800">{entry.tooltipTitle}</h4>
          </div>
          <ul className="space-y-1.5 text-xs font-medium text-slate-600">
            {entry.tooltipLines.map((line) => (
              <li key={line}>{entry.bullet ?? '- '}{line}</li>
            ))}
          </ul>
        </div>
      )}

      <p className={`mb-2 flex items-center gap-2 text-sm font-bold ${style.text}`}>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
        ระดับสี{entry.label}
      </p>
      <h3 className={`my-1 text-kpi font-black ${style.num}`}>
        {fmt(count)}
        <span className="ml-1 text-sm font-bold text-slate-400">({pct(count, total)}%)</span>
      </h3>
      {response && (
        <p className={`mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm ${style.text}`}>{response}</p>
      )}
    </div>
  )
}

export default function KpiCards({ section, counts }: KpiCardsProps) {
  const meta = section === 1 ? SEVERITY_META.section1 : SEVERITY_META.section2
  const accentBg = section === 1 ? 'bg-s1-600' : 'bg-s2-600'
  const accentTint = section === 1 ? 'text-s1-100' : 'text-s2-100'
  const TotalIcon = section === 1 ? Globe : AlertTriangle

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className={`relative flex flex-col justify-center overflow-hidden rounded-card ${accentBg} p-5 text-white shadow-card`}>
        <TotalIcon className="absolute -bottom-4 -right-4 h-28 w-28 opacity-20" strokeWidth={1.5} />
        <p className={`z-10 mb-1 text-xs font-bold ${accentTint}`}>เหตุการณ์ตรวจสอบทั้งหมด</p>
        <div className="z-10 flex items-baseline gap-2">
          <h3 className="text-kpi font-black">{fmt(counts.total)}</h3>
          <span className={`text-xs font-bold ${accentTint}`}>เหตุการณ์</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-3">
        <SeverityCard entry={meta.black} count={counts.black} total={counts.total} />
        <SeverityCard entry={meta.red} count={counts.red} total={counts.total} />
        <SeverityCard entry={meta.yellow} count={counts.yellow} total={counts.total} />
      </div>
    </div>
  )
}
