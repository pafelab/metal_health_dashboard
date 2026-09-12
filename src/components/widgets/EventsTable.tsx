// SPEC 6.3 — ตารางเหตุการณ์ (widget 19 Section 1 / widget 5 Section 2).
// Section 1 columns: ลำดับ, เดือน/ปี, เขตสุขภาพ, จังหวัด, หัวข้อข่าว, ลิงก์, ระดับ, การส่งรายงาน.
// Section 2 additionally shows ประเภทภัย as pills and (PDF p.11) must NOT show สถานที่,
// การดำเนินการ, ผู้ปฏิบัติงาน or ช่องทาง alert — those fields don't exist on HazardEvent at all,
// so nothing further to suppress. 20 rows/page. Links open in a new tab (rel="noopener noreferrer").
// Table text 16px. Horizontally scrollable on phones.
//
// Audit changes:
//  - UX-07: a source link becomes an anchor only when it is a real http(s) address; placeholders
//    such as '-' render as plain text instead of a relative link.
//  - UX-14: the search is labelled and scoped to this table, matched vs available counts are
//    shown, the empty state distinguishes "no data in scope" from "no match for <query>",
//    pagination disappears when there is nothing to page through, and เดือน/ปี + ระดับ sort.
//  - UX-12: an incoming severityFilter (from the KPI cards) narrows the table and is shown as a
//    removable chip.

import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Table2,
  X,
} from 'lucide-react'
import Card, { type CardHeaderTone } from '@/components/layout/Card'
import type { HazardEvent, Severity, SLEvent } from '@/types'
import { SEVERITY_META, formatZoneLabel } from '@/config'
import { isValidHttpUrl } from '@/data/normalize'
import { isOutOfPeriod, type CoverageWindow } from '@/data'

export interface EventsTableProps {
  section: 1 | 2
  sl?: SLEvent[]
  hz?: HazardEvent[]
  /** DOM id of the outermost element, so a severity drill-down can scroll here. */
  id?: string
  /** Severity chosen on the KPI cards; applied before the in-table text search. */
  severityFilter?: Severity | null
  onClearSeverityFilter?: () => void
  /** Validated reporting period (UX-02): rows outside it get a "นอกช่วงข้อมูล" badge here. */
  coverage?: CoverageWindow | null
  /** Show ONLY those flagged rows — wired from the section's review banner. */
  outOfPeriodOnly?: boolean
  onToggleOutOfPeriodOnly?: (next: boolean) => void
  /** Deck slide 9 — forwarded straight to Card so a section can frame this table with a filled
   *  title band. Optional and defaulted by Card, so existing call sites are untouched. */
  headerTone?: CardHeaderTone
}

interface Row {
  key: string
  sortKey: number
  monthLabel: string
  zone: number | null
  province: string
  headline: string
  link: string
  severity: Severity
  reporting: string
  hazards?: string[]
}

const PAGE_SIZE = 20

type SortColumn = 'date' | 'severity'
interface SortState {
  column: SortColumn
  /** 'desc' = newest first / most severe first, the default for both columns. */
  dir: 'asc' | 'desc'
}

/** Ordering weight for the ระดับ column: ดำ > แดง > เหลือง > ไม่ระบุ. */
const SEVERITY_WEIGHT: Record<Severity, number> = { black: 3, red: 2, yellow: 1, unknown: 0 }

function toRows(section: 1 | 2, sl: SLEvent[], hz: HazardEvent[]): Row[] {
  if (section === 1) {
    return sl.map((r, i) => ({
      key: `sl-${i}`,
      sortKey: r.sortKey,
      monthLabel: r.monthLabel,
      zone: r.zone,
      province: r.province,
      headline: r.headline,
      link: r.link,
      severity: r.severity,
      reporting: r.reporting,
    }))
  }
  return hz.map((r, i) => ({
    key: `hz-${i}`,
    sortKey: r.sortKey,
    monthLabel: r.monthLabel,
    zone: r.zone,
    province: r.province,
    headline: r.headline,
    link: r.link,
    severity: r.severity,
    reporting: r.reporting,
    hazards: r.hazards,
  }))
}

