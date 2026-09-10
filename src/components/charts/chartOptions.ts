// Pure ECharts option builders shared by SwitchableChart and MultiSeriesChart.
// No React, no side effects — every function here takes data + params and returns a plain
// EChartsOption object. SPEC 7 (count + percent labels in every chart type) and SPEC 8
// (Sarabun, 14px labels, generous padding, wrap long Thai names) are enforced centrally here.

import type { EChartsOption } from 'echarts'
import type { ChartType } from '@/types'
import { PALETTE } from '@/config'

export const FONT = 'Poppins, Prompt, sans-serif'
export const LABEL_SIZE = 14

/** Above this many slices a pie/donut/rose can no longer fit "name + count + percent" on the
 *  plot without the labels colliding, so the percent moves to the tooltip and the data table
 *  (audit UX-13: "move secondary percentage labels into accessible details when labels crowd"). */
const CROWDED_SLICE_COUNT = 6

/** True when the visitor asked the OS for reduced motion — charts then render without animation. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Formats "123 (45.6%)" — SPEC 4.5 / SPEC 7. Guards against a zero denominator. */
export function formatCountPercent(value: number, total: number): string {
  const count = Number.isFinite(value) ? value : 0
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return `${count.toLocaleString('en-US')} (${pct}%)`
}

/**
 * Splits a string into grapheme clusters so a Thai combining mark (สระ/วรรณยุกต์ — ิ ี ึ ื ุ ู ั
 * ่ ้ ๊ ๋ ์ ำ) never gets separated from the consonant it attaches to. Prefers Intl.Segmenter
 * (handles ำ correctly as a spacing mark); the regex fallback lists ำ explicitly alongside \p{M}
 * since it is category Lo, not Mn, but still must stay glued to the preceding base character.
 */
function graphemes(s: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, opts: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter
  if (Segmenter) {
    return Array.from(new Segmenter('th', { granularity: 'grapheme' }).segment(s), (x) => x.segment)
  }
  return s.match(/[^\p{M}ำ][\p{M}ำ]*/gu) ?? [s]
}

/** Inserts soft line breaks into long Thai category names instead of letting them clip. */
export function wrapThaiLabel(name: string, maxCharsPerLine = 12): string {
  const clusters = graphemes(name)
  if (clusters.length <= maxCharsPerLine) return name

  // If there's a space (e.g. "มากกว่า 60" or "ผู้ป่วย SMI-V"), prefer breaking at the space
  if (name.includes(' ')) {
    const spaceIdx = name.lastIndexOf(' ')
    const first = name.slice(0, spaceIdx).trim()
    const second = name.slice(spaceIdx + 1).trim()
    if (first && second && graphemes(second).length <= maxCharsPerLine) {
      return `${first}\n${second}`
    }
  }

  const chunks: string[] = []
  for (let i = 0; i < clusters.length; i += maxCharsPerLine) {
    chunks.push(clusters.slice(i, i + maxCharsPerLine).join(''))
  }
  return chunks.join('\n')
}

/**
 * One plotted datum. `value: null` means "not reported" — echarts leaves a break in the line
 * instead of drawing a point, which is how UX-02 asks missing months to differ from real zeros.
 * CategoryCount[] is assignable to ChartDatum[], so existing callers are unaffected.
 */
export interface ChartDatum {
  name: string
  value: number | null
}

/** '—' in a tooltip/table: the month exists on the axis but carries no report at all (UX-02). */
export const NO_DATA_TEXT = 'ไม่มีรายงาน'

function sumValues(data: ChartDatum[]): number {
  return data.reduce((acc, d) => acc + (typeof d.value === 'number' && Number.isFinite(d.value) ? d.value : 0), 0)
}

const baseTextStyle = { fontFamily: FONT, fontSize: LABEL_SIZE }

const baseTooltip: EChartsOption['tooltip'] = {
  textStyle: baseTextStyle,
  confine: true,
}

export interface ChartOptionParams {
  data: ChartDatum[]
  seriesName?: string
  valueSuffix?: string
  total?: number
  /** Multi-slice palette (pie/donut/rose/treemap/funnel). Defaults to PALETTE.categorical. */
  colors?: string[]
  /** Single-series accent (bar/hbar/line/area/step). Defaults to PALETTE.section1. */
  accentColor?: string
  /** [start, end] gradient stops for the area fill. Defaults to PALETTE.gradients.section1. */
  gradient?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function labelFormatterFor(total: number, suffix: string) {
  // ECharts' own formatter callback param union is deeply overloaded per series type; `any`
  // here is the pragmatic choice every echarts+TS integration makes rather than fighting it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (params: any): string => {
    const raw = typeof params?.value === 'number' ? params.value : (params?.data?.value ?? 0)
    return formatCountPercent(raw, total) + suffix
  }
}

