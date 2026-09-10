// SPEC 6.1 #1 and #2, PDF p.2, SPEC 4.4 — the risk-factor and warning-sign infographics. Each is
// its own polished infographic widget (not a chart, no switcher), matching the two-column pill
// design of docs/reference/site1/index.html renderRiskWarningInfographic() but recomposed with
// our design tokens and lucide-react icons in place of Font Awesome.
//
// UX-11: both aggregates (src/data/aggregate.ts riskFactors / warningSigns) count EVENTS, and one
// event can match several categories, so the category counts legitimately add up to more than the
// number of affected events. Every figure here therefore names its own base, and the per-category
// percentages are taken over `affected` (the events that carry at least one factor/sign) so the
// "53 + 22 + 4 vs 64" arithmetic can be explained without guessing.

import type { LucideIcon } from 'lucide-react'
import {
  TriangleAlert,
  Radar,
  Pill,
  Wine,
  Users,
  Angry,
  ShieldAlert,
  MessageCircle,
  BedDouble,
  Footprints,
  HelpCircle,
} from 'lucide-react'
import Card from '@/components/layout/Card'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import type { CategoryCount } from '@/types'

export interface RiskWarningProps {
  kind: 'risk' | 'sign'
  data: { items: CategoryCount[]; denominator: number; affected: number }
}

/** Icon per known label (RISK_KEYWORDS / SIGN_KEYWORDS in '@/config/keywords'). A future keyword
 *  not in this map still renders (falls back to HelpCircle) rather than disappearing. */
const ITEM_ICON: Record<string, LucideIcon> = {
  'ขาดยา/ไม่มาตามนัด': Pill,
  กลับมาเสพซ้ำ: Wine,
  อื่นๆ: Users,
  หงุดหงิดฉุนเฉียว: Angry,
  เที่ยวหวาดระแวง: ShieldAlert,
  พูดจาคนเดียว: MessageCircle,
  ไม่หลับไม่นอน: BedDouble,
  เดินไปเดินมา: Footprints,
}

/** Copy per kind. Kept together so the base of every number is stated in exactly one place. */
const COPY = {
  risk: {
    what: 'ปัจจัยเสี่ยง',
    /** What one row of the aggregate's denominator is. */
    baseUnit: 'เหตุการณ์ของผู้ป่วยรายเก่า',
    overlap:
      '1 เหตุการณ์อาจมีได้หลายปัจจัย ตัวเลขรายหมวดจึงรวมกันเกินจำนวนเหตุการณ์ที่มีปัจจัยเสี่ยงได้',
    affectedUnit: 'เหตุการณ์ที่มีปัจจัยเสี่ยง',
  },
  sign: {
    what: 'สัญญาณเตือน',
    baseUnit: 'เหตุการณ์ทั้งหมดตามตัวกรอง',
    overlap:
      '1 เหตุการณ์อาจมีได้หลายสัญญาณเตือน ตัวเลขรายหมวดจึงรวมกันเกินจำนวนเหตุการณ์ที่มีสัญญาณเตือนได้',
    affectedUnit: 'เหตุการณ์ที่มีสัญญาณเตือน',
  },
} as const

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

/** '12.3' — or '—' when there is nothing to divide by (UX-11: never print 0.0% for "no data"). */
function pct(n: number, denom: number): string {
  return denom > 0 ? ((n / denom) * 100).toFixed(1) : '—'
}

function pctBadge(value: number, base: number): string {
  const p = pct(value, base)
  return p === '—' ? '—' : `${p}%`
}

interface ItemRowProps {
  item: CategoryCount
  /** Denominator of the per-category percentage: the events carrying at least one factor/sign. */
  base: number
  /** Thai name of that denominator, used in the accessible label of the badge. */
  baseLabel: string
  tone: 'orange' | 'rose'
  index?: number
  compact?: boolean
}

const TONE = {
  orange: {
    border: 'border-orange-100',
    iconBg: 'bg-orange-50 text-orange-500',
    // bg-s1-700 (#C2410C): white text on it is ~5.2:1 — s1-500/600 fail 4.5:1 (UX-05).
    badge: 'bg-s1-700',
  },
  rose: {
    border: 'border-rose-100',
    iconBg: 'bg-rose-50 text-rose-500',
    // rose-600 (#E11D48) with white text is ~4.7:1; rose-500 is not (UX-05).
    badge: 'bg-rose-600',
  },
} as const

