// SPEC 6.1 widget 9 — ผู้เสียชีวิต / บาดเจ็บ ตามกลุ่มผู้ป่วย (PDF p.7).
// Default view: table of the 5 patient groups with mini horizontal bars for ผู้เสียชีวิต and
// ผู้ได้รับบาดเจ็บ (count + percent). Switchable to grouped bar / h-bar via useChartType, using
// the SPEC 7 switcher icon row. 'table' is a ChartType value that only this widget renders.
//
// UX-11: each percentage is a share of its own column total (deaths / injured summed over the
// groups), never of the other column and never of the event count. The column headers, the totals
// row, the chart tooltip and the note under the card all say so, and a 0 total prints '—' instead
// of a misleading 0.0%.
//
// UX-11 (base scope): impactByPatientGroup() skips every event whose กลุ่มผู้ป่วย cell is blank or '-'
// (src/data/aggregate.ts), so the column totals are NOT "all deaths / injured in the filter scope" —
// they are only those recorded against a patient group. The base is therefore never called
// 'ทั้งหมด': every header, label, tooltip and note names it
// 'ในเหตุการณ์ที่ระบุกลุ่มผู้ป่วย', which reconciles with the rows shown.

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { BarChart3, BarChartHorizontal, HeartCrack, Table2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '@/components/layout/Card'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import { useChartType } from '@/hooks/useChartType'
import type { ChartType } from '@/types'
import { PALETTE } from '@/config'
import { FONT, LABEL_SIZE } from '@/components/charts/chartOptions'

export interface GroupImpactTableProps {
  widgetId: string
  rows: { group: string; deaths: number; injured: number }[]
}

const SWITCH_OPTIONS: { type: ChartType; icon: LucideIcon; label: string }[] = [
  { type: 'table', icon: Table2, label: 'มุมมองตาราง' },
  { type: 'bar', icon: BarChart3, label: 'แท่งตั้ง' },
  { type: 'hbar', icon: BarChartHorizontal, label: 'แท่งนอน' },
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

/** '123 (45.6%)' — SPEC 4.5, with the UX-11 '—' rule for an empty column. */
function fmtCountPct(n: number, total: number): string {
  return `${n} (${pctText(n, total)})`
}

export default function GroupImpactTable({ widgetId, rows }: GroupImpactTableProps) {
  const [type, setType] = useChartType(widgetId, 'table')

  const totalDeaths = rows.reduce((s, r) => s + r.deaths, 0)
  const totalInjured = rows.reduce((s, r) => s + r.injured, 0)
  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.deaths, r.injured)))

  const option = useMemo(() => {
    const categories = rows.map((r) => r.group)
    const horizontal = type === 'hbar'
    const catAxis = {
      type: 'category' as const,
      data: categories,
      axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE, interval: 0, ...(horizontal ? {} : { rotate: 20 }) },
      axisTick: { alignWithLabel: true },
    }
    const valAxis = { type: 'value' as const, axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE } }
    // Series names carry the percentage base so the legend itself states it; the tooltip repeats
    // the base as a full sentence, which the cramped bar labels have no room for.
    const deathsName = `ผู้เสียชีวิต (% ของ${DEATH_BASE_SHORT})`
    const injuredName = `ผู้ได้รับบาดเจ็บ (% ของ${INJURED_BASE_SHORT})`

    return {
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
      grid: { left: horizontal ? 150 : 30, right: horizontal ? 60 : 20, top: 56, bottom: 16, containLabel: true },
      legend: { top: 4, textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE } },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (params: { seriesName?: string; value?: number; axisValueLabel?: string; name?: string }[]) => {
          const head = params[0]?.axisValueLabel ?? params[0]?.name ?? ''
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
            show: true,
            position: horizontal ? ('right' as const) : ('top' as const),
            fontFamily: FONT,
            fontSize: LABEL_SIZE,
            color: '#334155',
            formatter: (p: { value: number }) => {
              if (!p.value || p.value <= 0) return ''
              return horizontal ? fmtCountPct(p.value, totalDeaths) : `${p.value}\n(${pctText(p.value, totalDeaths)})`
            },
          },
        },
        {
          name: injuredName,
          type: 'bar' as const,
          data: rows.map((r) => r.injured),
          itemStyle: { color: PALETTE.severity.yellow, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
          label: {
            show: true,
            position: horizontal ? ('right' as const) : ('top' as const),
            fontFamily: FONT,
            fontSize: LABEL_SIZE,
            color: '#334155',
            formatter: (p: { value: number }) => {
              if (!p.value || p.value <= 0) return ''
              return horizontal ? fmtCountPct(p.value, totalInjured) : `${p.value}\n(${pctText(p.value, totalInjured)})`
            },
          },
        },
      ],
    }
  }, [rows, type, totalDeaths, totalInjured])

  return (
    <Card
      title="ผู้เสียชีวิต / บาดเจ็บ ตามกลุ่มผู้ป่วย"
      subtitle="5 กลุ่มผู้ป่วย · เฉพาะเหตุการณ์ที่ระบุกลุ่มผู้ป่วย"
      icon={HeartCrack}
      accent="s1"
      right={<Switcher current={type} onChange={setType} />}
    >
      {type === 'table' ? (
        <div className="flex-1 flex flex-col justify-center">
          <TableView rows={rows} totalDeaths={totalDeaths} totalInjured={totalInjured} maxVal={maxVal} />
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: '100%', minHeight: 340, flex: 1 }} notMerge lazyUpdate />
      )}
      <DenominatorNote className="mt-3 text-left">
        ร้อยละคิดแยกรายคอลัมน์จากผู้ที่อยู่ในเหตุการณ์ซึ่งระบุกลุ่มผู้ป่วยเท่านั้น: {DEATH_BASE_FULL} {totalDeaths} ราย
        และ{INJURED_BASE_FULL} {totalInjured} ราย (1 เหตุการณ์ถูกนับในกลุ่มผู้ป่วยเดียว แต่ละคอลัมน์จึงรวมได้ 100%)
        ทั้งนี้เหตุการณ์ที่ไม่ได้ระบุกลุ่มผู้ป่วยจะไม่ถูกนับในตารางนี้ ยอดรวมจึงอาจน้อยกว่าผู้เสียชีวิต/บาดเจ็บทั้งหมดตามตัวกรอง
      </DenominatorNote>
    </Card>
  )
}

function Switcher({ current, onChange }: { current: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
      {SWITCH_OPTIONS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={current === type}
          onClick={() => onChange(type)}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-s1-700 ${
            current === type ? 'bg-white text-s1-600 shadow-card' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
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
    <div className="overflow-x-auto">
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
