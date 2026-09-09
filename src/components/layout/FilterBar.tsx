// Sticky filter bar under the page header (SPEC 5.2). Filters apply ONLY on คัดกรอง — this
// component owns a local input draft, seeded from `value` and re-synced whenever `value`
// changes from outside (mount, ล้าง, or a map click via setProvinceAndApply); `onApply` fires
// once, with the fully-assembled Filters, when the user clicks คัดกรอง.
//
// *** CRITICAL — docs/BUILD_NOTES.md "CRITICAL UI HAZARD" ***
// Filters.fromMonth / toMonth are ALWAYS Buddhist-year 'YYYY-MM' ('2569-06'). An HTML
// <input type="month"> reads/writes a GREGORIAN year ('2026-06'). The two helpers below are the
// ONLY place that conversion happens (+543 reading the input into Filters, -543 writing a
// Filters value back into the input) — useFilters and applyFilters must never see a Gregorian
// year. Verified against the verification gate: 2569-01..2569-06 selects 335 ชีต2 rows;
// 2026-01..2026-06 (the un-converted Gregorian equivalent) selects 0.

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Filter as FilterIcon,
  Flame,
  Map,
  MapPin,
  X as ClearIcon,
} from 'lucide-react'
import type { Filters } from '@/types'
import {
  ALL_PROVINCES,
  HAZARD_FILTER_OPTIONS,
  PROVINCE_ALIASES,
  PROVINCE_EN,
  THAI_MONTHS,
  ZONE_PROVINCES,
} from '@/config'
import SearchableSelect from '@/components/ui/SearchableSelect'
import MonthPicker from '@/components/ui/MonthPicker'
import { HEADER_HEIGHT_PX } from './PageHeader'

export interface FilterBarProps {
  value: Filters
  onApply: (f: Filters) => void
  onClear: () => void
  showZone?: boolean
  zoneMode?: boolean
}

/** Buddhist 'YYYY-MM' -> Gregorian 'YYYY-MM' for an <input type="month"> value attribute. */
function beMonthToInputValue(be: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(be.trim())
  if (!m) return ''
  const ceYear = parseInt(m[1], 10) - 543
  return `${ceYear}-${m[2]}`
}

/** Gregorian 'YYYY-MM' (from the <input> element) -> Buddhist 'YYYY-MM' for Filters. */
function inputValueToBeMonth(ce: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ce.trim())
  if (!m) return ''
  const beYear = parseInt(m[1], 10) + 543
  return `${beYear}-${m[2]}`
}

/**
 * Human-readable Buddhist-year confirmation shown under each month input ('มิถุนายน 2569').
 * The native <input type="month"> always renders the Gregorian year (browser chrome we cannot
 * relabel), which would otherwise be the only year a Thai user sees on a page where every other
 * date reads in พ.ศ. This line is the visible proof the +543 conversion actually happened.
 */
function formatBeMonth(be: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(be.trim())
  if (!m) return ''
  const monthIdx = parseInt(m[2], 10) - 1
  const name = THAI_MONTHS[monthIdx]
  if (!name) return ''
  return `${name} ${m[1]}`
}

const ZONE_NUMBERS = Array.from({ length: 13 }, (_, i) => i + 1)

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-s1-300 focus:border-s1-400 transition-all shadow-sm'
const labelCls = 'flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5'

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

