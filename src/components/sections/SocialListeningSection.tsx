// SPEC 6.1 — Section 1 "ข้อมูล Social Listening".
//
// LAYOUT, review deck แก้งับ.pdf slides 1-4 and 13-21. UX-09's collapsible "การวิเคราะห์เชิงลึก"
// group is GONE — the deck strikes it out explicitly ("ตัดการวิเคราะห์เชิงลึก รายละเอียดของ
// เหตุการณ์ตามที่กรองไว้ออก") — and its children are hoisted into the section itself. The reason
// UX-09 gave for the wrapper (the overview must be readable before the breakdowns) survives as the
// ORDER below, not as a disclosure widget: severity KPIs → the two headline infographics →
// trend → patient status/groups → geography → casualties → demographics → suicide → the records.
// Each topic is now framed by its own card with a filled title band (Card `headerTone="brand"`,
// deck slide 9 "สีฟ้าก็ได้ ดูสบายตา") instead of by one shared <details>.
//
// Widget ids stay stable strings so SPEC 7's persisted chart-type choice is shared between the
// Dashboard tab and the zone tab (SPEC 6.4) — EXCEPT where a widget's rendering changed shape
// (the status donut, the 7-group bar, the impact chart, the age chart), which take NEW ids: a
// returning user's persisted 'pie'/'table' choice must not be resurrected on a chart that no
// longer offers it.
//
// Also implements SPEC 6.4's zone-mode variants that live entirely inside this component (the
// per-zone bar becomes a per-province bar, the section title gets the zone suffix, the map zooms
// to the zone). Everything here is rendered by ZonePage too, with `rows` already narrowed to one
// zone — nothing below may assume national scope.
//
// All aggregation is delegated to '@/data' (SPEC's frozen data layer) — nothing here recomputes
// a count itself, it only shapes already-aggregated CategoryCount[]/etc. into widget props.

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Megaphone,
  TrendingUp,
  MapPin,
  Users,
  Users2,
  CalendarDays,
  Activity,
  MapPinned,
  UserRound,
  AlertOctagon,
  AlertTriangle,
  ListChecks,
  LifeBuoy,
  PieChart,
  Donut,
  BarChart3,
  BarChartHorizontal,
  HeartPulse,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react'
import type { SLEvent, Severity, CategoryCount, ChartType } from '@/types'
import {
  severityCounts,
  monthlyTrend,
  provinceCounts,
  topN,
  countBy,
  patientStatusCounts,
  patientGroup7Counts,
  impactByGroup7,
  genderSplit,
  ageBandCounts,
  riskFactors,
  warningSigns,
  suicideSubset,
  zoneCounts,
  coverageWindow,
  reportedMonthKeys,
  outOfPeriodRows,
} from '@/data'
import {
  CATEGORY_ORDERS,
  AGE_BANDS,
  PALETTE,
  ZONE_PROVINCES,
  STATUS5_COLORS,
  GROUP7_COLORS,
} from '@/config'
import { useSheetData } from '@/hooks/useSheetData'
import { useChartType } from '@/hooks/useChartType'
import { FONT, LABEL_SIZE, wrapThaiLabel } from '@/components/charts/chartOptions'
import SwitchableChart from '@/components/charts/SwitchableChart'
import ThailandMap from '@/components/charts/ThailandMap'
import Card from '@/components/layout/Card'
import KpiCards from '@/components/widgets/KpiCards'
import RiskWarning from '@/components/widgets/RiskWarning'
import GenderFigure from '@/components/widgets/GenderFigure'
import GroupImpactTable, { ChartSwitcher, type SwitchOption } from '@/components/widgets/GroupImpactTable'
import EventsTable from '@/components/widgets/EventsTable'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import { scrollToWidget } from '@/lib/scrollToWidget'

export interface SocialListeningSectionProps {
  rows: SLEvent[]
  zoneMode?: boolean
  zone?: number | 'all'
  onProvinceClick: (p: string) => void
  selectedProvince?: string
  onClearProvince?: () => void
  showMapSideCards?: boolean
  /** Same-period total WITHOUT the geographic restriction, so the map's selected-area card can
   *  state a real share of its baseline instead of "100% ของทั้งประเทศ" (UX-01). */
  baselineTotal?: number
  /** What that baseline is ('ทั้งประเทศ' / 'เขตสุขภาพที่ N'), named explicitly in the copy. */
  baselineLabel?: string
}

/** Denominator a truncated top-N chart must report (UX-13): the sum of the WHOLE distribution,
 *  not of the 5/10 bars that happen to be drawn. */
function sumValues(counts: { value: number }[]): number {
  return counts.reduce((acc, c) => acc + (Number.isFinite(c.value) ? c.value : 0), 0)
}

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

/** '12.3%' — or '—' when there is nothing to divide by (UX-11: never print 0.0% for "no data"). */
function pctText(n: number, total: number): string {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—'
}

/** WCAG relative luminance of a '#rrggbb' colour. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/** Label colour that stays legible ON a slice of `hex`. STATUS5_COLORS pairs violet-300/orange-300
 *  pastels with violet-600/orange-600, so one flat white cannot serve all five (UX-05): the light
 *  shades take dark slate, the saturated ones take whichever of the two contrasts better. */
