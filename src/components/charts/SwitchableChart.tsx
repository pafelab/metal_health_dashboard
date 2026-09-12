// The chart-type switcher workhorse (SPEC 7). ~15 widgets render through this file.
// Frozen contract — see task brief for exact prop shapes.
// Audit UX-13: every chart also offers an equivalent data table and always shows a textual
// summary, the plot is exposed as role="img" with a Thai label, and the toolbar is keyboard
// operable with aria-pressed state.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  Table2,
  type LucideIcon,
} from 'lucide-react'
import type { ChartType } from '@/types'
import { PALETTE } from '@/config'
import Card, { type CardHeaderTone } from '@/components/layout/Card'
import { useChartType } from '@/hooks/useChartType'
import { buildChartOption, buildMultiSeriesOption, type ChartDatum } from './chartOptions'
import DataTable, { summaryText, type DataTableSeries } from './DataTable'

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

const FOCUS_RING =
  'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-1'

/** A widget's chosen type must both exist in TYPE_ICON and be chart-renderable (never 'table'). */
function isRenderable(t: ChartType): boolean {
  return t !== 'table'
}

/**
 * Pressed background behind WHITE 14px LABEL text, which needs 4.5:1: PALETTE.section1 (#EA580C)
 * only reaches ~3.6:1, so 's1' uses the darker s1-700 #C2410C (~4.9:1). The icon-only chart-type
 * buttons keep the brighter accent — non-text graphics only need 3:1 (audit UX-13).
 */
const PRESSED_LABEL_BG: Record<'s1' | 's2', string> = {
  s1: '#C2410C',
  s2: PALETTE.section2,
}

/** 'ดูข้อมูลเป็นตาราง' toggle — the accessible equivalent of the plot (audit UX-13).
 *  responsive-audit R08: h-10 (45px at the 18px root) meets the 44px project hit-area target;
 *  the previous h-8 measured 36px. Same for the chart-type buttons below. */
export function TableToggle({
  pressed,
  onToggle,
  accent,
}: {
  pressed: boolean
  onToggle: () => void
  accent: 's1' | 's2'
}): JSX.Element {
  const accentColor = PRESSED_LABEL_BG[accent]
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label="ดูข้อมูลเป็นตาราง"
      title="ดูข้อมูลเป็นตาราง"
      onClick={onToggle}
      className={`flex h-10 min-w-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${FOCUS_RING}`}
      style={
        pressed
          ? { backgroundColor: accentColor, color: '#fff' }
          : { backgroundColor: 'transparent', color: '#475569' }
      }
    >
      <Table2 size={16} strokeWidth={2} aria-hidden="true" />
      <span>ตาราง</span>
    </button>
  )
}

export interface ChartSegmentedControlProps {
  allowedTypes: ChartType[]
  activeType: ChartType
  onTypeChange: (t: ChartType) => void
  showTable: boolean
  onToggleTable: (show: boolean) => void
  accent: 's1' | 's2'
  className?: string
}

/**
 * Modern segmented control with a smooth sliding indicator pill transition animation.
 * Unifies chart type buttons and the table toggle into one seamless bar.
 */
