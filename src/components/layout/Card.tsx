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
    <div className={`bg-white rounded-card shadow-card ${className}`}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
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
          {right !== undefined && <div className="shrink-0">{right}</div>}
        </div>
      )}
      <div className={`px-6 pb-6 ${hasHeader ? '' : 'pt-6'} ${bodyClassName}`}>{children}</div>
    </div>
  )
}
