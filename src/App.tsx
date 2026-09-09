// App shell (SPEC 5.1): SheetDataProvider + Sidebar + PageHeader + hash routing across the 5
// pages. Both per-tab filter states (Dashboard, zone) live here so they survive switching tabs
// (site 2's behaviour — a tab is hidden/shown, never unmounted+remounted) even though only the
// active page is actually rendered (keeping ~30 ECharts instances from ever sitting in a
// display:none container, which breaks their sizing).

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { SheetDataProvider, useSheetData } from '@/hooks/useSheetData'
import { useHashRoute } from '@/hooks/useHashRoute'
import { useFilters } from '@/hooks/useFilters'
import { resetChartTypes } from '@/hooks/useChartType'
import { NAV_TABS } from '@/config'
import Sidebar from '@/components/layout/Sidebar'
import PageHeader from '@/components/layout/PageHeader'
import DashboardPage from '@/pages/DashboardPage'
import ZonePage from '@/pages/ZonePage'
import ReportPage from '@/pages/ReportPage'
import McattPage from '@/pages/McattPage'
import ContactPage from '@/pages/ContactPage'

function formatUpdatedAt(d: Date | null): string | null {
  if (!d) return null
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function Shell() {
  const { sl, hz, loading, error, updatedAt, reload } = useSheetData()
  const [hash, navigate] = useHashRoute()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Each tab's OWN filter state (SPEC 5.2): Dashboard defaults to เขตสุขภาพ = ทั้งหมด, the zone
  // tab defaults to เขตสุขภาพที่ 1. Held here (not inside the page components) so navigating away
  // and back never resets a selection the user made.
  const dashboardFilters = useFilters({ zone: 'all' })
  const zoneFilters = useFilters({ zone: 1 })

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }, [hash])

  const activeTab = NAV_TABS.find((t) => t.hash === hash) ?? NAV_TABS[0]
  const zoneTitle =
    zoneFilters.applied.zone === 'all'
      ? 'สถานการณ์ปัจจุบันรายเขต (ภาพรวม)'
      : `สถานการณ์ปัจจุบันรายเขต (เขต ${zoneFilters.applied.zone})`
  const title = hash === '#/zone' ? zoneTitle : activeTab.label

  const updatedAtLabel = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt])

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        active={hash}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onReload={reload}
        loading={loading}
      />

      <div className="flex-1 min-w-0 relative">
        <PageHeader
          title={title}
          updatedAt={updatedAtLabel}
          onReload={reload}
          loading={loading}
          onMenu={() => setSidebarOpen(true)}
          right={
            <button
              type="button"
              onClick={() => resetChartTypes()}
              title="รีเซ็ตรูปแบบกราฟทุกการ์ดกลับเป็นค่าเริ่มต้น"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={18} />
              <span className="hidden sm:inline">รีเซ็ตรูปแบบกราฟ</span>
            </button>
          }
        />

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={18} className="shrink-0" />
              {error}
            </div>
            <button
              type="button"
              onClick={reload}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw size={14} /> ลองใหม่
            </button>
          </div>
        )}

        <main>
          {hash === '#/dashboard' && <DashboardPage sl={sl} hz={hz} filters={dashboardFilters} />}
          {hash === '#/zone' && <ZonePage sl={sl} hz={hz} filters={zoneFilters} />}
          {hash === '#/report' && <ReportPage />}
          {hash === '#/mcatt' && <McattPage />}
          {hash === '#/contact' && <ContactPage />}
        </main>
      </div>

      {/* Loading overlay (SPEC 3.1): shown for every fetch, initial or reload. Translucent so a
          reload dims the page the user is already looking at rather than blanking it. */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
          <RefreshCw size={40} className="animate-spin text-s1-600" />
          <p className="animate-loading-pulse text-body font-medium text-slate-600">กำลังโหลดข้อมูล...</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <SheetDataProvider>
      <Shell />
    </SheetDataProvider>
  )
}
