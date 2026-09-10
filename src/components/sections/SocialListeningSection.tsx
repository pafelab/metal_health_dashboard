// SPEC 6.1 — Section 1 "ข้อมูล Social Listening", widgets 1-21. Widget ids and the widgets
// themselves are unchanged; UX-09 re-orders them so the OVERVIEW (scope + coverage, severity
// totals, trend, map, event records) comes first and every secondary breakdown moves into the
// collapsible "การวิเคราะห์เชิงลึก" group underneath, in its previous relative order.
// Also implements SPEC 6.4's zone-mode variants that live entirely inside this component
// (widget 20 becomes a per-province bar, section title gets the zone suffix, the map zooms to
// the zone). Widget ids are stable strings so SPEC 7's persisted chart-type choice is shared
// between the Dashboard tab and the zone tab (SPEC 6.4).
//
// All aggregation is delegated to '@/data' (SPEC's frozen data layer) — nothing here recomputes
// a count itself, it only shapes already-aggregated CategoryCount[]/etc. into widget props.

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Megaphone,
  TrendingUp,
  MapPin,
  Users,
  Brain,
  Users2,
  CalendarDays,
  UserCheck,
  Stethoscope,
  Activity,
  MapPinned,
  UserRound,
  AlertOctagon,
  AlertTriangle,
  ListChecks,
  Layers,
  Map as MapIcon,
  HandHeart,
} from 'lucide-react'
import type { SLEvent, Severity } from '@/types'
import {
  severityCounts,
  monthlyTrend,
  provinceCounts,
  topN,
  countBy,
  psychiatricDiagnosisCounts,
  impactByPatientGroup,
  genderSplit,
  ageBandByGender,
  riskFactors,
  warningSigns,
  suicideSubset,
  zoneCounts,
  coverageWindow,
  reportedMonthKeys,
  outOfPeriodRows,
} from '@/data'
import { CATEGORY_ORDERS, AGE_BANDS, PALETTE, ZONE_PROVINCES } from '@/config'
import { useSheetData } from '@/hooks/useSheetData'
import SwitchableChart, { MultiSeriesChart } from '@/components/charts/SwitchableChart'
import ThailandMap from '@/components/charts/ThailandMap'
import KpiCards from '@/components/widgets/KpiCards'
import RiskWarning from '@/components/widgets/RiskWarning'
import GenderFigure from '@/components/widgets/GenderFigure'
import GroupImpactTable from '@/components/widgets/GroupImpactTable'
import EventsTable from '@/components/widgets/EventsTable'
import AnalysisGroup, { scrollToWidget } from './AnalysisGroup'

export interface SocialListeningSectionProps {
  rows: SLEvent[]
  zoneMode?: boolean
  zone?: number | 'all'
  onProvinceClick: (p: string) => void
  selectedProvince?: string
  onClearProvince?: () => void
  showMapSideCards?: boolean
  /** Same-period total WITHOUT the geographic restriction, so the map's selected-area card can
   *  state a real share of its baseline instead of "100% ของทั้งประเทศ" (UX-01). */
  baselineTotal?: number
  /** What that baseline is ('ทั้งประเทศ' / 'เขตสุขภาพที่ N'), named explicitly in the copy. */
  baselineLabel?: string
}

/** Local display order for the "การช่วยเหลือผู้ก่อเหตุ" pie (widget 21) — not part of the frozen
 *  CATEGORY_ORDERS set (categoryOrders.ts doesn't cover this column), so it's kept here instead;
 *  countBy() still appends any unlisted value rather than dropping it (SPEC 4.5). */
const ASSISTANCE_ORDER = [
  'เข้าสู่กระบวนการทางกฎหมาย',
  'เข้าสู่กระบวนการรักษา',
  'เสียชีวิต',
  'ข้อมูลไม่เพียงพอ',
]

/** Local display order for the suicide age-group split (widget 16) — SLEvent.suicideAgeGroup
 *  (SPEC 3.2 col 11), observed values '<18' / '>=18 ปี' (SPEC 3.2 "Observed value sets"). */
const SUICIDE_AGE_ORDER = ['ต่ำกว่า 18', '≥ 18 ปี']

/** Denominator a truncated top-N chart must report (UX-13): the sum of the WHOLE distribution,
 *  not of the 5/10 bars that happen to be drawn. */
