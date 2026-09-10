// Small jump menu (SPEC 5.2): a row of Lucide icon+label buttons that smooth-scroll to a target
// element id (Section 1 / Section 2 wrapper elements carry those ids on the pages that use this).
//
// UX-06: scrollIntoView({ block: 'start' }) parked the heading behind the sticky header + filter
// bar. We scroll manually to (target top − the measured sticky stack height − breathing room),
// reading the --sticky-offset custom property FilterBar publishes, then move focus to the
// section so keyboard and screen-reader users land where sighted users do.

import type { LucideIcon } from 'lucide-react'

export interface SectionNavProps {
  targets: { id: string; label: string; icon: LucideIcon }[]
}

/** Height of the sticky header+filter stack, in px. 96 is the pre-measurement fallback. */
const FALLBACK_STICKY_OFFSET = 96
/** Gap between the sticky stack and the section heading, so the heading is not flush against it. */
const BREATHING_ROOM = 12

function stickyOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset')
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_STICKY_OFFSET
}

function scrollToTarget(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - BREATHING_ROOM

  window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' })

  // Focus follows the scroll (WCAG 2.4.3). preventScroll keeps the browser from re-scrolling to
  // its own idea of "visible", which would undo the sticky-stack offset above.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

export default function SectionNav({ targets }: SectionNavProps) {
  if (targets.length === 0) return null

  return (
    <nav aria-label="ข้ามไปยังส่วนของรายงาน" className="flex flex-wrap gap-2 px-4 sm:px-6 py-3">
      {targets.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToTarget(id)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-s1-300 hover:bg-s1-50 hover:text-s1-700 transition-colors"
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  )
}
