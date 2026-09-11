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
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync'
import FilterBar from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import TimelinessCard from '@/components/widgets/TimelinessCard'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'

export interface ZonePageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
  privacyMode?: boolean
}

export default function ZonePage({ sl, hz, filters, privacyMode = true }: ZonePageProps) {
  const { draft, applied, setDraft, apply, clear, setProvinceAndApply, clearProvince } = filters

  // UX-04: the applied filters live in the hash query so a filtered view can be shared.
  useFilterUrlSync(filters, '#/zone')

  const filtered = useMemo(() => applyFilters(sl, hz, applied), [sl, hz, applied])

  // UX-01: on the zone tab the comparison scope is the ZONE (province restriction removed),
  // falling back to the whole country when no single zone is selected.
  const baseline = useMemo(
    () => applyFilters(sl, hz, { ...applied, province: '' }),
    [sl, hz, applied],
  )
  const baselineLabel =
    applied.zone === 'all' ? 'ทั้งประเทศ' : `เขตสุขภาพที่ ${applied.zone}`

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
        applied={applied}
        zoneMode
      />
      <SectionNav targets={navTargets} />

      <div className="px-4 sm:px-6 py-6 space-y-10">
        {showSection1 && (
          <SocialListeningSection
            rows={filtered.sl}
            zoneMode
            zone={applied.zone}
            onProvinceClick={setProvinceAndApply}
            // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
            selectedProvince={applied.province !== '' ? applied.province : undefined}
            onClearProvince={clearProvince}
            baselineTotal={baseline.sl.length}
            baselineLabel={baselineLabel}
            privacyMode={privacyMode}
          />
        )}
        {showSection2 && (
          <OtherHazardsSection
            rows={filtered.hz}
            zoneMode
            zone={applied.zone}
            onProvinceClick={setProvinceAndApply}
            // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
            selectedProvince={applied.province !== '' ? applied.province : undefined}
            onClearProvince={clearProvince}
            baselineTotal={baseline.hz.length}
            baselineLabel={baselineLabel}
            privacyMode={privacyMode}
          />
        )}

        {/* UX-09 — the ~650px timeliness card (score + criteria legend) is detail, not overview:
            it used to push the sections' totals and severity summary below the fold on every
            common desktop height, so it now follows them. */}
        <TimelinessCard result={timeliness} />
      </div>
    </>
  )
}
