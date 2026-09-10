// Sticky page header (SPEC 5.1): tab title, page-refresh timestamp, reload button, mobile
// hamburger. Fixed height (see HEADER_HEIGHT_PX) so FilterBar (sticky, positioned right under
// this one) can offset by a value that never drifts out of sync with what actually renders here.
//
// UX-02: `updatedAt` is a full "รีเฟรชหน้าเมื่อ …" sentence built by App.tsx — it is the PAGE
// refresh time, never the dataset's coverage (shown per section).
// UX-03: `refreshing` shows a compact, non-blocking pill instead of the old full-screen overlay.
// UX-05: secondary text is slate-600 (>= 4.5:1 on white), not slate-400.
// UX-15: `showReload` keeps the refresh timestamp + reload button off pages that render no sheet
// data, so every header action applies to what is actually on screen.
// responsive-audit R08: the hamburger was a bare 24px SVG with no padding — the one control that
// every phone user has to hit first. It now has an explicit 44px box (h-11 = 49.5px at the 18px
// root), pulled back by -ml-2 so the icon stays where it always was.

import { Menu, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  updatedAt: string | null
  onReload: () => void
  loading: boolean
  onMenu: () => void
  right?: ReactNode
  /** True while a reload runs on top of data that is already on screen. */
  refreshing?: boolean
  /**
   * UX-15: gates the whole data-status cluster (refresh timestamp, "กำลังอัปเดตข้อมูล…" pill and
   * the reload button). Pages that render no sheet data (เกณฑ์และแบบฟอร์ม, ติดต่อเรา) pass false,
   * so the header never offers an action that changes nothing on the visible page.
   */
  showReload?: boolean
}

/** Exported so FilterBar.tsx can stick itself directly beneath this header without guessing. */
export const HEADER_HEIGHT_PX = 72

export default function PageHeader({
  title,
  updatedAt,
  onReload,
  loading,
  onMenu,
  right,
  refreshing = false,
  showReload = true,
}: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100"
      style={{ height: HEADER_HEIGHT_PX }}
    >
      <div className="h-full flex items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="lg:hidden -ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu size={24} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="font-sans font-bold text-lg sm:text-sectionTitle text-slate-800 truncate leading-tight">
            {title}
          </h2>
          {showReload && (
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs sm:text-sm text-slate-600 leading-tight truncate">
                {updatedAt ?? 'รีเฟรชหน้าเมื่อ —'}
              </p>
              {refreshing && (
                <span
                  role="status"
                  aria-live="polite"
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-s1-50 px-2 py-0.5 text-xs font-medium text-s1-700"
                >
                  <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  กำลังอัปเดตข้อมูล…
                </span>
              )}
            </div>
          )}
        </div>

        {right}

        {showReload && (
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            aria-label={loading ? 'กำลังโหลดข้อมูลใหม่' : 'โหลดข้อมูลใหม่'}
            className="shrink-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin motion-reduce:animate-none' : ''}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{loading ? 'กำลังโหลด...' : 'โหลดข้อมูลใหม่'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
