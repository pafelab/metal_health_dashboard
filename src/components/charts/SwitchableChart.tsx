// The chart-type switcher workhorse (SPEC 7). ~15 widgets render through this file.
// Frozen contract — see task brief for exact prop shapes.

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  BarChart3,
  BarChartHorizontal,
  LineChart,
  AreaChart,
  PieChart,
  Donut,
  Flower2,
  LayoutGrid,
  Filter,
  Layers,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryCount, ChartType } from '@/types'
import { PALETTE } from '@/config'
import Card from '@/components/layout/Card'
import { useChartType } from '@/hooks/useChartType'
import { buildChartOption, buildMultiSeriesOption } from './chartOptions'

const TYPE_ICON: Record<ChartType, LucideIcon> = {
  bar: BarChart3,
  hbar: BarChartHorizontal,
  line: LineChart,
  area: AreaChart,
  step: LineChart,
  pie: PieChart,
  donut: Donut,
  rose: Flower2,
  treemap: LayoutGrid,
  funnel: Filter,
  stacked: Layers,
  table: undefined as unknown as LucideIcon, // never rendered by the switcher — see guard below
}

const TYPE_LABEL_TH: Record<ChartType, string> = {
  bar: 'แผนภูมิแท่ง',
  hbar: 'แผนภูมิแท่งแนวนอน',
  line: 'แผนภูมิเส้น',
  area: 'แผนภูมิพื้นที่',
  step: 'แผนภูมิเส้นขั้นบันได',
  pie: 'แผนภูมิวงกลม',
  donut: 'แผนภูมิโดนัท',
  rose: 'แผนภูมิดอกกุหลาบ',
  treemap: 'ทรีแมป',
  funnel: 'แผนภูมิกรวย',
  stacked: 'แผนภูมิแท่งซ้อน',
  table: 'ตาราง',
}

/** A widget's chosen type must both exist in TYPE_ICON and be chart-renderable (never 'table'). */
function isRenderable(t: ChartType): boolean {
  return t !== 'table'
}

function ChartTypeSwitcher({
  allowedTypes,
  active,
  onChange,
  accent,
}: {
  allowedTypes: ChartType[]
  active: ChartType
  onChange: (t: ChartType) => void
  accent: 's1' | 's2'
}): JSX.Element {
  const accentColor = accent === 's2' ? PALETTE.section2 : PALETTE.section1
  return (
    <div className="flex items-center gap-1" role="group" aria-label="เลือกรูปแบบกราฟ">
      {allowedTypes.filter(isRenderable).map((t) => {
        const Icon = TYPE_ICON[t]
        const isActive = t === active
        return (
          <button
            key={t}
            type="button"
            title={TYPE_LABEL_TH[t]}
            aria-label={TYPE_LABEL_TH[t]}
            aria-pressed={isActive}
            onClick={() => onChange(t)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={
              isActive
                ? { backgroundColor: accentColor, color: '#fff' }
                : { backgroundColor: 'transparent', color: '#64748B' }
            }
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        )
      })}
    </div>
  )
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-tableText text-[#94A3B8]">
      <Inbox size={32} strokeWidth={1.5} />
      <span>ไม่มีข้อมูล</span>
    </div>
  )
}

export interface SwitchableChartProps {
  widgetId: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  data: CategoryCount[]
  defaultType: ChartType
  allowedTypes: ChartType[]
  palette?: string[]
  accent?: 's1' | 's2'
  height?: number
  seriesName?: string
  valueSuffix?: string
  total?: number
}

export default function SwitchableChart(p: SwitchableChartProps): JSX.Element {
  const accent = p.accent ?? 's1'
  const height = p.height ?? 340
  const allowed = useMemo(
    () => (p.allowedTypes.includes(p.defaultType) ? p.allowedTypes : [p.defaultType, ...p.allowedTypes]),
    [p.allowedTypes, p.defaultType],
  )

  const [storedType, setStoredType] = useChartType(p.widgetId, p.defaultType)
  const effectiveType: ChartType =
    isRenderable(storedType) && allowed.includes(storedType) ? storedType : p.defaultType

  const isEmpty = p.data.length === 0 || p.data.every((d) => !d.value)

  const option = useMemo(() => {
    if (isEmpty) return null
    const accentColor = accent === 's2' ? PALETTE.section2 : PALETTE.section1
    const gradient = accent === 's2' ? PALETTE.gradients.section2 : PALETTE.gradients.section1
    return buildChartOption(effectiveType, {
      data: p.data,
      total: p.total,
      valueSuffix: p.valueSuffix ?? '',
      colors: p.palette,
      accentColor,
      gradient,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, p.data, p.total, p.valueSuffix, p.palette, accent, isEmpty])

  return (
    <Card
      title={p.title}
      subtitle={p.subtitle}
      icon={p.icon}
      accent={accent}
      right={
        allowed.length > 1 && !isEmpty ? (
          <ChartTypeSwitcher allowedTypes={allowed} active={effectiveType} onChange={setStoredType} accent={accent} />
        ) : undefined
      }
    >
      {isEmpty || !option ? (
        <EmptyState />
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </Card>
  )
}

export interface MultiSeriesChartProps {
  widgetId: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  categories: string[]
  series: { name: string; data: number[]; color?: string }[]
  defaultType: ChartType
  allowedTypes: ChartType[]
  height?: number
  total?: number
  accent?: 's1' | 's2'
}

export function MultiSeriesChart(p: MultiSeriesChartProps): JSX.Element {
  const accent = p.accent ?? 's1'
  const height = p.height ?? 340
  const allowed = useMemo(
    () => (p.allowedTypes.includes(p.defaultType) ? p.allowedTypes : [p.defaultType, ...p.allowedTypes]),
    [p.allowedTypes, p.defaultType],
  )

  const [storedType, setStoredType] = useChartType(p.widgetId, p.defaultType)
  const effectiveType: ChartType =
    isRenderable(storedType) && allowed.includes(storedType) ? storedType : p.defaultType

  const isEmpty = p.categories.length === 0 || p.series.every((s) => s.data.every((v) => !v))

  const option = useMemo(() => {
    if (isEmpty) return null
    return buildMultiSeriesOption(effectiveType, {
      categories: p.categories,
      series: p.series,
      total: p.total,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, p.categories, p.series, p.total, isEmpty])

  return (
    <Card
      title={p.title}
      subtitle={p.subtitle}
      icon={p.icon}
      accent={accent}
      right={
        allowed.length > 1 && !isEmpty ? (
          <ChartTypeSwitcher allowedTypes={allowed} active={effectiveType} onChange={setStoredType} accent={accent} />
        ) : undefined
      }
    >
      {isEmpty || !option ? (
        <EmptyState />
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </Card>
  )
}
