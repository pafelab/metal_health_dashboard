// SPEC 6.2 — Section 2 "ข้อมูลภัยอื่นๆ (6 หมวดหมู่)", widgets 1-5.
// Shares SPEC 6.4's zone-mode map zoom (item 2) with SocialListeningSection; Section 2 has no
// per-zone widget of its own (widget 20 is Section-1 only, SPEC 6.4 item 3), so zoneMode/zone
// here only steer the map.
//
// Deck slide 22 rewrites this section's layout: the map gets explicit colour tiers
// ("สีด้วยนะ บอกระดับ"), a four-card casualty block is added, the hazard bar chart stays
// ("ใส่ แผนภูมิแท่ง ภัย"), and the event table moves to the VERY BOTTOM
// ("ด้านล่างก็เป็นตารางเหตุการณ์ ภัยอื่นๆ นะ").
//
// That last point supersedes half of UX-09. UX-09 placed the event records ABOVE the breakdown
// charts and hid the breakdowns inside a collapsible "การวิเคราะห์เชิงลึก" group, so that the
// overview came first and the detail was opt-in. The deck asks for the opposite tail order and
// for every topic to sit in its own framed card (slide 9) instead of behind a disclosure. What
// survives of UX-09 is the part the deck does not contradict and which the framed cards now carry
// visually: the section still opens with the scope/coverage line, the KPI totals and the map
// before any breakdown. The order is now
//   KPI cards → map → casualty block → breakdown charts → event table.

import { useCallback, useMemo, useState } from 'react'
import { Siren, MapPin, AlertTriangle, HeartPulse } from 'lucide-react'
import type { HazardEvent, Severity } from '@/types'
import {
  severityCounts,
  provinceCounts,
  topN,
  hazardTypeCounts,
  hazardCasualties,
  coverageWindow,
  outOfPeriodRows,
} from '@/data'
import { HAZARD_UNSPECIFIED_LABEL } from '@/config'
import { useSheetData } from '@/hooks/useSheetData'
import Card from '@/components/layout/Card'
import SwitchableChart from '@/components/charts/SwitchableChart'
import ThailandMap, { SECTION2_MAP_BUCKETS } from '@/components/charts/ThailandMap'
import KpiCards from '@/components/widgets/KpiCards'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import EventsTable from '@/components/widgets/EventsTable'
import { scrollToWidget } from '@/lib/scrollToWidget'

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

/**
 * Deck slide 22 — "เจ้าหน้าที่ที่บาดเจ็บ / เจ้าหน้าที่เสียชีวิต / ประชาชนที่ได้รับบาดเจ็บ / ประชาชนเสียชีวิต",
 * each with a count AND a percentage, laid out as the deck's 2x2 block.
 *
 * The percentage is the card's share of the COMBINED people count, so the four add to 100% before
 * rounding. Each is rounded independently with toFixed(1), so the four DISPLAYED figures can total
 * 99.9% or 100.1% — the note underneath therefore says "ประมาณ 100%", not "100%". (Largest-remainder
 * allocation would make the displayed four sum exactly, and is the fix to reach for if the four
 * percentages ever have to reconcile with something else.)
 * The share is also easy to misread as "x% of events", so the base is spelled out both in the card
 * subtitle and in the note underneath rather than left implicit.
 */
