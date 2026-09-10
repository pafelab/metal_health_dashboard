// Per-tab filter state (SPEC 5.2): a draft the user edits and an applied value that only
// changes on คัดกรอง / ล้าง / a map click. Pure React state, no I/O.
//
// `draft` is mirrored into a ref (`draftRef`) alongside the state so `apply()` — which takes no
// argument by contract — always reads the very latest draft even when called synchronously
// right after `setDraft()` in the same event handler (React state updates are not read back
// synchronously, but a plain ref assignment is). FilterBar (src/components/layout/FilterBar.tsx)
// relies on exactly this: `onApply={(f) => { setDraft(f); apply() }}`.

import { useCallback, useRef, useState } from 'react'
import type { Filters } from '@/types'
import { PROVINCE_ZONE } from '@/config'

const BASE_DEFAULTS: Filters = {
  fromMonth: '',
  toMonth: '',
  zone: 'all',
  province: '',
  hazardType: 'all',
}

function makeDefaults(initial: Partial<Filters>): Filters {
  return { ...BASE_DEFAULTS, ...initial }
}

export interface UseFiltersResult {
  draft: Filters
  applied: Filters
  /** This tab's OWN default filters (Dashboard: zone 'all'; zone tab: zone 1). Captured once on
   *  mount. Exposed so the URL sync can diff/seed against the page's defaults rather than a
   *  module-level guess — UX-04. */
  defaults: Filters
  setDraft: (f: Filters) => void
  apply: () => void
  clear: () => void
  setProvinceAndApply: (p: string) => void
  /** Set draft AND applied in one go (used to restore a shared URL — UX-04). */
  setApplied: (f: Filters) => void
  /** Clear only the province ('' = ทั้งประเทศ) and apply — UX-04(d). */
  clearProvince: () => void
}

export function useFilters(initial: Partial<Filters>): UseFiltersResult {
  // Captured once: SPEC 5.2 says each tab "keeps its own filter state" with its own defaults
  // (Dashboard: zone 'all'; zone tab: zone 1) — later re-renders passing a new `initial` object
  // must not reset an in-progress selection.
  const defaultsRef = useRef<Filters>(makeDefaults(initial))

  const [draft, setDraftState] = useState<Filters>(defaultsRef.current)
  const draftRef = useRef<Filters>(draft)

  const [applied, setAppliedState] = useState<Filters>(defaultsRef.current)

  const setDraft = useCallback((f: Filters) => {
    draftRef.current = f
    setDraftState(f)
  }, [])

  const apply = useCallback(() => {
    setAppliedState(draftRef.current)
  }, [])

  const clear = useCallback(() => {
    // Fresh object identity every call (not defaultsRef.current itself) — if `draft` already
    // equals defaultsRef.current (e.g. the user edited FilterBar's local draft without ever
    // clicking คัดกรอง), passing that same reference back into setDraftState would be a no-op
    // React bails on, leaving FilterBar's uncommitted local values on screen. See useFilters.ts
    // header + FilterBar.tsx's resync effect, which only fires when the `value` prop's identity
    // changes.
    const d = { ...defaultsRef.current }
    draftRef.current = d
    setDraftState(d)
    setAppliedState(d)
  }, [])

  // Map click (SPEC 5.2: "Clicking a province on either map sets the province filter and
  // applies."). If the currently selected zone doesn't contain the clicked province, widen (or
  // retarget) the zone too — otherwise applyFilters' zone-AND-province test would silently drop
  // every row (a map click that empties the page reads as a bug, not a feature).
  const setProvinceAndApply = useCallback((p: string) => {
    const current = draftRef.current
    const zoneOfP = PROVINCE_ZONE[p]
    const zone: Filters['zone'] =
      zoneOfP !== undefined && current.zone !== 'all' && current.zone !== zoneOfP ? zoneOfP : current.zone
    const next: Filters = { ...current, province: p, zone }
    draftRef.current = next
    setDraftState(next)
    setAppliedState(next)
  }, [])

  // Restore a shared '#/dashboard?...' URL (UX-04): draft and applied must land together, or the
  // bar would show a pending change the user never made.
  const setApplied = useCallback((f: Filters) => {
    const next = { ...f }
    draftRef.current = next
    setDraftState(next)
    setAppliedState(next)
  }, [])

  // "ดูทั้งประเทศ" / clearing a map selection. Filters.province '' means ALL provinces; passing
  // 'all' here would be read as a province literally named 'all' and applyFilters would drop
  // every row (UX-04 fix (d)).
  const clearProvince = useCallback(() => {
    const next: Filters = { ...draftRef.current, province: '' }
    draftRef.current = next
    setDraftState(next)
    setAppliedState(next)
  }, [])

  return {
    draft,
    applied,
    defaults: defaultsRef.current,
    setDraft,
    apply,
    clear,
    setProvinceAndApply,
    setApplied,
    clearProvince,
  }
}
