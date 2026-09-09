// SPEC 6.1 — Section 1 "ข้อมูล Social Listening", widgets 1-21 in the exact order and default
// chart types the SPEC 6.1 table lists. Also implements SPEC 6.4's zone-mode variants that live
// entirely inside this component (widget 20 becomes a per-province bar, section title gets the
// zone suffix, the map zooms to the zone). Widget ids are stable strings so SPEC 7's persisted
// chart-type choice is shared between the Dashboard tab and the zone tab (SPEC 6.4).
//
// All aggregation is delegated to '@/data' (SPEC's frozen data layer) — nothing here recomputes
// a count itself, it only shapes already-aggregated CategoryCount[]/etc. into widget props.

import { useMemo, type ReactNode } from 'react'
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
  ListChecks,
  Map as MapIcon,
  HandHeart,
} from 'lucide-react'
import type { SLEvent } from '@/types'
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
  latestDataMonth,
} from '@/data'
import { CATEGORY_ORDERS, AGE_BANDS, PALETTE, ZONE_PROVINCES } from '@/config'
import { useSheetData } from '@/hooks/useSheetData'
import SwitchableChart, { MultiSeriesChart } from '@/components/charts/SwitchableChart'
import ThailandMap, { SECTION1_MAP_BUCKETS } from '@/components/charts/ThailandMap'
import KpiCards from '@/components/widgets/KpiCards'
import RiskWarning from '@/components/widgets/RiskWarning'
import GenderFigure from '@/components/widgets/GenderFigure'
import GroupImpactTable from '@/components/widgets/GroupImpactTable'
import EventsTable from '@/components/widgets/EventsTable'

