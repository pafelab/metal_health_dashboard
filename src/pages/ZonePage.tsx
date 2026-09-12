// SPEC 6.4 — สถานการณ์ปัจจุบันรายเขต tab: the same sections as the Dashboard, rendered in
// "zone mode" (zoomed map, per-province trend bar, "(เขตสุขภาพที่ N)" section titles — all
// handled inside SocialListeningSection/OtherHazardsSection when zoneMode+zone are passed), plus
// a TimelinessCard computed over the filtered rows of both sections combined, and — deck slide 23 —
// the 13-zone reporting scorecard as the last block. Its own filter state (default เขตสุขภาพที่ 1,
// zone select also offers ทั้งหมด) is owned by App.tsx's Shell.

import { useMemo, useState } from 'react'
import { ClipboardCheck, Eye, Filter as FilterIcon, Megaphone, Siren } from 'lucide-react'
import type { SLEvent, HazardEvent } from '@/types'
import { applyFilters, computeTimeliness } from '@/data'
import type { UseFiltersResult } from '@/hooks/useFilters'
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync'
import { HEADER_HEIGHT_PX } from '@/components/layout/PageHeader'
import FilterBar, { describeApplied } from '@/components/layout/FilterBar'
import SectionNav from '@/components/layout/SectionNav'
import TimelinessCard from '@/components/widgets/TimelinessCard'
import SocialListeningSection from '@/components/sections/SocialListeningSection'
import OtherHazardsSection from '@/components/sections/OtherHazardsSection'
import ZoneScoreSection from '@/components/sections/ZoneScoreSection'

export interface ZonePageProps {
  sl: SLEvent[]
  hz: HazardEvent[]
  filters: UseFiltersResult
}

export default function ZonePage({ sl, hz, filters }: ZonePageProps) {
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
          : 'border-s2-400 bg-s2-600 text-white hover:bg-s2-700 shadow-md ring-2 ring-s2-200 ring-offset-1'
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
    <div
      className="flex relative"
      style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
    >
      {/* Pinned left-edge button when sidebar is closed so it stays accessible anywhere on the page */}
      <button
        type="button"
        onClick={toggleSidebar}
        title="เปิดแถบฟิลเตอร์ข้อมูล (Sidebar)"
        aria-hidden={sidebarOpen}
        tabIndex={sidebarOpen ? -1 : 0}
        className={`hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 items-center gap-2 rounded-r-2xl border border-l-0 border-s2-300 bg-white/95 px-3 py-3 text-xs font-bold text-s2-700 shadow-lg backdrop-blur hover:bg-s2-50 hover:text-s2-800 hover:border-s2-400 transition-all duration-300 ease-in-out cursor-pointer ${
          sidebarOpen
            ? '-translate-x-full opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100 pointer-events-auto'
        }`}
      >
        <FilterIcon size={16} className="text-s2-600" />
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
        defaultZone={1}
        zoneMode
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
              zoneMode
              zone={applied.zone}
              onProvinceClick={setProvinceAndApply}
              // Filters.province '' means "ทุกจังหวัด" — 'all' is not a province name.
              selectedProvince={applied.province !== '' ? applied.province : undefined}
              onClearProvince={clearProvince}
              baselineTotal={baseline.sl.length}
              baselineLabel={baselineLabel}
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
            />
          )}

          {/* UX-09 — the timeliness card is detail, not overview */}
          <TimelinessCard result={timeliness} />

          {/* Review deck slide 23. The scorecard is on this tab too */}
          <ZoneScoreSection sl={sl} hz={hz} applied={applied} selectedZone={applied.zone} />
        </div>
      </div>
    </div>
  )
}
