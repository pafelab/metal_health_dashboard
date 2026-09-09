// Choropleth map of Thailand (SPEC 6.1 widget 5 / SPEC 6.2 widget 2 / SPEC 6.4 item 2).
// Modern design matching Mental Health Dashboard (standalone).html:
// - Continuous vertical visualMap legend bar
// - Clean white province borders (#FFFFFF, 0.8px)
// - Sleek neutral slate base (#EDF1F6) with high-contrast hover (#1E293B)
// - Zoom 1.15 for optimal container filling
// - Optional companion side cards (Selected Area + Top 10 Provinces interactive filter list)

import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { MapPin } from 'lucide-react'
import type { CategoryCount } from '@/types'
import { ZONE_PROVINCES } from '@/config'
// eslint-disable-next-line import/no-unresolved
import geoRaw from '@/assets/thailand.json'

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
  buckets?: ThailandMapBucket[]
  title: string
  subtitle?: string
  accent: 's1' | 's2'
  onProvinceClick?: (province: string) => void
  selectedProvince?: string
  onClearProvince?: () => void
  topProvinces?: CategoryCount[]
  height?: number
  showSideCards?: boolean
  takeaway?: string
}

const RAMP_S1 = ['#FFF7ED', '#FDBA74', '#F97316', '#C2410C']
const RAMP_S2 = ['#EFF6FF', '#93C5FD', '#3B82F6', '#1D4ED8']

