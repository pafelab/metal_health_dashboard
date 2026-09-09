// SPEC 6.1 #1 and #2, PDF p.2, SPEC 4.4 — the risk-factor and warning-sign infographics. Each is
// its own polished infographic widget (not a chart, no switcher), matching the two-column pill
// design of docs/reference/site1/index.html renderRiskWarningInfographic() but recomposed with
// our design tokens and lucide-react icons in place of Font Awesome.

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

function fmt(n: number): string {
  return n.toLocaleString('th-TH')
}

function pct(n: number, denom: number): string {
  return denom > 0 ? ((n / denom) * 100).toFixed(1) : '0.0'
}

function ItemRow({ item, denominator, index, compact }: { item: CategoryCount; denominator: number; index: number; compact?: boolean }) {
  const Icon = ITEM_ICON[item.name] ?? HelpCircle
  if (compact) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm transition-transform hover:scale-[1.02]">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="mb-2 text-sm font-bold text-slate-700">{item.name}</div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>({fmt(item.value)})</span>
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-white">{pct(item.value, denominator)}%</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full items-center justify-between rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]">
      <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        {index + 1}. {item.name}
      </span>
      <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <span>({fmt(item.value)})</span>
        <span className="rounded-full bg-orange-500 px-3 py-1 text-white">{pct(item.value, denominator)}%</span>
      </span>
    </div>
  )
}

export default function RiskWarning({ kind, data }: RiskWarningProps) {
  const { items, denominator, affected } = data
  const affectedPct = pct(affected, denominator)

  if (kind === 'risk') {
    return (
      <Card title="3 ปัจจัยเสี่ยงหลัก" subtitle="ของผู้ป่วยรายเก่าที่ก่อความรุนแรง" icon={TriangleAlert} accent="s1">
        <div className="flex flex-col items-center">
          <div className="mb-5 flex text-xs font-bold">
            <span className="rounded-l-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
              จาก {fmt(denominator)} ผู้ป่วยรายเก่า
            </span>
            <span className="rounded-r-full border border-l-0 border-blue-200 bg-blue-100 px-3 py-1.5 text-blue-800">
              · มีปัจจัยเสี่ยง {fmt(affected)} ราย ({affectedPct}%)
            </span>
          </div>
          <div className="w-full space-y-3">
            {items.map((item, i) => (
              <ItemRow key={item.name} item={item} denominator={denominator} index={i} />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const [first, ...rest] = items

  return (
    <Card title="5 สัญญาณเตือน" subtitle="เฝ้าระวังกลุ่มเสี่ยงในชุมชน" icon={Radar} accent="s1">
      <div className="flex flex-col items-center">
        <div className="mb-5 flex text-xs font-bold">
          <span className="rounded-l-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            จาก {fmt(denominator)} เหตุการณ์
          </span>
          <span className="rounded-r-full border border-l-0 border-amber-200 bg-amber-100 px-3 py-1.5 text-amber-800">
            · มีสัญญาณเตือน {fmt(affected)} เหตุการณ์ ({affectedPct}%)
          </span>
        </div>
        <div className="w-full space-y-3">
          {first && (
            <div className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]">
              <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  {(() => {
                    const Icon = ITEM_ICON[first.name] ?? HelpCircle
                    return <Icon className="h-5 w-5" strokeWidth={2} />
                  })()}
                </span>
                {first.name}
              </span>
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>({fmt(first.value)})</span>
                <span className="rounded-full bg-rose-500 px-3 py-1 text-white">{pct(first.value, denominator)}%</span>
              </span>
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-3">
              {rest.map((item, i) => (
                <ItemRow key={item.name} item={item} denominator={denominator} index={i} compact />
              ))}
            </div>
          )}
        </div>
        <p className="mt-4 text-xs font-medium text-slate-400">
          หมายเหตุ: 1 เหตุการณ์สามารถมีได้มากกว่า 1 สัญญาณเตือน
        </p>
      </div>
    </Card>
  )
}