function CasualtyCards({
  casualties,
}: {
  casualties: { officerInjured: number; officerDead: number; publicInjured: number; publicDead: number; total: number }
}) {
  const { total } = casualties
  const tiles: { label: string; value: number; tone: string }[] = [
    { label: 'เจ้าหน้าที่ที่บาดเจ็บ', value: casualties.officerInjured, tone: 'bg-score-fair-soft text-score-fair' },
    { label: 'เจ้าหน้าที่เสียชีวิต', value: casualties.officerDead, tone: 'bg-score-poor-soft text-score-poor' },
    { label: 'ประชาชนที่ได้รับบาดเจ็บ', value: casualties.publicInjured, tone: 'bg-score-fair-soft text-score-fair' },
    { label: 'ประชาชนเสียชีวิต', value: casualties.publicDead, tone: 'bg-score-poor-soft text-score-poor' },
  ]

  return (
    <Card
      title="ผู้ได้รับผลกระทบจากภัยอื่นๆ"
      subtitle={`รวม ${total.toLocaleString('th-TH')} คน ในขอบเขตฟิลเตอร์`}
      icon={HeartPulse}
      accent="s2"
      headerTone="brand"
    >
      {/* The deck draws these as a 2x2 block: two columns from sm, one column on a phone. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-card p-4 ${t.tone}`}>
            <p className="text-sm font-bold">{t.label}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-black leading-none tabular-nums">
                {t.value.toLocaleString('th-TH')}
              </span>
              <span className="text-sm font-bold">คน</span>
            </div>
            <p className="mt-1 text-sm font-bold">
              {total > 0 ? `${((t.value / total) * 100).toFixed(1)}%` : '—'} ของผู้ได้รับผลกระทบทั้งหมด
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        ร้อยละบนแต่ละการ์ดคิดจากผู้ได้รับผลกระทบทั้งหมด {total.toLocaleString('th-TH')} คน
        ไม่ใช่สัดส่วนของจำนวนเหตุการณ์ ทั้งสี่ค่าจึงรวมกันได้ประมาณ 100% (แต่ละค่าปัดทศนิยม 1 ตำแหน่งแยกกัน)
      </p>
    </Card>
  )
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
  /**
   * The section heading says "6 หมวดหมู่" (deck slide 22) but hazardTypeCounts() returns SEVEN
   * entries: the six real flags plus a "ภัยอื่นๆ (ไม่ระบุ)" bucket for rows that carry no flag at
   * all. Rather than let the heading and the chart contradict each other, the fallback row is
   * dropped when it is empty (the usual case, and then exactly six bars are drawn), and named in
   * the chart's own subtitle when it is not.
   */
  const allHazardTypes = useMemo(() => hazardTypeCounts(rows), [rows])
  const unspecifiedHazards = useMemo(
    () => allHazardTypes.find((h) => h.name === HAZARD_UNSPECIFIED_LABEL)?.value ?? 0,
    [allHazardTypes],
  )
  const hazardTypes = useMemo(
    () =>
      unspecifiedHazards > 0
        ? allHazardTypes
        : allHazardTypes.filter((h) => h.name !== HAZARD_UNSPECIFIED_LABEL),
    [allHazardTypes, unspecifiedHazards],
  )
  // UX-11 — hazardTypeCounts() counts a row once per hazard flag it carries, so this sum is a
  // number of "ครั้ง" (mentions) and is >= the number of events; the two figures are shown side by
  // side under the widget so the gap is explained rather than discovered. Summed over the rows
  // that are actually DRAWN, so the note can never describe bars that are not there.
  const hazardMentions = useMemo(() => hazardTypes.reduce((sum, h) => sum + h.value, 0), [hazardTypes])

  const hazardChartTitle =
    unspecifiedHazards > 0 ? 'สัดส่วนประเภทภัย 6 หมวด และที่ไม่ระบุประเภท' : 'สัดส่วนประเภทภัย 6 หมวด'
  const hazardChartSubtitle =
    unspecifiedHazards > 0
      ? `นับตามประเภทภัยที่ระบุ (1 เหตุการณ์อาจมีได้หลายประเภท) · อีก ${unspecifiedHazards.toLocaleString('th-TH')} เหตุการณ์ยังไม่ระบุประเภท`
      : 'นับตามประเภทภัยที่ระบุ (1 เหตุการณ์อาจมีได้หลายประเภท)'

  // Deck slide 22 — the 2x2 casualty block. Percentages are each card's share of the combined
  // people count, so the four add to 100%; the base is named on the card for exactly that reason.
  const casualties = useMemo(() => hazardCasualties(rows), [rows])

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

      {/* ---- Overview first (KPI → map), then the breakdowns, then the records (deck slide 22:
             the table is the last thing on the page). ---- */}
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
            headerTone="brand"
            onProvinceClick={onProvinceClick}
            selectedProvince={selectedProvince}
            onClearProvince={onClearProvince}
            baselineTotal={baselineTotal}
            baselineLabel={baselineLabel}
          />
        </div>

        {/* Deck slide 22 — ผู้ได้รับผลกระทบ, as the deck's 2x2 block of four counts. */}
        <div className="md:col-span-2 xl:col-span-4">
          <CasualtyCards casualties={casualties} />
        </div>

        {/* Widget 4 — hazard type breakdown.
            UX-11: overlapping categories, so no part-of-whole pie/donut default (their slices
            would have to be forced to 100%); horizontal bars keep the long Thai labels readable
            and are what the deck asks for ("ใส่ แผนภูมิแท่ง ภัย").
            `total` pins every percentage to the event count, and the note names that base. */}
        <div className="md:col-span-2 xl:col-span-2 flex h-full flex-col gap-2">
          <div className="min-h-0 flex-1">
            <SwitchableChart
              widgetId="s2-hazard-types"
              title={hazardChartTitle}
              subtitle={hazardChartSubtitle}
              icon={Siren}
              data={hazardTypes}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s2"
              headerTone="brand"
              total={rows.length}
              unit="ครั้ง"
              valueSuffix=" ครั้ง"
              categoryHeader="ประเภทภัย"
              /* Every hazard category is drawn, so a denominator larger than the bars must never
                 be reported as "แสดง N อันดับแรก". (It cannot happen with today's data —
                 every event contributes at least one mention — but the guard is free and the
                 claim would be false the moment it did.) */
              truncated={false}
            />
          </div>
          <DenominatorNote>
            1 เหตุการณ์อาจมีได้หลายประเภทภัย ร้อยละของแต่ละหมวดคิดจากเหตุการณ์ทั้งหมด{' '}
            {rows.length.toLocaleString('th-TH')} เหตุการณ์ ในขอบเขตฟิลเตอร์ ส่วนผลรวมรายหมวดเท่ากับ{' '}
            {hazardMentions.toLocaleString('th-TH')} ครั้ง ตัวเลขรายหมวดจึงรวมกันเกิน 100% ได้
          </DenominatorNote>
        </div>

        {/* Widget 3 — top 10 provinces */}
        <div className="md:col-span-2 xl:col-span-2">
          <SwitchableChart
            widgetId="s2-top-provinces"
            title="10 อันดับจังหวัด"
            icon={MapPin}
            data={topProvinces}
            defaultType="hbar"
            allowedTypes={['hbar', 'bar']}
            accent="s2"
            headerTone="brand"
            total={provinceTotal}
            unit="เหตุการณ์"
            categoryHeader="จังหวัด"
          />
        </div>

        {/* Widget 5 — the event table stays at the very bottom (deck slide 22). */}
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
            headerTone="brand"
          />
        </div>
      </div>

    </section>
  )
}
