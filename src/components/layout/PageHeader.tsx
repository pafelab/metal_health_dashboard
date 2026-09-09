// Sticky page header (SPEC 5.1): tab title, "อัปเดต: HH:MM", reload button, mobile hamburger.
// Fixed height (see HEADER_HEIGHT_PX) so FilterBar (sticky, positioned right under this one)
// can offset by a value that never drifts out of sync with what actually renders here.

import { Menu, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  updatedAt: string | null
  onReload: () => void
  loading: boolean
  onMenu: () => void
  right?: ReactNode
}

/** Exported so FilterBar.tsx can stick itself directly beneath this header without guessing. */
export const HEADER_HEIGHT_PX = 72

export default function PageHeader({ title, updatedAt, onReload, loading, onMenu, right }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100"
      style={{ height: HEADER_HEIGHT_PX }}
    >
      <div className="h-full flex items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="lg:hidden shrink-0 text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu size={24} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="font-sans font-bold text-lg sm:text-sectionTitle text-slate-800 truncate leading-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-tight">อัปเดต: {updatedAt ?? '-'}</p>
        </div>

        {right}

        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{loading ? 'กำลังโหลด...' : 'โหลดข้อมูลใหม่'}</span>
        </button>
      </div>
    </header>
  )
}
