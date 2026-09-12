// Base card shell (SPEC 8): white, radius 24, soft shadow. Every widget card composes this.
//
// Deck slide 9 asks every topic to sit in a framed card with a SOLID header band, so sections read
// as groups ("สีฟ้าก็ได้ ดูสบายตา" — a deep blue is explicitly welcome). That is the optional
// `headerTone` prop below. It defaults to 'plain', which is byte-for-byte the old white header, so
// the existing consumers are untouched until they opt in.

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type CardHeaderTone = 'plain' | 'brand' | 'accent' | 'orange'

export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  accent?: 's1' | 's2' | 'neutral'
  right?: ReactNode
  className?: string
  bodyClassName?: string
  /**
   * Deck slide 9. 'plain' = the original white header row. 'brand' = vibrant orange band,
   * 'accent' = deep s1-800 band — both with white text.
   */
  headerTone?: CardHeaderTone
  children: ReactNode
}

const ACCENT_ICON_CLS: Record<'s1' | 's2' | 'neutral', string> = {
  s1: 'bg-s1-100 text-s1-600',
  s2: 'bg-s2-100 text-s2-600',
  neutral: 'bg-slate-100 text-slate-500',
}

/**
 * Band fills:
 *   brand  gradient from s1-600 (#EA580C) to s1-700 (#C2410C) — vibrant orange with high contrast
 *   accent s1-800 #9A3412
 *   orange alias for brand
 */
const TONE_BAND_CLS: Record<Exclude<CardHeaderTone, 'plain'>, string> = {
  brand: 'bg-gradient-to-r from-s1-600 to-s1-700',
  accent: 'bg-s1-800',
  orange: 'bg-gradient-to-r from-s1-600 to-s1-700',
}

export default function Card({
  title,
  subtitle,
  icon: Icon,
  accent = 'neutral',
  right,
  className = '',
  bodyClassName = '',
  headerTone = 'plain',
  children,
}: CardProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || Icon !== undefined || right !== undefined
  const banded = headerTone !== 'plain'

  return (
    /* responsive-audit R09: min-w-0 on the card and its body, so the 860px min-width of a table
       inside can never become the card's own automatic minimum size and push the section grid
       wider than the page. (The measured 63px of page overflow at 1024 had a second cause: the
       sr-only spans in the sortable table headers are position:absolute and were resolving
       against the page's `relative` content column instead of the scroll box — every
       overflow-x-auto table wrapper is now `relative` so they stay inside it.)

       Note there is deliberately NO `overflow-hidden` here even though the band would look tidier
       clipped: SeverityInfoButton and the chart-type menus render absolutely-positioned popovers
       from inside the card, and clipping would cut them off. The band rounds its own top corners
       with rounded-t-card instead. */
    <div className={`bg-white rounded-card shadow-card h-full flex flex-col min-w-0 ${className}`}>
      {hasHeader && (
        /* responsive-audit R01: `right` (usually ChartTypeSwitcher — up to six icon buttons, now
            44px each) used to be shrink-0 next to a `truncate` title, so on a narrow card it took
            its width first and the title got whatever was left. Measured before the wrap existed:
            at 390px three dashboard titles rendered at literally 0px wide and eight more under
            60px. The audit then measured the same squeeze AT 1363px (four titles clipped, e.g.
            'กลุ่มผู้ป่วยจิตเวช 3 ประเภท' 251px of text in 157px), so `xl:flex-nowrap` is gone too:
            the header wraps at every width where the untruncated title would not fit beside the
            controls, and the title itself never clips. */
        <div
          className={`flex flex-wrap items-start justify-between gap-3 px-6 flex-none ${
            banded ? `${TONE_BAND_CLS[headerTone]} rounded-t-card py-4` : 'pt-5 pb-3'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span
                className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl ${
                  banded ? 'bg-white/20 text-white' : ACCENT_ICON_CLS[accent]
                }`}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.25} />
              </span>
            )}
            <div className="min-w-0">
              {/* responsive-audit R01: the title wraps in full — never clipped. Thai wraps on
                  word boundaries, so no break-all here. */}
              {title !== undefined && (
                <h3
                  className={`font-sans font-bold text-cardTitle leading-snug ${
                    banded ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {title}
                </h3>
              )}
              {subtitle !== undefined && (
                <p className={`text-sm mt-0.5 ${banded ? 'text-white/90' : 'text-slate-500'}`}>{subtitle}</p>
              )}
            </div>
          </div>
          {/* responsive-audit R01: min-w-0 + max-w-full so a six-button switcher can itself wrap
              inside a narrow card instead of forcing the header wider than the card.
              On a filled band the controls inside `right` are still styled for a white surface
              (slate borders, slate text), so they get their own white tile to sit on rather than
              becoming unreadable on the fill. */}
          {right !== undefined && (
            <div className={`ml-auto min-w-0 max-w-full ${banded ? 'rounded-xl bg-white/95 p-1' : ''}`}>{right}</div>
          )}
        </div>
      )}
      <div
        className={`px-6 pb-6 flex-1 flex flex-col min-w-0 ${hasHeader ? (banded ? 'pt-5' : '') : 'pt-6'} ${bodyClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
