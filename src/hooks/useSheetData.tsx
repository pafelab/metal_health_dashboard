// React context that fetches both sheet tabs ONCE at app start and exposes the parsed rows to
// every tab/page. SPEC 3.1 / 5.1 ("Both sheet fetches happen once at app start and are shared
// by all tabs; the reload button refetches both."). The only network I/O is fetchAllData(),
// re-exported (with the parsers) from '@/data' — this file owns no parsing/normalisation logic
// of its own.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { SLEvent, HazardEvent, McattPerson } from '@/types'
import { fetchAllData, parseSheet2, parseWide, parseMcatt } from '@/data'

export interface SheetDataValue {
  sl: SLEvent[]
  hz: HazardEvent[]
  mcatt: McattPerson[]
  loading: boolean
  error: string | null
  updatedAt: Date | null
  reload: () => void
}

const SheetDataContext = createContext<SheetDataValue | null>(null)

const FETCH_ERROR_MESSAGE =
  'ไม่สามารถโหลดข้อมูลจากชีตได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'

export function SheetDataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [sl, setSl] = useState<SLEvent[]>([])
  const [hz, setHz] = useState<HazardEvent[]>([])
  const [mcatt, setMcatt] = useState<McattPerson[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  // Guards against setState after unmount and against two reloads racing each other.
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)

  const load = useCallback(() => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true)
    setError(null)

    fetchAllData()
      .then(({ sheet2, wide }) => {
        if (!mountedRef.current) return
        setSl(parseSheet2(sheet2))
        setHz(parseWide(wide))
        setMcatt(parseMcatt(wide))
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (!mountedRef.current) return
        setError(FETCH_ERROR_MESSAGE)
      })
      .finally(() => {
        inFlightRef.current = false
        if (!mountedRef.current) return
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = useCallback(() => {
    load()
  }, [load])

  const value: SheetDataValue = { sl, hz, mcatt, loading, error, updatedAt, reload }

  return <SheetDataContext.Provider value={value}>{children}</SheetDataContext.Provider>
}

export function useSheetData(): SheetDataValue {
  const ctx = useContext(SheetDataContext)
  if (ctx === null) {
    throw new Error('useSheetData must be used within a SheetDataProvider')
  }
  return ctx
}
