// UX-04 (e) — the applied filter state lives in the URL, so a filtered view can be copied and
// shared: '#/dashboard?from=2568-10&to=2569-06&zone=8&province=%E0%B8%AD%E0%B8%B8...&type=all'.
//
// Two directions, both intentionally narrow:
//   read  — ONCE on mount, and only when the hash path already matches this page's route and
//           actually carries a query. Every value is validated before it reaches the filters;
//           an unknown zone/province/type/month is dropped rather than trusted, because a bad
//           value would silently empty every widget on the page.
//   write — whenever `applied` changes, via history.replaceState: no new history entries (the
//           back button still walks tabs, not every filter tweak) and no scroll jump.
//
// The draft is never written to the URL — only what the user has actually applied.
//
// Auto-apply (review deck slide 11) makes `applied` change on every dropdown click rather than on
// a คัดกรอง press, so the write effect now fires once per click. That is still one replaceState
// per discrete user action — every control bound to Filters is click-driven (SearchableSelect's
// search box writes to its own local state, MonthPicker commits on a month button) — so no
// debounce is needed. If a free-text control is ever bound to Filters, debounce HERE, at the
// applied/URL-write boundary, never at the input: debouncing the input would reintroduce the
// draft-vs-applied lag the deck asked us to remove.

import { useEffect, useRef } from 'react'
import type { Filters } from '@/types'
import { ALL_PROVINCES, HAZARD_TYPES } from '@/config'
import type { UseFiltersResult } from '@/hooks/useFilters'

// The DEFAULTS used for diffing/seeding are the ones the PAGE was created with
// (useFilters(...).defaults), not a module-level constant: the zone tab defaults to เขต 1, so
// 'zone=all' there is a real, shareable choice that must survive in the URL — and a URL that
// omits `zone` must restore เขต 1, not 'all'. See useFilters.ts.

const VALID_HAZARD_KEYS = new Set<string>([
  'all',
  'social',
  'hazards',
  ...HAZARD_TYPES.map((h) => h.key),
])

/** Buddhist 'YYYY-MM'. Range guard keeps a typo like '0000-01' out of the month filter. */
function isBeMonth(v: string): boolean {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v)
  if (!m) return false
  const year = parseInt(m[1], 10)
  return year >= 2400 && year <= 2700
}

function parseZone(v: string): Filters['zone'] | null {
  if (v === 'all') return 'all'
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 13 ? n : null
}

/** Query string -> Filters (seeded from the page's own defaults), or null when nothing usable. */
function parseQuery(search: string, defaults: Filters): Filters | null {
  const params = new URLSearchParams(search)
  const next: Filters = { ...defaults }
  let used = false

  const from = params.get('from')
  if (from && isBeMonth(from)) {
    next.fromMonth = from
    used = true
  }
  const to = params.get('to')
  if (to && isBeMonth(to)) {
    next.toMonth = to
    used = true
  }
  // Second entry point for an inverted range: a hand-edited or stale shared link can carry
  // from > to, which matches zero rows and blanks every widget on load. FilterBar guards the
  // interactive path by clamping the other endpoint; here neither bound is "the one just picked",
  // so the narrower bound is simply dropped — '?from=2569-06&to=2569-01' restores as
  // "ตั้งแต่ มิ.ย. 2569 เป็นต้นไป", which is non-empty and honest. The write effect then
  // rewrites the URL without the bad key.
  if (next.fromMonth && next.toMonth && next.fromMonth > next.toMonth) {
    next.toMonth = defaults.toMonth
  }
  const zone = params.get('zone')
  if (zone !== null) {
    const parsed = parseZone(zone)
    if (parsed !== null) {
      next.zone = parsed
      used = true
    }
  }
  const province = params.get('province')
  if (province !== null && (province === '' || ALL_PROVINCES.includes(province))) {
    next.province = province
    used = true
  }
  const type = params.get('type')
  if (type !== null && VALID_HAZARD_KEYS.has(type)) {
    next.hazardType = type
    used = true
  }

  return used ? next : null
}

/** Filters -> '?from=...&zone=...' (URL-encoded), page-default-valued keys omitted. '' when empty. */
function buildQuery(f: Filters, defaults: Filters): string {
  const params = new URLSearchParams()
  if (f.fromMonth !== defaults.fromMonth) params.set('from', f.fromMonth)
  if (f.toMonth !== defaults.toMonth) params.set('to', f.toMonth)
  if (f.zone !== defaults.zone) params.set('zone', String(f.zone))
  if (f.province !== defaults.province) params.set('province', f.province)
  if (f.hazardType !== defaults.hazardType) params.set('type', f.hazardType)
  const qs = params.toString()
  return qs === '' ? '' : `?${qs}`
}

/**
 * Keeps `filters.applied` and the hash query in sync for one route ('#/dashboard', '#/zone').
 * Call it from the page component; it renders nothing and never re-navigates.
 */
export function useFilterUrlSync(filters: UseFiltersResult, routeHash: string): void {
  const { applied, setApplied, defaults } = filters
  const restoredRef = useRef(false)
  // Set when a shared URL was just restored: the write effect below still runs once in the same
  // commit with the PRE-restore `applied`, and must not overwrite the query we just read.
  const skipNextWriteRef = useRef(false)

  // Restore first (mount only), so the write effect below sees the restored value.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const raw = window.location.hash
    const qIndex = raw.indexOf('?')
    if (qIndex === -1) return
    if (raw.slice(0, qIndex) !== routeHash) return
    const parsed = parseQuery(raw.slice(qIndex + 1), defaults)
    if (parsed) {
      skipNextWriteRef.current = true
      setApplied(parsed)
    }
  }, [routeHash, setApplied, defaults])

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false
      return
    }
    const raw = window.location.hash
    // Only rewrite the hash while this page is genuinely the current route.
    if (raw.split('?')[0] !== routeHash) return
    const target = `${routeHash}${buildQuery(applied, defaults)}`
    if (raw === target) return
    // replaceState (not location.hash =) — no extra history entry and no scroll to the target.
    history.replaceState(
      history.state,
      '',
      `${window.location.pathname}${window.location.search}${target}`,
    )
  }, [applied, routeHash, defaults])
}
