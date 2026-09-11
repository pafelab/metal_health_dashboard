// SPEC 5.2 / 6.1 / 6.2 — Dashboard tab: FilterBar + jump menu + both sections, country-wide
// (not zoomed to a zone). Its own filter state (เขตสุขภาพ = ทั้งหมด by default) is owned by
// App.tsx's Shell and passed in as `filters`, so it survives switching tabs.

import { useMemo } from 'react'
import { Activity, LayoutDashboard, Megaphone, Siren, Table2 } from 'lucide-react'
import type { SLEvent, HazardEvent } from '@/types'
import { applyFilters } from '@/data'
import type { UseFiltersResult } from '@/hooks/useFilters'
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync'
import FilterBar from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'

export interface DashboardPageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
  privacyMode?: boolean
}

export default function DashboardPage({ sl, hz, filters, privacyMode = true }: DashboardPageProps) {
  const { draft, applied, setDraft, apply, clear, setProvinceAndApply, clearProvince } = filters

  // UX-04: the applied filters live in the hash query so a filtered view can be shared.
  useFilterUrlSync(filters, '#/dashboard')

  const filtered = useMemo(() => applyFilters(sl, hz, applied), [sl, hz, applied])

  // UX-01: the denominator for "% ของทั้งประเทศ" — the SAME period and hazard type, but with
  // every geographic restriction removed. Without this, a province was compared against itself
  // and always read 100%.
  const baseline = useMemo(
    () => applyFilters(sl, hz, { ...applied, zone: 'all', province: '' }),
    [sl, hz, applied],
  )

  // SPEC 5.2: 'Social Listening' hides Section 2; any ภัยอื่นๆ value hides Section 1; ทั้งหมด
  // shows both. Decided directly from applied.hazardType, never from an empty rows array.
  const showSection1 = applied.hazardType === 'all' || applied.hazardType === 'social'
  const showSection2 = applied.hazardType !== 'social'

  const navTargets = [
    ...(showSection1
      ? [
          { id: 's1-overview', label: 'ภาพรวม (Overview)', icon: LayoutDashboard },
          { id: 'section-1', label: 'Social Listening', icon: Megaphone },
          { id: 's1-suicide', label: 'วิเคราะห์การฆ่าตัวตาย', icon: Activity },
        ]
      : []),
    ...(showSection2 ? [{ id: 'section-2', label: 'ภัยอื่นๆ (Other Hazards)', icon: Siren }] : []),
    { id: 's1-events', label: 'ตารางเหตุการณ์ & Data QA', icon: Table2 },
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
      />
      <SectionNav targets={navTargets} />

      <div className="px-4 sm:px-6 py-6 space-y-10">
        {showSection1 && (
          <SocialListeningSection
            rows={filtered.sl}
            onProvinceClick={setProvinceAndApply}
            // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
            selectedProvince={applied.province !== '' ? applied.province : undefined}
            onClearProvince={clearProvince}
            baselineTotal={baseline.sl.length}
            baselineLabel="ทั้งประเทศ"
            privacyMode={privacyMode}
          />
        )}
        {showSection2 && (
          <OtherHazardsSection
            rows={filtered.hz}
            onProvinceClick={setProvinceAndApply}
            // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
            selectedProvince={applied.province !== '' ? applied.province : undefined}
            onClearProvince={clearProvince}
            baselineTotal={baseline.hz.length}
            baselineLabel="ทั้งประเทศ"
            privacyMode={privacyMode}
          />
        )}
      </div>
    </>
  )
}
