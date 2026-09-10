// Hash-based route hook (SPEC 5.1). No router library — five known hashes, default '#/dashboard'.
//
// UX-04 added a shareable filter query to the hash ('#/dashboard?zone=8&province=อุดรธานี', see
// useFilterUrlSync). This hook is deliberately query-BLIND: it strips everything from '?' before
// validating and only ever returns the PATH part, so App.tsx keeps comparing against plain
// '#/dashboard' / '#/zone' values and re-clicking the current tab does not wipe the query.

import { useCallback, useEffect, useState } from 'react'

const VALID_HASHES = ['#/dashboard', '#/zone', '#/report', '#/mcatt', '#/contact'] as const
const DEFAULT_HASH: string = '#/dashboard'

/** '#/dashboard?zone=8' -> '#/dashboard'. Anything unknown falls back to the dashboard. */
function hashPath(raw: string): string {
  const path = raw.split('?')[0]
  return (VALID_HASHES as readonly string[]).includes(path) ? path : DEFAULT_HASH
}

function readHash(): string {
  if (typeof window === 'undefined') return DEFAULT_HASH
  return hashPath(window.location.hash)
}

/**
 * Current hash route (path only) + a navigator. Listens to `hashchange` so back/forward and
 * direct links work. An unknown or empty hash normalises to the dashboard both on read and via
 * the effect below, which also seeds `location.hash` on first load so the address bar reflects
 * the route.
 */
export function useHashRoute(): [string, (h: string) => void] {
  const [hash, setHash] = useState<string>(readHash)

  useEffect(() => {
    const onHashChange = () => setHash(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (window.location.hash === '' || window.location.hash === '#') {
      window.location.hash = DEFAULT_HASH
    }
  }, [])

  const navigate = useCallback((h: string) => {
    const target = hashPath(h)
    // Compare paths, not raw hashes: staying on the current route must keep its ?filters query.
    if (hashPath(window.location.hash) !== target) {
      // Triggers the 'hashchange' listener above, which updates state.
      window.location.hash = target
    } else {
      setHash(target)
    }
  }, [])

  return [hash, navigate]
}
