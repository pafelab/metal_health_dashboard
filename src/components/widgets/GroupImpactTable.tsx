// SPEC 6.1 widget 9 — ผู้เสียชีวิต / บาดเจ็บ ตามกลุ่มผู้ป่วย (PDF p.7).
// Default view: table of the 5 patient groups with mini horizontal bars for ผู้เสียชีวิต and
// ผู้ได้รับบาดเจ็บ (count + percent). Switchable to grouped bar / h-bar via useChartType, using
// the SPEC 7 switcher icon row. 'table' is a ChartType value that only this widget renders.

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { BarChart3, BarChartHorizontal, HeartCrack, Table2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '@/components/layout/Card'
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

/** '123 (45.6%)' — SPEC 4.5. Percent is 0.0% (not NaN) when the denominator is 0. */
function fmtCountPct(n: number, total: number): string {
  const pct = total > 0 ? (n / total) * 100 : 0
  return `${n} (${pct.toFixed(1)}%)`
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

    return {
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
      grid: { left: horizontal ? 150 : 30, right: horizontal ? 60 : 20, top: 56, bottom: 16, containLabel: true },
      legend: { top: 4, textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE } },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: [
        {
          name: 'ผู้เสียชีวิต',
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
              return horizontal
                ? fmtCountPct(p.value, totalDeaths)
                : `${p.value}\n(${((p.value / (totalDeaths || 1)) * 100).toFixed(1)}%)`
            },
          },
        },
        {
          name: 'ผู้ได้รับบาดเจ็บ',
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
              return horizontal
                ? fmtCountPct(p.value, totalInjured)
                : `${p.value}\n(${((p.value / (totalInjured || 1)) * 100).toFixed(1)}%)`
            },
          },
        },
      ],
    }
  }, [rows, type, totalDeaths, totalInjured])

  return (
    <Card
      title="ผู้เสียชีวิต / บาดเจ็บ ตามกลุ่มผู้ป่วย"
      subtitle="5 กลุ่มผู้ป่วย"
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
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            current === type ? 'bg-white text-s1-600 shadow-card' : 'text-slate-400 hover:text-slate-600'
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
          <tr className="border-b border-slate-100 text-left text-slate-500">
            <th className="py-2 pr-4 font-medium">กลุ่มผู้ป่วย</th>
            <th className="py-2 pr-4 font-medium">ผู้เสียชีวิต</th>
            <th className="py-2 font-medium">ผู้ได้รับบาดเจ็บ</th>
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
      </table>
    </div>
  )
}

function MiniBar({ value, max, total, color }: { value: number; max: number; total: number; color: string }) {
  const widthPct = value > 0 && max > 0 ? Math.max(3, (value / max) * 100) : 0
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: color }} />
      </div>
      <span className="whitespace-nowrap tabular-nums text-slate-700">{fmtCountPct(value, total)}</span>
    </div>
  )
}