function ItemRow({ item, base, baseLabel, tone, index, compact }: ItemRowProps) {
  const Icon = ITEM_ICON[item.name] ?? HelpCircle
  const t = TONE[tone]
  const badge = pctBadge(item.value, base)
  const badgeLabel = `${badge} ของ ${fmt(base)} ${baseLabel}`

  if (compact) {
    return (
      <div className={`flex flex-col items-center rounded-2xl border ${t.border} bg-white p-3 text-center shadow-sm transition-transform hover:scale-[1.02]`}>
        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${t.iconBg}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="mb-2 text-sm font-bold text-slate-700">{item.name}</div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>({fmt(item.value)})</span>
          <span className={`rounded-full ${t.badge} px-2 py-0.5 text-white`} title={badgeLabel} aria-label={badgeLabel}>
            {badge}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex w-full items-center justify-between rounded-2xl border ${t.border} bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]`}>
      <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${t.iconBg}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        {index !== undefined ? `${index + 1}. ${item.name}` : item.name}
      </span>
      <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
        <span>({fmt(item.value)})</span>
        <span className={`rounded-full ${t.badge} px-3 py-1 text-white`} title={badgeLabel} aria-label={badgeLabel}>
          {badge}
        </span>
      </span>
    </div>
  )
}

/** Headline chip pair: the base on the left, "how many of that base are affected" on the right. */
function HeadlineChips({
  denominator,
  affected,
  copy,
  accent,
}: {
  denominator: number
  affected: number
  copy: (typeof COPY)[keyof typeof COPY]
  accent: string
}) {
  if (denominator <= 0) {
    return (
      <div className="mb-5 flex flex-col items-center gap-1 text-xs font-bold">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">—</span>
        <span className="font-medium text-slate-600">ไม่มีข้อมูลใน{copy.baseUnit}ตามตัวกรองที่ใช้</span>
      </div>
    )
  }
  return (
    <div className="mb-4 flex flex-wrap justify-center text-xs font-bold">
      <span className="rounded-l-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
        ฐาน: {fmt(denominator)} {copy.baseUnit}
      </span>
      <span className={`rounded-r-full border border-l-0 px-3 py-1.5 ${accent}`}>
        · มี{copy.what} {fmt(affected)} จาก {fmt(denominator)} เหตุการณ์ ({pct(affected, denominator)}%)
      </span>
    </div>
  )
}

export default function RiskWarning({ kind, data }: RiskWarningProps) {
  const { items, denominator, affected } = data
  const copy = COPY[kind]
  // Per-category percentages are shares of the affected events, not of the whole base — stated
  // under the list so the badges can never be read against the wrong denominator.
  const categoryBaseNote =
    affected > 0
      ? `ร้อยละรายหมวด = % ของ ${fmt(affected)} ${copy.affectedUnit} (ไม่ใช่ % ของ ${fmt(denominator)} ${copy.baseUnit})`
      : `ยังไม่มี${copy.affectedUnit}ในขอบเขตนี้ จึงแสดงร้อยละรายหมวดเป็น —`

  if (kind === 'risk') {
    return (
      <Card title="3 ปัจจัยเสี่ยงหลัก" subtitle="ของผู้ป่วยรายเก่าที่ก่อความรุนแรง" icon={TriangleAlert} accent="s1">
        <div className="flex flex-col items-center">
          <HeadlineChips
            denominator={denominator}
            affected={affected}
            copy={copy}
            accent="border-blue-200 bg-blue-100 text-blue-800"
          />
          <div className="w-full space-y-3">
            {items.map((item, i) => (
              <ItemRow
                key={item.name}
                item={item}
                base={affected}
                baseLabel={copy.affectedUnit}
                tone="orange"
                index={i}
              />
            ))}
          </div>
          <DenominatorNote className="mt-4 justify-center text-center">{categoryBaseNote}</DenominatorNote>
          <DenominatorNote className="mt-1 justify-center text-center" hideIcon>
            หมายเหตุ: {copy.overlap}
          </DenominatorNote>
        </div>
      </Card>
    )
  }

  const [first, ...rest] = items

  return (
    <Card title="5 สัญญาณเตือน" subtitle="เฝ้าระวังกลุ่มเสี่ยงในชุมชน" icon={Radar} accent="s1">
      <div className="flex flex-col items-center">
        <HeadlineChips
          denominator={denominator}
          affected={affected}
          copy={copy}
          accent="border-amber-200 bg-amber-100 text-amber-800"
        />
        <div className="w-full space-y-3">
          {first && <ItemRow item={first} base={affected} baseLabel={copy.affectedUnit} tone="rose" />}
          {rest.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-3">
              {rest.map((item) => (
                <ItemRow key={item.name} item={item} base={affected} baseLabel={copy.affectedUnit} tone="rose" compact />
              ))}
            </div>
          )}
        </div>
        <DenominatorNote className="mt-4 justify-center text-center">{categoryBaseNote}</DenominatorNote>
        <DenominatorNote className="mt-1 justify-center text-center" hideIcon>
          หมายเหตุ: {copy.overlap}
        </DenominatorNote>
      </div>
    </Card>
  )
}
