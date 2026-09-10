// UX-09 — the overview (scope, totals, trend, map, event records) must come first; every
// secondary breakdown lives inside this collapsible "การวิเคราะห์เชิงลึก" group underneath it.
//
// Built on native <details>/<summary> on purpose: it is keyboard operable (Enter/Space), exposes
// the expanded state to assistive tech, and keeps working before hydration — no ARIA plumbing of
// our own. Default open, so nothing that used to be visible becomes hidden by this change.

import type { ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

export interface AnalysisGroupProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  accent?: 's1' | 's2'
  defaultOpen?: boolean
  children: ReactNode
}

export default function AnalysisGroup({
  title,
  subtitle,
  icon: Icon,
  accent = 's1',
  defaultOpen = true,
  children,
}: AnalysisGroupProps): JSX.Element {
  const accentText = accent === 's2' ? 'text-s2-600' : 'text-s1-600'
  return (
    <details open={defaultOpen} className="group space-y-6">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-card px-1 py-2 outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
      >
        {Icon ? <Icon className={accentText} size={22} strokeWidth={2.25} aria-hidden /> : null}
        <h3 className="text-cardTitle font-bold text-slate-700">{title}</h3>
        {subtitle ? <span className="text-sm font-medium text-slate-500">{subtitle}</span> : null}
        <ChevronDown
          size={20}
          strokeWidth={2.25}
          aria-hidden
          className="ml-auto text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
        <span className="sr-only">(กดเพื่อย่อหรือขยายส่วนการวิเคราะห์เชิงลึก)</span>
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  )
}

/**
 * Scroll a widget into view below the sticky header+filter stack and hand it keyboard focus.
 * Shared by both sections' severity-card drill-down (UX-12); the offset comes from the
 * `--sticky-offset` custom property FilterBar keeps in sync with the real sticky height (UX-06).
 */
export function scrollToWidget(id: string): void {
  const el = document.getElementById(id)
  if (!el) return

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset')
  const stickyOffset = Number.parseFloat(raw) || 96
  const top = window.scrollY + el.getBoundingClientRect().top - stickyOffset - 12

  const reduceMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' })

  // Keyboard users must land on the filtered table, not stay behind on the card they clicked.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