export interface SocialListeningSectionProps {
  rows: SLEvent[]
  zoneMode?: boolean
  zone?: number | 'all'
  onProvinceClick: (p: string) => void
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

function Span({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

const GRID = 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'
const HALF = 'md:col-span-1 xl:col-span-2'
const FULL = 'md:col-span-2 xl:col-span-4'

export default function SocialListeningSection({ rows, zoneMode, zone, onProvinceClick }: SocialListeningSectionProps) {
  const effectiveZone: number | 'all' = zone ?? 'all'
  const isZoneScoped = !!zoneMode && effectiveZone !== 'all'

  const counts = useMemo(() => severityCounts(rows), [rows])
  const risk = useMemo(() => riskFactors(rows), [rows])
  const warn = useMemo(() => warningSigns(rows), [rows])

  // SPEC 3.5: "so the lag is visible" is about the whole sheet's coverage, not the current
  // filter/zone selection — a filtered-out newest month would silently hide the very lag this
  // header exists to surface. Read the full, unfiltered ชีต2 rows straight from the shared
  // SheetDataProvider (every page that renders this section sits under it, SPEC 5.1) rather than
  // deriving it from the (possibly filtered/zone-scoped) `rows` prop.
  const { sl: allSl } = useSheetData()
  const latestMonth = useMemo(() => latestDataMonth(allSl), [allSl])

  const trendData = useMemo(
    () => monthlyTrend(rows).map((p) => ({ name: p.label, value: p.value })),
    [rows],
  )
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

  // Widget 20 (SPEC 6.4 item 3): zone-scoped -> one bar per province of that zone, same widget id.
  const zoneEventsData = useMemo(() => {
    if (isZoneScoped) return countBy(rows, (r) => r.province, ZONE_PROVINCES[effectiveZone as number] ?? [])
    return zoneCounts(rows)
  }, [rows, isZoneScoped, effectiveZone])
  const zoneEventsTitle = isZoneScoped ? 'จำนวนเหตุการณ์รายจังหวัด' : 'จำนวนเหตุการณ์รายเขตสุขภาพ'
  const zoneEventsSubtitle = isZoneScoped
    ? `เขตสุขภาพที่ ${effectiveZone} · ${(ZONE_PROVINCES[effectiveZone as number] ?? []).length} จังหวัด`
    : '13 เขตสุขภาพ'

  const titleSuffix = zoneMode ? (effectiveZone === 'all' ? ' (ภาพรวม)' : ` (เขตสุขภาพที่ ${effectiveZone})`) : ''

  return (
    <section id="section-1" className="scroll-mt-24 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
          <Megaphone className="text-s1-600" size={26} strokeWidth={2.25} />
          ข้อมูล Social Listening{titleSuffix}
        </h2>
        <p className="text-sm font-medium text-slate-500">
          {latestMonth ? `ข้อมูลล่าสุดถึง ${latestMonth}` : 'ยังไม่มีข้อมูล'}
        </p>
      </div>

      <div className={GRID}>
        {/* Widget 1-2 — risk factor / warning sign infographics */}
        <Span className={HALF}>
          <RiskWarning kind="risk" data={risk} />
        </Span>
        <Span className={HALF}>
          <RiskWarning kind="sign" data={warn} />
        </Span>

        {/* Widget 3 — KPI cards */}
        <Span className={FULL}>
          <KpiCards section={1} counts={counts} />
        </Span>

        {/* Widget 4 — monthly trend */}
        <Span className={FULL}>
          <SwitchableChart
            widgetId="s1-trend"
            title="แนวโน้มรายเดือน"
            subtitle="ปีงบประมาณ 2569"
            icon={TrendingUp}
            data={trendData}
            defaultType="area"
            allowedTypes={['area', 'line', 'bar', 'step']}
            accent="s1"
            height={360}
          />
        </Span>

        {/* Widget 5 — density map */}
        <Span className={FULL}>
          <ThailandMap
            mode={zoneMode ? 'zone' : 'country'}
            zone={effectiveZone}
            data={mapData}
            buckets={SECTION1_MAP_BUCKETS}
            title="แผนที่ความหนาแน่น"
            accent="s1"
            onProvinceClick={onProvinceClick}
          />
        </Span>

        {/* Widget 6 — top 10 provinces */}
        <Span className={HALF}>
          <SwitchableChart
            widgetId="s1-top-provinces"
            title="10 อันดับจังหวัด"
            icon={MapPin}
            data={topProvinces}
            defaultType="hbar"
            allowedTypes={['hbar', 'bar', 'pie', 'donut', 'treemap', 'funnel']}
            accent="s1"
          />
        </Span>

        {/* Widget 7 — patient groups (5) */}
        <Span className={HALF}>
          <SwitchableChart
            widgetId="s1-patient-groups"
            title="จำนวนผู้ป่วย 5 กลุ่ม"
            subtitle="ผู้ป่วยจิตเวช/อื่นๆ"
            icon={Users}
            data={patientGroups}
            defaultType="bar"
            allowedTypes={['bar', 'hbar', 'pie', 'donut', 'rose', 'treemap']}
            accent="s1"
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
            allowedTypes={['pie', 'donut', 'rose', 'bar', 'hbar']}
            accent="s1"
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
          />
        </Span>

        {/* Widget 13 — treatment history */}
        <Span className={HALF}>
          <SwitchableChart
            widgetId="s1-treatment-history"
            title="ประวัติการรักษา"
            icon={Stethoscope}
            data={treatmentHistory}
            defaultType="donut"
            allowedTypes={['donut', 'pie', 'rose', 'bar', 'hbar']}
            accent="s1"
          />
        </Span>

        {/* Suicide sub-section (widgets 14-18) */}
        <Span className={FULL}>
          <h3 className="flex items-center gap-2 text-cardTitle font-bold text-slate-700">
            <Activity className="text-s1-600" size={22} strokeWidth={2.25} />
            การฆ่าตัวตาย
            <span className="text-sm font-medium text-slate-400">({suicideRows.length} เหตุการณ์)</span>
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
            allowedTypes={['hbar', 'bar', 'pie', 'donut', 'treemap']}
            accent="s1"
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
            allowedTypes={['hbar', 'bar', 'pie', 'donut', 'funnel']}
            accent="s1"
          />
        </Span>

        {/* Widget 18 — suicide method top 5 */}
        <Span className={HALF}>
          <SwitchableChart
            widgetId="s1-suicide-method"
            title="ฆ่าตัวตาย: วิธี 5 อันดับ"
            icon={ListChecks}
            data={suicideMethod}
            defaultType="bar"
            allowedTypes={['bar', 'hbar', 'pie', 'donut', 'funnel']}
            accent="s1"
          />
        </Span>

        {/* Widget 19 — events table */}
        <Span className={FULL}>
          <EventsTable section={1} sl={rows} />
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
            allowedTypes={['bar', 'line', 'hbar']}
            accent="s1"
          />
        </Span>

        {/* Widget 21 — assistance given to the perpetrator */}
        <Span className={HALF}>
          <SwitchableChart
            widgetId="s1-assistance"
            title="การช่วยเหลือผู้ก่อเหตุ"
            icon={HandHeart}
            data={assistance}
            defaultType="donut"
            allowedTypes={['donut', 'pie', 'bar', 'hbar']}
            accent="s1"
          />
        </Span>
      </div>
    </section>
  )
}
