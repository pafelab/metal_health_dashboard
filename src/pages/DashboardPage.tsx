// SPEC 5.2 / 6.1 / 6.2 — Dashboard tab: FilterBar + jump menu + both sections, country-wide
// (not zoomed to a zone). Its own filter state (เขตสุขภาพ = ทั้งหมด by default) is owned by
// App.tsx's Shell and passed in as `filters`, so it survives switching tabs.

import { useMemo } from 'react'
import { Megaphone, Siren } from 'lucide-react'
import type { SLEvent, HazardEvent } from '@/types'
import { applyFilters } from '@/data'
import type { UseFiltersResult } from '@/hooks/useFilters'
import FilterBar from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'

export interface DashboardPageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
}

export default function DashboardPage({ sl, hz, filters }: DashboardPageProps) {
  const { draft, applied, setDraft, apply, clear, setProvinceAndApply } = filters

  const filtered = useMemo(() => applyFilters(sl, hz, applied), [sl, hz, applied])

  // SPEC 5.2: 'Social Listening' hides Section 2; any ภัยอื่นๆ value hides Section 1; ทั้งหมด
  // shows both. Decided directly from applied.hazardType, never from an empty rows array.
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
      />
      <SectionNav targets={navTargets} />

      <div className="px-4 sm:px-6 py-6 space-y-10">
        {showSection1 && (
          <SocialListeningSection
            rows={filtered.sl}
            onProvinceClick={setProvinceAndApply}
            selectedProvince={applied.province !== 'all' ? applied.province : undefined}
            onClearProvince={() => setProvinceAndApply('all')}
          />
        )}
        {showSection2 && (
          <OtherHazardsSection rows={filtered.hz} onProvinceClick={setProvinceAndApply} />
        )}
      </div>
    </>
  )
}
