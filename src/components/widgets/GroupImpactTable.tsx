// SPEC 6.1 widget 9 — ผู้เสียชีวิตและบาดเจ็บ จำแนกตามกลุ่มผู้ป่วย (review deck แก้งับ.pdf slide 17).
//
// SLIDE 17 CHANGED THE DEFAULT VIEW. The card used to open on a two-column mini-bar TABLE; the
// deck asks for a side-by-side comparison instead ("ทำเป็นแผนภูมิแท่งเปรียบเทียบดีกว่า น่าจะอ่านง่าย
// เห็นภาพมากกว่า"), so the default is now the grouped COLUMN chart and every column carries both
// its count and its percent ("ใส่เปอเซ็นไว้ ด้านบน และก็ จำนวน ด้วยนะ"). The table view stays on the
// switcher as the accessible equivalent of the plot (UX-13) — it is no longer the default, not
// gone. The caller passes a NEW widgetId for that reason: reusing the old one would restore a
// returning user's persisted 'table' choice and undo the slide's whole point.
//
// The rows are now the SEVEN deck groups from impactByGroup7() (col 12), not the five of
// impactByPatientGroup() (col 13) — the caller chooses; this component only renders what it is
// given, and the 'บาดเจ็บ/เสียชีวิต per group' semantics are identical either way.
//
// UX-11: each percentage is a share of its own column total (deaths / injured summed over the
// groups), never of the other column and never of the event count. The base is still named in the
// series names, the tooltip and the table headers — deck slide 17 deletes only the long paragraph
// that used to repeat it a fourth time under the card ("ตัดออก"), not the base itself. A 0 total
// prints '—' instead of a misleading 0.0%.
//
// UX-11 (base scope): the aggregate skips every event whose กลุ่มผู้ป่วย cell is blank or '-'
// (src/data/aggregate.ts), so the column totals are NOT "all deaths / injured in the filter scope"
// — they are only those recorded against a patient group. The base is therefore never called
// 'ทั้งหมด': it is 'ในเหตุการณ์ที่ระบุกลุ่มผู้ป่วย', which reconciles with the rows shown.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { BarChart3, BarChartHorizontal, HeartCrack, Table2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '@/components/layout/Card'
import { useChartType } from '@/hooks/useChartType'
import type { ChartType } from '@/types'
import { PALETTE } from '@/config'
import { FONT, LABEL_SIZE, wrapThaiLabel } from '@/components/charts/chartOptions'

export interface GroupImpactTableProps {
  widgetId: string
  rows: { group: string; deaths: number; injured: number }[]
}

/** One entry of the little icon switcher rendered in a card header. */
export interface SwitchOption {
  type: ChartType
  icon: LucideIcon
  label: string
}

const SWITCH_OPTIONS: SwitchOption[] = [
  { type: 'bar', icon: BarChart3, label: 'แท่งตั้ง' },
  { type: 'hbar', icon: BarChartHorizontal, label: 'แท่งนอน' },
  { type: 'table', icon: Table2, label: 'มุมมองตาราง' },
]

/** The population each column's percentage is taken over — only casualties recorded against a
 *  patient group, never every casualty in the filter scope (UX-11). */
const DEATH_BASE_FULL = 'ผู้เสียชีวิตในเหตุการณ์ที่ระบุกลุ่มผู้ป่วย'
const INJURED_BASE_FULL = 'ผู้บาดเจ็บในเหตุการณ์ที่ระบุกลุ่มผู้ป่วย'
/** Same base, shortened for the cramped legend / bar labels. */
const DEATH_BASE_SHORT = 'ผู้เสียชีวิตที่ระบุกลุ่ม'
const INJURED_BASE_SHORT = 'ผู้บาดเจ็บที่ระบุกลุ่ม'

/** '12.3%' — or '—' when the column total is 0, so "no casualties" never reads as 0.0% (UX-11). */
function pctText(n: number, total: number): string {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—'
}

/** '123 (45.6%)' — SPEC 4.5's table convention, with the UX-11 '—' rule for an empty column. */
function fmtCountPct(n: number, total: number): string {
  return `${n} (${pctText(n, total)})`
}

/** '45.6% (123)' — the same pair in the order the BAR labels use. Deck slide 17 puts the percent
 *  first ("ใส่เปอเซ็นไว้ ด้านบน และก็ จำนวน ด้วยนะ"), which the column view honours by stacking
 *  percent over count; the horizontal view has one line, so it leads with the percent instead of
 *  flipping the pair round and formatting the identical datum two different ways. */
function fmtPctCount(n: number, total: number): string {
  return `${pctText(n, total)} (${n})`
}