export default function ThailandMap(p: ThailandMapProps): JSX.Element {
  const height = p.height ?? 580
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
  }, [isZoneScoped, p.zone])

  const totalCount = useMemo(
    () => p.data.reduce((acc, d) => acc + (Number.isFinite(d.value) ? d.value : 0), 0),
    [p.data],
  )

  const top10 = useMemo(
    () => (p.topProvinces ?? [...p.data].sort((a, b) => b.value - a.value)).slice(0, 10),
    [p.topProvinces, p.data],
  )

  const maxVal = useMemo(() => {
    const rawMax = Math.max(...p.data.map((d) => (Number.isFinite(d.value) ? d.value : 0)), 0)
    if (rawMax <= 0) return p.accent === 's1' ? 40 : 15
    if (rawMax <= 15) return 15
    if (rawMax <= 30) return 30
    return Math.ceil(rawMax / 10) * 10
  }, [p.data, p.accent])

  const ramp = p.accent === 's1' ? RAMP_S1 : RAMP_S2

  const option = useMemo<EChartsOption>(() => {
    return {
      textStyle: { fontFamily: FONT },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { fontFamily: FONT, fontSize: 14, color: '#1E293B' },
        extraCssText:
          'box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1); border-radius: 12px;',
        formatter: (params: any) => {
          const value = typeof params.value === 'number' ? params.value : 0
          return `<div style="font-weight:700;font-size:15px;color:#0F172A;margin-bottom:2px">${params.name}</div><div style="font-size:13px;color:#64748B">${value.toLocaleString('en-US')} เหตุการณ์</div>`
        },
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxVal,
        left: 16,
        bottom: 16,
        orient: 'vertical',
        itemHeight: 120,
        itemWidth: 12,
        calculable: false,
        text: [String(maxVal), '0'],
        inRange: { color: ramp },
        textStyle: { fontFamily: FONT, fontSize: 13, color: '#64748B' },
      },
      series: [
        {
          name: p.title,
          type: 'map',
          map: mapName,
          roam: false,
          layoutCenter: ['50%', '50%'],
          layoutSize: '88%',
          label: { show: false },
          itemStyle: {
            areaColor: '#EDF1F6',
            borderColor: '#FFFFFF',
            borderWidth: 0.8,
          },
          emphasis: {
            itemStyle: { areaColor: '#1E293B' },
            label: { show: false },
          },
          select: {
            itemStyle: { areaColor: '#1E293B' },
            label: { show: false },
          },
          data: p.data.map((d) => ({
            name: d.name,
            value: d.value,
            selected: p.selectedProvince ? d.name === p.selectedProvince : false,
          })),
        },
      ],
    }
  }, [mapName, maxVal, p.data, p.selectedProvince, p.title, ramp])

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.componentType === 'series' && typeof params.name === 'string' && p.onProvinceClick) {
          if (p.selectedProvince && p.selectedProvince === params.name && p.onClearProvince) {
            p.onClearProvince()
          } else {
            p.onProvinceClick(params.name)
          }
        }
      },
    }),
    [p.onProvinceClick, p.onClearProvince, p.selectedProvince],
  )

  const subtitle = p.subtitle ?? (p.mode === 'country' ? 'ใช้เลือกพื้นที่ · คลิกจังหวัดเพื่อกรองทุกการ์ดในหน้านี้' : `${provinceCount} จังหวัด`)

  const takeawayText = useMemo(() => {
    if (p.takeaway) return p.takeaway
    if (p.selectedProvince) {
      return `กำลังแสดงข้อมูลเฉพาะ ${p.selectedProvince} (คลิกจังหวัดอีกครั้งหรือกดปุ่มล้างเพื่อแสดงทั้งหมด)`
    }
    if (p.mode === 'country') {
      const top1 = top10[0]
      const top2 = top10[1]
      if (top1 && top1.value > 0) {
        const diffText =
          top2 && top2.value > 0 && top1.value >= top2.value * 1.5
            ? ` มากกว่าจังหวัดอันดับสอง (${top2.name} ${top2.value.toLocaleString()} เหตุการณ์) เกือบสองเท่า`
            : ''
        return `ภาคกลางและภาคอีสานตอนล่างมีเหตุการณ์หนาแน่นที่สุด ${top1.name} ${top1.value.toLocaleString()} เหตุการณ์${diffText}`
      }
      return 'ใช้เลือกพื้นที่ · คลิกจังหวัดเพื่อกรองทุกการ์ดในหน้านี้'
    }
    return `เขตสุขภาพที่ ${p.zone} มีทั้งหมด ${provinceCount} จังหวัด รวม ${totalCount.toLocaleString()} เหตุการณ์`
  }, [p.takeaway, p.selectedProvince, p.mode, p.zone, provinceCount, top10, totalCount])

  const selectedInfo = useMemo(() => {
    if (!p.selectedProvince) return null
    const hit = p.data.find((d) => d.name === p.selectedProvince)
    const val = hit ? hit.value : 0
    const zoneNum =
      Object.entries(ZONE_PROVINCES).find(([_, provs]) => provs.includes(p.selectedProvince!))?.[0] ?? '-'
    const pct = totalCount > 0 ? ((val / totalCount) * 100).toFixed(1) : '0.0'
    return { name: p.selectedProvince, value: val, zoneNum, pct }
  }, [p.selectedProvince, p.data, totalCount])

  const maxProvVal = top10[0]?.value || 1

  const mapCard = (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-2">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl ${
              p.accent === 's1' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
            }`}
            aria-hidden="true"
          >
            <MapPin size={20} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h3 className="font-sans font-bold text-cardTitle text-slate-800 truncate">{p.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      {takeawayText && (
        <p className="px-6 pt-1 pb-1 text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-[75ch]">
          {takeawayText}
        </p>
      )}
      <div className="px-3 pb-4 sm:px-4 sm:pb-5">
        <ReactECharts option={option} onEvents={onEvents} style={{ height, width: '100%' }} notMerge lazyUpdate />
      </div>
    </div>
  )

  if (!p.showSideCards) {
    return mapCard
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Main Map Card */}
      <div className="lg:col-span-2 min-w-0">{mapCard}</div>

      {/* Side Companion Cards */}
      <div className="lg:col-span-1 min-w-0 flex flex-col gap-6">
        {/* Card 1: พื้นที่ที่เลือก */}
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-sans font-bold text-lg text-slate-800">พื้นที่ที่เลือก</h3>
            {p.selectedProvince && p.onClearProvince && (
              <button
                type="button"
                onClick={p.onClearProvince}
                className={`text-sm font-semibold hover:underline transition-colors ${
                  p.accent === 's1' ? 'text-s1-600 hover:text-s1-700' : 'text-s2-600 hover:text-s2-700'
                }`}
              >
                ล้าง
              </button>
            )}
          </div>
          <div className="mt-3">
            {selectedInfo ? (
              <div>
                <p className="text-xl font-bold text-slate-800">{selectedInfo.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">เขตสุขภาพที่ {selectedInfo.zoneNum}</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span
                    className={`text-4xl font-extrabold leading-none ${
                      p.accent === 's1' ? 'text-s1-600' : 'text-s2-600'
                    }`}
                  >
                    {selectedInfo.value.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">
                    เหตุการณ์ · {selectedInfo.pct}% ของ{p.mode === 'zone' ? 'เขต' : 'ทั้งประเทศ'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-slate-800 text-[17px]">
                  {p.mode === 'zone' ? `เขตสุขภาพที่ ${p.zone}` : 'ทั้งประเทศ'} ·{' '}
                  <b className="font-bold">{totalCount.toLocaleString()}</b> เหตุการณ์
                </p>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  คลิกจังหวัดบนแผนที่ หรือเลือกจากรายการด้านล่าง เพื่อกรองการ์ดและตารางทั้งหน้า
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: 10 อันดับจังหวัด */}
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="font-sans font-bold text-lg text-slate-800">10 อันดับจังหวัด</h3>
            <span className="text-xs text-slate-400">คลิกเพื่อเลือก</span>
          </div>
          <div className="space-y-1">
            {top10.map((prov) => {
              const isSelected = p.selectedProvince === prov.name
              const barPct = Math.round((prov.value / maxProvVal) * 100)
              return (
                <button
                  key={prov.name}
                  type="button"
                  onClick={() => {
                    if (isSelected && p.onClearProvince) {
                      p.onClearProvince()
                    } else {
                      p.onProvinceClick?.(prov.name)
                    }
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 transition-all ${
                    isSelected
                      ? p.accent === 's1'
                        ? 'bg-orange-50 ring-1 ring-orange-200'
                        : 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-sm transition-colors ${
                        isSelected
                          ? p.accent === 's1'
                            ? 'font-bold text-orange-700'
                            : 'font-bold text-blue-700'
                          : 'font-normal text-slate-700'
                      }`}
                    >
                      {prov.name}
                    </span>
                    <span
                      className={`text-sm tabular-nums font-bold ${
                        isSelected
                          ? p.accent === 's1'
                            ? 'text-orange-700'
                            : 'text-blue-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {prov.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSelected
                          ? p.accent === 's1'
                            ? 'bg-orange-600'
                            : 'bg-blue-600'
                          : p.accent === 's1'
                          ? 'bg-orange-300'
                          : 'bg-blue-300'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
