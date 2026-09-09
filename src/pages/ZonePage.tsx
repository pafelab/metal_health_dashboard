// SPEC 6.4 — สถานการณ์ปัจจุบันรายเขต tab: the same sections as the Dashboard, rendered in
// "zone mode" (zoomed map, per-province trend bar, "(เขตสุขภาพที่ N)" section titles — all
// handled inside SocialListeningSection/OtherHazardsSection when zoneMode+zone are passed), plus
// a TimelinessCard computed over the filtered rows of both sections combined. Its own filter
// state (default เขตสุขภาพที่ 1, zone select also offers ทั้งหมด) is owned by App.tsx's Shell.

import { useMemo } from 'react'
import { Megaphone, Siren } from 'lucide-react'
import type { SLEvent, HazardEvent } from '@/types'
import { applyFilters, computeTimeliness } from '@/data'
import type { UseFiltersResult } from '@/hooks/useFilters'
import FilterBar from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import TimelinessCard from '@/components/widgets/TimelinessCard'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'

export interface ZonePageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
}

export default function ZonePage({ sl, hz, filters }: ZonePageProps) {
  const { draft, applied, setDraft, apply, clear, setProvinceAndApply } = filters

  const filtered = useMemo(() => applyFilters(sl, hz, applied), [sl, hz, applied])

  const timeliness = useMemo(
    () => computeTimeliness([...filtered.sl, ...filtered.hz]),
    [filtered],
  )

  const showSection1 = applied.hazardType === 'all' || applied.hazardType === 'social'
  const showSection2 = applied.hazardType !== 'social'

  const navTargets = [
    ...(showSection1 ? [{ id: 'section-1', label: 'ข้อมูล Social Listening', icon: Megaphone }] : []),
    ...(showSection2 ? [{ id: 'section-2', label: 'ข้อมูลภัยอื่นๆ', icon: Siren }] : []),
  ]

  return (
    <>
      <FilterBar
        value={draft}
        onApply={(f) => {
          setDraft(f)
          apply()
        }}
        onClear={clear}
        zoneMode
      />
      <SectionNav targets={navTargets} />

      <div className="px-4 sm:px-6 py-6 space-y-10">
        <TimelinessCard result={timeliness} />

        {showSection1 && (
          <SocialListeningSection
            rows={filtered.sl}
            zoneMode
            zone={applied.zone}
            onProvinceClick={setProvinceAndApply}
            selectedProvince={applied.province !== 'all' ? applied.province : undefined}
            onClearProvince={() => setProvinceAndApply('all')}
          />
        )}
        {showSection2 && (
          <OtherHazardsSection
            rows={filtered.hz}
            zoneMode
            zone={applied.zone}
            onProvinceClick={setProvinceAndApply}
          />
        )}
      </div>
    </>
  )
}
