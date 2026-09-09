// Base card shell (SPEC 8): white, radius 24, soft shadow. Every widget card composes this.

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  accent?: 's1' | 's2' | 'neutral'
  right?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

const ACCENT_ICON_CLS: Record<'s1' | 's2' | 'neutral', string> = {
  s1: 'bg-s1-100 text-s1-600',
  s2: 'bg-s2-100 text-s2-600',
  neutral: 'bg-slate-100 text-slate-500',
}

export default function Card({
  title,
  subtitle,
  icon: Icon,
  accent = 'neutral',
  right,
  className = '',
  bodyClassName = '',
  children,
}: CardProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || Icon !== undefined || right !== undefined

  return (
    <div className={`bg-white rounded-card shadow-card h-full flex flex-col ${className}`}>
      {hasHeader && (
        /* `right` (usually ChartTypeSwitcher — up to six icon buttons, ~150px) is shrink-0, so on
            a narrow card it takes its width first and the title, which is min-w-0 + truncate, gets
            whatever is left. Measured before this wrap existed: at 390px three dashboard titles
            rendered at literally 0px wide and eight more under 60px; same at 768 and 1024. Wrapping
            drops `right` onto its own line whenever the untruncated title would not fit beside it,
            which is exactly when the squeeze happens. Above xl there is room for both (worst case
            measured 86px of title), so the single-line header is kept there. */
        <div className="flex flex-wrap xl:flex-nowrap items-start justify-between gap-3 px-6 pt-5 pb-3 flex-none">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span
                className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl ${ACCENT_ICON_CLS[accent]}`}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.25} />
              </span>
            )}
            <div className="min-w-0">
              {title !== undefined && (
                <h3 className="font-sans font-bold text-cardTitle text-slate-800 truncate">{title}</h3>
              )}
              {subtitle !== undefined && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {right !== undefined && <div className="shrink-0 ml-auto">{right}</div>}
        </div>
      )}
      <div className={`px-6 pb-6 flex-1 flex flex-col ${hasHeader ? '' : 'pt-6'} ${bodyClassName}`}>{children}</div>
    </div>
  )
}
