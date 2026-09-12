// Left filter sidebar (docked on desktop, off-canvas drawer on phones).
//
// Re-architected from the former horizontal top filter bar into a dedicated left sidebar.
// On desktop (>= lg), it stays pinned to the left edge below PageHeader (top: 128px,
// height: calc(100vh - 128px), scrollable with its own overflow-y-auto).
// It can be collapsed by the user to expand the dashboard data area to full width.
// On mobile (< lg), it operates as a slide-out modal drawer with dark backdrop.
//
// *** AUTO-APPLY ***
// Every dropdown change commits immediately via `onApply`. The reset button
// ("ล้างฟิลเตอร์ทั้งหมด") restores defaults.
//
// *** Buddhist years ***
// Filters.fromMonth / toMonth are ALWAYS Buddhist-year 'YYYY-MM' ('2569-06').
// MonthPicker is Buddhist-era native end to end.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  Eye,
  Filter as FilterIcon,
  Flame,
  Map,
  MapPin,
  RotateCcw,
} from 'lucide-react'
import type { Filters } from '@/types'
import {
  ALL_PROVINCES,
  HAZARD_FILTER_OPTIONS,
  HAZARD_TYPES,
  MONTH_ABBR,
  PROVINCE_ALIASES,
  PROVINCE_EN,
  THAI_MONTHS,
  ZONE_NUMBERS,
  ZONE_PROVINCES,
  formatZoneLabel,
} from '@/config'
import SearchableSelect from '@/components/ui/SearchableSelect'
import MonthPicker from '@/components/ui/MonthPicker'
import { HEADER_HEIGHT_PX } from './PageHeader'

export interface FilterBarProps {
  value: Filters
  onApply: (f: Filters) => void
  /** Total reset affordance. */
  onClear?: () => void
  showZone?: boolean
  zoneMode?: boolean
  /** Default zone for inline reset. */
  defaultZone?: Filters['zone']
  /** Applied filters actually in force for summary display. */
  applied?: Filters
  /** Controlled open state for the sidebar/drawer. */
  open?: boolean
  /** Callback to close or collapse the sidebar/drawer. */
  onClose?: () => void
}

/** Human-readable Buddhist-year month ('มิถุนายน 2569'). */
function formatBeMonth(be: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(be.trim())
  if (!m) return ''
  const monthIdx = parseInt(m[2], 10) - 1
  const name = THAI_MONTHS[monthIdx]
  if (!name) return ''
  return `${name} ${m[1]}`
}

/** Compact Buddhist month for the applied-scope summary ('ต.ค. 2568'). */
function formatBeMonthShort(be: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(be.trim())
  if (!m) return ''
  const abbr = MONTH_ABBR[parseInt(m[2], 10) - 1]
  return abbr ? `${abbr} ${m[1]}` : ''
}

/** Buddhist 'YYYY-MM' -> ordinal. null when empty/unparseable. */
function monthOrdinal(be: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(be.trim())
  if (!m) return null
  return parseInt(m[1], 10) * 12 + parseInt(m[2], 10)
}

export function describeMonthRange(f: Filters): string {
  const from = formatBeMonthShort(f.fromMonth)
  const to = formatBeMonthShort(f.toMonth)
  if (!from && !to) return 'ทุกช่วงเวลา'
  if (from && !to) return `ตั้งแต่ ${from}`
  if (!from && to) return `ถึง ${to}`
  return from === to ? from : `${from} – ${to}`
}

export function describeHazardType(key: string): string {
  if (key === 'all' || key === '') return 'ทุกประเภทภัย'
  if (key === 'social') return 'Social Listening'
  if (key === 'hazards') return 'ภัยอื่นๆ (รวม)'
  return HAZARD_TYPES.find((h) => h.key === key)?.label ?? 'ทุกประเภทภัย'
}

