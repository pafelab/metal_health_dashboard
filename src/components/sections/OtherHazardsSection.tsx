// SPEC 6.2 — Section 2 "ข้อมูลภัยอื่นๆ (6 หมวดหมู่)", widgets 1-5. Same overview-before-detail
// ordering as Section 1 (UX-09): KPI cards, map, event records, then the breakdown charts inside
// the collapsible "การวิเคราะห์เชิงลึก" group. Shares SPEC 6.4's zone-mode map zoom (item 2) with
// SocialListeningSection; Section 2 has no per-zone widget of its own (widget 20 is Section-1
// only, SPEC 6.4 item 3), so zoneMode/zone here only steer the map.

import { useCallback, useMemo, useState } from 'react'
import { Siren, MapPin, Layers, AlertTriangle } from 'lucide-react'
import type { HazardEvent, Severity } from '@/types'
import {
  severityCounts,
  provinceCounts,
  topN,
  hazardTypeCounts,
  coverageWindow,
  outOfPeriodRows,
} from '@/data'
import { useSheetData } from '@/hooks/useSheetData'
import SwitchableChart from '@/components/charts/SwitchableChart'
import ThailandMap, { SECTION2_MAP_BUCKETS } from '@/components/charts/ThailandMap'
import KpiCards from '@/components/widgets/KpiCards'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import EventsTable from '@/components/widgets/EventsTable'
import AnalysisGroup, { scrollToWidget } from './AnalysisGroup'

export interface OtherHazardsSectionProps {
  rows: HazardEvent[]
  zoneMode?: boolean
  zone?: number | 'all'
  onProvinceClick: (p: string) => void
  /** The applied province ('' -> undefined), so the map highlights it and a second click on it
   *  clears the filter instead of re-applying it (UX-04). */
  selectedProvince?: string
  onClearProvince?: () => void
  /** Same-period total WITHOUT the geographic restriction, so the map can state a real share of
   *  its baseline instead of "100% ของทั้งประเทศ" (UX-01). */
  baselineTotal?: number
  /** What that baseline is ('ทั้งประเทศ' / 'เขตสุขภาพที่ N'), named explicitly in the copy. */
  baselineLabel?: string
}