/** Builds the option for one of the "category axis" shapes: bar / hbar / line / area / step. */
function buildAxisOption(
  kind: 'bar' | 'hbar' | 'line' | 'area' | 'step',
  { data, total, valueSuffix = '', accentColor, gradient, seriesName }: ChartOptionParams,
): EChartsOption {
  const denom = total ?? sumValues(data)
  const names = data.map((d) => d.name)
  const values = data.map((d) => d.value)
  const color = accentColor ?? PALETTE.section1
  const gradStops = gradient ?? PALETTE.gradients.section1
  const labelFmt = labelFormatterFor(denom, valueSuffix)
  const isVerticalBar = kind !== 'hbar' && !(kind === 'line' || kind === 'area' || kind === 'step')
  // Rotate a crowded vertical category axis rather than let wrapped labels collide.
  const rotate = isVerticalBar && names.length > 6 ? 30 : 0

  // Plain (untyped-against-EChartsOption) objects: category/value axes get swapped between the
  // x and y slots below (hbar flips them), and XAXisOption/YAXisOption are nominally distinct
  // even though structurally compatible, so we build these loosely and cast the final option.
  const categoryAxis = {
    type: 'category',
    data: names,
    axisLabel: {
      fontFamily: FONT,
      fontSize: LABEL_SIZE,
      interval: 0,
      rotate,
      formatter: (v: string) => (rotate ? v : wrapThaiLabel(v)),
      hideOverlap: false,
    },
    axisTick: { alignWithLabel: true },
  }
  const valueAxis = {
    type: 'value',
    axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE },
    splitLine: { lineStyle: { color: '#EEF2F7' } },
  }

  const isHorizontal = kind === 'hbar'
  const isLineFamily = kind === 'line' || kind === 'area' || kind === 'step'

  const series = [
    {
      name: seriesName ?? 'series1',
      type: isLineFamily ? 'line' : 'bar',
      data: values,
      step: kind === 'step' ? 'middle' : undefined,
      smooth: false,
      symbol: isLineFamily ? 'circle' : undefined,
      symbolSize: isLineFamily ? 8 : undefined,
      barMaxWidth: 48,
      itemStyle: { color, borderRadius: kind === 'bar' ? [6, 6, 0, 0] : kind === 'hbar' ? [0, 6, 6, 0] : 0 },
      lineStyle: isLineFamily ? { color, width: 3 } : undefined,
      areaStyle:
        kind === 'area'
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: gradStops[1] + 'CC' },
                  { offset: 1, color: gradStops[0] + '11' },
                ],
              },
            }
          : undefined,
      label: {
        show: true,
        position: isHorizontal ? 'right' : 'top',
        fontFamily: FONT,
        fontSize: LABEL_SIZE,
        color: '#334155',
        formatter: (p: any) => {
          const val = typeof p?.value === 'number' ? p.value : (p?.data?.value ?? 0)
          if (!val || val <= 0) return ''
          return labelFmt(p)
        },
      },
    },
  ]

  return {
    textStyle: baseTextStyle,
    animation: !prefersReducedMotion(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tooltip: { ...baseTooltip, trigger: 'axis', formatter: (p: any) => {
      const item = Array.isArray(p) ? p[0] : p
      const idx = item?.dataIndex ?? 0
      const v = values[idx]
      // A null datum is a month with no report at all — never present it as "0 (0.0%)".
      return `${names[idx]}<br/>${v == null ? NO_DATA_TEXT : labelFmt({ value: v })}`
    } },
    grid: isHorizontal
      ? { left: 16, right: 90, top: 24, bottom: 16, containLabel: true }
      : { left: 16, right: 24, top: 40, bottom: 48, containLabel: true },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series,
  } as EChartsOption
}

const HEX6_RE = /^#[0-9a-f]{6}$/i

/** Light-to-saturated radial gradient derived from a slice's own categorical colour, so each
 *  slice keeps its identity but gains the 'มีมิติ' depth SPEC 8 asks for (palette.ts:59). Only
 *  applied to plain 6-digit hex — a caller-supplied colour in some other form (named colour,
 *  rgba(), an ECharts gradient object already) is passed through flat rather than mangled. */