function reportingPill(reporting: string): { label: string; className: string } {
  const t = (reporting ?? '').trim()
  if (t === '' || t === '-' || t === 'ไม่มีข้อมูล') {
    return { label: 'ไม่มีข้อมูล', className: 'bg-slate-100 text-slate-600' }
  }
  if (t.includes('ตามเกณฑ์') && !t.includes('ไม่')) {
    return { label: 'ตามเกณฑ์', className: 'bg-emerald-100 text-emerald-700' }
  }
  return { label: 'ไม่ตามเกณฑ์', className: 'bg-rose-100 text-rose-700' }
}

/** Badge text tone: the amber and grey fills are far too light for white text (audit UX-05). */
function severityPillText(sev: Severity): string {
  return sev === 'black' || sev === 'red' ? 'text-white' : 'text-slate-900'
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string
  column: SortColumn
  sort: SortState
  onSort: (c: SortColumn) => void
}) {
  const active = sort.column === column
  const Arrow = active && sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="py-2 pr-3 font-medium"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 rounded text-slate-600 outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
      >
        {label}
        <Arrow size={14} aria-hidden="true" className={active ? 'opacity-100' : 'opacity-30'} />
        <span className="sr-only">
          {active ? (sort.dir === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย') : 'กดเพื่อเรียงตามคอลัมน์นี้'}
        </span>
      </button>
    </th>
  )
}

export default function EventsTable({
  section,
  sl,
  hz,
  id,
  severityFilter = null,
  onClearSeverityFilter,
  coverage = null,
  outOfPeriodOnly = false,
  onToggleOutOfPeriodOnly,
  headerTone,
}: EventsTableProps) {
  const rows = useMemo(() => toRows(section, sl ?? [], hz ?? []), [section, sl, hz])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ column: 'date', dir: 'desc' })
  const searchId = useId()
  const hintId = useId()

  useEffect(() => {
    setPage(1)
  }, [search, rows, severityFilter, outOfPeriodOnly, sort])

  // UX-02 — a record dated outside the validated reporting period is flagged for review, so the
  // section banner's count is actually findable among hundreds of rows.
  const flaggedCount = useMemo(
    () => (coverage ? rows.filter((r) => isOutOfPeriod(r.sortKey, coverage)).length : 0),
    [rows, coverage],
  )

  const meta = section === 1 ? SEVERITY_META.section1 : SEVERITY_META.section2
  const accent = section === 1 ? 's1' : 's2'

  // Severity first ("what is in scope"), then the text search ("what matched inside that scope"),
  // so the subtitle can report matched-out-of-available honestly (audit UX-14).
  const available = useMemo(() => {
    let base = severityFilter ? rows.filter((r) => r.severity === severityFilter) : rows
    if (outOfPeriodOnly && coverage) base = base.filter((r) => isOutOfPeriod(r.sortKey, coverage))
    return base
  }, [rows, severityFilter, outOfPeriodOnly, coverage])

  const query = search.trim()
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base =
      q === ''
        ? available
        : available.filter((r) => r.headline.toLowerCase().includes(q) || r.province.toLowerCase().includes(q))
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...base].sort((a, b) => {
      if (sort.column === 'severity') {
        const bySeverity = (SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]) * dir
        // Equal severity keeps the familiar newest-first order as the tie-break.
        return bySeverity !== 0 ? bySeverity : b.sortKey - a.sortKey
      }
      return (a.sortKey - b.sortKey) * dir
    })
  }, [available, query, sort])

  const matched = filtered.length
  const totalPages = Math.max(1, Math.ceil(matched / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const colCount = section === 2 ? 9 : 8

  const onSort = (column: SortColumn) =>
    setSort((s) => (s.column === column ? { column, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { column, dir: 'desc' }))

  return (
    <div id={id} className="h-full scroll-mt-[var(--sticky-offset,96px)]">
      <Card
        title="ตารางเหตุการณ์"
        subtitle={`แสดง ${matched} จาก ${available.length} เหตุการณ์`}
        icon={Table2}
        accent={accent}
        headerTone={headerTone}
        right={
          <div className="w-full sm:w-auto">
            <label
              htmlFor={searchId}
              className={`block text-xs font-bold ${
                headerTone && headerTone !== 'plain' ? 'text-white' : 'text-slate-600'
              }`}
            >
              ค้นหาในตารางนี้
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="relative">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id={searchId}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-describedby={hintId}
                  placeholder="ค้นหาหัวข้อข่าวหรือจังหวัด"
                  className="w-56 max-w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                />
              </div>
              {search !== '' && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold outline-none transition-colors ${
                    headerTone && headerTone !== 'plain'
                      ? 'border-white/40 bg-white/20 text-white hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-s1-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2'
                  }`}
                >
                  ล้างคำค้น
                </button>
              )}
            </div>
            <p
              id={hintId}
              className={`mt-1 max-w-[16rem] text-xs ${
                headerTone && headerTone !== 'plain' ? 'text-white/80' : 'text-slate-500'
              }`}
            >
              ค้นหาเฉพาะหัวข้อข่าวและจังหวัดในตารางนี้ ไม่กระทบฟิลเตอร์ด้านบน
            </p>
            {flaggedCount > 0 && onToggleOutOfPeriodOnly && (
              <button
                type="button"
                aria-pressed={outOfPeriodOnly}
                onClick={() => onToggleOutOfPeriodOnly(!outOfPeriodOnly)}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
              >
                <AlertTriangle size={14} aria-hidden="true" />
                {outOfPeriodOnly
                  ? 'แสดงทุกรายการ'
                  : `ดูเฉพาะรายการนอกช่วงข้อมูล (${flaggedCount.toLocaleString('th-TH')})`}
              </button>
            )}
          </div>
        }
      >
        {severityFilter && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm font-bold text-slate-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: meta[severityFilter].color }}
                aria-hidden="true"
              />
              กรองอยู่: ระดับสี{meta[severityFilter].label}
              {onClearSeverityFilter && (
                <button
                  type="button"
                  onClick={onClearSeverityFilter}
                  aria-label="ยกเลิกฟิลเตอร์ระดับสี"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 outline-none hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        )}

        {outOfPeriodOnly && coverage && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 py-1 pl-3 pr-1 text-sm font-bold text-amber-900">
              <AlertTriangle size={14} aria-hidden="true" />
              {`กรองอยู่: เฉพาะรายการนอกช่วงข้อมูล ${coverage.firstLabel} – ${coverage.lastLabel}`}
              {onToggleOutOfPeriodOnly && (
                <button
                  type="button"
                  onClick={() => onToggleOutOfPeriodOnly(false)}
                  aria-label="ยกเลิกฟิลเตอร์รายการนอกช่วงข้อมูล"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-amber-900 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-amber-700"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        )}

        {/* responsive-audit R05: the desktop table stays (a data grid may keep a two-dimensional
            layout under the WCAG reflow exception), but on a phone the 860px row has to be
            scrolled to read severity and source. The wrapper is now a named, keyboard-focusable
            scroll region and says so, with a visible hint above it. A dedicated per-event card
            list for phones is the larger follow-up this lighter fix does not replace. */}
        <p className="mb-2 text-xs text-slate-600 md:hidden">
            ตารางนี้เลื่อนดูแนวนอนได้ — ปัดซ้าย/ขวาเพื่อดูระดับความรุนแรงและลิงก์แหล่งข่าว
        </p>
        <div
          className="relative overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="ตารางเหตุการณ์ — เลื่อนดูแนวนอนได้"
        >
          {/* Deck slide: the zone column spells out 'เขตสุขภาพที่ N' rather than the abbreviated
              'เขต N'. That cell is ~110px at 16px whitespace-nowrap against ~50px before, so the
              table's minimum width goes up by the same ~60px — otherwise the extra width is taken
              out of the หัวข้อข่าว column instead. Column COUNT is unchanged, so `colCount`
              (and the empty-state colSpan it feeds) stays 8/9. */}
          <table className="w-full min-w-[920px] text-tableText">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-600">
                <th scope="col" className="py-2 pr-3 font-medium">
                  ลำดับ
                </th>
                <SortableHeader label="เดือน/ปี" column="date" sort={sort} onSort={onSort} />
                <th scope="col" className="py-2 pr-3 font-medium">
                  เขตสุขภาพ
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  จังหวัด
                </th>
                {section === 2 && (
                  <th scope="col" className="py-2 pr-3 font-medium">
                    ประเภทภัย
                  </th>
                )}
                <th scope="col" className="py-2 pr-3 font-medium">
                  หัวข้อข่าว
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  ลิงก์
                </th>
                <SortableHeader label="ระดับ" column="severity" sort={sort} onSort={onSort} />
                <th scope="col" className="py-2 font-medium">
                  การส่งรายงาน
                </th>
              </tr>
            </thead>
            <tbody>
              {matched === 0 ? (
                <tr>
                  <td colSpan={colCount} className="py-8 text-center text-slate-600">
                    {available.length === 0 ? (
                      'ไม่มีเหตุการณ์ในขอบเขตที่เลือก'
                    ) : (
                      <span className="inline-flex flex-wrap items-center justify-center gap-2">
                        {/* The query is echoed as text, never as markup. */}
                        <span>ไม่พบเหตุการณ์ที่ตรงกับ &quot;{query}&quot;</span>
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="rounded-full border border-slate-300 px-3 py-1 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        >
                          ล้างคำค้น
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => {
                  const sev = meta[r.severity]
                  const pill = reportingPill(r.reporting)
                  return (
                    <tr key={r.key} className="border-b border-slate-50 align-top last:border-0">
                      <td className="py-3 pr-3 text-slate-600">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {r.monthLabel || '-'}
                        {isOutOfPeriod(r.sortKey, coverage) && (
                          <span
                            title={`อยู่นอกช่วงข้อมูล ${coverage?.firstLabel} – ${coverage?.lastLabel} — ควรตรวจสอบ`}
                            className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900"
                          >
                            <AlertTriangle size={12} aria-hidden="true" />
                            นอกช่วงข้อมูล
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {r.zone !== null ? formatZoneLabel(r.zone) : '-'}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">{r.province || '-'}</td>
                      {section === 2 && (
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {(r.hazards ?? []).map((h) => (
                              <span
                                key={h}
                                className="whitespace-nowrap rounded-full bg-s2-50 px-2 py-0.5 text-xs font-medium text-s2-700"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                      {/* Audit UX-14: headlines wrap in full instead of being clipped. */}
                      <td className="py-3 pr-3 max-w-[320px] whitespace-normal break-words">{r.headline || '-'}</td>
                      <td className="py-3 pr-3">
                        {isValidHttpUrl(r.link) ? (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`เปิดลิงก์แหล่งข่าว: ${r.headline || 'ไม่ระบุหัวข้อข่าว'}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded text-s2-700 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                          >
                            เปิดลิงก์ <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="whitespace-nowrap text-slate-500">ไม่มีลิงก์แหล่งข่าว</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityPillText(r.severity)}`}
                          style={{ backgroundColor: sev.color }}
                        >
                          {sev.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Nothing to page through when nothing matched (audit UX-14). */}
        {matched > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              หน้า {safePage} จาก {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="หน้าก่อนหน้า"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-600 outline-none disabled:opacity-40 enabled:hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="หน้าถัดไป"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-600 outline-none disabled:opacity-40 enabled:hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
