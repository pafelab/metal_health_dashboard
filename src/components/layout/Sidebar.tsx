// Left sidebar (SPEC 5.1): 256px on desktop, off-canvas drawer on phones. Brand block, five nav
// tabs (active = orange left bar + pale orange background), footer address block.
//
// UX-15: nav labels wrap in full — Thai task names must never be truncated — each tab carries a
// description (tooltip + screen-reader text) that explains its destination, and the duplicate
// reload button is gone: the header's reload is the single primary refresh control. The brand
// block spells out MHSO / DMH in Thai on first use and wraps rather than clipping.
// UX-05: the footer address uses slate-500 (>= 4.5:1 on white); icon colours are unchanged.

import { icons, X } from 'lucide-react'
import { NAV_TABS } from '@/config'

export interface SidebarProps {
  active: string
  onNavigate: (hash: string) => void
  open: boolean
  onClose: () => void
}

const ADDRESS_LINE =
  'กองบริหารระบบบริการสุขภาพจิต กรมสุขภาพจิต · อาคาร 2 ชั้น 3 ต.ตลาดขวัญ อ.เมือง จ.นนทบุรี 11000 · โทร 0 2590 8220, 0 2590 8578'

/** UX-15: the brand abbreviations spelled out in Thai, right where they first appear. */
const BRAND_EXPANSION =
  'กองบริหารระบบบริการสุขภาพจิต (MHSO) · กรมสุขภาพจิต (DMH) · เฝ้าระวังข้อมูลจากสื่อสังคมออนไลน์ (Social Listening)'

export default function Sidebar({ active, onNavigate, open, onClose }: SidebarProps) {
  const body = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between gap-2 px-6 pt-6 pb-5">
        <div className="min-w-0">
          {/* Wraps instead of truncating in the 256px column, and the abbreviations are expanded
              below (and in the tooltip) so they are never the only form on screen (UX-15). */}
          <p
            className="text-xs font-semibold tracking-wide text-s1-700 uppercase leading-snug break-words"
            title={BRAND_EXPANSION}
          >
            MHSO / DMH · Social Listening
          </p>
          <h1 className="font-sans font-extrabold text-xl text-slate-800 mt-1 leading-snug">Dashboard สุขภาพจิต</h1>
          <p className="mt-1 text-xs leading-snug text-slate-500">{BRAND_EXPANSION}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="ปิดเมนู"
        >
          <X size={22} />
        </button>
      </div>

      <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_TABS.map((tab) => {
          const Icon = icons[tab.icon as keyof typeof icons]
          const isActive = tab.hash === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.hash)}
              aria-current={isActive ? 'page' : undefined}
              title={tab.description}
              className={`w-full flex items-start gap-3 rounded-xl border-l-4 px-3 py-3 text-left text-body transition-colors ${
                isActive
                  ? 'border-s1-600 bg-s1-50 text-s1-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon size={20} strokeWidth={2.25} className="shrink-0 mt-0.5" aria-hidden="true" />}
              {/* Thai task names wrap instead of truncating (UX-15). */}
              <span className="min-w-0 leading-snug break-words">
                {tab.label}
                {tab.description && <span className="sr-only"> — {tab.description}</span>}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-5 border-t border-slate-100">
        <p className="text-xs leading-relaxed text-slate-500">{ADDRESS_LINE}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: fixed 256px column, always visible. */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-100">
        <div className="fixed top-0 left-0 h-screen w-64">{body}</div>
      </aside>

      {/* Mobile: off-canvas drawer + backdrop. */}
      <div className={`lg:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <div
          className={`absolute top-0 left-0 h-full w-72 max-w-[85vw] shadow-xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {body}
        </div>
      </div>
    </>
  )
}
