// SPEC 6.3 — ตารางเหตุการณ์ (widget 19 Section 1 / widget 5 Section 2).
// Section 1 columns: ลำดับ, เดือน/ปี, เขต, จังหวัด, หัวข้อข่าว, ลิงก์, ระดับ, การส่งรายงาน.
// Section 2 additionally shows ประเภทภัย as pills and (PDF p.11) must NOT show สถานที่,
// การดำเนินการ, ผู้ปฏิบัติงาน or ช่องทาง alert — those fields don't exist on HazardEvent at all,
// so nothing further to suppress. Search box filters headline/province, 20 rows/page, newest
// first (sortKey desc). Links open in a new tab (rel="noopener noreferrer"). Table text 16px.
// Horizontally scrollable on phones. Page resets to 1 whenever the search text or incoming rows
// change.

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Search, Table2 } from 'lucide-react'
import Card from '@/components/layout/Card'
import type { HazardEvent, Severity, SLEvent } from '@/types'
import { SEVERITY_META } from '@/config'

export interface EventsTableProps {
  section: 1 | 2
  sl?: SLEvent[]
  hz?: HazardEvent[]
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
    return { label: 'ไม่มีข้อมูล', className: 'bg-slate-100 text-slate-500' }
  }
  if (t.includes('ตามเกณฑ์') && !t.includes('ไม่')) {
    return { label: 'ตามเกณฑ์', className: 'bg-emerald-100 text-emerald-700' }
  }
  return { label: 'ไม่ตามเกณฑ์', className: 'bg-rose-100 text-rose-700' }
}

export default function EventsTable({ section, sl, hz }: EventsTableProps) {
  const rows = useMemo(() => toRows(section, sl ?? [], hz ?? []), [section, sl, hz])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q === '' ? rows : rows.filter((r) => r.headline.toLowerCase().includes(q) || r.province.toLowerCase().includes(q))
    return [...base].sort((a, b) => b.sortKey - a.sortKey)
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const meta = section === 1 ? SEVERITY_META.section1 : SEVERITY_META.section2
  const accent = section === 1 ? 's1' : 's2'

  return (
    <Card
      title="ตารางเหตุการณ์"
      subtitle={`ทั้งหมด ${filtered.length} เหตุการณ์`}
      icon={Table2}
      accent={accent}
      right={
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาหัวข้อข่าวหรือจังหวัด"
            className="w-56 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-tableText">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="py-2 pr-3 font-medium">ลำดับ</th>
              <th className="py-2 pr-3 font-medium">เดือน/ปี</th>
              <th className="py-2 pr-3 font-medium">เขต</th>
              <th className="py-2 pr-3 font-medium">จังหวัด</th>
              {section === 2 && <th className="py-2 pr-3 font-medium">ประเภทภัย</th>}
              <th className="py-2 pr-3 font-medium">หัวข้อข่าว</th>
              <th className="py-2 pr-3 font-medium">ลิงก์</th>
              <th className="py-2 pr-3 font-medium">ระดับ</th>
              <th className="py-2 font-medium">การส่งรายงาน</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={section === 2 ? 9 : 8} className="py-8 text-center text-slate-400">
                  ไม่พบเหตุการณ์
                </td>
              </tr>
            ) : (
              pageRows.map((r, i) => {
                const sev = meta[r.severity]
                const pill = reportingPill(r.reporting)
                return (
                  <tr key={r.key} className="border-b border-slate-50 align-top last:border-0">
                    <td className="py-3 pr-3 text-slate-500">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{r.monthLabel || '-'}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{r.zone !== null ? `เขต ${r.zone}` : '-'}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{r.province || '-'}</td>
                    {section === 2 && (
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.hazards ?? []).map((h) => (
                            <span key={h} className="whitespace-nowrap rounded-full bg-s2-50 px-2 py-0.5 text-xs font-medium text-s2-700">
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="py-3 pr-3 max-w-[280px]">{r.headline || '-'}</td>
                    <td className="py-3 pr-3">
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 whitespace-nowrap text-s2-700 hover:underline"
                        >
                          เปิดลิงก์ <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: sev.color }}
                      >
                        {sev.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}>
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

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          หน้า {safePage} จาก {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="หน้าก่อนหน้า"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-30 enabled:hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="หน้าถัดไป"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-30 enabled:hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