function sumValues(counts: { value: number }[]): number {
  return counts.reduce((acc, c) => acc + (Number.isFinite(c.value) ? c.value : 0), 0)
}

function Span({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`h-full flex flex-col ${className}`}>{children}</div>
}

const GRID = 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'
const HALF = 'md:col-span-1 xl:col-span-2'
const FULL = 'md:col-span-2 xl:col-span-4'

export default function SocialListeningSection({
  rows,
  zoneMode,
  zone,
  onProvinceClick,
  selectedProvince,
  onClearProvince,
  showMapSideCards = true,
  baselineTotal,
  baselineLabel,
}: SocialListeningSectionProps) {
  const effectiveZone: number | 'all' = zone ?? 'all'
  const isZoneScoped = !!zoneMode && effectiveZone !== 'all'

  const counts = useMemo(() => severityCounts(rows), [rows])
  const risk = useMemo(() => riskFactors(rows), [rows])
  const warn = useMemo(() => warningSigns(rows), [rows])

  // UX-12 — a severity card is a drill-down into the matching records, not just a definition.
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null)
  const handleDrillDown = useCallback((sev: Severity) => {
    setSeverityFilter(sev)
    scrollToWidget('s1-events')
  }, [])

  // SPEC 3.5: "so the lag is visible" is about the whole sheet's coverage, not the current
  // filter/zone selection — a filtered-out newest month would silently hide the very lag this
  // header exists to surface. Read the full, unfiltered ชีต2 rows straight from the shared
  // SheetDataProvider (every page that renders this section sits under it, SPEC 5.1) rather than
  // deriving it from the (possibly filtered/zone-scoped) `rows` prop.
  const { sl: allSl } = useSheetData()

  // UX-02 — the validated reporting period. It ends at the newest month that is not in the future
  // and starts where the contiguous run of reported months leading up to it starts, so a single
  // mistyped early row cannot advertise coverage of months that contain nothing at all.
  const coverage = useMemo(() => coverageWindow(allSl), [allSl])
  const reportedKeys = useMemo(() => reportedMonthKeys(allSl), [allSl])

  const coverageText = useMemo(() => {
    if (!coverage) return 'ยังไม่มีข้อมูล'
    if (coverage.firstLabel === coverage.lastLabel) return `ข้อมูลล่าสุดถึง ${coverage.lastLabel}`
    return `ข้อมูลล่าสุดถึง ${coverage.lastLabel} · ครอบคลุม ${coverage.firstLabel} – ${coverage.lastLabel}`
  }, [coverage])

  // UX-02 — rows dated outside that period at EITHER end are known data-entry errors
  // (BUILD_NOTES). Counted over the rows this section shows, so the number matches the table.
  const outOfPeriod = useMemo(() => outOfPeriodRows(rows, coverage), [rows, coverage])
  const outOfPeriodCount = outOfPeriod.before.length + outOfPeriod.after.length
  const [outOfPeriodOnly, setOutOfPeriodOnly] = useState(false)

  // The trend is clipped to the same validated period the coverage line states, and a month the
  // dataset never reported stays null so the line breaks there instead of asserting a zero
  // (UX-02 fix 4) — a month that WAS reported but has no row in the current filter scope is a
  // real zero and is still plotted as one.
  const trendPoints = useMemo(
    () => monthlyTrend(rows, { fromKey: coverage?.firstKey, toKey: coverage?.lastKey, reportedKeys }),
    [rows, coverage, reportedKeys],
  )
  const trendData = useMemo(
    () => trendPoints.map((p) => ({ name: p.label, value: p.value })),
    [trendPoints],
  )
  const missingMonths = trendPoints.filter((p) => p.missing).length
  // Derived from the plotted points, never a hardcoded fiscal year (UX-02).
  const trendSubtitle =
    trendPoints.length > 0
      ? `ช่วงข้อมูล ${trendPoints[0].label} – ${trendPoints[trendPoints.length - 1].label} (ตรงกับช่วงข้อมูลด้านบน)` +
        (missingMonths > 0
          ? ` · ${missingMonths.toLocaleString('th-TH')} เดือนยังไม่มีรายงาน เว้นเป็นช่องว่าง ไม่ใช่ค่า 0`
          : ' · เดือนที่ไม่มีเหตุการณ์ในขอบเขตนี้แสดงเป็น 0')
      : 'ยังไม่มีข้อมูลรายเดือน'

  const mapData = useMemo(() => provinceCounts(rows), [rows])
  const topProvinces = useMemo(() => topN(rows, (r) => r.province, 10), [rows])
  const patientGroups = useMemo(
    () => countBy(rows, (r) => r.patientGroup, CATEGORY_ORDERS.patientGroup),
    [rows],
  )
  const diagnosis = useMemo(() => psychiatricDiagnosisCounts(rows), [rows])
  const impact = useMemo(() => impactByPatientGroup(rows), [rows])
  const gender = useMemo(() => genderSplit(rows), [rows])
  const ageGender = useMemo(() => ageBandByGender(rows), [rows])
  const ageGenderCategories = useMemo(() => AGE_BANDS.map((b) => b.label), [])
  const ageGenderSeries = useMemo(
    () => [
      { name: 'ชาย', data: ageGender.map((r) => r.male), color: PALETTE.gender.male },
      { name: 'หญิง', data: ageGender.map((r) => r.female), color: PALETTE.gender.female },
    ],
    [ageGender],
  )
  const patientClass = useMemo(
    () => countBy(rows, (r) => r.patientClass, CATEGORY_ORDERS.patientClass),
    [rows],
  )
  const treatmentHistory = useMemo(
    () => countBy(rows, (r) => r.treatmentHistory, CATEGORY_ORDERS.treatmentHistory),
    [rows],
  )
  const assistance = useMemo(() => countBy(rows, (r) => r.assistance, ASSISTANCE_ORDER), [rows])

  const suicideRows = useMemo(() => suicideSubset(rows), [rows])
  const suicideOutcome = useMemo(
    () => countBy(suicideRows, (r) => r.suicide, CATEGORY_ORDERS.suicide),
    [suicideRows],
  )
  const suicideLocation = useMemo(() => topN(suicideRows, (r) => r.suicideLocation, 10), [suicideRows])
  const suicideGender = useMemo(() => genderSplit(suicideRows), [suicideRows])
  const suicideAgeSplit = useMemo(
    () => countBy(suicideRows, (r) => r.suicideAgeGroup, SUICIDE_AGE_ORDER).map((c) => ({ label: c.name, value: c.value })),
    [suicideRows],
  )
  const suicideCause = useMemo(() => topN(suicideRows, (r) => r.suicideCause, 5), [suicideRows])
  const suicideMethod = useMemo(() => topN(suicideRows, (r) => r.suicideMethod, 5), [suicideRows])

  // UX-13 — every top-N chart above hides part of its distribution, so its data table and textual
  // summary need the full total as the percentage base.
  const provinceTotal = useMemo(() => sumValues(mapData), [mapData])
  const suicideLocationTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideLocation)),
    [suicideRows],
  )
  const suicideCauseTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideCause)),
    [suicideRows],
  )
  const suicideMethodTotal = useMemo(
    () => sumValues(countBy(suicideRows, (r) => r.suicideMethod)),
    [suicideRows],
  )

  // Widget 20 (SPEC 6.4 item 3): zone-scoped -> one bar per province of that zone, same widget id.
  const zoneEventsData = useMemo(() => {
    if (isZoneScoped) return countBy(rows, (r) => r.province, ZONE_PROVINCES[effectiveZone as number] ?? [])
    return zoneCounts(rows)
  }, [rows, isZoneScoped, effectiveZone])
  const zoneEventsTitle = isZoneScoped ? 'จำนวนเหตุการณ์รายจังหวัด (กราฟ)' : 'จำนวนเหตุการณ์รายเขตสุขภาพ'
  const zoneEventsSubtitle = isZoneScoped
    ? `เขตสุขภาพที่ ${effectiveZone} · ${(ZONE_PROVINCES[effectiveZone as number] ?? []).length} จังหวัด`
    : '13 เขตสุขภาพ'

  const titleSuffix = zoneMode ? (effectiveZone === 'all' ? ' (ภาพรวม)' : ` (เขตสุขภาพที่ ${effectiveZone})`) : ''

  return (
    <section id="section-1" className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
            <Megaphone className="text-s1-600" size={26} strokeWidth={2.25} />
            ข้อมูล Social Listening{titleSuffix}
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
              {' (อาจเป็นข้อผิดพลาดในการกรอกข้อมูล) — ไม่นับรวมในกราฟแนวโน้ม แต่ยังแสดงในตารางพร้อมเครื่องหมาย “นอกช่วงข้อมูล” เพื่อการตรวจสอบ'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOutOfPeriodOnly(true)
                scrollToWidget('s1-events')
              }}
              className="whitespace-nowrap rounded-full border border-amber-500 bg-white px-3 py-1.5 text-sm font-bold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              ดูเฉพาะรายการที่ต้องตรวจสอบ
            </button>
          </div>
        )}
      </div>

      {/* ---- Overview first: totals, trend, geography, records (UX-09) ---- */}
      <div className={GRID}>
        {/* Widget 3 — KPI cards */}
        <Span className={FULL}>
          <KpiCards
            section={1}
            counts={counts}
            onDrillDown={handleDrillDown}
            activeSeverity={severityFilter}
          />
        </Span>

        {/* Widget 4 — monthly trend */}
        <Span className={FULL}>
          <SwitchableChart
            widgetId="s1-trend"
            title="แนวโน้มรายเดือน"
            subtitle={trendSubtitle}
            icon={TrendingUp}
            data={trendData}
            defaultType="line"
            allowedTypes={['line', 'area', 'bar']}
            accent="s1"
            height={360}
            unit="เหตุการณ์"
            categoryHeader="เดือน"
          />
        </Span>

        {/* Widget 5 — events-per-province map (with companion Selected Area + Top 10 cards) */}
        <Span className={FULL}>
          <ThailandMap
            mode={zoneMode ? 'zone' : 'country'}
            zone={effectiveZone}
            data={mapData}
            title="จำนวนเหตุการณ์รายจังหวัด"
            accent="s1"
            onProvinceClick={onProvinceClick}
            selectedProvince={selectedProvince}
            onClearProvince={onClearProvince}
            topProvinces={topProvinces}
            showSideCards={showMapSideCards}
            baselineTotal={baselineTotal}
            baselineLabel={baselineLabel}
          />
        </Span>

        {/* Widget 6 — top 10 provinces (rendered when the map's side cards are not shown) */}
        {!showMapSideCards && (
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-top-provinces"
              title="10 อันดับจังหวัด"
              icon={MapPin}
              data={topProvinces}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              total={provinceTotal}
              unit="เหตุการณ์"
              categoryHeader="จังหวัด"
            />
          </Span>
        )}

        {/* Widget 19 — events table: the records behind every number above */}
        <Span className={FULL}>
          <EventsTable
            section={1}
            sl={rows}
            id="s1-events"
            severityFilter={severityFilter}
            onClearSeverityFilter={() => setSeverityFilter(null)}
            coverage={coverage}
            outOfPeriodOnly={outOfPeriodOnly}
            onToggleOutOfPeriodOnly={setOutOfPeriodOnly}
          />
        </Span>
      </div>

      {/* ---- Then the detail, collapsible and open by default (UX-09) ---- */}
      <AnalysisGroup
        title="การวิเคราะห์เชิงลึก"
        subtitle="รายละเอียดของเหตุการณ์ตามขอบเขตที่กรองไว้"
        icon={Layers}
        accent="s1"
      >
        <div className={GRID}>
          {/* Widget 1-2 — risk factor / warning sign infographics */}
          <Span className={HALF}>
            <RiskWarning kind="risk" data={risk} />
          </Span>
          <Span className={HALF}>
            <RiskWarning kind="sign" data={warn} />
          </Span>

          {/* Widget 7 — patient groups (5) */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-patient-groups"
              title="จำนวนผู้ป่วย 5 กลุ่ม"
              subtitle="ผู้ป่วยจิตเวช/อื่นๆ"
              icon={Users}
              data={patientGroups}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="กลุ่มผู้ป่วย"
            />
          </Span>

          {/* Widget 8 — psychiatric diagnosis (3) */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-diagnosis"
              title="กลุ่มผู้ป่วยจิตเวช 3 ประเภท"
              subtitle="การวินิจฉัยโรค"
              icon={Brain}
              data={diagnosis}
              defaultType="pie"
              allowedTypes={['pie', 'donut', 'bar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="การวินิจฉัย"
            />
          </Span>

          {/* Widget 9 — deaths / injured by patient group */}
          <Span className={HALF}>
            <GroupImpactTable widgetId="s1-impact" rows={impact} />
          </Span>

          {/* Widget 10 — gender */}
          <Span className={HALF}>
            <GenderFigure title="เพศ" data={gender} icon={Users2} />
          </Span>

          {/* Widget 11 — age band x gender */}
          <Span className={HALF}>
            <MultiSeriesChart
              widgetId="s1-age-gender"
              title="ช่วงวัย × เพศ"
              subtitle="6 ช่วงวัย"
              icon={CalendarDays}
              categories={ageGenderCategories}
              series={ageGenderSeries}
              defaultType="bar"
              allowedTypes={['bar', 'stacked', 'hbar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="ช่วงวัย"
            />
          </Span>

          {/* Widget 12 — patient class เก่า/ใหม่ */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-patient-class"
              title="ประเภทผู้ป่วย เก่า/ใหม่"
              subtitle="การจำแนกผู้ป่วย"
              icon={UserCheck}
              data={patientClass}
              defaultType="pie"
              allowedTypes={['pie', 'donut', 'bar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="ประเภทผู้ป่วย"
            />
          </Span>

          {/* Widget 13 — treatment history */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-treatment-history"
              title="ประวัติการรักษา"
              icon={Stethoscope}
              data={treatmentHistory}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="ประวัติการรักษา"
            />
          </Span>

          {/* Suicide sub-section (widgets 14-18) */}
          <Span className={FULL}>
            <h3 className="flex items-center gap-2 text-cardTitle font-bold text-slate-700">
              <Activity className="text-s1-600" size={22} strokeWidth={2.25} />
              การฆ่าตัวตาย
              <span className="text-sm font-medium text-slate-500">({suicideRows.length} เหตุการณ์)</span>
            </h3>
          </Span>

          {/* Widget 14 — suicide outcome */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-suicide-outcome"
              title="ฆ่าตัวตาย: สำเร็จ/ไม่สำเร็จ"
              icon={Activity}
              data={suicideOutcome}
              defaultType="pie"
              allowedTypes={['pie', 'donut', 'bar']}
              palette={[PALETTE.suicide.success, PALETTE.suicide.fail]}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="ผลลัพธ์"
            />
          </Span>

          {/* Widget 15 — suicide location top 10 */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-suicide-location"
              title="ฆ่าตัวตาย: สถานที่ 10 อันดับ"
              icon={MapPinned}
              data={suicideLocation}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              total={suicideLocationTotal}
              unit="เหตุการณ์"
              categoryHeader="สถานที่"
            />
          </Span>

          {/* Widget 16 — suicide gender + age split */}
          <Span className={HALF}>
            <GenderFigure
              title="ฆ่าตัวตาย: เพศและช่วงวัย (<18 / ≥18 ปี)"
              data={suicideGender}
              icon={UserRound}
              ageSplit={suicideAgeSplit}
            />
          </Span>

          {/* Widget 17 — suicide cause top 5 */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-suicide-cause"
              title="ฆ่าตัวตาย: สาเหตุ 5 อันดับ"
              icon={AlertOctagon}
              data={suicideCause}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              total={suicideCauseTotal}
              unit="เหตุการณ์"
              categoryHeader="สาเหตุ"
            />
          </Span>

          {/* Widget 18 — suicide method top 5 */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-suicide-method"
              title="ฆ่าตัวตาย: วิธี 5 อันดับ"
              icon={ListChecks}
              data={suicideMethod}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              total={suicideMethodTotal}
              unit="เหตุการณ์"
              categoryHeader="วิธี"
            />
          </Span>

          {/* Widget 20 — events by zone / (zone mode) by province */}
          <Span className={FULL}>
            <SwitchableChart
              widgetId="s1-zone-events"
              title={zoneEventsTitle}
              subtitle={zoneEventsSubtitle}
              icon={MapIcon}
              data={zoneEventsData}
              defaultType="bar"
              allowedTypes={['bar', 'hbar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader={isZoneScoped ? 'จังหวัด' : 'เขตสุขภาพ'}
            />
          </Span>

          {/* Widget 21 — assistance given to the perpetrator */}
          <Span className={HALF}>
            <SwitchableChart
              widgetId="s1-assistance"
              title="การช่วยเหลือผู้ก่อเหตุ"
              icon={HandHeart}
              data={assistance}
              defaultType="hbar"
              allowedTypes={['hbar', 'bar']}
              accent="s1"
              unit="เหตุการณ์"
              categoryHeader="การช่วยเหลือ"
            />
          </Span>
        </div>
      </AnalysisGroup>
    </section>
  )
}
