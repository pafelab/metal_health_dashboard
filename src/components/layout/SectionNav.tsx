// Small jump menu (SPEC 5.2): a row of Lucide icon+label buttons that smooth-scroll to a target
// element id (Section 1 / Section 2 wrapper elements carry those ids on the pages that use this).
//
// UX-06: scrollIntoView({ block: 'start' }) parked the heading behind the sticky header + filter
// bar, so the jump is done manually — see @/lib/scrollToWidget, which carries the full rationale
// (sticky-stack offset, reduced motion, focus follows the scroll). This file used to keep its own
// near-identical copy of that logic; it now shares the one the section drill-downs already use,
// which also clamps the target to >= 0.

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { scrollToWidget } from '@/lib/scrollToWidget'

export interface SectionNavProps {
  targets: { id: string; label: string; icon: LucideIcon }[]
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
}

export default function SectionNav({ targets, leadingSlot, trailingSlot }: SectionNavProps) {
  if (targets.length === 0 && !leadingSlot && !trailingSlot) return null

  return (
    <nav
      aria-label="ข้ามไปยังส่วนของรายงาน"
      className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 bg-white/60 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {leadingSlot}
        {targets.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToWidget(id)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-s1-300 hover:bg-s1-50 hover:text-s1-700 transition-colors cursor-pointer"
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {trailingSlot && <div className="flex items-center gap-2">{trailingSlot}</div>}
    </nav>
  )
}