export function ChartSegmentedControl({
  allowedTypes,
  activeType,
  onTypeChange,
  showTable,
  onToggleTable,
  accent,
  className = '',
}: ChartSegmentedControlProps): JSX.Element {
  const accentColor = PRESSED_LABEL_BG[accent]
  const activeKey = showTable ? 'table' : activeType
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number; height: number; ready: boolean }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  const renderable = useMemo(() => allowedTypes.filter(isRenderable), [allowedTypes])

  useLayoutEffect(() => {
    const updatePosition = () => {
      const activeEl = buttonRefs.current[activeKey]
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
  }, [activeKey, renderable])

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-wrap items-center gap-1 rounded-xl p-1 bg-white/95 shadow-sm border border-slate-200/50 ${className}`}
      role="group"
      aria-label="เลือกรูปแบบกราฟและตาราง"
    >
      {/* Sliding indicator pill with smooth spring/cubic-bezier transition */}
      {indicator.ready && (
        <div
          className="absolute top-0 left-0 rounded-lg pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-xs"
          style={{
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
            backgroundColor: accentColor,
          }}
          aria-hidden="true"
        />
      )}

      {renderable.map((t) => {
        const Icon = TYPE_ICON[t]
        const isActive = !showTable && t === activeType
        return (
          <button
            key={t}
            ref={(el) => {
              buttonRefs.current[t] = el
            }}
            type="button"
            title={TYPE_LABEL_TH[t]}
            aria-label={TYPE_LABEL_TH[t]}
            aria-pressed={isActive}
            onClick={() => {
              onToggleTable(false)
              onTypeChange(t)
            }}
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer active:scale-95 ${FOCUS_RING} ${
              isActive ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )
      })}

      {/* Accessible data table toggle option */}
      <button
        key="table"
        ref={(el) => {
          buttonRefs.current['table'] = el
        }}
        type="button"
        aria-pressed={showTable}
        aria-label="ดูข้อมูลเป็นตาราง"
        title="ดูข้อมูลเป็นตาราง"
        onClick={() => onToggleTable(!showTable)}
        className={`relative z-10 flex h-10 min-w-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer active:scale-95 ${FOCUS_RING} ${
          showTable ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Table2 size={16} strokeWidth={2} aria-hidden="true" />
        <span>ตาราง</span>
      </button>
    </div>
  )
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-tableText text-slate-500">
      <Inbox size={32} strokeWidth={1.5} aria-hidden="true" />
      <span>ไม่มีข้อมูลในขอบเขตที่เลือก</span>
    </div>
  )
}

/** Textual summary rendered under every plot / table so the key numbers exist as text. */
function ChartSummary({ text }: { text: string }): JSX.Element {
  return <p className="mt-2 text-sm text-slate-600 leading-relaxed">{text}</p>
}

export interface SwitchableChartProps {
  widgetId: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** CategoryCount[] fits; a `value: null` datum is plotted as a break ("not reported", UX-02). */
  data: ChartDatum[]
  defaultType: ChartType
  allowedTypes: ChartType[]
  palette?: string[]
  accent?: 's1' | 's2'
  height?: number
  seriesName?: string
  valueSuffix?: string
  total?: number
  /** Noun used by the textual summary ("รวม 440 <unit>"). Defaults to 'รายการ'. */
  unit?: string
  /** Header of the table's first column. Defaults to 'หมวด'. */
  categoryHeader?: string
  /**
   * Set `false` when `total` is legitimately larger than the sum of the plotted values but every
   * category IS drawn (a people-denominator behind a multi-select question, say). Without it the
   * table and summary infer a truncated top-N from `total > sum` and print a sentence wrongly
   * claiming rows were left out. Leave undefined for a real top-N chart.
   */
  truncated?: boolean
  /** Deck slide 9 — forwarded to Card so a topic can be framed with a filled title band. */
  headerTone?: CardHeaderTone
}