function readableOn(hex: string): string {
  return luminance(hex) > 0.179 ? '#1E293B' : '#FFFFFF'
}

/** A slice thinner than this cannot hold a legible inside label; below it the percent is left to
 *  the legend column beside the chart rather than drawn over a sliver it would overflow. */
const MIN_INSIDE_LABEL_SHARE = 0.05

/** Top-N depth of every ranked chart in the suicide module (deck slide 20 puts cause, location and
 *  method all at the same depth). The headings below are derived from the number of bars that
 *  actually come back, never from this constant — a filtered subset routinely has fewer. */
const SUICIDE_TOP_N = 5

/** 'สาเหตุการฆ่าตัวตาย 5 อันดับสูงสุด' — but with the REAL bar count, and without the ranking
 *  phrase at all when there is only one bar to rank. */
function topTitle(base: string, count: number): string {
  return count > 1 ? `${base} ${count} อันดับสูงสุด` : base
}

function Span({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`h-full flex flex-col ${className}`}>{children}</div>
}

const GRID = 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'
const HALF = 'md:col-span-1 xl:col-span-2'
const FULL = 'md:col-span-2 xl:col-span-4'

/** Same wording as SwitchableChart's own empty state, for the hand-built charts below. */
function EmptyBlock() {
  return (
    <div className="flex min-h-[180px] flex-1 items-center justify-center text-tableText text-slate-500">
      ไม่มีข้อมูลในขอบเขตที่เลือก
    </div>
  )
}

/* ------------------------------------------------------------------------------------------- *
 * Hand-built chart blocks.
 *
 * These do NOT go through SwitchableChart, for two reasons the deck forces:
 *   1. slides 15/18 delete the "รวม N เหตุการณ์" summary line that SwitchableChart prints under
 *      every plot, and
 *   2. slide 9 asks these cards for a filled header band, which SwitchableChart's Card call does
 *      not expose.
 * Everything else they need (count + percent labels, wrapped Thai category labels, a keyboard
 * switcher, an image role with a Thai label) is reproduced here.
 * ------------------------------------------------------------------------------------------- */

interface CategoryBarsProps {
  data: CategoryCount[]
  /** Percentage denominator. For a top-N chart this is the FULL distribution total (UX-13). */
  total: number
  orientation?: ChartType
  colors?: string[]
  /** Wrap width for the category axis labels — long Thai names wrap, never clip ("ดูการตัดคำ"). */
  maxLabelChars?: number
  ariaLabel: string
  /** Height override; a horizontal chart otherwise sizes itself from the number of bars. */
  height?: number
}

