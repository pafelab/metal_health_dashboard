// SPEC 6.1 #1 and #2, review deck แก้งับ.pdf slides 13-14 — the risk-factor and warning-sign
// infographics. Each is its own polished infographic widget (not a chart, no switcher), keeping
// the pill-row layout the deck explicitly asked to leave alone ("ตัวชุดข้อมูลก็ แบบเดิมเลย ดูง่าย").
//
// PERCENTAGE BASE — deck slide 13 (supersedes the earlier UX-11 note, which divided every
// per-category percentage by `affected`): the deck states the rule as a worked example — 100
// people in 5 equal groups, only 80 of whom can carry a factor, so "ขาดยา 20" must read
// 20*100/80 = 25%. Every per-item percentage here is therefore value / `denominator`, NEVER
// value / `affected`. `affected` survives only in the summary banner ("how many of the base carry
// at least one"), which is the one figure it is actually the answer to.
//
// The two bases differ on purpose and are named on the card so 417 vs 580 can never read as a bug:
//   risk — only the four จิตเวช/สารเสพติด statuses can carry a factor (riskFactors' denominator),
//          so the card prints a qualifier line naming that narrowed base.
//   sign — every filtered event, because anyone can show a warning sign (warningSigns').
//
// Deck slide 9 asks both cards to be framed and prominent ("ให้มันเด่นหน่อย" / "ทำเหมือน 4
// ปัจจัยเลย นะ เพิ่มกรอบให้"), which is Card's `headerTone="brand"` band plus the softer tinted
// banner underneath it ("เพิ่มกรอบให้มันหน่อย สีให้อ่อน กว่าหัวข้อ และจัด ให้อยู่กึ่งกลาง").

