// SPEC 6.1 #10 and #16 — human-figure infographic. Mirrors docs/reference/site2's
// renderCustomGender()/renderCustomAge() (person icon + a fluid-fill capsule sized by percent)
// rebuilt with lucide-react icons and our design tokens. Widget 16 also supplies `ageSplit`
// (<18 / >=18) which renders as a second figure row inside the same card.

import type { LucideIcon } from 'lucide-react'
import { User, UserRound, Users, Baby, PersonStanding } from 'lucide-react'
import Card from '@/components/layout/Card'
import type { GenderSplit } from '@/types'

export interface GenderFigureProps {
  title: string
  data: GenderSplit
  icon?: LucideIcon
  ageSplit?: { label: string; value: number }[]
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
  percent,
  color,
  bg,
  large = false,
}: {
  Icon: LucideIcon
  label: string
  value: number
  percent: number
  color: string
  bg: string
  large?: boolean
}) {
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
      <span className={`font-bold text-slate-800 ${large ? 'mt-4 text-base sm:text-lg' : 'mt-3 text-sm'}`}>
        {label}
      </span>
      <span className={`font-bold text-slate-500 ${large ? 'text-sm' : 'text-xs'}`}>{percent.toFixed(1)}%</span>
    </div>
  )
}

export default function GenderFigure({ title, data, icon, ageSplit }: GenderFigureProps) {
  const genderFigures: FigureSpec[] = [
    { key: 'male', Icon: User, label: 'ชาย', value: data.male, color: '#2563EB', bg: '#BFDBFE' },
    { key: 'female', Icon: UserRound, label: 'หญิง', value: data.female, color: '#EC4899', bg: '#FBCFE8' },
  ]
  if (data.other > 0) {
    genderFigures.push({ key: 'other', Icon: Users, label: 'อื่นๆ', value: data.other, color: '#64748B', bg: '#E2E8F0' })
  }

  const isLarge = !ageSplit || ageSplit.length === 0

  const ageIcons: LucideIcon[] = [Baby, PersonStanding]
  const ageColors: { color: string; bg: string }[] = [
    { color: '#7C3AED', bg: '#DDD6FE' },
    { color: '#059669', bg: '#A7F3D0' },
  ]
  const ageTotal = ageSplit ? ageSplit.reduce((sum, a) => sum + a.value, 0) : 0

  return (
    <Card title={title} icon={icon} accent="s1" bodyClassName="justify-center">
      <div
        className={`my-auto flex flex-wrap items-center justify-center ${
          isLarge ? 'gap-12 py-6 sm:gap-20' : 'gap-8 py-4 sm:gap-14'
        }`}
      >
        {genderFigures.map((f) => (
          <FigureColumn
            key={f.key}
            Icon={f.Icon}
            label={f.label}
            value={f.value}
            percent={pct(f.value, data.total)}
            color={f.color}
            bg={f.bg}
            large={isLarge}
          />
        ))}
      </div>

      {ageSplit && ageSplit.length > 0 && (
        <>
          <div className="my-5 border-t border-slate-100" />
          <div className="flex flex-wrap justify-center gap-8 py-2 sm:gap-14">
            {ageSplit.map((a, i) => (
              <FigureColumn
                key={a.label}
                Icon={ageIcons[i % ageIcons.length]}
                label={a.label}
                value={a.value}
                percent={pct(a.value, ageTotal)}
                color={ageColors[i % ageColors.length].color}
                bg={ageColors[i % ageColors.length].bg}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
