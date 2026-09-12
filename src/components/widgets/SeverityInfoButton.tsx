// Audit UX-12 — the severity definition, split off from the card itself so the card's primary
// action can be the drill-down instead of "show me a tooltip".
//
// UX-06, REVISED (deck slides 10 and 22: "อยากได้ แบบชี้ปุป ขึ้นปับ" / "เอาเม้าไปชี้ ขึ้นคำอธิบายเลย").
// The original decision was click-ONLY, because a hover-opened panel used to linger over the
// controls after a section jump moved the pointer's target out from under it. The deck asks for
// hover, so the panel now opens on hover and on focus as well — the paths are tracked separately:
//
//   • `hovering` — opened by pointerenter (mouse/pen only, never a touch "hover") or by keyboard
//     focus, and closed again the moment the pointer or focus leaves. It can therefore never be
//     the thing left stranded over the controls: nothing keeps it open once the pointer is gone.
//   • `pinned`   — the click/Enter/Space toggle. It is the ONLY path that survives a pointer
//     leave, and it is what touch users get, since touch fires no hover at all.
//   • `dismissed` — set by a click (or Escape) that CLOSES an already-open panel, and cleared on
//     the way out (the hover close timer, a blur, or the next pointerenter). It exists because
//     `hovering` must NOT be cleared on that click: the pointer is still inside the wrapper, so no
//     further pointerenter would ever fire and the icon would stay dead until the pointer
//     physically left and came back. A third flag closes the panel without lying about where the
//     pointer is.
//
// FINAL ARIA DECISION: this is a pure TOOLTIP, one pattern only. The panel is `role="tooltip"`
// (not `role="dialog"`: it holds no focusable content, and a dialog opening on hover would
// announce a spurious "dialog" every time the mouse passed over the icon), and the trigger
// publishes `aria-describedby` while it is open — nothing else. The old click-only disclosure's
// `aria-expanded` is GONE: it advertised a second, contradictory pattern, and with hover wired up
// its state flipped merely because a pointer crossed the icon, so a screen reader announced
// "collapsed/expanded" for something presented as a tooltip. Click still toggles the pin; the
// button simply does not report that as expanded state.
//
// No CSS transition is used: the global prefers-reduced-motion rule makes transitions instant, so
// anything that waited on `transitionend` would never fire for those users.

import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import type { SeverityMetaEntry } from '@/config'

export interface SeverityInfoButtonProps {
  entry: SeverityMetaEntry
  /** Border class for the popover's heading rule, so it echoes the card it belongs to. */
  accentBorderClassName?: string
  className?: string
}

/**
 * Grace period before a hover-opened panel closes. The panel sits 4px below the trigger
 * (`mt-1`), so a pointer travelling from the button into the panel crosses a gap and fires
 * pointerleave on the wrapper; without the delay the panel would close out from under it.
 */
const HOVER_CLOSE_DELAY_MS = 150

export default function SeverityInfoButton({
  entry,
  accentBorderClassName = 'border-slate-200',
  className = '',
}: SeverityInfoButtonProps) {
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  /** Suppresses an otherwise-open panel after a click/Escape dismissal, WITHOUT pretending the
   *  pointer has left. Cleared the moment the pointer or focus actually goes away (or comes back). */
  const [dismissed, setDismissed] = useState(false)
  const panelId = useId()
  const titleId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  const open = (pinned || hovering) && !dismissed

  const cancelClose = (): void => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = (): void => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null
      setHovering(false)
      // The pointer really is gone now, so a previous click-dismissal has nothing left to
      // suppress. Clearing it here rather than on pointerleave keeps the panel from flashing back
      // open for the grace period as the pointer exits.
      setDismissed(false)
    }, HOVER_CLOSE_DELAY_MS)
  }

  useEffect(() => cancelClose, [])

  useEffect(() => {
    if (!pinned) return
    // Outside press un-pins. pointerdown covers mouse, pen and touch with one listener, and fires
    // before the focus change, so tapping another card's info button opens exactly that one.
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPinned(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pinned])

  if (entry.tooltipLines.length === 0) return null

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      // Mouse and pen only. A touch "hover" is a synthesised event that would open the panel on
      // the same tap that toggles it, immediately cancelling itself; touch uses the click path.
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return
        cancelClose()
        setDismissed(false)
        setHovering(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'touch') return
        scheduleClose()
      }}
      // Keyboard parity with hover: tabbing to the trigger reveals the same text (WCAG 1.4.13).
      onFocus={() => {
        cancelClose()
        setDismissed(false)
        setHovering(true)
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
          setHovering(false)
          setDismissed(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setPinned(false)
          // Same reason as the click path: focus stays on the trigger, so clearing `hovering`
          // here would leave the panel unreachable until focus left and returned.
          setDismissed(true)
          cancelClose()
          buttonRef.current?.focus()
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`คำอธิบายระดับสี${entry.label}`}
        // No aria-expanded — tooltip contract only (see the header note). Only ever points at a
        // node that exists: an aria-describedby aimed at an unmounted id is a dangling reference.
        aria-describedby={open ? panelId : undefined}
        onClick={() => {
          if (open) {
            // Dismiss WITHOUT touching `hovering`: the pointer is still over the trigger, so a
            // cleared hover flag could not be set again until the pointer left and returned —
            // the icon would look dead right after the interaction most users try first.
            setPinned(false)
            setDismissed(true)
            cancelClose()
          } else {
            setPinned(true)
            setDismissed(false)
          }
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 outline-none motion-safe:transition-colors hover:bg-white/70 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1"
      >
        <Info size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          role="tooltip"
          aria-labelledby={titleId}
          // right-0 anchors the 288px panel to the trigger's RIGHT edge, and the trigger itself
          // sits at the card's top-right, so the panel grows leftwards into the card and never
          // overhangs the viewport's right edge. max-w-[80vw] covers the narrowest phones, where
          // the card is nearly the full width. Nothing portals it out of the card, so it may
          // overlap the card's own body — that is intended; it is a transient overlay.
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-cardHover"
        >
          <div className={`mb-2 flex items-center gap-2 border-b pb-2 ${accentBorderClassName}`}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
            <h4 id={titleId} className="text-sm font-bold text-slate-800">
              {entry.tooltipTitle}
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs font-medium text-slate-600">
            {entry.tooltipLines.map((line) => (
              <li key={line}>
                {entry.bullet ?? '- '}
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
