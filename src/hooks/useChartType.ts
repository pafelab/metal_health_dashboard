// Persists each chart widget's user-chosen chart type in localStorage (SPEC 7).
// Frozen contract — see task brief. Tolerates malformed JSON and unavailable storage
// (private browsing, quota errors, non-browser environments during SSR/tests).

import { useCallback, useEffect, useState } from 'react'
import type { ChartType } from '@/types'

export const CHART_TYPES_STORAGE_KEY = 'sl-dashboard:chartTypes'

/** Fired on window when resetChartTypes() runs, so every mounted hook instance re-syncs. */
const RESET_EVENT = 'sl-dashboard:chart-types-reset'

type StoredMap = Record<string, ChartType>

function safeParseMap(json: string | null): StoredMap {
  if (!json) return {}
  try {
    const parsed: unknown = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StoredMap
    }
    return {}
  } catch {
    return {}
  }
}

function readAll(): StoredMap {
  try {
    return safeParseMap(window.localStorage.getItem(CHART_TYPES_STORAGE_KEY))
  } catch {
    return {}
  }
}

function writeAll(map: StoredMap): void {
  try {
    window.localStorage.setItem(CHART_TYPES_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage unavailable — the in-memory React state still works for this session.
  }
}

/**
 * Resolves what a stored value means for this widget. A persisted type that the widget does not
 * offer (allowedTypes changed since the choice was made, or storage was hand-edited) must not be
 * rendered — the widget falls back to its own default instead (audit UX-13).
 */
function resolveStored(widgetId: string, fallback: ChartType, allowed?: ChartType[]): ChartType {
  const stored = readAll()[widgetId]
  if (!stored) return fallback
  if (allowed && !allowed.includes(stored)) return fallback
  return stored
}

/**
 * Per-widget chart type, persisted across reloads. `fallback` is the widget's default type
 * (used on first visit, when storage is empty/corrupt, or after resetChartTypes()). `allowed`,
 * when given, is the list of types the widget offers; anything else in storage is ignored.
 */
export function useChartType(
  widgetId: string,
  fallback: ChartType,
  allowed?: ChartType[],
): [ChartType, (t: ChartType) => void] {
  const [type, setTypeState] = useState<ChartType>(() => resolveStored(widgetId, fallback, allowed))

  // Keep in sync with a reset triggered elsewhere on the page (or in another mounted instance).
  useEffect(() => {
    const onReset = (): void => setTypeState(fallback)
    try {
      window.addEventListener(RESET_EVENT, onReset)
      return () => window.removeEventListener(RESET_EVENT, onReset)
    } catch {
      return undefined
    }
  }, [fallback])

  // If the widget id itself changes under a mounted instance, re-read for the new id.
  useEffect(() => {
    setTypeState(resolveStored(widgetId, fallback, allowed))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId])

  const setType = useCallback(
    (t: ChartType) => {
      setTypeState(t)
      const all = readAll()
      all[widgetId] = t
      writeAll(all)
    },
    [widgetId],
  )

  return [type, setType]
}

/** Clears every persisted chart-type choice and resets all mounted widgets to their defaults. */
export function resetChartTypes(): void {
  try {
    window.localStorage.removeItem(CHART_TYPES_STORAGE_KEY)
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new Event(RESET_EVENT))
  } catch {
    // non-browser environment — nothing mounted to notify
  }
}