function CategoryBars({
  data,
  total,
  orientation = 'hbar',
  colors,
  maxLabelChars,
  ariaLabel,
  height,
}: CategoryBarsProps) {
  const isPie = orientation === 'pie' || orientation === 'donut'
  const isDonut = orientation === 'donut'
  const horizontal = orientation === 'hbar'
  const isEmpty = data.length === 0 || data.every((d) => !d.value)

  const option = useMemo(() => {
    const palette = colors ?? PALETTE.categorical

    if (isPie) {
      const denom = total > 0 ? total : sumValues(data)
      return {
        textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
        color: palette,
        tooltip: {
          trigger: 'item' as const,
          formatter: (p: { name?: string; value?: number }) =>
            `${p.name ?? ''}<br/><b>${fmt(p.value ?? 0)} ราย</b> (${pctText(p.value ?? 0, denom)})`,
        },
        legend: {
          bottom: 2,
          type: 'scroll' as const,
          textStyle: { fontFamily: FONT, fontSize: 12 },
          formatter: (name: string) => wrapThaiLabel(name, 16),
        },
        title: isDonut
          ? {
              text: fmt(denom),
              subtext: 'รายทั้งหมด',
              left: 'center',
              top: '36%',
              itemGap: 2,
              textStyle: { fontFamily: FONT, fontSize: 22, fontWeight: 'bold' as const, color: '#1E293B' },
              subtextStyle: { fontFamily: FONT, fontSize: 12, color: '#64748B' },
            }
          : undefined,
        series: [
          {
            name: ariaLabel,
            type: 'pie' as const,
            radius: isDonut ? ['42%', '68%'] : '66%',
            center: ['50%', '44%'],
            avoidLabelOverlap: true,
            minAngle: 5,
            itemStyle: {
              borderColor: '#FFFFFF',
              borderWidth: 2,
              borderRadius: 4,
            },
            label: {
              show: true,
              position: 'outside' as const,
              fontFamily: FONT,
              fontSize: 12,
              lineHeight: 16,
              formatter: (p: { name?: string; value?: number }) => {
                const val = p.value ?? 0
                const pct = denom > 0 ? ((val / denom) * 100).toFixed(1) : '0'
                return `${wrapThaiLabel(p.name ?? '', 12)}\n${fmt(val)} (${pct}%)`
              },
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 12,
            },
            data: data.map((d, i) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: palette[i % palette.length] },
            })),
          },
        ],
      }
    }

    const catAxis = {
      type: 'category' as const,
      data: data.map((d) => d.name),
      // A horizontal bar axis draws bottom-up; inverse puts the first category at the top.
      inverse: horizontal,
      axisLabel: {
        fontFamily: FONT,
        fontSize: LABEL_SIZE,
        interval: 0,
        color: '#334155',
        formatter: (name: string) => wrapThaiLabel(name, maxLabelChars ?? (horizontal ? 18 : 10)),
      },
      axisTick: { alignWithLabel: true },
    }
    const valAxis = {
      type: 'value' as const,
      axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE },
      splitLine: { lineStyle: { color: '#F1F5F9' } },
    }
    return {
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
      grid: {
        left: 8,
        // Room for the "N ราย (x%)" label that sits to the right of every horizontal bar —
        // measured at ~115px for the widest case ("303 ราย (52.2%)") at 14px Prompt.
        right: horizontal ? 128 : 16,
        top: horizontal ? 12 : 40,
        bottom: 8,
        containLabel: true,
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name?: string; value?: number }) =>
          `${String(p.name ?? '').replace(/\n/g, ' ')}<br/>${fmt(p.value ?? 0)} ราย (${pctText(p.value ?? 0, total)})`,
      },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: [
        {
          type: 'bar' as const,
          barMaxWidth: horizontal ? 30 : 56,
          data: data.map((d, i) => ({
            value: d.value,
            itemStyle: {
              color: palette[i % palette.length],
              borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
            },
          })),
          label: {
            show: true,
            position: horizontal ? ('right' as const) : ('top' as const),
            fontFamily: FONT,
            fontSize: LABEL_SIZE,
            color: '#334155',
            lineHeight: 18,
            // Count AND percent on every bar — deck slides 16/18/20 ask for both.
            formatter: (p: { value?: number }) =>
              horizontal
                ? `${fmt(p.value ?? 0)} ราย (${pctText(p.value ?? 0, total)})`
                : `${pctText(p.value ?? 0, total)}\n${fmt(p.value ?? 0)} ราย`,
          },
        },
      ],
    }
  }, [data, total, isPie, isDonut, horizontal, colors, maxLabelChars, ariaLabel])

  if (isEmpty) return <EmptyBlock />

  // Deck slide 15: "ไม่อยากให้เลื่อน อยากให้ข้อความขึ้นมาแบบไม่ต้องเลื่อน" — every category gets
  // its own row of real height, so all of them are on screen at once with nothing to scroll.
  const resolvedHeight =
    height ??
    (isPie
      ? 340
      : horizontal
      ? Math.max(240, data.length * 54 + 48)
      : 360)

  return (
    <div key={orientation} role="img" aria-label={ariaLabel} className="animate-chart-transition">
      <ReactECharts option={option} style={{ height: resolvedHeight, width: '100%' }} notMerge lazyUpdate />
    </div>
  )
}

const PIE_SWITCH: SwitchOption[] = [
  { type: 'donut', icon: Donut, label: 'แผนภูมิโดนัท' },
  { type: 'pie', icon: PieChart, label: 'แผนภูมิวงกลม' },
]

const BAR_SWITCH: SwitchOption[] = [
  { type: 'hbar', icon: BarChartHorizontal, label: 'แท่งนอน' },
  { type: 'bar', icon: BarChart3, label: 'แท่งตั้ง' },
]

const BAR_PIE_DONUT_SWITCH: SwitchOption[] = [
  { type: 'hbar', icon: BarChartHorizontal, label: 'แท่งนอน' },
  { type: 'bar', icon: BarChart3, label: 'แท่งตั้ง' },
  { type: 'pie', icon: PieChart, label: 'วงกลม' },
  { type: 'donut', icon: Donut, label: 'โดนัท' },
]

const TOPN_SWITCH: SwitchOption[] = [
  { type: 'hbar', icon: BarChartHorizontal, label: 'แผนภูมิแท่ง' },
  { type: 'pie', icon: PieChart, label: 'แผนภูมิวงกลม' },
  { type: 'donut', icon: Donut, label: 'แผนภูมิโดนัท' },
]

/**
 * Deck slide 15/16 card #1 — the 5-way ประเภทผู้ป่วย donut. The percentage rides on the slice and
 * the raw count rides in the legend ("ตรงเปอเซ็นด้านขวา อาจจะเปลี่ยนเป็นจำนวน ราย เพราะเปอเซ็นจะ
 * อยู่ในวงแล้ว"), and the filtered total sits in the hole. The legend is HTML rather than an
 * ECharts legend so the Thai status names wrap instead of being ellipsised.
 */
