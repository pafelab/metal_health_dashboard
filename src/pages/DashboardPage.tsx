// SPEC 5.2 / 6.1 / 6.2 — Dashboard tab: FilterBar (Left Sidebar) + jump menu + both sections + the 13-zone
// reporting scorecard at the very bottom (review deck slide 23), country-wide
// (not zoomed to a zone). Its own filter state (เขตสุขภาพ = ทั้งหมด by default) is owned by
// App.tsx's Shell and passed in as `filters`, so it survives switching tabs.

import { useMemo, useState } from 'react'
import { ClipboardCheck, Eye, Filter as FilterIcon, Megaphone, Siren } from 'lucide-react'
import type { SLEvent, HazardEvent } from '@/types'
import { applyFilters } from '@/data'
import type { UseFiltersResult } from '@/hooks/useFilters'
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync'
import FilterBar, { describeApplied } from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'
import ZoneScoreSection from '@/components/sections/ZoneScoreSection'

export interface DashboardPageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
}

export default function DashboardPage({ sl, hz, filters }: DashboardPageProps) {
  const { draft, applied, setDraft, apply, clear, setProvinceAndApply, clearProvince } = filters

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const saved = window.sessionStorage.getItem('dmh_filter_sidebar_open')
      if (saved !== null) return saved === 'true'
    } catch {}
    return window.innerWidth >= 1024
  })

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev
      try {
        window.sessionStorage.setItem('dmh_filter_sidebar_open', String(next))
      } catch {}
      return next
    })
  }

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

  // The zone scorecard is NOT gated by showSection1/showSection2: it scores Social Listening and
  // ภัยอื่นๆ rows together, so it has something to show under every ประเภทภัย value (the hazard and
  // month filters already narrow its rows inside applyFilters). Its nav entry is therefore
  // unconditional too — the jump target always exists.
  const navTargets = [
    ...(showSection1 ? [{ id: 'section-1', label: 'ข้อมูล Social Listening', icon: Megaphone }] : []),
    ...(showSection2 ? [{ id: 'section-2', label: 'ข้อมูลภัยอื่นๆ', icon: Siren }] : []),
    { id: 'section-zone-score', label: 'ผลการรายงานข่าว 13 เขตสุขภาพ', icon: ClipboardCheck },
  ]

  const filterToggleBtn = (
    <button
      type="button"
      onClick={toggleSidebar}
      title={sidebarOpen ? 'ซ่อนแถบฟิลเตอร์' : 'เปิดแถบฟิลเตอร์ข้อมูล'}
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold transition-all cursor-pointer shadow-sm ${
        sidebarOpen
          ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          : 'border-s1-400 bg-s1-600 text-white hover:bg-s1-700 shadow-md ring-2 ring-s1-200 ring-offset-1'
      }`}
    >
      <FilterIcon size={15} />
      <span>{sidebarOpen ? 'ซ่อนฟิลเตอร์' : 'เปิดแถบฟิลเตอร์'}</span>
    </button>
  )

  const activeScopeSummary = (
    <p
      className={`hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-xs transition-all duration-300 ease-in-out ${
        !sidebarOpen
          ? 'opacity-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 translate-x-3 pointer-events-none'
      }`}
    >
      <Eye size={13} className="text-slate-400 shrink-0" />
      <span className="truncate max-w-xs xl:max-w-md">{describeApplied(applied)}</span>
    </p>
  )

  return (
    <div className="flex min-h-[calc(100vh-128px)] relative">
      {/* Pinned left-edge button when sidebar is closed so it stays accessible anywhere on the page */}
      <button
        type="button"
        onClick={toggleSidebar}
        title="เปิดแถบฟิลเตอร์ข้อมูล (Sidebar)"
        aria-hidden={sidebarOpen}
        tabIndex={sidebarOpen ? -1 : 0}
        className={`hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 items-center gap-2 rounded-r-2xl border border-l-0 border-s1-300 bg-white/95 px-3 py-3 text-xs font-bold text-s1-700 shadow-lg backdrop-blur hover:bg-s1-50 hover:text-s1-800 hover:border-s1-400 transition-all duration-300 ease-in-out cursor-pointer ${
          sidebarOpen
            ? '-translate-x-full opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100 pointer-events-auto'
        }`}
      >
        <FilterIcon size={16} className="text-s1-600" />
        <span className="[writing-mode:vertical-lr] tracking-wider">เปิดฟิลเตอร์</span>
      </button>

      <FilterBar
        value={draft}
        onApply={(f) => {
          setDraft(f)
          apply()
        }}
        onClear={clear}
        applied={applied}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <SectionNav
          targets={navTargets}
          leadingSlot={filterToggleBtn}
          trailingSlot={activeScopeSummary}
        />

        <div className="px-4 sm:px-6 py-6 space-y-10 flex-1">
          {showSection1 && (
            <SocialListeningSection
              rows={filtered.sl}
              onProvinceClick={setProvinceAndApply}
              // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
              selectedProvince={applied.province !== '' ? applied.province : undefined}
              onClearProvince={clearProvince}
              baselineTotal={baseline.sl.length}
              baselineLabel="ทั้งประเทศ"
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
            />
          )}

          {/* Review deck slide 23 — "ด้านล่างสุด": the 13-zone reporting scorecard is the last block
              on the page. It is handed the UNFILTERED arrays plus `applied` and scores every zone
              itself, so it reads the same on this tab and on the zone tab (see ZoneScoreSection's
              header comment). Its <section> carries id 'section-zone-score', which the SectionNav
              entry above scrolls to and focuses. */}
          <ZoneScoreSection sl={sl} hz={hz} applied={applied} selectedZone={applied.zone} />
        </div>
      </div>
    </div>
  )
}
