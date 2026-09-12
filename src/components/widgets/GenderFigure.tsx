// SPEC 6.1 #10 and #16 — human-figure infographic. Mirrors docs/reference/site2's
// renderCustomGender()/renderCustomAge() (person icon + a fluid-fill capsule sized by percent)
// rebuilt with lucide-react icons and our design tokens. The suicide module also supplies
// `ageSplit` (ต่ำกว่า 18 ปี / ≥ 18 ปี) which renders as a second figure row in the same block.
//
// Deck slide 18 ("ตัด รวม 440 ออกให้หมด") removes the per-column "ของ N ราย" caption and the
// "รวม N ราย" footnote that used to sit under each row: on a page where every card shares one
// filter scope, repeating the same total under every figure was noise. The base has NOT been
// dropped, only moved — it still reads out in each column's aria-label ("… คิดเป็น X% ของ N ราย"),
// which is where the UX-11 requirement (never show a bare percent whose base is unstated) is now
// satisfied for screen-reader users. The gender row's base is every row in scope; the age row's
// base is only the rows carrying a usable age, so the two aria-labels name different numbers.
//
// `bare` renders the figures WITHOUT the Card shell, for use as one sub-block inside a bigger
// framed container (the deck slide-20 "สถานการณ์การฆ่าตัวตาย" module).

import type { LucideIcon } from 'lucide-react'
import { User, UserRound, Users, Baby, PersonStanding } from 'lucide-react'
import Card, { type CardHeaderTone } from '@/components/layout/Card'
import type { GenderSplit } from '@/types'

export interface GenderFigureProps {
  title: string
  data: GenderSplit
  icon?: LucideIcon
  ageSplit?: { label: string; value: number }[]
  /** Deck slide 9 — let a caller ask for the filled title band (see Card.headerTone). */
  headerTone?: CardHeaderTone
  /** Render only the figures, with no Card/title around them (sub-block of a larger card). */
  bare?: boolean
}

function pct(n: number, denom: number): number {
  return denom > 0 ? (n / denom) * 100 : 0
}

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

interface FigureSpec {
  key: string
  Icon: LucideIcon
  label: string
  value: number
  color: string
  bg: string
}

function FigureColumn({
  Icon,
  label,
  value,
  total,
  color,
  bg,
  large = false,
}: {
  Icon: LucideIcon
  label: string
  value: number
  /** Denominator this column's percent is taken over — named in the aria-label (deck slide 18). */
  total: number
  color: string
  bg: string
  large?: boolean
}) {
  const percent = pct(value, total)
  const percentText = total > 0 ? `${percent.toFixed(1)}%` : '—'
  const fillHeight = value === 0 ? 4 : Math.max(16, Math.round(percent))
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-end gap-3 sm:gap-4 ${large ? 'h-[210px]' : 'h-[140px]'}`}>
        <Icon className={large ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-16 w-16'} style={{ color }} strokeWidth={1.75} />
        <div
          className={`relative h-full overflow-hidden rounded-full shadow-inner ${large ? 'w-12 sm:w-14' : 'w-10'}`}
          style={{ backgroundColor: bg }}
        >
          <div
            className="absolute bottom-0 flex w-full items-start justify-center rounded-full pt-2 transition-all duration-700"
            style={{ height: `${fillHeight}%`, backgroundColor: color }}
          >
            {value > 0 && (
              <span className={`font-bold text-white drop-shadow ${large ? 'text-base sm:text-lg' : 'text-sm'}`}>
                {fmt(value)}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Thai labels here can be as long as 'ต่ำกว่า 18 ปี' — allow them to wrap, never clip. */}
      <span className={`text-center font-bold text-slate-800 ${large ? 'mt-4 text-base sm:text-lg' : 'mt-3 text-sm'}`}>
        {label}
      </span>
      {/* Count AND percent, both visible (deck slides 18/20); the base lives in the aria-label. */}
      <span
        className={`font-bold tabular-nums text-slate-600 ${large ? 'text-sm' : 'text-xs'}`}
        aria-label={`${label} ${fmt(value)} ราย คิดเป็น ${percentText} ของ ${fmt(total)} ราย`}
      >
        {fmt(value)} ราย · {percentText}
      </span>
    </div>
  )
}

export default function GenderFigure({ title, data, icon, ageSplit, headerTone, bare }: GenderFigureProps) {
  const genderFigures: FigureSpec[] = [
    { key: 'male', Icon: User, label: 'ชาย', value: data.male, color: '#2563EB', bg: '#BFDBFE' },
    { key: 'female', Icon: UserRound, label: 'หญิง', value: data.female, color: '#EC4899', bg: '#FBCFE8' },
  ]
  if (data.other > 0) {
    genderFigures.push({ key: 'other', Icon: Users, label: 'อื่นๆ', value: data.other, color: '#64748B', bg: '#E2E8F0' })
  }

  const hasAgeSplit = !!ageSplit && ageSplit.length > 0
  const isLarge = !hasAgeSplit && !bare

  const ageIcons: LucideIcon[] = [Baby, PersonStanding]
  const ageColors: { color: string; bg: string }[] = [
    { color: '#7C3AED', bg: '#DDD6FE' },
    { color: '#059669', bg: '#A7F3D0' },
  ]
  const ageTotal = ageSplit ? ageSplit.reduce((sum, a) => sum + a.value, 0) : 0

  const body = (
    <>
      <div
        className={`flex flex-wrap items-center justify-center ${
          isLarge ? 'gap-12 py-6 sm:gap-20' : 'gap-8 py-4 sm:gap-14'
        } ${bare ? '' : 'my-auto'}`}
      >
        {genderFigures.map((f) => (
          <FigureColumn
            key={f.key}
            Icon={f.Icon}
            label={f.label}
            value={f.value}
            total={data.total}
            color={f.color}
            bg={f.bg}
            large={isLarge}
          />
        ))}
      </div>

      {hasAgeSplit && (
        <>
          <div className="my-5 border-t border-slate-100" />
          <div className="flex flex-wrap justify-center gap-8 py-2 sm:gap-14">
            {ageSplit!.map((a, i) => (
              <FigureColumn
                key={a.label}
                Icon={ageIcons[i % ageIcons.length]}
                label={a.label}
                value={a.value}
                total={ageTotal}
                color={ageColors[i % ageColors.length].color}
                bg={ageColors[i % ageColors.length].bg}
              />
            ))}
          </div>
        </>
      )}
    </>
  )

  if (bare) return <div className="flex w-full flex-col">{body}</div>

  return (
    <Card title={title} icon={icon} accent="s1" headerTone={headerTone} bodyClassName="justify-center">
      {body}
    </Card>
  )
}
