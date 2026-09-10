// Audit UX-12 — the severity definition, split off from the card itself so the card's primary
// action can be the drill-down instead of "show me a tooltip". This is an explicit popover:
// it opens on click / Enter / Space / tap, closes on Escape (focus returns to the trigger) and
// on a pointer press outside. Hover alone no longer opens it, so it can never sit over the
// controls after a section jump (audit UX-06).

import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import type { SeverityMetaEntry } from '@/config'

export interface SeverityInfoButtonProps {
  entry: SeverityMetaEntry
  /** Border class for the popover's heading rule, so it echoes the card it belongs to. */
  accentBorderClassName?: string
  className?: string
}

export default function SeverityInfoButton({
  entry,
  accentBorderClassName = 'border-slate-200',
  className = '',
}: SeverityInfoButtonProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const titleId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Outside press closes. pointerdown covers mouse, pen and touch with one listener, and fires
    // before the focus change, so tapping another card's info button opens exactly that one.
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (entry.tooltipLines.length === 0) return null

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`คำอธิบายระดับสี${entry.label}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 outline-none motion-safe:transition-colors hover:bg-white/70 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1"
      >
        <Info size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
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