export default function GroupImpactTable({ widgetId, rows }: GroupImpactTableProps) {
  // Deck slide 17: the grouped column chart is the default view now, not the table.
  const [type, setType] = useChartType(widgetId, 'bar', ['bar', 'hbar', 'table'])

  const totalDeaths = rows.reduce((s, r) => s + r.deaths, 0)
  const totalInjured = rows.reduce((s, r) => s + r.injured, 0)
  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.deaths, r.injured)))

  const option = useMemo(() => {
    const horizontal = type === 'hbar'
    // Seven Thai group names on a category axis: wrapped, never rotated away or truncated
    // ("ดูการตัดคำให้ด้วย" — deck slide 20's instruction applies to every long-label axis here).
    const catAxis = {
      type: 'category' as const,
      data: rows.map((r) => r.group),
      axisLabel: {
        fontFamily: FONT,
        fontSize: LABEL_SIZE,
        interval: 0,
        formatter: (name: string) => wrapThaiLabel(name, horizontal ? 16 : 10),
      },
      axisTick: { alignWithLabel: true },
    }
    const valAxis = { type: 'value' as const, axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE } }
    // Series names carry the percentage base so the legend itself states it; the tooltip repeats
    // the base as a full sentence, which the cramped bar labels have no room for.
    const deathsName = `ผู้เสียชีวิต (% ของ${DEATH_BASE_SHORT})`
    const injuredName = `ผู้ได้รับบาดเจ็บ (% ของ${INJURED_BASE_SHORT})`

    const barLabel = {
      show: true,
      position: horizontal ? ('right' as const) : ('top' as const),
      fontFamily: FONT,
      fontSize: LABEL_SIZE,
      color: '#334155',
      lineHeight: 18,
    }

    return {
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
      // `right` on the horizontal variant must clear the whole bar label that sits outside the bar:
      // the widest case ("78.9% (672)") measures ~95px at 14px Prompt, so 64 clipped it.
      grid: { left: horizontal ? 16 : 8, right: horizontal ? 104 : 16, top: 64, bottom: 8, containLabel: true },
      legend: { top: 4, textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE } },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (params: { seriesName?: string; value?: number; axisValueLabel?: string; name?: string }[]) => {
          const head = (params[0]?.axisValueLabel ?? params[0]?.name ?? '').replace(/\n/g, ' ')
          const lines = params.map((p) => {
            const isDeaths = (p.seriesName ?? '').startsWith('ผู้เสียชีวิต')
            const value = typeof p.value === 'number' ? p.value : 0
            const total = isDeaths ? totalDeaths : totalInjured
            const baseText = isDeaths
              ? `${DEATH_BASE_FULL} ${totalDeaths} ราย`
              : `${INJURED_BASE_FULL} ${totalInjured} ราย`
            const short = isDeaths ? 'ผู้เสียชีวิต' : 'ผู้ได้รับบาดเจ็บ'
            return `${short}: ${value} ราย (${pctText(value, total)} ของ${baseText})`
          })
          return [head, ...lines].join('<br/>')
        },
      },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: [
        {
          name: deathsName,
          type: 'bar' as const,
          data: rows.map((r) => r.deaths),
          itemStyle: { color: PALETTE.severity.black, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
          label: {
            ...barLabel,
            formatter: (p: { value: number }) => {
              if (!p.value || p.value <= 0) return ''
              // Percent first in BOTH orientations (the deck asks for it "ด้านบน"): stacked over
              // the raw count on a column, beside it on a horizontal bar.
              return horizontal
                ? fmtPctCount(p.value, totalDeaths)
                : `${pctText(p.value, totalDeaths)}\n${p.value}`
            },
          },
        },
        {
          name: injuredName,
          type: 'bar' as const,
          data: rows.map((r) => r.injured),
          itemStyle: { color: PALETTE.severity.yellow, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
          label: {
            ...barLabel,
            formatter: (p: { value: number }) => {
              if (!p.value || p.value <= 0) return ''
              return horizontal
                ? fmtPctCount(p.value, totalInjured)
                : `${pctText(p.value, totalInjured)}\n${p.value}`
            },
          },
        },
      ],
    }
  }, [rows, type, totalDeaths, totalInjured])

  // A horizontal chart needs vertical room per category, otherwise seven groups collapse into an
  // unreadable stack; the column chart needs room for the wrapped axis labels under it.
  const chartHeight = type === 'hbar' ? Math.max(360, rows.length * 64 + 90) : 420

  return (
    <Card
      title="ผู้เสียชีวิตและบาดเจ็บ จำแนกตามกลุ่มผู้ป่วย"
      icon={HeartCrack}
      accent="s1"
      headerTone="brand"
      right={<ChartSwitcher options={SWITCH_OPTIONS} current={type} onChange={setType} />}
    >
      {type === 'table' ? (
        <div key="table" className="animate-chart-transition flex flex-1 flex-col justify-center">
          <TableView rows={rows} totalDeaths={totalDeaths} totalInjured={totalInjured} maxVal={maxVal} />
        </div>
      ) : (
        <div key={type} className="animate-chart-transition">
          <ReactECharts
            option={option}
            style={{ height: chartHeight, width: '100%' }}
            notMerge
            lazyUpdate
          />
        </div>
      )}
    </Card>
  )
}

