// App shell (SPEC 5.1): SheetDataProvider + Sidebar + PageHeader + hash routing across the 5
// pages. Both per-tab filter states (Dashboard, zone) live here so they survive switching tabs
// (site 2's behaviour — a tab is hidden/shown, never unmounted+remounted) even though only the
// active page is actually rendered (keeping ~30 ECharts instances from ever sitting in a
// display:none container, which breaks their sizing).
//
// UX-03: no data-driven page renders before the first successful response (a skeleton stands in,
// so temporary zeros can never read as "no incidents"), a failed first load gets a retry panel,
// and a later reload keeps the previous values on screen behind a quiet header pill — the old
// full-screen overlay is gone, so keyboard focus is never disturbed by a refresh.

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { SheetDataProvider, useSheetData } from '@/hooks/useSheetData'
import { useHashRoute } from '@/hooks/useHashRoute'
import { useFilters } from '@/hooks/useFilters'
import { resetChartTypes } from '@/hooks/useChartType'
import { MONTH_ABBR, NAV_TABS } from '@/config'
import Sidebar from '@/components/layout/Sidebar'
import PageHeader from '@/components/layout/PageHeader'
import SafetyBanner from '@/components/layout/SafetyBanner'
import LoadingSkeleton from '@/components/layout/LoadingSkeleton'
import DashboardPage from '@/pages/DashboardPage'
import ZonePage from '@/pages/ZonePage'
import ReportPage from '@/pages/ReportPage'
import McattPage from '@/pages/McattPage'
import ContactPage from '@/pages/ContactPage'

/** Routes whose content is built from the sheet data (and so must wait for it). */
const DATA_ROUTES = ['#/dashboard', '#/zone', '#/mcatt']
/** Routes that own analytical charts — the only ones that get the chart-reset control (UX-15). */
const CHART_ROUTES = ['#/dashboard', '#/zone']

/**
 * UX-02: the header timestamp is the PAGE refresh time, never the dataset's coverage, so it is
 * spelled out in full — Buddhist year, Bangkok clock, explicit timezone.
 * e.g. 'รีเฟรชหน้าเมื่อ 10 ก.ย. 2569 08:13 น. (เวลาไทย)'
 */
function formatUpdatedAt(d: Date | null): string | null {
  if (!d) return null
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const month = MONTH_ABBR[Number(get('month')) - 1] ?? ''
    const year = Number(get('year')) + 543
    return `รีเฟรชหน้าเมื่อ ${Number(get('day'))} ${month} ${year} ${get('hour')}:${get('minute')} น. (เวลาไทย)`
  } catch {
    // No Asia/Bangkok tz data (very old engines): fall back to the device clock, unlabelled.
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `รีเฟรชหน้าเมื่อ ${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear() + 543} ${hh}:${mm} น.`
  }
}

function Shell() {
  const { sl, hz, loading, error, updatedAt, reload, status, hasLoaded } = useSheetData()
  const [hash, navigate] = useHashRoute()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Each tab's OWN filter state (SPEC 5.2): Dashboard defaults to เขตสุขภาพ = ทั้งหมด, the zone
  // tab defaults to เขตสุขภาพที่ 1. Held here (not inside the page components) so navigating away
  // and back never resets a selection the user made.
  const dashboardFilters = useFilters({ zone: 'all' })
  const zoneFilters = useFilters({ zone: 1 })
  const [privacyMode, setPrivacyMode] = useState(true)

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }, [hash])

  // UX-03: a finished background refresh is announced (politely) instead of being signalled by a
  // disappearing overlay. Nothing steals focus; the message clears itself so it is not re-read.
  const [announcement, setAnnouncement] = useState('')
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    if (prev !== 'refreshing' || status !== 'success') return
    setAnnouncement('อัปเดตข้อมูลแล้ว')
    const timer = window.setTimeout(() => setAnnouncement(''), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  const activeTab = NAV_TABS.find((t) => t.hash === hash) ?? NAV_TABS[0]
  const zoneTitle =
    zoneFilters.applied.zone === 'all' ? 'สถานการณ์รายเขต (ภาพรวม)' : `สถานการณ์รายเขต (เขต ${zoneFilters.applied.zone})`
  const title = hash === '#/zone' ? zoneTitle : activeTab.label

  const updatedAtLabel = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt])

  const needsData = DATA_ROUTES.includes(hash)
  const showInitialError = needsData && !hasLoaded && status === 'error'
  const showSkeleton = needsData && !hasLoaded && !showInitialError

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <SafetyBanner privacyMode={privacyMode} onTogglePrivacyMode={setPrivacyMode} />
      <div className="flex flex-1 min-h-0">
      <Sidebar active={hash} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 relative">
        <PageHeader
          title={title}
          // UX-15: data controls (timestamp, refresh pill, reload) belong only to the routes whose
          // content comes from the sheet — on เกณฑ์และแบบฟอร์ม / ติดต่อเรา a reload changes nothing
          // on screen, so the control is not offered there at all.
          updatedAt={needsData ? updatedAtLabel : null}
          showReload={needsData}
          onReload={reload}
          loading={loading}
          refreshing={needsData && status === 'refreshing'}
          onMenu={() => setSidebarOpen(true)}
          right={
            CHART_ROUTES.includes(hash) ? (
              <button
                type="button"
                onClick={() => resetChartTypes()}
                title="รีเซ็ตรูปแบบกราฟทุกการ์ดกลับเป็นค่าเริ่มต้น"
                className="shrink-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={18} aria-hidden="true" />
                <span className="hidden sm:inline">รีเซ็ตรูปแบบกราฟ</span>
              </button>
            ) : undefined
          }
        />

        {/* Error AFTER a successful load: the data stays on screen, the banner offers a retry.
            Only on data-backed routes (UX-15) — its retry is the same page-level action. */}
        {needsData && error && !showInitialError && (
          <div className="mx-4 sm:mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
              {error}
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />{' '}
              ลองใหม่
            </button>
          </div>
        )}

        <main>
          {showInitialError ? (
            <div className="mx-4 sm:mx-6 my-10 max-w-2xl rounded-card border border-rose-200 bg-white p-6 shadow-card">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="min-w-0 space-y-2">
                  <h3 className="font-sans text-cardTitle font-bold text-slate-800">โหลดข้อมูลไม่สำเร็จ</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    ยังไม่มีข้อมูลแสดงบนหน้านี้ ตัวเลขทั้งหมดจะปรากฏเมื่อโหลดข้อมูลสำเร็จ
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    disabled={loading}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-s1-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-s1-800 disabled:opacity-60 transition-colors"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
                    {loading ? 'กำลังโหลด...' : 'ลองใหม่'}
                  </button>
                </div>
              </div>
            </div>
          ) : showSkeleton ? (
            <LoadingSkeleton />
          ) : (
            <>
              {hash === '#/dashboard' && <DashboardPage sl={sl} hz={hz} filters={dashboardFilters} privacyMode={privacyMode} />}
              {hash === '#/zone' && <ZonePage sl={sl} hz={hz} filters={zoneFilters} privacyMode={privacyMode} />}
              {hash === '#/report' && <ReportPage />}
              {hash === '#/mcatt' && <McattPage />}
              {hash === '#/contact' && <ContactPage />}
            </>
          )}
        </main>
      </div>
      </div>

      {/* Politeness channel for state changes that have no visible focus target (UX-03). */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
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