import type { LucideIcon } from 'lucide-react'
import {
  TriangleAlert,
  Radar,
  Pill,
  Repeat,
  Syringe,
  Ellipsis,
  Angry,
  Eye,
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

/**
 * Icon per known label — keyed on the EXACT label string in RISK_KEYWORDS / SIGN_KEYWORDS
 * ('@/config/keywords'), so a renamed factor silently falls back to HelpCircle instead of
 * disappearing. The 2026-09-12 schema refresh renamed two risk factors and added a fourth; the
 * pre-refresh spellings are kept below as well, so a fallback fetch of the old 84-column sheet
 * still draws real icons rather than four question marks.
 *
 * Deck slide 14 asks the warning signs in particular to read as friendly illustrations
 * ("จะเอารูปหน้าคุยคนเดียวเดินไปเดินมา มาใส่ ทำให้ดูน่าอ่านเลยยย") — hence the expressive lucide
 * set (an eye for หวาดระแวง, a speech bubble for พูดจาคนเดียว, a bed for ไม่หลับไม่นอน,
 * footprints for เดินไปเดินมา). No image assets: these stay crisp at any size and inherit colour.
 */
const ITEM_ICON: Record<string, LucideIcon> = {
  // ปัจจัยเสี่ยง (current spellings)
  'ขาดยา/ไม่มาตามนัด': Pill,
  กลับมาใช้สารเสพติดซ้ำ: Repeat,
  การใช้สารเสพติดร่วมด้วย: Syringe,
  อื่นๆ: Ellipsis,
  // ปัจจัยเสี่ยง (pre-refresh spelling, still reachable through the fallback sheet)
  กลับมาเสพซ้ำ: Repeat,
  // สัญญาณเตือน
  หงุดหงิดฉุนเฉียว: Angry,
  เที่ยวหวาดระแวง: Eye,
  พูดจาคนเดียว: MessageCircle,
  ไม่หลับไม่นอน: BedDouble,
  เดินไปเดินมา: Footprints,
}

/** Copy per kind. Kept together so the base of every number is stated in exactly one place. */
const COPY = {
  risk: {
    /** Trailing half of the title; the leading count comes from items.length, never a literal. */
    titleSuffix: 'ปัจจัยหลักของผู้ป่วยที่ก่อความรุนแรง',
    what: 'ปัจจัยเสี่ยง',
    /**
     * Deck slide 13: this card's base EXCLUDES the ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด
     * group, so the banner's 417 is smaller than the 580 every other Section-1 card shows. Naming
     * the base on the card is what keeps that from being read as a missing-data bug.
     */
    baseQualifier: 'นับเฉพาะผู้ป่วยจิตเวช/ผู้ใช้สารเสพติด (รายเก่า/รายใหม่)',
    footnote: 'หมายเหตุ: 1 เหตุการณ์สามารถพบปัจจัยเสี่ยงมากกว่า 1 ปัจจัย',
    emptyText: 'ไม่มีผู้ป่วยจิตเวช/ผู้ใช้สารเสพติดในขอบเขตฟิลเตอร์ที่ใช้',
  },
  sign: {
    titleSuffix: 'สัญญาณเตือน',
    what: 'สัญญาณเตือน',
    /** Deck slide 14: the base IS every filtered event — anyone can show a sign. No qualifier. */
    baseQualifier: '',
    footnote: 'หมายเหตุ: 1 เหตุการณ์สามารถพบสัญญาณเตือนมากกว่า 1 สัญญาณ',
    emptyText: 'ไม่มีเหตุการณ์ในขอบเขตฟิลเตอร์ที่ใช้',
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
  /** Denominator of the per-item percentage: the card's BASE (deck slide 13), not `affected`. */
  base: number
  /** Thai name of that denominator, used in the accessible label of the badge. */
  baseLabel: string
  tone: 'orange' | 'rose'
  index?: number
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

function ItemRow({ item, base, baseLabel, tone, index }: ItemRowProps) {
  const Icon = ITEM_ICON[item.name] ?? HelpCircle
  const t = TONE[tone]
  const badge = pctBadge(item.value, base)
  const badgeLabel = `${badge} ของ ${fmt(base)} ${baseLabel}`

  return (
    <div
      className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border ${t.border} bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]`}
    >
      <span className="flex min-w-0 items-center gap-3 text-sm font-bold text-slate-700">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.iconBg}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        {index !== undefined ? `${index + 1}. ${item.name}` : item.name}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
        <span className="tabular-nums">({fmt(item.value)})</span>
        <span
          className={`rounded-full ${t.badge} px-3 py-1 tabular-nums text-white`}
          title={badgeLabel}
          aria-label={badgeLabel}
        >
          {badge}
        </span>
      </span>
    </div>
  )
}

/**
 * The deck's centred summary banner (slide 13). Deliberately a SOFTER tint than the brand header
 * band above it (s2-50/s2-100 under the s2-700 band) so it reads as a sub-heading of the card,
 * not as a second title. text-s2-800 on s2-50 is ~9:1.
 */
function SummaryBanner({
  denominator,
  affected,
  what,
  qualifier,
  emptyText,
}: {
  denominator: number
  affected: number
  what: string
  qualifier: string
  emptyText: string
}) {
  if (denominator <= 0) {
    return (
      <div className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-600">
        {emptyText}
      </div>
    )
  }
  return (
    <div className="mb-4 w-full rounded-2xl border border-s2-100 bg-s2-50 px-4 py-3 text-center">
      <p className="text-base font-bold leading-snug text-s2-800">
        {`จากเหตุการณ์ทั้งหมด ${fmt(denominator)} เหตุการณ์ มี${what} ${fmt(affected)} เหตุการณ์ (${pct(
          affected,
          denominator,
        )}%)`}
      </p>
      {qualifier !== '' && <p className="mt-1 text-xs font-medium text-s2-800/80">{qualifier}</p>}
    </div>
  )
}

export default function RiskWarning({ kind, data }: RiskWarningProps) {
  const { items, denominator, affected } = data
  const copy = COPY[kind]
  const isRisk = kind === 'risk'
  const tone = isRisk ? 'orange' : 'rose'
  // Derived from the data, never a hard-coded "3"/"5": the sheet owner adding a sixth sign or a
  // fifth factor must not leave the title asserting a count the card no longer shows.
  const title = `${items.length} ${copy.titleSuffix}`
  const baseLabel = isRisk ? 'เหตุการณ์ของผู้ป่วยจิตเวช/ผู้ใช้สารเสพติด' : 'เหตุการณ์ทั้งหมด'
  // With no base there is nothing to take a percentage OF: the rows below would each read "(0) —"
  // under a notice that just said there is no data, and the multi-factor footnote would annotate
  // rows that are not there. The empty notice is the whole card in that case.
  const hasBase = denominator > 0

  return (
    <Card title={title} icon={isRisk ? TriangleAlert : Radar} headerTone="brand" accent="s1">
      <div className="flex flex-1 flex-col">
        <SummaryBanner
          denominator={denominator}
          affected={affected}
          what={copy.what}
          qualifier={copy.baseQualifier}
          emptyText={copy.emptyText}
        />
        {hasBase && (
          <>
            <div className="w-full space-y-3">
              {items.map((item, i) => (
                <ItemRow
                  key={item.name}
                  item={item}
                  base={denominator}
                  baseLabel={baseLabel}
                  tone={tone}
                  index={isRisk ? i : undefined}
                />
              ))}
            </div>
            <DenominatorNote className="mt-4 justify-center text-center" hideIcon>
              {copy.footnote}
            </DenominatorNote>
          </>
        )}
      </div>
    </Card>
  )
}