export default function SwitchableChart(p: SwitchableChartProps): JSX.Element {
  const accent = p.accent ?? 's1'
  const height = p.height ?? 340
  const allowed = useMemo(
    () => (p.allowedTypes.includes(p.defaultType) ? p.allowedTypes : [p.defaultType, ...p.allowedTypes]),
    [p.allowedTypes, p.defaultType],
  )

  const [storedType, setStoredType] = useChartType(p.widgetId, p.defaultType, allowed)
  const [showTable, setShowTable] = useState(false)
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

  const categories = useMemo(() => p.data.map((d) => d.name), [p.data])
  const tableSeries = useMemo<DataTableSeries[]>(
    () => [{ name: 'จำนวน', values: p.data.map((d) => d.value) }],
    [p.data],
  )
  const summary = useMemo(
    () => summaryText({ categories, series: tableSeries, total: p.total, truncated: p.truncated, unit: p.unit }),
    [categories, tableSeries, p.total, p.truncated, p.unit],
  )

  return (
    <Card
      title={p.title}
      subtitle={p.subtitle}
      icon={p.icon}
      accent={accent}
      headerTone={p.headerTone}
      right={
        isEmpty ? undefined : (
          <ChartSegmentedControl
            allowedTypes={allowed}
            activeType={effectiveType}
            onTypeChange={setStoredType}
            showTable={showTable}
            onToggleTable={setShowTable}
            accent={accent}
          />
        )
      }
    >
      {isEmpty || !option ? (
        <EmptyState />
      ) : showTable ? (
        <div key="table" className="animate-chart-transition">
          <DataTable
            caption={p.title}
            categories={categories}
            series={tableSeries}
            categoryHeader={p.categoryHeader}
            total={p.total}
            truncated={p.truncated}
            valueSuffix={p.valueSuffix ?? ''}
            maxHeight={height}
          />
          <ChartSummary text={summary} />
        </div>
      ) : (
        <div key={effectiveType} className="animate-chart-transition">
          <div role="img" aria-label={`${p.title} แผนภูมิ`}>
            <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
          </div>
          <ChartSummary text={summary} />
        </div>
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
  /** Noun used by the textual summary ("รวม 440 <unit>"). Defaults to 'รายการ'. */
  unit?: string
  /** Header of the table's first column. Defaults to 'หมวด'. */
  categoryHeader?: string
  /**
   * Set `false` when `total` is legitimately larger than the sum of the plotted values but every
   * category IS drawn (a people-denominator behind a multi-select question, say). Without it the
   * table and summary infer a truncated top-N from `total > sum` and print a sentence wrongly
   * claiming rows were left out. Leave undefined for a real top-N chart.
   */
  truncated?: boolean
  /** Deck slide 9 — forwarded to Card so a topic can be framed with a filled title band. */
  headerTone?: CardHeaderTone
}

export function MultiSeriesChart(p: MultiSeriesChartProps): JSX.Element {
  const accent = p.accent ?? 's1'
  const height = p.height ?? 340
  const allowed = useMemo(
    () => (p.allowedTypes.includes(p.defaultType) ? p.allowedTypes : [p.defaultType, ...p.allowedTypes]),
    [p.allowedTypes, p.defaultType],
  )

  const [storedType, setStoredType] = useChartType(p.widgetId, p.defaultType, allowed)
  const [showTable, setShowTable] = useState(false)
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

  const tableSeries = useMemo<DataTableSeries[]>(
    () => p.series.map((s) => ({ name: s.name, values: s.data })),
    [p.series],
  )
  const summary = useMemo(
    () =>
      summaryText({
        categories: p.categories,
        series: tableSeries,
        total: p.total,
        truncated: p.truncated,
        unit: p.unit,
      }),
    [p.categories, tableSeries, p.total, p.truncated, p.unit],
  )

  return (
    <Card
      title={p.title}
      subtitle={p.subtitle}
      icon={p.icon}
      accent={accent}
      headerTone={p.headerTone}
      right={
        isEmpty ? undefined : (
          <ChartSegmentedControl
            allowedTypes={allowed}
            activeType={effectiveType}
            onTypeChange={setStoredType}
            showTable={showTable}
            onToggleTable={setShowTable}
            accent={accent}
          />
        )
      }
    >
      {isEmpty || !option ? (
        <EmptyState />
      ) : showTable ? (
        <div key="table" className="animate-chart-transition">
          <DataTable
            caption={p.title}
            categories={p.categories}
            series={tableSeries}
            categoryHeader={p.categoryHeader}
            total={p.total}
            truncated={p.truncated}
            maxHeight={height}
          />
          <ChartSummary text={summary} />
        </div>
      ) : (
        <div key={effectiveType} className="animate-chart-transition">
          <div role="img" aria-label={`${p.title} แผนภูมิ`}>
            <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
          </div>
          <ChartSummary text={summary} />
        </div>
      )}
    </Card>
  )
}
