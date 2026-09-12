// Sticky page header (SPEC 5.1, redesigned per deck slides 10-11).
//
// Two fixed-height rows:
//   row 1 — DMH logo, "Social Listening 2569" (or the per-route title), the
//           "กองบริหารระบบบริการสุขภาพจิต" subheader, the page-refresh timestamp, and the data
//           controls (`right` slot + reload button);
//   row 2 — the primary nav row.
//
// Deck slide 11 ("แถบซ้ายมือ ตัดออกให้หมด") deleted the left sidebar, which was the ONLY navigation
// UI and the only place NAV_TABS rendered. Those tabs now live in row 2, keeping the four
// non-dashboard routes reachable, and the lucide string->component resolution moved here with
// them. The hamburger is gone with the drawer it opened; `onMenu` survives as an optional no-op
// prop so existing call sites keep compiling.
//
// HEIGHT IS LOAD-BEARING. FilterBar sticks itself at `top: HEADER_HEIGHT_PX` and publishes
// `--sticky-offset` as HEADER_HEIGHT_PX + its own height, so anything in here that wraps silently
// desynchronises the whole sticky stack. Every row therefore has an explicit height and every
// text run either truncates or scrolls horizontally — nothing is allowed to reflow to a new line.
//
// UX-02: `updatedAt` is a full "รีเฟรชหน้าเมื่อ …" sentence built by App.tsx — it is the PAGE
// refresh time, never the dataset's coverage (shown per section).
// UX-03: `refreshing` shows a compact, non-blocking pill instead of the old full-screen overlay.
// UX-05: secondary text is slate-600 (>= 4.5:1 on white), not slate-400.
// UX-15: `showReload` keeps the refresh timestamp + reload button off pages that render no sheet
// data, so every header action applies to what is actually on screen. Nav labels are never
// truncated — the row scrolls sideways instead (Thai task names must stay readable in full), and
// each tab keeps its tooltip + screen-reader description.
// responsive-audit R08: every control in here keeps a >= 44px touch box (the nav pills are h-10 =
// 45px at the 18px root). The old hamburger's own 44px box is moot now that it is gone.

import { icons, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { NAV_TABS } from '@/config'

export interface PageHeaderProps {
  title: string
  updatedAt: string | null
  onReload: () => void
  loading: boolean
  /**
   * @deprecated The mobile drawer it opened was deleted with the sidebar (deck slide 11). Kept
   * optional so existing call sites keep compiling; it is never called.
   */
  onMenu?: () => void
  right?: ReactNode
  /** True while a reload runs on top of data that is already on screen. */
  refreshing?: boolean
  /**
   * UX-15: gates the whole data-status cluster (refresh timestamp, "กำลังอัปเดตข้อมูล…" pill and
   * the reload button). Pages that render no sheet data (เกณฑ์และแบบฟอร์ม, ติดต่อเรา) pass false,
   * so the header never offers an action that changes nothing on the visible page.
   */
  showReload?: boolean
  /** Current route hash, so the nav row can mark its active tab. */
  activeHash?: string
  /** Navigate to a route hash. Omitted on the (hypothetical) chrome-less render. */
  onNavigate?: (hash: string) => void
}

/**
 * Exported so FilterBar.tsx can stick itself directly beneath this header without guessing.
 * 80 (title row) + 48 (nav row). Was 72 before the redesign added the nav row and the subheader.
 */
export const TITLE_ROW_HEIGHT_PX = 80
// Primary navigation bar row is commented out by request (default to display is Social Listening 2569).
// Set NAV_ROW_HEIGHT_PX = 48 to restore the navigation bar.
// export const NAV_ROW_HEIGHT_PX = 48
export const NAV_ROW_HEIGHT_PX = 0
export const HEADER_HEIGHT_PX = TITLE_ROW_HEIGHT_PX + NAV_ROW_HEIGHT_PX

/** Deck slide 10: the owning division, spelled out under the product name. */
const SUBHEADER = 'กองบริหารระบบบริการสุขภาพจิต'

export default function PageHeader({
  title,
  updatedAt,
  onReload,
  loading,
  right,
  refreshing = false,
  showReload = true,
  activeHash,
  onNavigate,
}: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200"
      style={{ height: HEADER_HEIGHT_PX }}
    >
      {/* Row 1: identity + data controls. */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6"
        style={{ height: TITLE_ROW_HEIGHT_PX }}
      >
        {/* Decorative: the visible title already names the product, so an alt text here would only
            be read out twice. Explicit intrinsic size (the file is 421x432) + a fixed height class
            so a slow image load can never shift the fixed-height row. */}
        <img
          src="/dmh-logo.png"
          alt=""
          width={421}
          height={432}
          decoding="async"
          className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 object-contain"
        />

        <div className="min-w-0 flex-1">
          {/* The page's only <h1> now that the sidebar's brand block is gone. Sized so the three
              stacked lines fit the 80px row exactly: 17px is the largest size at which the full
              product name still clears the two icon buttons at 390px. */}
          <h1
            title={title}
            className="font-sans font-extrabold text-[17px] sm:text-xl text-slate-800 truncate leading-tight"
          >
            {title}
          </h1>
          <p className="text-xs text-slate-600 leading-tight truncate">{SUBHEADER}</p>
          {showReload && (
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs text-slate-600 leading-tight truncate">
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
            <span className="hidden lg:inline">{loading ? 'กำลังโหลด...' : 'โหลดข้อมูลใหม่'}</span>
          </button>
        )}
      </div>

      {/* Row 2: primary navigation bar hidden by request (default display: Social Listening 2569).
          Uncomment this block and restore NAV_ROW_HEIGHT_PX = 48 above to re-enable. */}
      {/*
      <nav
        aria-label="เมนูหลัก"
        className="flex items-center gap-1.5 px-4 sm:px-6 overflow-x-auto no-scrollbar border-t border-slate-100"
        style={{ height: NAV_ROW_HEIGHT_PX }}
      >
        {NAV_TABS.map((tab) => {
          const Icon = icons[tab.icon as keyof typeof icons]
          const isActive = tab.hash === activeHash
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate?.(tab.hash)}
              aria-current={isActive ? 'page' : undefined}
              title={tab.description}
              className={`shrink-0 inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-s1-600 ${
                isActive
                  ? 'bg-s1-50 text-s1-700 font-semibold'
                  : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {Icon && <Icon size={18} strokeWidth={2.25} aria-hidden="true" />}
              {tab.label}
              {tab.description && <span className="sr-only"> — {tab.description}</span>}
            </button>
          )
        })}
      </nav>
      */}
    </header>
  )
}
