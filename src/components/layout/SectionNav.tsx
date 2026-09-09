// Small jump menu (SPEC 5.2): a row of Lucide icon+label buttons that smooth-scroll to a target
// element id (Section 1 / Section 2 wrapper elements carry those ids on the pages that use this).

import type { LucideIcon } from 'lucide-react'

export interface SectionNavProps {
  targets: { id: string; label: string; icon: LucideIcon }[]
}

export default function SectionNav({ targets }: SectionNavProps) {
  if (targets.length === 0) return null

  function scrollToTarget(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3">
      {targets.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToTarget(id)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-s1-300 hover:bg-s1-50 hover:text-s1-700 transition-colors"
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
