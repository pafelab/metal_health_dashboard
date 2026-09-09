// Hash-based route hook (SPEC 5.1). No router library — five known hashes, default '#/dashboard'.

import { useCallback, useEffect, useState } from 'react'

const VALID_HASHES = ['#/dashboard', '#/zone', '#/report', '#/mcatt', '#/contact'] as const
const DEFAULT_HASH: string = '#/dashboard'

function normalizeHash(raw: string): string {
  return (VALID_HASHES as readonly string[]).includes(raw) ? raw : DEFAULT_HASH
}

function readHash(): string {
  if (typeof window === 'undefined') return DEFAULT_HASH
  return normalizeHash(window.location.hash)
}

/**
 * Current hash route + a navigator. Listens to `hashchange` so back/forward and direct links
 * work. An unknown or empty hash normalises to the dashboard both on read and via the effect
 * below, which also seeds `location.hash` on first load so the address bar reflects the route.
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
    const target = normalizeHash(h)
    if (window.location.hash !== target) {
      // Triggers the 'hashchange' listener above, which updates state.
      window.location.hash = target
    } else {
      setHash(target)
    }
  }, [])

  return [hash, navigate]
}
