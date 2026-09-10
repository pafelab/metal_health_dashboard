// UX-11 — one shared way to state what a percentage is calculated from. Every widget that shows
// a percentage renders its base through this note so the wording, size and contrast stay identical
// across cards (text-slate-600 on white ≈ 7.6:1; the icon may stay lighter).

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

export interface DenominatorNoteProps {
  children: ReactNode
  className?: string
  /** Drop the leading icon where the note sits directly under a figure and the icon would crowd it. */
  hideIcon?: boolean
}

export default function DenominatorNote({ children, className = '', hideIcon = false }: DenominatorNoteProps) {
  return (
    <p className={`flex items-start gap-1.5 text-xs font-medium leading-relaxed text-slate-600 ${className}`}>
      {!hideIcon && <Info className="mt-[3px] h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  )
}
