// UX-08 — the month picker is a NON-MODAL popover (role="dialog" aria-modal="false"):
// Escape closes it from the trigger and from every control inside it, focus moves into the panel
// on open and returns to the trigger on close, Tab/Shift+Tab cycle inside the panel while it is
// open, arrow keys move between months, selection is exposed with aria-pressed, and the chosen
// month/year is announced through a polite live region. Public props are unchanged.

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useId } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { THAI_MONTHS, MONTH_ABBR } from '@/config'

const ENG_MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Month grid is 3 columns wide, so ArrowUp/ArrowDown move by three. */
const GRID_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: 3,
  ArrowUp: -3,
}

export interface MonthPickerProps {
  id?: string
  value: string // 'YYYY-MM' in Buddhist Year, e.g. '2569-06', or ''
  onChange: (value: string) => void
  placeholder?: string
  accentColor?: 's1' | 's2'
  disabled?: boolean
  className?: string
}

export default function MonthPicker({
  id,
  value,
  onChange,
  placeholder = 'เลือกเดือน (พ.ศ.)',
  accentColor = 's1',
  disabled = false,
  className = '',
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const now = new Date()
  const defaultYear = now.getFullYear() + 543 // Buddhist Year

  // Parse 'YYYY-MM' (Buddhist Year)
  const parsed = useMemo(() => {
    if (!value || !value.trim()) return null
    const m = /^(\d{4})-(\d{1,2})$/.exec(value.trim())
    if (!m) return null
    return {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
    }
  }, [value])

  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? defaultYear)

  // Sync viewYear when value changes
  useEffect(() => {
    if (parsed?.year) {
      setViewYear(parsed.year)
    }
  }, [parsed?.year])

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const monthRefs = useRef<Array<HTMLButtonElement | null>>([])

  // responsive-audit R04: the panel was a fixed w-72 sm:w-80 anchored at left-0 with no
  // viewport-relative cap. At the 18px root that is 324/360px, so at 320px wide it was already
  // wider than the screen before its left inset, and from the rightmost filter column it ran off
  // the right edge. The width is now capped at the viewport and the panel flips to the right edge
  // / above the trigger and caps its own height when there is not enough room where it prefers to
  // be. Absolute + flip on purpose: FilterBar has `backdrop-blur`, which makes it the containing
  // block for fixed descendants, so a position:fixed sheet here would NOT be viewport-relative.
  const [placement, setPlacement] = useState<{ alignRight: boolean; above: boolean; maxHeight: number }>({
    alignRight: false,
    above: false,
    maxHeight: 0,
  })

  useLayoutEffect(() => {
    if (!isOpen) return
    const compute = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const panelWidth = Math.min(360, vw - 32)
      const spaceBelow = vh - rect.bottom - 16
      const spaceAbove = rect.top - 16
      const above = spaceBelow < 320 && spaceAbove > spaceBelow
      setPlacement({
        // Flip to the right edge only when doing so actually fits (a full-width trigger on a
        // phone fits neither way; there the viewport-capped width alone keeps it on screen).
        alignRight: rect.left + panelWidth > vw - 8 && rect.right - panelWidth >= 8,
        above,
        // No generous floor here: on a 390px-tall landscape phone the roomier side is only
        // ~195px, and a floor above that would push the footer actions back off screen. The
        // panel scrolls internally instead.
        maxHeight: Math.max(120, Math.round(above ? spaceAbove : spaceBelow)),
      })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [isOpen])

  const close = useCallback((returnFocus = true) => {
    setIsOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  // Escape from anywhere while open (capture, so it wins over the controls inside the panel),
  // plus dismissal on an outside pointerdown.
  useEffect(() => {
    if (!isOpen) return

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close(false) // a pointer dismissal should not yank focus back to the trigger
      }
    }

    document.addEventListener('keydown', onDocKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onDocKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen, close])

  // Move focus into the panel on open: the selected month if it is on screen, else the first one.
  // Deliberately keyed on `isOpen` only — re-running on viewYear changes would steal focus from
  // the year controls while the panel is open.
  useEffect(() => {
    if (!isOpen) return
    const selectedIdx = parsed && parsed.year === viewYear ? parsed.month - 1 : 0
    const target = monthRefs.current[selectedIdx] ?? monthRefs.current[0]
    target?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /** Escape + Tab containment for everything rendered inside the popover. */
  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function handleMonthKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    let next: number | null = null
    if (GRID_STEP[e.key] !== undefined) next = (idx + GRID_STEP[e.key] + 12) % 12
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 11
    if (next === null) return
    e.preventDefault()
    monthRefs.current[next]?.focus()
  }

  function handleSelectMonth(monthIndex: number) {
    const monthNum = monthIndex + 1
    const padMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`
    onChange(`${viewYear}-${padMonth}`)
    close()
  }

  function handleClearFromTrigger() {
    onChange('')
    // The clear control disappears with the value, so park focus on the trigger.
    triggerRef.current?.focus()
  }

  function handleSetThisMonth() {
    const currCeYear = now.getFullYear()
    const currBeYear = currCeYear + 543
    const currMonth = now.getMonth() + 1
    const padMonth = currMonth < 10 ? `0${currMonth}` : `${currMonth}`
    onChange(`${currBeYear}-${padMonth}`)
    close()
  }

  // Display text on trigger button
  const displayLabel = useMemo(() => {
    if (!parsed) return null
    const idx = parsed.month - 1
    const thName = THAI_MONTHS[idx] ?? ''
    const enAbbr = ENG_MONTH_ABBR[idx] ?? ''
    const ceYear = parsed.year - 543
    return `${thName} ${parsed.year} (${enAbbr} ${ceYear})`
  }, [parsed])

  const ringColor =
    accentColor === 's2'
      ? 'focus:ring-s2-300 focus:border-s2-400'
      : 'focus:ring-s1-300 focus:border-s1-400'
  const focusRing =
    accentColor === 's2'
      ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400'
      : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400'
  const activeBg =
    accentColor === 's2'
      ? 'bg-s2-600 text-white shadow-md shadow-blue-500/25'
      : 'bg-s1-700 text-white shadow-md shadow-orange-500/25'
  const hoverBg =
    accentColor === 's2' ? 'hover:bg-s2-50 hover:text-s2-700' : 'hover:bg-s1-50 hover:text-s1-700'
  const currentMonthBorder =
    accentColor === 's2' ? 'border-s2-400 text-s2-700' : 'border-s1-400 text-s1-700'

  // Quick years around viewYear
  const quickYears = [viewYear - 1, viewYear, viewYear + 1]

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) {
            e.stopPropagation()
            close()
          }
          if (e.key === 'ArrowDown' && !isOpen && !disabled) {
            e.preventDefault()
            setIsOpen(true)
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={`w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 ${ringColor} transition-all text-left shadow-sm ${
          value && !disabled ? 'pr-14' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <span className={`truncate mr-2 ${!displayLabel ? 'text-slate-500 font-normal' : 'font-medium'}`}>
          {displayLabel || placeholder}
        </span>
        <Calendar
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-colors ${isOpen ? 'text-slate-700' : 'text-slate-400'}`}
        />
      </button>

      {/* Clear — a sibling, never a button nested inside the trigger button. */}
      {value && !disabled && (
        <button
          type="button"
          aria-label="ล้างการเลือกเดือน"
          onClick={handleClearFromTrigger}
          className={`absolute right-8 top-1/2 -translate-y-1/2 grid h-[44px] w-[44px] place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${focusRing}`}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}

      {/* Selection announcement — polite, so it never interrupts typing elsewhere. */}
      <span role="status" aria-live="polite" className="sr-only">
        {displayLabel ? `เดือนที่เลือก: ${displayLabel}` : 'ยังไม่ได้เลือกเดือน'}
      </span>

      {/* Non-modal popover */}
      {isOpen && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="เลือกเดือนและปี"
          onKeyDown={handlePanelKeyDown}
          style={{ maxHeight: placement.maxHeight || undefined }}
          className={`absolute z-50 overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-xl border border-slate-100 p-3.5 w-[min(20rem,calc(100vw-2rem))] ${
            placement.alignRight ? 'right-0' : 'left-0'
          } ${placement.above ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {/* Year Navigation Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className={`grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ${focusRing}`}
              title="ปีก่อนหน้า"
              aria-label="ปีก่อนหน้า"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            <div className="text-center">
              <div className="text-base font-bold text-slate-800">พ.ศ. {viewYear}</div>
              <div className="text-xs text-slate-500 font-medium">(A.D. {viewYear - 543})</div>
            </div>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className={`grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ${focusRing}`}
              title="ปีถัดไป"
              aria-label="ปีถัดไป"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Quick Year Pill Bar */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {quickYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setViewYear(y)}
                aria-pressed={y === viewYear}
                aria-label={`ปี พ.ศ. ${y}`}
                className={`min-h-[44px] px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${focusRing} ${
                  y === viewYear
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {THAI_MONTHS.map((thMonth, idx) => {
              const isSelected = parsed?.year === viewYear && parsed?.month === idx + 1
              const isCurrentMonth = viewYear === now.getFullYear() + 543 && idx === now.getMonth()
              const abbr = MONTH_ABBR[idx]
              const enAbbr = ENG_MONTH_ABBR[idx]

              return (
                <button
                  key={thMonth}
                  type="button"
                  ref={(el) => {
                    monthRefs.current[idx] = el
                  }}
                  onClick={() => handleSelectMonth(idx)}
                  onKeyDown={(e) => handleMonthKeyDown(e, idx)}
                  aria-pressed={isSelected}
                  aria-label={`${thMonth} ${viewYear}`}
                  className={`flex min-h-[44px] flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${focusRing} ${
                    isSelected
                      ? activeBg
                      : isCurrentMonth
                        ? `border border-dashed ${currentMonthBorder} ${hoverBg}`
                        : `text-slate-700 bg-slate-50/70 hover:bg-slate-100 ${hoverBg}`
                  }`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                    {abbr}
                  </span>
                  <span
                    className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/90' : 'text-slate-500'}`}
                  >
                    {enAbbr}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-medium">
            <button
              type="button"
              onClick={() => onChange('')}
              className={`inline-flex min-h-[44px] items-center text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ${focusRing}`}
            >
              ล้างค่า (Clear)
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className={`inline-flex min-h-[44px] items-center text-slate-700 hover:text-slate-950 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer font-semibold ${focusRing}`}
            >
              เดือนนี้ (This Month)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