function sliceGradient(hex: string): string | { type: 'radial'; x: number; y: number; r: number; colorStops: { offset: number; color: string }[] } {
  if (!HEX6_RE.test(hex)) return hex
  return {
    type: 'radial',
    x: 0.5,
    y: 0.5,
    r: 0.5,
    colorStops: [
      { offset: 0, color: hex + 'B3' },
      { offset: 1, color: hex },
    ],
  }
}

/** Builds pie / donut / rose. */
function buildPieFamilyOption(
  kind: 'pie' | 'donut' | 'rose',
  { data, total, valueSuffix = '', colors }: ChartOptionParams,
): EChartsOption {
  const denom = total ?? sumValues(data)
  const labelFmt = labelFormatterFor(denom, valueSuffix)
  const palette = colors ?? PALETTE.categorical
  const crowded = data.length > CROWDED_SLICE_COUNT
  // Crowded plot: keep the count on the slice, drop the percent (still in tooltip + table).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sliceLabel = (p: any): string =>
    crowded
      ? `${p.name}\n${(typeof p.value === 'number' ? p.value : 0).toLocaleString('en-US')}${valueSuffix}`
      : `${p.name}\n${labelFmt({ value: p.value })}`

  return {
    textStyle: baseTextStyle,
    animation: !prefersReducedMotion(),
    color: palette,
    tooltip: { ...baseTooltip, trigger: 'item', formatter: (p: any) => `${p.name}<br/>${labelFmt({ value: p.value })}` },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE },
    },
    series: [
      {
        name: 'series1',
        type: 'pie',
        radius: kind === 'donut' ? ['45%', '70%'] : kind === 'rose' ? ['20%', '72%'] : '68%',
        center: ['50%', '46%'],
        roseType: kind === 'rose' ? 'radius' : undefined,
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        data: data.map((d, i) => ({
          name: d.name,
          value: d.value ?? 0,
          itemStyle: { color: sliceGradient(palette[i % palette.length]) },
        })),
        label: {
          fontFamily: FONT,
          fontSize: LABEL_SIZE,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (p: any) => sliceLabel(p),
        },
        labelLine: { length: 10, length2: 10 },
      },
    ],
  }
}

function buildTreemapOption({ data, total, valueSuffix = '', colors }: ChartOptionParams): EChartsOption {
  const denom = total ?? sumValues(data)
  const labelFmt = labelFormatterFor(denom, valueSuffix)
  const palette = colors ?? PALETTE.categorical
  return {
    textStyle: baseTextStyle,
    animation: !prefersReducedMotion(),
    color: palette,
    tooltip: { ...baseTooltip, formatter: (p: any) => `${p.name}<br/>${labelFmt({ value: p.value })}` },
    series: [
      {
        name: 'series1',
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        upperLabel: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        label: {
          fontFamily: FONT,
          fontSize: LABEL_SIZE,
          color: '#1E293B',
          formatter: (p: any) => `${p.name}\n${labelFmt({ value: p.value })}`,
        },
        data: data.map((d) => ({ name: d.name, value: d.value ?? 0 })),
      },
    ],
  }
}

function buildFunnelOption({ data, total, valueSuffix = '', colors }: ChartOptionParams): EChartsOption {
  const denom = total ?? sumValues(data)
  const labelFmt = labelFormatterFor(denom, valueSuffix)
  const palette = colors ?? PALETTE.categorical
  return {
    textStyle: baseTextStyle,
    animation: !prefersReducedMotion(),
    color: palette,
    tooltip: { ...baseTooltip, trigger: 'item', formatter: (p: any) => `${p.name}<br/>${labelFmt({ value: p.value })}` },
    series: [
      {
        name: 'series1',
        type: 'funnel',
        sort: 'none',
        left: 16,
        right: 16,
        top: 16,
        bottom: 16,
        minSize: '10%',
        maxSize: '100%',
        gap: 4,
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        label: {
          fontFamily: FONT,
          fontSize: LABEL_SIZE,
          formatter: (p: any) => `${p.name}  ${labelFmt({ value: p.value })}`,
        },
        data: data.map((d) => ({ name: d.name, value: d.value ?? 0 })),
      },
    ],
  }
}

