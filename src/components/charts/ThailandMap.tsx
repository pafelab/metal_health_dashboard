// Choropleth map of Thailand (SPEC 6.1 widget 5 / SPEC 6.2 widget 2 / SPEC 6.4 item 2).
// Frozen contract — see task brief. No switcher (SPEC 7): maps are not chart-type-switchable.

import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CategoryCount } from '@/types'
import { ZONE_PROVINCES } from '@/config'
import Card from '@/components/layout/Card'
// eslint-disable-next-line import/no-unresolved
import geoRaw from '@/assets/thailand.json'
import { LABEL_SIZE } from '@/components/charts/chartOptions'

const FONT = 'Poppins, Prompt, sans-serif'

interface GeoFeature {
  type: string
  properties: { name: string; nameEn?: string }
  geometry: unknown
}
interface GeoFeatureCollection {
  type: string
  features: GeoFeature[]
}

const geo = geoRaw as unknown as GeoFeatureCollection

const COUNTRY_MAP_NAME = 'thailand'

/** Guards echarts.registerMap against being called twice for the same name. */
const registeredMaps = new Set<string>()

function ensureMapRegistered(name: string, fc: GeoFeatureCollection): void {
  if (registeredMaps.has(name)) return
  echarts.registerMap(name, fc as unknown as Parameters<typeof echarts.registerMap>[1])
  registeredMaps.add(name)
}

function zoneFeatureCollection(zone: number): GeoFeatureCollection {
  const provinces = new Set(ZONE_PROVINCES[zone] ?? [])
  return {
    type: 'FeatureCollection',
    features: geo.features.filter((f) => provinces.has(f.properties.name)),
  }
}

export interface ThailandMapBucket {
  min: number
  max: number | null
  color: string
  label: string
}

/**
 * Named bucket sets for the two SPEC-defined density scales, exported so section-owning
 * components don't have to hand-roll the same five colour stops (SPEC 6.1 widget 5 / 6.2
 * widget 2). Colours are the s1/s2 Tailwind ramp (300→700), darker = more, per SPEC 8.
 */
export const SECTION1_MAP_BUCKETS: ThailandMapBucket[] = [
  { min: 1, max: 15, color: '#FDBA74', label: '1-15' },
  { min: 16, max: 30, color: '#FB923C', label: '16-30' },
  { min: 31, max: 45, color: '#F97316', label: '31-45' },
  { min: 46, max: 60, color: '#EA580C', label: '46-60' },
  { min: 61, max: null, color: '#C2410C', label: '≥61' },
]

export const SECTION2_MAP_BUCKETS: ThailandMapBucket[] = [
  { min: 1, max: 3, color: '#93C5FD', label: '1-3' },
  { min: 4, max: 6, color: '#60A5FA', label: '4-6' },
  { min: 7, max: 9, color: '#3B82F6', label: '7-9' },
  { min: 10, max: 12, color: '#2563EB', label: '10-12' },
  { min: 13, max: null, color: '#1D4ED8', label: '≥13' },
]

export interface ThailandMapProps {
  mode: 'country' | 'zone'
  zone?: number | 'all'
  data: CategoryCount[]
  buckets: ThailandMapBucket[]
  title: string
  subtitle?: string
  accent: 's1' | 's2'
  onProvinceClick?: (province: string) => void
  height?: number
}

export default function ThailandMap(p: ThailandMapProps): JSX.Element {
  const height = p.height ?? 480
  const isZoneScoped = p.mode === 'zone' && typeof p.zone === 'number'

  // Register (once) and pick the map name + province count for the current scope.
  const { mapName, provinceCount } = useMemo(() => {
    if (isZoneScoped) {
      const zoneNum = p.zone as number
      const name = `zone-${zoneNum}`
      ensureMapRegistered(name, zoneFeatureCollection(zoneNum))
      return { mapName: name, provinceCount: (ZONE_PROVINCES[zoneNum] ?? []).length }
    }
    ensureMapRegistered(COUNTRY_MAP_NAME, geo)
    return { mapName: COUNTRY_MAP_NAME, provinceCount: geo.features.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isZoneScoped, p.zone])

  const option = useMemo<EChartsOption>(() => {
    const noDataColor = '#F1F5F9'
    return {
      textStyle: { fontFamily: FONT },
      tooltip: {
        trigger: 'item',
        textStyle: { fontFamily: FONT, fontSize: 14 },
        confine: true,
        formatter: (params: any) => {
          const value = typeof params.value === 'number' ? params.value : 0
          return `${params.name}<br/>${value.toLocaleString('en-US')} เหตุการณ์`
        },
      },
      visualMap: {
        type: 'piecewise',
        pieces: p.buckets.map((b) => ({
          min: b.min,
          max: b.max ?? undefined,
          label: b.label,
          color: b.color,
        })),
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 14,
        textStyle: { fontFamily: FONT, fontSize: LABEL_SIZE, color: '#475569' },
        outOfRange: { color: noDataColor },
        showLabel: true,
      },
      series: [
        {
          name: p.title,
          type: 'map',
          map: mapName,
          roam: false,
          left: 8,
          right: 8,
          top: 8,
          bottom: 48,
          label: { show: false },
          itemStyle: { areaColor: noDataColor, borderColor: '#CBD5E1', borderWidth: 1 },
          emphasis: {
            label: { show: true, fontFamily: FONT, fontSize: LABEL_SIZE, color: '#0F172A' },
            itemStyle: { areaColor: '#FDE68A' },
          },
          select: { itemStyle: { areaColor: '#FDE68A' } },
          data: p.data.map((d) => ({ name: d.name, value: d.value })),
        },
      ],
    }
  }, [mapName, p.buckets, p.data, p.title])

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.componentType === 'series' && typeof params.name === 'string' && p.onProvinceClick) {
          p.onProvinceClick(params.name)
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.onProvinceClick],
  )

  // SPEC: subtitle shows 'N จังหวัด'. If the caller already supplies one (they may, per the
  // frozen `subtitle?` prop), respect it rather than rendering the count twice.
  const subtitle = p.subtitle ?? `${provinceCount} จังหวัด`

  return (
    <Card title={p.title} subtitle={subtitle} accent={p.accent}>
      <ReactECharts option={option} onEvents={onEvents} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </Card>
  )
}