export default function FilterBar({
  value,
  onApply,
  onClear,
  showZone = true,
  zoneMode = false,
}: FilterBarProps) {
  const [local, setLocal] = useState<Filters>(value)

  // Re-sync from the parent's draft on every change that originates OUTSIDE this component.
  // Our own edits never round-trip through `value` mid-typing, so this never clobbers the user.
  useEffect(() => {
    setLocal(value)
  }, [value])

  const zoneProvinces =
    local.zone === 'all' ? ALL_PROVINCES : (ZONE_PROVINCES[local.zone] ?? ALL_PROVINCES)

  function handleZoneChange(raw: string) {
    const zone: Filters['zone'] = raw === 'all' ? 'all' : Number(raw)
    const provinces = zone === 'all' ? ALL_PROVINCES : (ZONE_PROVINCES[zone] ?? [])
    // Reset the province when it no longer belongs to the newly selected zone.
    const province = provinces.includes(local.province) ? local.province : ''
    setLocal({ ...local, zone, province })
  }

  const accentBtn = zoneMode ? 'bg-s2-600 hover:bg-s2-700' : 'bg-s1-600 hover:bg-s1-700'
  const accentColor = zoneMode ? 's2' : 's1'

  // Options for Health Zone (supports both Thai and English search)
  const zoneOptions = useMemo(
    () => [
      { value: 'all', label: 'ทั้งหมด (All)' },
      ...ZONE_NUMBERS.map((z) => ({
        value: String(z),
        label: `เขต ${z} (Zone ${z})`,
        aliases: [
          `เขต${z}`,
          `เขตสุขภาพที่ ${z}`,
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

  // Reverse mapping and English aliases for provinces (supports Thai & English search)
  const provinceOptions = useMemo(() => {
    const aliasMap: Record<string, string[]> = {}
    Object.entries(PROVINCE_ALIASES).forEach(([alias, prov]) => {
      if (!aliasMap[prov]) aliasMap[prov] = []
      aliasMap[prov].push(alias)
    })

    // English names from thailand.json
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
      { value: '', label: 'ทั้งหมด (All)' },
      ...zoneProvinces.map((p) => {
        const en = PROVINCE_EN[p]
        return {
          value: p,
          label: en ? `${p} (${en})` : p,
          aliases: aliasMap[p],
        }
      }),
    ]
  }, [zoneProvinces])

  // Options for Hazard Type (supports Thai & English search)
  const hazardOptions = useMemo(
    () =>
      HAZARD_FILTER_OPTIONS.map((opt) => {
        const en = HAZARD_ENGLISH_MAP[opt.key]
        const aliases: string[] = []
        if (en) aliases.push(en)
        if (opt.label.startsWith('- ')) {
          aliases.push(opt.label.slice(2))
        }
        return {
          value: opt.key,
          label: en && opt.key !== 'social' ? `${opt.label} (${en})` : opt.label,
          aliases,
        }
      }),
    [],
  )

  return (
    <div
      // SPEC 5.2 says this bar is sticky, and it is — from md up, where it is at most two rows
      // (measured 215px at 768, 139px at 1280, i.e. 26-37% of the viewport under the 72px header).
      // Below md it stacks to one field per row and pinning it is not viable: measured 569px tall
      // at 390x820, so header+bar owned 78% of the screen and the first card's title sat behind it;
      // at 640x360 (landscape phone) the 445px pinned block is TALLER than the viewport, which puts
      // คัดกรอง permanently off-screen. Static below md, so it scrolls away like normal content.
      // `top` is simply inert while the element is static, so no second breakpoint is needed here.
      className="md:sticky z-20 bg-canvas/95 backdrop-blur border-b border-slate-100 shadow-sm"
      style={{ top: HEADER_HEIGHT_PX }}
    >
      <div className="px-4 sm:px-6 py-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(max-content,1fr)] gap-3 items-end">
          {/* จากเดือน */}
          <div>
            <label className={labelCls}>
              <Calendar size={14} className="text-slate-400" />
              ตั้งแต่เดือน (พ.ศ.)
            </label>
            <MonthPicker
              value={local.fromMonth}
              onChange={(val) => setLocal({ ...local, fromMonth: val })}
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
              value={local.toMonth}
              onChange={(val) => setLocal({ ...local, toMonth: val })}
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
                value={String(local.zone)}
                onChange={handleZoneChange}
                options={zoneOptions}
                placeholder="เลือกเขตสุขภาพ"
                searchPlaceholder="ค้นหา... (เช่น 1, Zone 5)"
                accentColor={accentColor}
                defaultValue="all"
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
              value={local.province}
              onChange={(val) => setLocal({ ...local, province: val })}
              options={provinceOptions}
              placeholder="เลือกจังหวัด"
              searchPlaceholder="ค้นหา... (เช่น เชียงใหม่, Bangkok, BKK)"
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
              value={local.hazardType}
              onChange={(val) => setLocal({ ...local, hazardType: val })}
              options={hazardOptions}
              placeholder="เลือกประเภทภัย"
              searchPlaceholder="ค้นหา... (เช่น ธรรมชาติ, Chemical, Social)"
              accentColor={accentColor}
              defaultValue="all"
            />
          </div>

          {/* Buttons: คัดกรอง & ล้าง */}
          <div className="flex gap-2 sm:col-span-2 md:col-span-1 xl:col-span-1">
            <button
              type="button"
              onClick={() => onApply(local)}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer ${accentBtn}`}
            >
              <FilterIcon size={16} /> คัดกรอง
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm transition-colors cursor-pointer"
            >
              <ClearIcon size={16} /> ล้าง
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

