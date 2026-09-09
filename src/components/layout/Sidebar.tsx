// Left sidebar (SPEC 5.1): 256px on desktop, off-canvas drawer on phones. Brand block, five nav
// tabs (active = orange left bar + pale orange background), footer address block + reload button.

import { icons, RefreshCw, X } from 'lucide-react'
import { NAV_TABS } from '@/config'

export interface SidebarProps {
  active: string
  onNavigate: (hash: string) => void
  open: boolean
  onClose: () => void
  onReload: () => void
  loading: boolean
}

const ADDRESS_LINE =
  'กองบริหารระบบบริการสุขภาพจิต กรมสุขภาพจิต · อาคาร 2 ชั้น 3 ต.ตลาดขวัญ อ.เมือง จ.นนทบุรี 11000 · โทร 0 2590 8220, 0 2590 8578'

export default function Sidebar({ active, onNavigate, open, onClose, onReload, loading }: SidebarProps) {
  const body = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between gap-2 px-6 pt-6 pb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-s1-600 uppercase truncate">
            MHSO / DMH · Social Listening
          </p>
          <h1 className="font-sans font-extrabold text-xl text-slate-800 mt-1 leading-snug">Dashboard สุขภาพจิต</h1>
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

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_TABS.map((tab) => {
          const Icon = icons[tab.icon as keyof typeof icons]
          const isActive = tab.hash === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.hash)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-xl border-l-4 px-3 py-3 text-left text-body transition-colors ${
                isActive
                  ? 'border-s1-600 bg-s1-50 text-s1-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon size={20} strokeWidth={2.25} className="shrink-0" />}
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-5 border-t border-slate-100 space-y-3">
        <p className="text-xs leading-relaxed text-slate-400">{ADDRESS_LINE}</p>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-s1-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-s1-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'กำลังโหลด...' : 'โหลดข้อมูลใหม่'}
        </button>
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
