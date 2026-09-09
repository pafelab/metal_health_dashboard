// SPEC 6.2 — Section 2 "ข้อมูลภัยอื่นๆ (6 หมวดหมู่)", widgets 1-5 in the exact order and default
// chart types the SPEC 6.2 table lists. Shares SPEC 6.4's zone-mode map zoom (item 2) with
// SocialListeningSection; Section 2 has no per-zone widget of its own (widget 20 is Section-1
// only, SPEC 6.4 item 3), so zoneMode/zone here only steer the map.

import { useMemo } from 'react'
import { Siren, MapPin } from 'lucide-react'
import type { HazardEvent } from '@/types'
import { severityCounts, provinceCounts, topN, hazardTypeCounts } from '@/data'
import SwitchableChart from '@/components/charts/SwitchableChart'
import ThailandMap, { SECTION2_MAP_BUCKETS } from '@/components/charts/ThailandMap'
import KpiCards from '@/components/widgets/KpiCards'
import EventsTable from '@/components/widgets/EventsTable'

export interface OtherHazardsSectionProps {
  rows: HazardEvent[]
  zoneMode?: boolean
  zone?: number | 'all'
  onProvinceClick: (p: string) => void
}

export default function OtherHazardsSection({ rows, zoneMode, zone, onProvinceClick }: OtherHazardsSectionProps) {
  const effectiveZone: number | 'all' = zone ?? 'all'

  const counts = useMemo(() => severityCounts(rows), [rows])
  const mapData = useMemo(() => provinceCounts(rows), [rows])
  const topProvinces = useMemo(() => topN(rows, (r) => r.province, 10), [rows])
  const hazardTypes = useMemo(() => hazardTypeCounts(rows), [rows])

  const titleSuffix = zoneMode ? (effectiveZone === 'all' ? ' (ภาพรวม)' : ` (เขตสุขภาพที่ ${effectiveZone})`) : ''

  return (
    <section id="section-2" className="scroll-mt-24 space-y-6">
      <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
        <Siren className="text-s2-600" size={26} strokeWidth={2.25} />
        ข้อมูลภัยอื่นๆ (6 หมวดหมู่){titleSuffix}
      </h2>

      {/* Widget 1 — KPI cards */}
      <KpiCards section={2} counts={counts} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Widget 2 — map */}
        <div className="md:col-span-2 xl:col-span-4">
          <ThailandMap
            mode={zoneMode ? 'zone' : 'country'}
            zone={effectiveZone}
            data={mapData}
            buckets={SECTION2_MAP_BUCKETS}
            title="แผนที่ภัยอื่นๆ"
            accent="s2"
            onProvinceClick={onProvinceClick}
          />
        </div>

        {/* Widget 3 — top 10 provinces */}
        <div className="md:col-span-1 xl:col-span-2">
          <SwitchableChart
            widgetId="s2-top-provinces"
            title="10 อันดับจังหวัด"
            icon={MapPin}
            data={topProvinces}
            defaultType="hbar"
            allowedTypes={['hbar', 'bar', 'pie', 'donut', 'treemap']}
            accent="s2"
          />
        </div>

        {/* Widget 4 — hazard type breakdown (6 categories) */}
        <div className="md:col-span-1 xl:col-span-2">
          <SwitchableChart
            widgetId="s2-hazard-types"
            title="สัดส่วนประเภทภัย 6 หมวด"
            icon={Siren}
            data={hazardTypes}
            defaultType="pie"
            allowedTypes={['pie', 'donut', 'rose', 'bar', 'hbar']}
            accent="s2"
          />
        </div>

        {/* Widget 5 — events table */}
        <div className="md:col-span-2 xl:col-span-4">
          <EventsTable section={2} hz={rows} />
        </div>
      </div>
    </section>
  )
}