/**
 * Single-series option builder used by SwitchableChart. Covers bar, hbar, line, area, step,
 * pie, donut, rose, treemap, funnel. An unrecognised type (e.g. 'table', or 'stacked' — which
 * has no meaning for a single series) falls back to 'bar' rather than throwing.
 */
export function buildChartOption(type: ChartType, params: ChartOptionParams): EChartsOption {
  switch (type) {
    case 'bar':
    case 'hbar':
    case 'line':
    case 'area':
    case 'step':
      return buildAxisOption(type, params)
    case 'pie':
    case 'donut':
    case 'rose':
      return buildPieFamilyOption(type, params)
    case 'treemap':
      return buildTreemapOption(params)
    case 'funnel':
      return buildFunnelOption(params)
    default:
      return buildAxisOption('bar', params)
  }
}

export interface MultiSeriesOptionParams {
  categories: string[]
  series: { name: string; data: number[]; color?: string }[]
  total?: number
  valueSuffix?: string
}

/**
 * Multi-series option builder used by MultiSeriesChart (grouped bar / grouped hbar / stacked
 * bar). Falls back to grouped 'bar' for any other requested type.
 */
export function buildMultiSeriesOption(
  type: ChartType,
  { categories, series, total, valueSuffix = '' }: MultiSeriesOptionParams,
): EChartsOption {
  const denom = total ?? series.reduce((acc, s) => acc + s.data.reduce((a, v) => a + (v || 0), 0), 0)
  const labelFmt = labelFormatterFor(denom, valueSuffix)
  const stacked = type === 'stacked'
  const isHorizontal = type === 'hbar'
  const palette = series.map((s, i) => s.color ?? PALETTE.categorical[i % PALETTE.categorical.length])

  // See buildAxisOption's comment: built loosely, cast at the return below.
  const categoryAxis = {
    type: 'category',
    data: categories,
    axisLabel: {
      fontFamily: FONT,
      fontSize: LABEL_SIZE,
      interval: 0,
      formatter: (v: string) => wrapThaiLabel(v),
    },
    axisTick: { alignWithLabel: true },
  }
  const valueAxis = {
    type: 'value',
    axisLabel: { fontFamily: FONT, fontSize: LABEL_SIZE },
    splitLine: { lineStyle: { color: '#EEF2F7' } },
  }

  const seriesOut = series.map((s, i) => ({
    name: s.name,
    type: 'bar',
    stack: stacked ? 'total' : undefined,
    barMaxWidth: stacked ? 56 : 36,
    data: s.data,
    itemStyle: {
      color: palette[i],
      borderRadius: stacked
        ? undefined
        : isHorizontal
        ? [0, 4, 4, 0]
        : [4, 4, 0, 0],
    },
    label: {
      show: true,
      position: isHorizontal ? 'right' : stacked ? 'inside' : 'top',
      fontFamily: FONT,
      fontSize: stacked ? 12 : LABEL_SIZE,
      color: stacked ? '#ffffff' : '#334155',
      textShadowColor: stacked ? 'rgba(0, 0, 0, 0.45)' : undefined,
      textShadowBlur: stacked ? 3 : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => {
        const val = typeof p?.value === 'number' ? p.value : (p?.data?.value ?? 0)
        if (!val || val <= 0) return ''
        const pct = denom > 0 ? ((val / denom) * 100).toFixed(1) : '0.0'
        if (isHorizontal) {
          return `${val.toLocaleString('en-US')} (${pct}%)${valueSuffix}`
        }
        return `${val.toLocaleString('en-US')}\n(${pct}%)${valueSuffix}`
      },
    },
    // Thin stacked segments can't fit "123 (45.6%)" — drop the label rather than overlap it.
    labelLayout: { hideOverlap: true },
  }))

  return {
    textStyle: baseTextStyle,
    animation: !prefersReducedMotion(),
    color: palette,
    tooltip: {
      ...baseTooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params]
        const cat = list[0]?.axisValueLabel ?? list[0]?.name ?? ''
        const lines = list.map((p: any) => `${p.marker} ${p.seriesName}: ${labelFmt({ value: p.value })}`)
        return [cat, ...lines].join('<br/>')
      },
    },
    legend: { top: 0, textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE } },
    grid: isHorizontal
      ? { left: 16, right: 100, top: 40, bottom: 16, containLabel: true }
      : { left: 16, right: 24, top: 48, bottom: 48, containLabel: true },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series: seriesOut,
  } as EChartsOption
}