function PatientStatusCard({ data }: { data: CategoryCount[] }) {
  const [type, setType] = useChartType('s1-patient-status5', 'donut', ['donut', 'pie'])
  const total = useMemo(() => sumValues(data), [data])
  const isDonut = type !== 'pie'

  const option = useMemo(() => {
    return {
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
      color: STATUS5_COLORS,
      legend: { show: false },
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: { name?: string; value?: number }) =>
          `${p.name ?? ''}<br/>${fmt(p.value ?? 0)} ราย (${pctText(p.value ?? 0, total)})`,
      },
      title: isDonut
        ? {
            text: fmt(total),
            subtext: 'เหตุการณ์',
            left: 'center',
            top: 'middle',
            itemGap: 2,
            textStyle: { fontFamily: FONT, fontSize: 32, fontWeight: 'bold' as const, color: '#1E293B' },
            subtextStyle: { fontFamily: FONT, fontSize: LABEL_SIZE, color: '#475569' },
          }
        : undefined,
      series: [
        {
          type: 'pie' as const,
          radius: isDonut ? ['54%', '78%'] : '74%',
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          // The smallest status is 8 of 580 (1.4%): give it a floor so the SLICE stays visible
          // instead of collapsing into the ring. Its percent is not drawn on such a sliver — an
          // inside label there would overflow into its neighbours — the legend row below carries it.
          minAngle: 4,
          itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
          // Deck slide 15: "เปอเซ็นจะอยู่ในวงแล้ว" — the percent rides ON the slice, so it is not
          // repeated on a leader line outside the ring next to the legend that already prints it.
          label: {
            show: true,
            position: 'inside' as const,
            fontFamily: FONT,
            fontSize: LABEL_SIZE,
            fontWeight: 'bold' as const,
            formatter: (p: { value?: number }) =>
              total > 0 && (p.value ?? 0) / total >= MIN_INSIDE_LABEL_SHARE
                ? pctText(p.value ?? 0, total)
                : '',
          },
          labelLine: { show: false },
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            label: { color: readableOn(STATUS5_COLORS[i % STATUS5_COLORS.length]) },
          })),
        },
      ],
    }
  }, [data, total, isDonut])

  return (
    <Card
      title="1. สถานะผู้ป่วย / ผู้ใช้สารเสพติด"
      icon={PieChart}
      accent="s1"
      headerTone="brand"
      right={total > 0 ? <ChartSwitcher options={PIE_SWITCH} current={type} onChange={setType} /> : undefined}
    >
      {total <= 0 ? (
        <EmptyBlock />
      ) : (
        <>
          <div role="img" aria-label="สถานะผู้ป่วย / ผู้ใช้สารเสพติด แผนภูมิ">
            <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge lazyUpdate />
          </div>
          <ul className="mt-4 space-y-2">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: STATUS5_COLORS[i % STATUS5_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 font-medium text-slate-700">{d.name}</span>
                <span className="shrink-0 whitespace-nowrap font-bold tabular-nums text-slate-800">
                  {fmt(d.value)} ราย
                </span>
                <span className="w-16 shrink-0 whitespace-nowrap text-right font-bold tabular-nums text-slate-600">
                  {pctText(d.value, total)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

/** Deck slide 15/16 card #2 — the SEVEN การประเมินกลุ่มผู้ป่วย groups, short labels, all rows on
 *  screen at once (see the height note in CategoryBars). */
function PatientGroup7Card({ data }: { data: CategoryCount[] }) {
  const [type, setType] = useChartType('s1-patient-group7', 'hbar', ['hbar', 'bar', 'pie', 'donut'])
  const total = useMemo(() => sumValues(data), [data])
  return (
    <Card
      title="2. จำแนกประเภทผู้ป่วย (7 กลุ่ม)"
      icon={Users}
      accent="s1"
      headerTone="brand"
      right={total > 0 ? <ChartSwitcher options={BAR_PIE_DONUT_SWITCH} current={type} onChange={setType} /> : undefined}
    >
      <CategoryBars
        data={data}
        total={total}
        orientation={type}
        colors={GROUP7_COLORS}
        maxLabelChars={type === 'bar' ? 11 : 18}
        ariaLabel="จำแนกประเภทผู้ป่วย 7 กลุ่ม"
        height={type === 'bar' ? 420 : type === 'pie' || type === 'donut' ? 360 : undefined}
      />
    </Card>
  )
}

/** Deck slide 18 — ช่วงอายุ as ONE combined series, deliberately NOT split by ชาย/หญิง
 *  ("ไม่ต้องแยก ชาย หญิง มานะ ทำแบบ ภาพรวมเลย"). New widget id: the old s1-age-gender belonged to
 *  a two-series chart whose persisted 'stacked' choice means nothing here. */
function AgeBandCard({ data }: { data: CategoryCount[] }) {
  const [type, setType] = useChartType('s1-age', 'bar', ['bar', 'hbar', 'pie', 'donut'])
  const total = useMemo(() => sumValues(data), [data])
  const ageColors = useMemo(() => AGE_BANDS.map((b) => b.color), [])
  return (
    <Card
      title="ช่วงอายุ ผู้ก่อเหตุ"
      icon={CalendarDays}
      accent="s1"
      headerTone="brand"
      right={total > 0 ? <ChartSwitcher options={BAR_PIE_DONUT_SWITCH} current={type} onChange={setType} /> : undefined}
    >
      <CategoryBars
        data={data}
        total={total}
        orientation={type}
        colors={ageColors}
        maxLabelChars={type === 'hbar' ? 14 : 9}
        ariaLabel="ช่วงอายุ ผู้ก่อเหตุ"
        height={type === 'bar' ? 360 : type === 'pie' || type === 'donut' ? 340 : undefined}
      />
    </Card>
  )
}

/** One titled block inside the suicide module. Plain h4 + chart — the module owns the one card. */
function SubBlock({
  title,
  icon: Icon,
  right,
  children,
  className = '',
}: {
  title: string
  icon: LucideIcon
  right?: ReactNode
  children: ReactNode
  /** Grid placement override — the odd fifth block spans both columns so `lg` has no empty cell. */
  className?: string
}) {
  return (
    <div className={`flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-xs ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Icon size={18} strokeWidth={2.25} className="shrink-0 text-s2-700" aria-hidden />
          {title}
        </h4>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function SocialListeningSection({
  rows,
  zoneMode,
  zone,
  onProvinceClick,
  selectedProvince,
  onClearProvince,
  showMapSideCards = true,
  baselineTotal,
  baselineLabel,
}: SocialListeningSectionProps) {
  const effectiveZone: number | 'all' = zone ?? 'all'
  const isZoneScoped = !!zoneMode && effectiveZone !== 'all'

  const counts = useMemo(() => severityCounts(rows), [rows])
  const risk = useMemo(() => riskFactors(rows), [rows])
  const warn = useMemo(() => warningSigns(rows), [rows])

  // UX-12 — a severity card is a drill-down into the matching records, not just a definition.
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null)
  const handleDrillDown = useCallback((sev: Severity) => {
    setSeverityFilter(sev)
    scrollToWidget('s1-events')
  }, [])

  // SPEC 3.5: "so the lag is visible" is about the whole sheet's coverage, not the current
  // filter/zone selection — a filtered-out newest month would silently hide the very lag this
  // header exists to surface. Read the full, unfiltered rows straight from the shared
  // SheetDataProvider (every page that renders this section sits under it, SPEC 5.1) rather than
  // deriving it from the (possibly filtered/zone-scoped) `rows` prop.
  const { sl: allSl } = useSheetData()

  // UX-02 — the validated reporting period. It ends at the newest month that is not in the future
  // and starts where the contiguous run of reported months leading up to it starts, so a single
  // mistyped early row cannot advertise coverage of months that contain nothing at all.
  const coverage = useMemo(() => coverageWindow(allSl), [allSl])
  const reportedKeys = useMemo(() => reportedMonthKeys(allSl), [allSl])

  const coverageText = useMemo(() => {
    if (!coverage) return 'ยังไม่มีข้อมูล'
    if (coverage.firstLabel === coverage.lastLabel) return `ข้อมูลล่าสุดถึง ${coverage.lastLabel}`
    return `ข้อมูลล่าสุดถึง ${coverage.lastLabel} · ครอบคลุม ${coverage.firstLabel} – ${coverage.lastLabel}`
  }, [coverage])

  // UX-02 — rows dated outside that period at EITHER end are known data-entry errors
  // (BUILD_NOTES). Counted over the rows this section shows, so the number matches the table.
  const outOfPeriod = useMemo(() => outOfPeriodRows(rows, coverage), [rows, coverage])
  const outOfPeriodCount = outOfPeriod.before.length + outOfPeriod.after.length
  const [outOfPeriodOnly, setOutOfPeriodOnly] = useState(false)

  // The trend is clipped to the same validated period the coverage line states, and a month the
  // dataset never reported stays null so the line breaks there instead of asserting a zero
  // (UX-02 fix 4) — a month that WAS reported but has no row in the current filter scope is a
  // real zero and is still plotted as one.
  const trendPoints = useMemo(
    () => monthlyTrend(rows, { fromKey: coverage?.firstKey, toKey: coverage?.lastKey, reportedKeys }),
    [rows, coverage, reportedKeys],
  )
  const trendData = useMemo(
    () => trendPoints.map((p) => ({ name: p.label, value: p.value })),
    [trendPoints],
  )
  const missingMonths = trendPoints.filter((p) => p.missing).length
  // Derived from the plotted points, never a hardcoded fiscal year (UX-02).
  const trendSubtitle =
    trendPoints.length > 0
      ? `ช่วงข้อมูล ${trendPoints[0].label} – ${trendPoints[trendPoints.length - 1].label} (ตรงกับช่วงข้อมูลด้านบน)` +
        (missingMonths > 0
          ? ` · ${missingMonths.toLocaleString('th-TH')} เดือนยังไม่มีรายงาน เว้นเป็นช่องว่าง ไม่ใช่ค่า 0`
          : ' · เดือนที่ไม่มีเหตุการณ์ในขอบเขตนี้แสดงเป็น 0')
      : 'ยังไม่มีข้อมูลรายเดือน'

  const mapData = useMemo(() => provinceCounts(rows), [rows])
  const topProvinces = useMemo(() => topN(rows, (r) => r.province, 10), [rows])

  // Deck slides 15-18 — the restructured breakdowns.
  const patientStatus = useMemo(() => patientStatusCounts(rows), [rows])
  const patientGroup7 = useMemo(() => patientGroup7Counts(rows), [rows])
  const impact = useMemo(() => impactByGroup7(rows), [rows])
  const gender = useMemo(() => genderSplit(rows), [rows])
  const ageBands = useMemo(() => ageBandCounts(rows), [rows])

  const suicideRows = useMemo(() => suicideSubset(rows), [rows])
  const suicideOutcome = useMemo(
    () => countBy(suicideRows, (r) => r.suicide, CATEGORY_ORDERS.suicide),
    [suicideRows],
  )
  // Deck slide 20 shrinks the location chart from 10 rows to SUICIDE_TOP_N, matching cause and method.
  const suicideLocation = useMemo(
    () => topN(suicideRows, (r) => r.suicideLocation, SUICIDE_TOP_N),
    [suicideRows],
  )
  const suicideGender = useMemo(() => genderSplit(suicideRows), [suicideRows])
  // CATEGORY_ORDERS.suicideAgeGroup, not a local array: normalize.ts rewrites the raw under-18
  // value to 'ต่ำกว่า 18 ปี' (deck slide 20 wants the 'ปี'), and a stale local order missing that
  // spelling would push every under-18 row into an appended extra category instead.
  const suicideAgeSplit = useMemo(
    () =>
      countBy(suicideRows, (r) => r.suicideAgeGroup, CATEGORY_ORDERS.suicideAgeGroup).map((c) => ({
        label: c.name,
        value: c.value,
      })),
    [suicideRows],
  )
  const suicideCause = useMemo(
    () => topN(suicideRows, (r) => r.suicideCause, SUICIDE_TOP_N),
    [suicideRows],
  )
  const suicideMethod = useMemo(
    () => topN(suicideRows, (r) => r.suicideMethod, SUICIDE_TOP_N),
    [suicideRows],
  )

  // Deck slide 20's three ranked blocks. Each heading states the number of bars actually drawn —
  // topN() returns FEWER than SUICIDE_TOP_N whenever the filtered subset has fewer distinct values
  // (routine on ZonePage or under a single-month filter), and "5 อันดับสูงสุด" over 2 bars lies.
  const suicideCauseTitle = topTitle('สาเหตุการฆ่าตัวตาย', suicideCause.length)
  const suicideLocationTitle = topTitle('สถานที่เกิดเหตุ', suicideLocation.length)
  const suicideMethodTitle = topTitle('วิธีการฆ่าตัวตาย', suicideMethod.length)

  // UX-13 — every top-N chart above hides part of its distribution, so its percentages need the
  // full total as their base, not the sum of the bars that happen to be drawn. countBy() also
  // drops blank/'-' cells, so each of these bases is SMALLER than the module's event count (e.g.
  // 106 causes recorded across 108 suicide events) — which is why every block prints its own base
  // in a DenominatorNote below its chart instead of leaving the reader to assume the header's
  // "N เหตุการณ์" is the divisor. The three bases differ; none of them may be shared.
  const provinceTotal = useMemo(() => sumValues(mapData), [mapData])
  const suicideOutcomeTotal = useMemo(() => sumValues(suicideOutcome), [suicideOutcome])
  const suicideLocationTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideLocation)),
    [suicideRows],
  )
  const suicideCauseTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideCause)),
    [suicideRows],
  )
  const suicideMethodTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideMethod)),
    [suicideRows],
  )

  const [outcomeType, setOutcomeType] = useChartType('s1-suicide-outcome', 'hbar', ['hbar', 'pie', 'donut'])
  const [causeType, setCauseType] = useChartType('s1-suicide-cause', 'hbar', ['hbar', 'pie', 'donut'])
  const [locationType, setLocationType] = useChartType('s1-suicide-location', 'hbar', ['hbar', 'pie', 'donut'])
  const [methodType, setMethodType] = useChartType('s1-suicide-method', 'hbar', ['hbar', 'pie', 'donut'])

  // SPEC 6.4 item 3: zone-scoped -> one bar per province of that zone, same widget id.
  const zoneEventsData = useMemo(() => {
    if (isZoneScoped) return countBy(rows, (r) => r.province, ZONE_PROVINCES[effectiveZone as number] ?? [])
    return zoneCounts(rows)
  }, [rows, isZoneScoped, effectiveZone])
  const zoneEventsTitle = isZoneScoped ? 'จำนวนเหตุการณ์รายจังหวัด (กราฟ)' : 'จำนวนเหตุการณ์รายเขตสุขภาพ'
  const zoneEventsSubtitle = isZoneScoped
    ? `เขตสุขภาพที่ ${effectiveZone} · ${(ZONE_PROVINCES[effectiveZone as number] ?? []).length} จังหวัด`
    : '13 เขตสุขภาพ'

  const titleSuffix = zoneMode ? (effectiveZone === 'all' ? ' (ภาพรวม)' : ` (เขตสุขภาพที่ ${effectiveZone})`) : ''

  return (
    <section id="section-1" className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
            <Megaphone className="text-s1-600" size={26} strokeWidth={2.25} />
            ข้อมูล Social Listening{titleSuffix}
          </h2>
          <p className="text-sm font-medium text-slate-600">{coverageText}</p>
        </div>

        {coverage && outOfPeriodCount > 0 && (
          <div className="flex flex-wrap items-start gap-2 rounded-card border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <AlertTriangle size={16} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
            <p className="min-w-[16rem] flex-1">
              {`พบ ${outOfPeriodCount.toLocaleString('th-TH')} รายการนอกช่วงข้อมูล ${coverage.firstLabel} – ${coverage.lastLabel}`}
              {outOfPeriod.before.length > 0 &&
                ` · ก่อนช่วง ${outOfPeriod.before.length.toLocaleString('th-TH')} รายการ`}
              {outOfPeriod.after.length > 0 &&
                ` · หลังช่วง ${outOfPeriod.after.length.toLocaleString('th-TH')} รายการ`}
              {' (อาจเป็นข้อผิดพลาดในการกรอกข้อมูล) — ไม่นับรวมในกราฟแนวโน้ม แต่ยังแสดงในตารางพร้อมเครื่องหมาย “นอกช่วงข้อมูล” เพื่อการตรวจสอบ'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOutOfPeriodOnly(true)
                scrollToWidget('s1-events')
              }}
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-amber-500 bg-white px-4 py-1.5 text-sm font-bold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              ดูเฉพาะรายการที่ต้องตรวจสอบ
            </button>
          </div>
        )}
      </div>

      <div className={GRID}>
        {/* 1 — KPI severity cards (drill-down into the records below) */}
        <Span className={FULL}>
          <KpiCards
            section={1}
            counts={counts}
            onDrillDown={handleDrillDown}
            activeSeverity={severityFilter}
          />
        </Span>

        {/* 2 — the two headline infographics, side by side (deck slides 13-14) */}
        <Span className={HALF}>
          <RiskWarning kind="risk" data={risk} />
        </Span>
        <Span className={HALF}>
          <RiskWarning kind="sign" data={warn} />
        </Span>

        {/* 3 — monthly trend */}
        <Span className={FULL}>
          <SwitchableChart
            widgetId="s1-trend"
            headerTone="brand"
            title="แนวโน้มรายเดือน"
            subtitle={trendSubtitle}
            icon={TrendingUp}
            data={trendData}
            defaultType="line"
            allowedTypes={['line', 'area', 'bar']}
            accent="s1"
            height={360}
            unit="เหตุการณ์"
            categoryHeader="เดือน"
          />
        </Span>

        {/* 4 — events-per-province map (with companion Selected Area + Top 10 cards) */}
        <Span className={FULL}>
          <ThailandMap
            mode={zoneMode ? 'zone' : 'country'}
            zone={effectiveZone}
            data={mapData}
            title="จำนวนเหตุการณ์รายจังหวัด"
            headerTone="brand"
            accent="s1"
            onProvinceClick={onProvinceClick}
            selectedProvince={selectedProvince}
            onClearProvince={onClearProvince}
            topProvinces={topProvinces}
            showSideCards={showMapSideCards}
            baselineTotal={baselineTotal}
            baselineLabel={baselineLabel}
          />
        </Span>

        {/* 4b — top 10 provinces (rendered when the map's side cards are not shown) */}
        {!showMapSideCards && (
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-top-provinces"
              headerTone="brand"
              title="10 อันดับจังหวัด"
              icon={MapPin}
              data={topProvinces}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar', 'pie', 'donut']}
              accent="s1"
              total={provinceTotal}
              unit="เหตุการณ์"
              categoryHeader="จังหวัด"
            />
          </Span>
        )}

        {/* 4c — events by zone / (zone mode) by province */}
        <Span className={FULL}>
          <SwitchableChart
            widgetId="s1-zone-events"
            headerTone="brand"
            title={zoneEventsTitle}
            subtitle={zoneEventsSubtitle}
            icon={MapIcon}
            data={zoneEventsData}
            defaultType="bar"
            allowedTypes={['bar', 'hbar']}
            accent="s1"
            unit="เหตุการณ์"
            categoryHeader={isZoneScoped ? 'จังหวัด' : 'เขตสุขภาพ'}
          />
        </Span>

        {/* 5 — patient status donut + 7-group bar (deck slides 15-16) */}
        <Span className={HALF}>
          <PatientStatusCard data={patientStatus} />
        </Span>
        <Span className={HALF}>
          <PatientGroup7Card data={patientGroup7} />
        </Span>

        {/* 6 — deaths / injured compared across the 7 groups (deck slide 17) */}
        <Span className={FULL}>
          <GroupImpactTable widgetId="s1-impact-group7" rows={impact} />
        </Span>

        {/* 7 — gender + age (deck slide 18) */}
        <Span className={HALF}>
          <GenderFigure title="เพศ" data={gender} icon={Users2} headerTone="brand" />
        </Span>
        <Span className={HALF}>
          <AgeBandCard data={ageBands} />
        </Span>

        {/* 8 — the whole suicide picture in ONE framed module (deck slide 20) */}
        <Span className={FULL}>
          <Card
            title="สถานการณ์การฆ่าตัวตาย"
            subtitle={`${fmt(suicideRows.length)} เหตุการณ์ในขอบเขตฟิลเตอร์`}
            icon={HeartPulse}
            accent="s1"
            headerTone="brand"
          >
            {suicideRows.length === 0 ? (
              <EmptyBlock />
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SubBlock
                  title="ฆ่าตัวตาย สำเร็จ / ไม่สำเร็จ"
                  icon={Activity}
                  right={<ChartSwitcher options={TOPN_SWITCH} current={outcomeType} onChange={setOutcomeType} size="sm" />}
                >
                  <CategoryBars
                    data={suicideOutcome}
                    total={suicideOutcomeTotal}
                    orientation={outcomeType}
                    colors={[PALETTE.suicide.success, PALETTE.suicide.fail]}
                    maxLabelChars={16}
                    ariaLabel={`ฆ่าตัวตาย สำเร็จ ไม่สำเร็จ ${outcomeType === 'hbar' ? 'แผนภูมิแท่ง' : 'แผนภูมิวงกลม'}`}
                  />
                </SubBlock>

                <SubBlock title="เพศและช่วงอายุ" icon={UserRound}>
                  <GenderFigure title="เพศและช่วงอายุ" data={suicideGender} ageSplit={suicideAgeSplit} bare />
                </SubBlock>

                <SubBlock
                  title={suicideCauseTitle}
                  icon={AlertOctagon}
                  right={<ChartSwitcher options={TOPN_SWITCH} current={causeType} onChange={setCauseType} size="sm" />}
                >
                  <CategoryBars
                    data={suicideCause}
                    total={suicideCauseTotal}
                    orientation={causeType}
                    maxLabelChars={16}
                    ariaLabel={`${suicideCauseTitle} ${causeType === 'hbar' ? 'แผนภูมิแท่ง' : 'แผนภูมิวงกลม'}`}
                  />
                  {suicideCauseTotal > 0 && (
                    <DenominatorNote className="mt-3">
                      {`ฐาน ${fmt(suicideCauseTotal)} ราย ที่ระบุสาเหตุ`}
                    </DenominatorNote>
                  )}
                </SubBlock>

                <SubBlock
                  title={suicideLocationTitle}
                  icon={MapPinned}
                  right={<ChartSwitcher options={TOPN_SWITCH} current={locationType} onChange={setLocationType} size="sm" />}
                >
                  <CategoryBars
                    data={suicideLocation}
                    total={suicideLocationTotal}
                    orientation={locationType}
                    maxLabelChars={16}
                    ariaLabel={`${suicideLocationTitle} ${locationType === 'hbar' ? 'แผนภูมิแท่ง' : 'แผนภูมิวงกลม'}`}
                  />
                  {suicideLocationTotal > 0 && (
                    <DenominatorNote className="mt-3">
                      {`ฐาน ${fmt(suicideLocationTotal)} ราย ที่ระบุสถานที่เกิดเหตุ`}
                    </DenominatorNote>
                  )}
                </SubBlock>

                <SubBlock
                  title={suicideMethodTitle}
                  icon={ListChecks}
                  className="lg:col-span-2"
                  right={<ChartSwitcher options={TOPN_SWITCH} current={methodType} onChange={setMethodType} size="sm" />}
                >
                  <CategoryBars
                    data={suicideMethod}
                    total={suicideMethodTotal}
                    orientation={methodType}
                    maxLabelChars={16}
                    ariaLabel={`${suicideMethodTitle} ${methodType === 'hbar' ? 'แผนภูมิแท่ง' : 'แผนภูมิวงกลม'}`}
                  />
                  {suicideMethodTotal > 0 && (
                    <DenominatorNote className="mt-3">
                      {`ฐาน ${fmt(suicideMethodTotal)} ราย ที่ระบุวิธีการ`}
                    </DenominatorNote>
                  )}
                </SubBlock>
              </div>
            )}

            {/* Deck slide 20's reference art carries a helpline strip; deliberately quiet, so it
                supports the reader without competing with the data above it. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2 font-bold text-slate-800">
                <LifeBuoy size={18} strokeWidth={2.25} className="text-s2-700" aria-hidden />
                ขอความช่วยเหลือได้ที่
              </span>
              <span>
                สายด่วนสุขภาพจิต <strong className="tabular-nums">1323</strong>
              </span>
            </div>
          </Card>
        </Span>

        {/* 9 — events table: the records behind every number above */}
        <Span className={FULL}>
          <EventsTable
            section={1}
            sl={rows}
            id="s1-events"
            // Deck slide 9: every card on the page carries the filled title band, and Section 2's
            // identically-titled ตารางเหตุการณ์ already does.
            headerTone="brand"
            severityFilter={severityFilter}
            onClearSeverityFilter={() => setSeverityFilter(null)}
            coverage={coverage}
            outOfPeriodOnly={outOfPeriodOnly}
            onToggleOutOfPeriodOnly={setOutOfPeriodOnly}
          />
        </Span>
      </div>
    </section>
  )
}