/** Human-readable description of the currently applied filter criteria. */
export function describeApplied(f: Filters): string {
  return [
    describeMonthRange(f),
    f.zone === 'all' ? 'ทุกเขตสุขภาพ' : formatZoneLabel(f.zone),
    f.province === '' ? 'ทั้งประเทศ' : f.province,
    describeHazardType(f.hazardType),
  ].join(' · ')
}

const labelCls = 'flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5'

const HAZARD_ENGLISH_MAP: Record<string, string> = {
  all: 'All',
  social: 'Social Listening',
  hazards: 'Other Hazards (All)',
  biological: 'Biological',
  chemical: 'Chemical & Radiation',
  natural: 'Natural Disaster',
  environmental: 'Environmental',
  transport: 'Transport Accident',
  security: 'National Security',
}

const STORAGE_KEY = 'dmh_filter_sidebar_open'

function getInitialOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY)
    if (saved !== null) return saved === 'true'
  } catch {
    // sessionStorage unavailable
  }
  return window.innerWidth >= 1024
}

export default function FilterBar({
  value,
  onApply,
  onClear,
  showZone = true,
  zoneMode = false,
  applied,
  defaultZone = 'all',
  open: openProp,
  onClose,
}: FilterBarProps) {
  const [internalOpen, setInternalOpen] = useState(getInitialOpen)
  const isControlled = typeof openProp === 'boolean'
  const isOpen = isControlled ? openProp : internalOpen

  const [rangeNotice, setRangeNotice] = useState('')
  const fieldsId = useId()
  const barRef = useRef<HTMLElement | null>(null)

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
    if (!isControlled) {
      setInternalOpen(false)
      try {
        window.sessionStorage.setItem(STORAGE_KEY, 'false')
      } catch {}
    }
  }

  // Publish sticky offset: since the filter bar is now on the left, top sticky offset is simply the header height.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--sticky-offset', `${HEADER_HEIGHT_PX}px`)
    return () => {
      root.style.setProperty('--sticky-offset', `${HEADER_HEIGHT_PX}px`)
    }
  }, [])

  // Smooth real-time resize sync for charts (ECharts) while sidebar is expanding/collapsing
  useEffect(() => {
    let frameId: number
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      window.dispatchEvent(new Event('resize'))
      if (elapsed < 350) {
        frameId = requestAnimationFrame(animate)
      }
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [isOpen])

  const zoneProvinces =
    value.zone === 'all' ? ALL_PROVINCES : (ZONE_PROVINCES[value.zone] ?? ALL_PROVINCES)

  function commit(next: Filters, notice = '') {
    setRangeNotice(notice)
    onApply(next)
  }

  function commitFromMonth(val: string) {
    const next: Filters = { ...value, fromMonth: val }
    const from = monthOrdinal(val)
    const to = monthOrdinal(value.toMonth)
    if (from !== null && to !== null && from > to) {
      next.toMonth = val
      commit(next, `ปรับ "ถึงเดือน" เป็น ${formatBeMonth(val)} เพราะเดือนสิ้นสุดเดิมอยู่ก่อนเดือนเริ่มต้น`)
      return
    }
    commit(next)
  }

  function commitToMonth(val: string) {
    const next: Filters = { ...value, toMonth: val }
    const to = monthOrdinal(val)
    const from = monthOrdinal(value.fromMonth)
    if (to !== null && from !== null && to < from) {
      next.fromMonth = val
      commit(next, `ปรับ "ตั้งแต่เดือน" เป็น ${formatBeMonth(val)} เพราะเดือนเริ่มต้นเดิมอยู่หลังเดือนสิ้นสุด`)
      return
    }
    commit(next)
  }

  function handleZoneChange(raw: string) {
    const zone: Filters['zone'] = raw === 'all' ? 'all' : Number(raw)
    const provinces = zone === 'all' ? ALL_PROVINCES : (ZONE_PROVINCES[zone] ?? [])
    const province = provinces.includes(value.province) ? value.province : ''
    commit({ ...value, zone, province })
  }

  function handleClear() {
    setRangeNotice('')
    onClear?.()
  }

  const accentColor = zoneMode ? 's2' : 's1'
  const appliedScope = describeApplied(applied ?? value)

  const zoneOptions = useMemo(
    () => [
      { value: 'all', label: 'ทั้งหมด', aliases: ['all', 'ทุกเขต'] },
      ...ZONE_NUMBERS.map((z) => ({
        value: String(z),
        label: formatZoneLabel(z),
        aliases: [
          `เขต ${z}`,
          `เขต${z}`,
          `เขตสุขภาพที่${z}`,
          `zone ${z}`,
          `zone${z}`,
          `health zone ${z}`,
          String(z),
        ],
      })),
    ],
    [],
  )

  const provinceOptions = useMemo(() => {
    const aliasMap: Record<string, string[]> = {}
    Object.entries(PROVINCE_ALIASES).forEach(([alias, prov]) => {
      if (!aliasMap[prov]) aliasMap[prov] = []
      aliasMap[prov].push(alias)
    })

    Object.entries(PROVINCE_EN).forEach(([prov, enName]) => {
      if (!aliasMap[prov]) aliasMap[prov] = []
      aliasMap[prov].push(enName)
      aliasMap[prov].push(enName.replace(/\s+/g, ''))
    })

    const extraAliases: Record<string, string[]> = {
      กรุงเทพมหานคร: ['กทม', 'กทม.', 'กรุงเทพ', 'กรุงเทพฯ', 'bangkok', 'bkk'],
      เชียงใหม่: ['chiang mai', 'chiangmai', 'cnx'],
      เชียงราย: ['chiang rai', 'chiangrai', 'cei'],
      ภูเก็ต: ['phuket', 'hkt'],
      ชลบุรี: ['chonburi', 'chon buri', 'pattaya', 'พัทยา'],
      นครราชสีมา: ['korat', 'โคราช'],
      สงขลา: ['hat yai', 'hatyai', 'หาดใหญ่', 'songkhla'],
      ขอนแก่น: ['khon kaen', 'khonkaen', 'kku'],
      นนทบุรี: ['nonthaburi'],
      ปทุมธานี: ['pathum thani', 'pathumthani'],
      สุราษฎร์ธานี: ['surat thani', 'suratthani', 'สมุย', 'samui', 'koh samui'],
      พระนครศรีอยุธยา: ['อยุธยา', 'ayutthaya'],
    }

    Object.entries(extraAliases).forEach(([prov, aliases]) => {
      if (!aliasMap[prov]) aliasMap[prov] = []
      aliasMap[prov].push(...aliases)
    })

    return [
      { value: '', label: 'ทั้งหมด', aliases: ['all', 'ทั้งประเทศ'] },
      ...zoneProvinces.map((p) => ({
        value: p,
        label: p,
        aliases: aliasMap[p],
      })),
    ]
  }, [zoneProvinces])

  const hazardOptions = useMemo(
    () =>
      HAZARD_FILTER_OPTIONS.map((opt) => {
        const en = HAZARD_ENGLISH_MAP[opt.key]
        const aliases: string[] = []
        if (en) aliases.push(en)
        return { value: opt.key, label: opt.label, aliases }
      }),
    [],
  )

  const sidebarBody = (
    <div className="flex h-full flex-col bg-white">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`grid h-8 w-8 place-items-center rounded-lg ${
              zoneMode ? 'bg-s2-50 text-s2-700' : 'bg-s1-50 text-s1-700'
            }`}
          >
            <FilterIcon size={16} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">ฟิลเตอร์ข้อมูล</h2>
            <p className="text-xs text-slate-500">ปรับเปลี่ยนข้อมูลที่แสดง</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          title="ซ่อนฟิลเตอร์ข้อมูล"
          aria-label="ซ่อนฟิลเตอร์ข้อมูล"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">ซ่อน</span>
        </button>
      </div>

      {/* Form Fields Stack */}
      <div id={fieldsId} className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
        {/* ตั้งแต่เดือน */}
        <div>
          <label className={labelCls}>
            <Calendar size={14} className="text-slate-400" />
            ตั้งแต่เดือน (พ.ศ.)
          </label>
          <MonthPicker
            value={value.fromMonth}
            onChange={commitFromMonth}
            placeholder="เลือกเดือนเริ่มต้น"
            accentColor={accentColor}
          />
        </div>

        {/* ถึงเดือน */}
        <div>
          <label className={labelCls}>
            <Calendar size={14} className="text-slate-400" />
            ถึงเดือน (พ.ศ.)
          </label>
          <MonthPicker
            value={value.toMonth}
            onChange={commitToMonth}
            placeholder="เลือกเดือนสิ้นสุด"
            accentColor={accentColor}
          />
        </div>

        {/* เขตสุขภาพ */}
        {showZone && (
          <div>
            <label className={labelCls}>
              <Map size={14} className="text-slate-400" />
              เขตสุขภาพ
            </label>
            <SearchableSelect
              value={String(value.zone)}
              onChange={handleZoneChange}
              options={zoneOptions}
              placeholder="เลือกเขตสุขภาพ"
              searchPlaceholder="ค้นหาเขตสุขภาพ"
              accentColor={accentColor}
              defaultValue={String(defaultZone)}
            />
          </div>
        )}

        {/* จังหวัด */}
        <div>
          <label className={labelCls}>
            <MapPin size={14} className="text-slate-400" />
            จังหวัด
          </label>
          <SearchableSelect
            value={value.province}
            onChange={(val) => commit({ ...value, province: val })}
            options={provinceOptions}
            placeholder="เลือกจังหวัด"
            searchPlaceholder="ค้นหาจังหวัด"
            accentColor={accentColor}
            defaultValue=""
          />
        </div>

        {/* ประเภทภัย */}
        <div>
          <label className={labelCls}>
            <Flame size={14} className="text-slate-400" />
            ประเภทภัย
          </label>
          <SearchableSelect
            value={value.hazardType}
            onChange={(val) => commit({ ...value, hazardType: val })}
            options={hazardOptions}
            placeholder="เลือกประเภทภัย"
            searchPlaceholder="ค้นหาประเภทภัย"
            accentColor={accentColor}
            defaultValue="all"
          />
        </div>
      </div>

      {/* Footer / Summary block */}
      <div className="p-5 border-t border-slate-100 bg-slate-50/70 space-y-3 shrink-0">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Eye size={13} className="text-slate-500" aria-hidden="true" />
            <span>กำลังแสดง:</span>
          </div>
          <p className="text-slate-600 leading-relaxed break-words">{appliedScope}</p>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={handleClear}
            className="w-full flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>ล้างฟิลเตอร์ทั้งหมด</span>
          </button>
        )}

        {rangeNotice && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 font-medium leading-relaxed"
          >
            {rangeNotice}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar: sticky 320px column below PageHeader (top: 128px) with width & opacity animation */}
      <aside
        ref={barRef}
        aria-label="ฟิลเตอร์ข้อมูล"
        aria-hidden={!isOpen}
        className={`hidden lg:block shrink-0 bg-white sticky top-[128px] h-[calc(100vh-128px)] z-20 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
          isOpen
            ? 'w-80 border-r border-slate-200 opacity-100'
            : 'w-0 border-r-0 border-transparent opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`w-80 h-full transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-12'
          }`}
        >
          {sidebarBody}
        </div>
      </aside>

      {/* Mobile / Tablet drawer: off-canvas drawer with backdrop and smooth sliding animation */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="ฟิลเตอร์ข้อมูล"
          className={`absolute inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarBody}
        </aside>
      </div>
    </>
  )
}

export { FilterBar as FilterSidebar }
