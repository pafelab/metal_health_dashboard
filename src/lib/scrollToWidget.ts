// Shared "scroll a target into view below the sticky stack, then focus it" helper.
//
// Lifted verbatim out of components/sections/AnalysisGroup.tsx (which now re-exports it) so that
// SectionNav and both section components can share ONE implementation. AnalysisGroup is on its way
// out; this behaviour is not.
//
// UX-06: scrollIntoView({ block: 'start' }) parked the target behind the sticky header + filter
// bar. We scroll manually to (target top − the measured sticky stack height − breathing room),
// reading the `--sticky-offset` custom property that FilterBar keeps in sync with the real sticky
// height, then move focus to the target so keyboard and screen-reader users land where sighted
// users do (WCAG 2.4.3).
// UX-12: also used by both sections' severity-card drill-down, which jumps to the filtered table.

/**
 * Height of the sticky header+filter stack, in px, when `--sticky-offset` has not been published
 * yet. FilterBar sets the real value on mount (and resets it to HEADER_HEIGHT_PX on unmount), so
 * this only applies for the first frames of a fresh load. Kept at the originally measured 96.
 */
const FALLBACK_STICKY_OFFSET = 96

/** Gap between the sticky stack and the target, so it is not flush against the bar above it. */
const BREATHING_ROOM = 12

/**
 * Scroll the element with `id` into view below the sticky header+filter stack and hand it
 * keyboard focus. No-op when the id is not on the page.
 */
export function scrollToWidget(id: string): void {
  const el = document.getElementById(id)
  if (!el) return

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset')
  const stickyOffset = Number.parseFloat(raw) || FALLBACK_STICKY_OFFSET
  const top = window.scrollY + el.getBoundingClientRect().top - stickyOffset - BREATHING_ROOM

  const reduceMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' })

  // Keyboard users must land on the target (e.g. the filtered table), not stay behind on the card
  // they clicked. preventScroll keeps the browser from re-scrolling to its own idea of "visible",
  // which would undo the sticky-stack offset computed above.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