export default function OtherHazardsSection({
  rows,
  zoneMode,
  zone,
  onProvinceClick,
  selectedProvince,
  onClearProvince,
  baselineTotal,
  baselineLabel,
}: OtherHazardsSectionProps) {
  const effectiveZone: number | 'all' = zone ?? 'all'

  const counts = useMemo(() => severityCounts(rows), [rows])
  const mapData = useMemo(() => provinceCounts(rows), [rows])
  const topProvinces = useMemo(() => topN(rows, (r) => r.province, 10), [rows])
  // UX-13 — the top-10 chart truncates, so its table/summary percentages must be based on the
  // whole province distribution, not on the 10 bars that are drawn.
  const provinceTotal = useMemo(
    () => mapData.reduce((acc, c) => acc + (Number.isFinite(c.value) ? c.value : 0), 0),
    [mapData],
  )
  const hazardTypes = useMemo(() => hazardTypeCounts(rows), [rows])
  // UX-11 — hazardTypeCounts() counts a row once per hazard flag it carries, so this sum is a
  // number of "ครั้ง" (mentions) and is >= the number of events; the two figures are shown side by
  // side under the widget so the gap is explained rather than discovered.
  const hazardMentions = useMemo(() => hazardTypes.reduce((sum, h) => sum + h.value, 0), [hazardTypes])

  // UX-12 — a severity card is a drill-down into the matching records, not just a definition.
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null)
  const handleDrillDown = useCallback((sev: Severity) => {
    setSeverityFilter(sev)
    scrollToWidget('s2-events')
  }, [])

  // UX-02/UX-09 — the overview must state what period the HAZARD dataset covers, not only the
  // page-refresh time in the header. Read from the full, unfiltered ชีต1 rows (same reasoning as
  // Section 1): a filtered-out newest month would hide the very reporting lag this line exists
  // to surface.
  const { hz: allHz } = useSheetData()
  const coverage = useMemo(() => coverageWindow(allHz), [allHz])
  const coverageText = useMemo(() => {
    if (!coverage) return 'ยังไม่มีข้อมูล'
    if (coverage.firstLabel === coverage.lastLabel) return `ข้อมูลล่าสุดถึง ${coverage.lastLabel}`
    return `ข้อมูลล่าสุดถึง ${coverage.lastLabel} · ครอบคลุม ${coverage.firstLabel} – ${coverage.lastLabel}`
  }, [coverage])

  // UX-02 — records dated outside that period are flagged for review, in the table too.
  const outOfPeriod = useMemo(() => outOfPeriodRows(rows, coverage), [rows, coverage])
  const outOfPeriodCount = outOfPeriod.before.length + outOfPeriod.after.length
  const [outOfPeriodOnly, setOutOfPeriodOnly] = useState(false)

  const titleSuffix = zoneMode ? (effectiveZone === 'all' ? ' (ภาพรวม)' : ` (เขตสุขภาพที่ ${effectiveZone})`) : ''

  return (
    <section id="section-2" className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
            <Siren className="text-s2-600" size={26} strokeWidth={2.25} />
            ข้อมูลภัยอื่นๆ (6 หมวดหมู่){titleSuffix}
          </h2>
          <p className="text-sm font-medium text-slate-600">{coverageText}</p>
        </div>

        {coverage && outOfPeriodCount > 0 && (
          <div className="flex flex-wrap items-start gap-2 rounded-card border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <AlertTriangle size={16} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
            <p className="min-w-[16rem] flex-1">
              {`พบ ${outOfPeriodCount.toLocaleString('th-TH')} รายการนอกช่วงข้อมูล ${coverage.firstLabel} – ${coverage.lastLabel}`}
              {outOfPeriod.before.length > 0 &&
                ` · ก่อนช่วง ${outOfPeriod.before.length.toLocaleString('th-TH')} รายการ`}
              {outOfPeriod.after.length > 0 &&
                ` · หลังช่วง ${outOfPeriod.after.length.toLocaleString('th-TH')} รายการ`}
              {' (อาจเป็นข้อผิดพลาดในการกรอกข้อมูล) — ยังแสดงในตารางพร้อมเครื่องหมาย “นอกช่วงข้อมูล” เพื่อการตรวจสอบ'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOutOfPeriodOnly(true)
                scrollToWidget('s2-events')
              }}
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-amber-500 bg-white px-4 py-1.5 text-sm font-bold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              ดูเฉพาะรายการที่ต้องตรวจสอบ
            </button>
          </div>
        )}
      </div>

      {/* Widget 1 — KPI cards */}
      <KpiCards
        section={2}
        counts={counts}
        onDrillDown={handleDrillDown}
        activeSeverity={severityFilter}
      />

      {/* ---- Overview first: geography, then the records behind the totals (UX-09) ---- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Widget 2 — map */}
        <div className="md:col-span-2 xl:col-span-4">
          <ThailandMap
            mode={zoneMode ? 'zone' : 'country'}
            zone={effectiveZone}
            data={mapData}
            buckets={SECTION2_MAP_BUCKETS}
            title="จำนวนเหตุการณ์ภัยอื่นๆ รายจังหวัด"
            accent="s2"
            onProvinceClick={onProvinceClick}
            selectedProvince={selectedProvince}
            onClearProvince={onClearProvince}
            baselineTotal={baselineTotal}
            baselineLabel={baselineLabel}
          />
        </div>

        {/* Widget 5 — events table (moved above the breakdown charts, UX-09) */}
        <div className="md:col-span-2 xl:col-span-4">
          <EventsTable
            section={2}
            hz={rows}
            id="s2-events"
            severityFilter={severityFilter}
            onClearSeverityFilter={() => setSeverityFilter(null)}
            coverage={coverage}
            outOfPeriodOnly={outOfPeriodOnly}
            onToggleOutOfPeriodOnly={setOutOfPeriodOnly}
          />
        </div>
      </div>

      {/* ---- Then the detail, collapsible and open by default (UX-09) ---- */}
      <AnalysisGroup
        title="การวิเคราะห์เชิงลึก"
        subtitle="รายละเอียดของเหตุการณ์ตามขอบเขตที่กรองไว้"
        icon={Layers}
        accent="s2"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Widget 3 — top 10 provinces */}
          <div className="md:col-span-1 xl:col-span-2">
            <SwitchableChart
              widgetId="s2-top-provinces"
              title="10 อันดับจังหวัด"
              icon={MapPin}
              data={topProvinces}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s2"
              total={provinceTotal}
              unit="เหตุการณ์"
              categoryHeader="จังหวัด"
            />
          </div>

          {/* Widget 4 — hazard type breakdown (6 categories).
              UX-11: overlapping categories, so no part-of-whole pie/donut default (their slices
              would have to be forced to 100%); horizontal bars keep the long Thai labels readable.
              `total` pins every percentage to the event count, and the note names that base. */}
          <div className="md:col-span-1 xl:col-span-2 flex h-full flex-col gap-2">
            <div className="min-h-0 flex-1">
              <SwitchableChart
                widgetId="s2-hazard-types"
                title="สัดส่วนประเภทภัย 6 หมวด"
                subtitle="นับตามประเภทภัยที่ระบุ (1 เหตุการณ์อาจมีได้หลายประเภท)"
                icon={Siren}
                data={hazardTypes}
                defaultType="hbar"
                allowedTypes={['hbar', 'bar']}
                accent="s2"
                total={rows.length}
                unit="ครั้ง"
                valueSuffix=" ครั้ง"
                categoryHeader="ประเภทภัย"
              />
            </div>
            <DenominatorNote>
              1 เหตุการณ์อาจมีได้หลายประเภทภัย ร้อยละของแต่ละหมวดคิดจากเหตุการณ์ทั้งหมด {rows.length} เหตุการณ์
              ในขอบเขตตัวกรอง ส่วนผลรวมรายหมวดเท่ากับ {hazardMentions} ครั้ง ตัวเลขรายหมวดจึงรวมกันเกิน 100% ได้
            </DenominatorNote>
          </div>
        </div>
      </AnalysisGroup>
    </section>
  )
}