/**
 * Small icon switcher for widgets that build their own ECharts option instead of going through
 * SwitchableChart. Exported so the Section-1 donut / 7-group cards use the same control rather
 * than a third copy of it. Includes smooth sliding pill transition animation.
 */
export function ChartSwitcher({
  options,
  current,
  onChange,
  size = 'md',
  className = '',
}: {
  options: SwitchOption[]
  current: ChartType
  onChange: (t: ChartType) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const isSm = size === 'sm'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number; height: number; ready: boolean }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  useLayoutEffect(() => {
    const updatePosition = () => {
      const activeEl = buttonRefs.current[current]
      if (activeEl && containerRef.current) {
        setIndicator({
          left: activeEl.offsetLeft,
          top: activeEl.offsetTop,
          width: activeEl.offsetWidth,
          height: activeEl.offsetHeight,
          ready: true,
        })
      }
    }

    updatePosition()
    const raf = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updatePosition)
    }
  }, [current, options])

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 rounded-xl bg-white/95 p-1 shadow-sm border border-slate-200/50 ${className}`}
      role="group"
      aria-label="เลือกรูปแบบกราฟ"
    >
      {/* Sliding indicator pill */}
      {indicator.ready && (
        <div
          className="absolute top-0 left-0 rounded-lg bg-s1-600 shadow-xs pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
          }}
          aria-hidden="true"
        />
      )}

      {options.map(({ type, icon: Icon, label }) => {
        const isActive = current === type
        return (
          <button
            key={type}
            ref={(el) => {
              buttonRefs.current[type] = el
            }}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            onClick={() => onChange(type)}
            className={`relative z-10 flex items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 active:scale-95 ${
              isSm ? 'h-7 w-7' : 'h-9 w-9'
            } ${
              isActive
                ? 'text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={isSm ? 14 : 16} strokeWidth={2} />
          </button>
        )
      })}
    </div>
  )
}

function TableView({
  rows,
  totalDeaths,
  totalInjured,
  maxVal,
}: {
  rows: GroupImpactTableProps['rows']
  totalDeaths: number
  totalInjured: number
  maxVal: number
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] text-tableText">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-600">
            <th className="py-2 pr-4 font-medium">กลุ่มผู้ป่วย</th>
            <th className="py-2 pr-4 font-medium">
              ผู้เสียชีวิต
              <span className="block text-xs font-normal text-slate-600">
                ราย · % ของ{DEATH_BASE_FULL} {totalDeaths} ราย
              </span>
            </th>
            <th className="py-2 font-medium">
              ผู้ได้รับบาดเจ็บ
              <span className="block text-xs font-normal text-slate-600">
                ราย · % ของ{INJURED_BASE_FULL} {totalInjured} ราย
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.group} className="border-b border-slate-50 last:border-0">
              <td className="py-3 pr-4 align-middle">{r.group}</td>
              <td className="py-3 pr-4 align-middle">
                <MiniBar value={r.deaths} max={maxVal} total={totalDeaths} color={PALETTE.severity.black} />
              </td>
              <td className="py-3 align-middle">
                <MiniBar value={r.injured} max={maxVal} total={totalInjured} color={PALETTE.severity.yellow} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-bold text-slate-800">
            <td className="py-3 pr-4 align-middle">รวม (เฉพาะที่ระบุกลุ่มผู้ป่วย)</td>
            <td className="py-3 pr-4 align-middle tabular-nums">{fmtCountPct(totalDeaths, totalDeaths)}</td>
            <td className="py-3 align-middle tabular-nums">{fmtCountPct(totalInjured, totalInjured)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function MiniBar({ value, max, total, color }: { value: number; max: number; total: number; color: string }) {
  const widthPct = value > 0 && max > 0 ? Math.max(3, (value / max) * 100) : 0
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: color }} />
      </div>
      <span className="whitespace-nowrap tabular-nums text-slate-700">{fmtCountPct(value, total)}</span>
    </div>
  )
}
