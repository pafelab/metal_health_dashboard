// SPEC 6.5 — MCATT & SMI-V tab: 13 zone groups in order, each headed 'เขตสุขภาพที่ N' with its
// province list as subtitle, one card per person. Search (name/agency/province) + role toggle.
// No charts, so no chart-type switcher.
//
// UX-17: every contact value carries its channel label ('โทร:', 'LINE ID:', 'ชื่อ LINE:'), missing
// values read 'ไม่ระบุ', the role badges are explained by a legend before their first use, people
// with no role get a neutral badge, the role filter states what it does, empty results say why and
// offer recovery, and a zone jump list scrolls past the sticky header (--sticky-offset).

import { useId, useMemo, useState } from 'react'
import { Building2, Check, Copy, MessageCircle, Phone, Search, UserRound, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { McattPerson } from '@/types'
import { ZONE_NUMBERS, ZONE_PROVINCES, formatZoneLabel } from '@/config'
import { thaiPhoneDigits } from '@/data/mcatt'
import { useSheetData } from '@/hooks/useSheetData'
import Card from '@/components/layout/Card'

type RoleFilter = 'all' | 'mcatt' | 'smiv'

const ROLE_OPTIONS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'mcatt', label: 'MCATT' },
  { key: 'smiv', label: 'SMI-V' },
]

const ROLE_LEGEND: { term: string; meaning: string }[] = [
  { term: 'MCATT', meaning: 'ทีมช่วยเหลือเยียวยาจิตใจผู้ประสบภาวะวิกฤต' },
  { term: 'SMI-V', meaning: 'ผู้ป่วยจิตเวชที่มีความเสี่ยงสูงต่อการก่อความรุนแรง' },
  { term: 'ไม่ระบุบทบาท', meaning: 'แหล่งข้อมูลไม่ได้ระบุบทบาทของผู้ประสานงานคนนี้' },
]

const NOT_SPECIFIED = 'ไม่ระบุ'

/** Height of the sticky header + filter bar, published by FilterBar as a CSS custom property. */
const STICKY_OFFSET_FALLBACK = '96px'

function normalize(s: string): string {
  return s.trim().toLocaleLowerCase('th-TH')
}

function matchesSearch(p: McattPerson, provinces: string[], query: string): boolean {
  if (query === '') return true
  const q = normalize(query)
  if (normalize(p.name).includes(q)) return true
  if (normalize(p.agency).includes(q)) return true
  return provinces.some((prov) => normalize(prov).includes(q))
}

function matchesRole(p: McattPerson, role: RoleFilter): boolean {
  if (role === 'all') return true
  if (role === 'mcatt') return p.mcatt
  return p.smiv
}

interface ContactRowProps {
  icon: LucideIcon
  label: string
  value: string
  /** Set only for a channel we verified (a valid Thai phone number). */
  href?: string
  copied: boolean
  onCopy: () => void
}

/** One labelled contact line: channel label, value (or 'ไม่ระบุ'), and copy/open only when real. */
function ContactRow({ icon: Icon, label, value, href, copied, onCopy }: ContactRowProps) {
  const hasValue = value.trim() !== ''
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="shrink-0 text-slate-500">{label}</span>
      {hasValue ? (
        <>
          {href ? (
            <a
              href={href}
              className="font-medium text-s2-600 hover:underline break-all rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400"
              aria-label={`โทรออกหา ${value}`}
            >
              {value}
            </a>
          ) : (
            <span className="font-medium text-slate-700 break-all">{value}</span>
          )}
          <button
            type="button"
            onClick={onCopy}
            aria-label={`คัดลอก${label.replace(':', '')} ${value}`}
            className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          </button>
        </>
      ) : (
        <span className="text-slate-500">{NOT_SPECIFIED}</span>
      )}
    </div>
  )
}

function PersonCard({ person }: { person: McattPerson }) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const phoneDigits = thaiPhoneDigits(person.phone)
  const hasRole = person.mcatt || person.smiv

  function copy(field: string, text: string) {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedField(field)
        window.setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 1600)
      })
      .catch(() => {
        /* clipboard blocked (insecure context / permission) — the value is still selectable */
      })
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserRound size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-800 truncate">{person.name}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {person.mcatt && (
            <span className="rounded-md border border-s1-200 bg-s1-100 px-2 py-0.5 text-[11px] font-bold text-s1-700">
              MCATT
            </span>
          )}
          {person.smiv && (
            <span className="rounded-md border border-s2-200 bg-s2-100 px-2 py-0.5 text-[11px] font-bold text-s2-700">
              SMI-V
            </span>
          )}
          {!hasRole && (
            <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              ไม่ระบุบทบาท
            </span>
          )}
        </div>
      </div>

      <ContactRow
        icon={Building2}
        label="หน่วยงาน:"
        value={person.agency}
        copied={copiedField === 'agency'}
        onCopy={() => copy('agency', person.agency)}
      />
      <ContactRow
        icon={Phone}
        label="โทร:"
        value={person.phone}
        href={phoneDigits ? `tel:${phoneDigits}` : undefined}
        copied={copiedField === 'phone'}
        onCopy={() => copy('phone', person.phone)}
      />
      <ContactRow
        icon={MessageCircle}
        label="LINE ID:"
        value={person.lineId}
        copied={copiedField === 'lineId'}
        onCopy={() => copy('lineId', person.lineId)}
      />
      <ContactRow
        icon={MessageCircle}
        label="ชื่อ LINE:"
        value={person.lineName}
        copied={copiedField === 'lineName'}
        onCopy={() => copy('lineName', person.lineName)}
      />

      <span role="status" aria-live="polite" className="sr-only">
        {copiedField ? 'คัดลอกแล้ว' : ''}
      </span>
    </div>
  )
}

export default function McattPage() {
  const { mcatt } = useSheetData()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')
  const roleHintId = useId()
  const searchId = useId()

  const byZone = useMemo(() => {
    const map = new Map<number, McattPerson[]>()
    for (const z of ZONE_NUMBERS) map.set(z, [])
    for (const p of mcatt) {
      if (!map.has(p.zone)) map.set(p.zone, [])
      map.get(p.zone)!.push(p)
    }
    return map
  }, [mcatt])

  const groups = useMemo(
    () =>
      ZONE_NUMBERS.map((zone) => {
        const provinces = ZONE_PROVINCES[zone] ?? []
        const people = byZone.get(zone) ?? []
        return {
          zone,
          provinces,
          people,
          visible: people.filter((p) => matchesSearch(p, provinces, search) && matchesRole(p, role)),
        }
      }),
    [byZone, search, role],
  )

  const totalVisible = groups.reduce((n, g) => n + g.visible.length, 0)
  const roleLabel = ROLE_OPTIONS.find((o) => o.key === role)?.label ?? ''
  const isFiltered = search.trim() !== '' || role !== 'all'

  function clearSearch() {
    setSearch('')
  }

  /** Jump list: scroll the zone group into view below the sticky header, and focus it so the
   *  jump also works for keyboard and screen-reader users. */
  function jumpToZone(zone: number) {
    const el = document.getElementById(`zone-${zone}`)
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      {/* Role legend — before the first badge appears on screen. */}
      <dl className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
        {ROLE_LEGEND.map((item) => (
          <div key={item.term} className="flex gap-2">
            <dt className="shrink-0 font-bold text-slate-700">{item.term}</dt>
            <dd className="text-slate-600">= {item.meaning}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 max-w-md">
          <label htmlFor={searchId} className="sr-only">
            ค้นหาชื่อ หน่วยงาน หรือจังหวัด
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id={searchId}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หน่วยงาน หรือจังหวัด..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-body text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-s1-300 focus:border-s1-400 transition-shadow"
            />
            {search !== '' && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="ล้างคำค้น"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div
            role="group"
            aria-label="กรองตามบทบาท"
            aria-describedby={roleHintId}
            className="inline-flex rounded-xl border border-slate-200 bg-white p-1"
          >
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRole(opt.key)}
                aria-pressed={role === opt.key}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 ${
                  role === opt.key ? 'bg-s1-700 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p id={roleHintId} className="mt-1.5 text-xs text-slate-500 lg:text-right">
            แสดงเฉพาะผู้ที่มีบทบาทนี้ — ผู้ที่ไม่ระบุบทบาทจะไม่แสดงเมื่อเลือก MCATT หรือ SMI-V
          </p>
        </div>
      </div>

      {/* Zone jump list */}
      <nav aria-label="ข้ามไปยังเขตสุขภาพ" className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-600">ไปยังเขตสุขภาพ:</span>
        {groups.map((g) => (
          <button
            key={g.zone}
            type="button"
            onClick={() => jumpToZone(g.zone)}
            aria-label={`ไปยัง${formatZoneLabel(g.zone)} (${g.visible.length} คน)`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 ${
              g.visible.length === 0
                ? 'border-slate-200 bg-white text-slate-500'
                : 'border-slate-200 bg-white text-slate-700 hover:border-s1-300 hover:bg-s1-50 hover:text-s1-700'
            }`}
          >
            {/* Deck slide 10: always the full 'เขตสุขภาพที่ N'. The clipped 'เขต N' also made the
                visible label disagree with this button's own aria-label and with the card title
                it jumps to. */}
            {formatZoneLabel(g.zone)}
            <span className="ml-1 text-xs font-medium text-slate-500">({g.visible.length})</span>
          </button>
        ))}
      </nav>

      <p className="text-sm text-slate-600" role="status" aria-live="polite">
        แสดง {totalVisible} คน จากทั้งหมด {mcatt.length} คน
        {role !== 'all' ? ` · บทบาท: ${roleLabel}` : ''}
        {search.trim() !== '' ? ` · คำค้น: "${search.trim()}"` : ''}
      </p>

      {totalVisible === 0 && isFiltered ? (
        <Card title="ไม่พบผลการค้นหา" icon={Search} accent="neutral">
          <div className="space-y-3">
            <p className="text-body text-slate-600">
              ไม่พบผู้ประสานงานที่ตรงกับ
              {search.trim() !== '' ? ` คำค้น "${search.trim()}"` : ''}
              {search.trim() !== '' && role !== 'all' ? ' และ' : ''}
              {role !== 'all' ? ` บทบาท ${roleLabel}` : ''} ในทุกเขตสุขภาพ
            </p>
            <div className="flex flex-wrap gap-2">
              {search.trim() !== '' && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-xl bg-s1-700 px-4 py-2 text-sm font-semibold text-white hover:bg-s1-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
                >
                  ล้างคำค้น
                </button>
              )}
              {role !== 'all' && (
                <button
                  type="button"
                  onClick={() => setRole('all')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
                >
                  แสดงทุกบทบาท
                </button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section
              key={g.zone}
              id={`zone-${g.zone}`}
              tabIndex={-1}
              aria-label={formatZoneLabel(g.zone)}
              style={{ scrollMarginTop: `var(--sticky-offset, ${STICKY_OFFSET_FALLBACK})` }}
              className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400"
            >
              <Card
                title={formatZoneLabel(g.zone)}
                subtitle={g.provinces.join(', ')}
                icon={Users}
                accent="s1"
                right={
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">
                    {g.visible.length} คน
                  </span>
                }
              >
                {g.people.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีข้อมูลบุคลากรในเขตนี้</p>
                ) : g.visible.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      เขตนี้มี {g.people.length} คน แต่ไม่มีใครตรงกับ
                      {search.trim() !== '' ? ` คำค้น "${search.trim()}"` : ''}
                      {search.trim() !== '' && role !== 'all' ? ' และ' : ''}
                      {role !== 'all' ? ` บทบาท ${roleLabel}` : ''}
                    </p>
                    {search.trim() !== '' && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
                      >
                        ล้างคำค้น
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {g.visible.map((p, i) => (
                      <PersonCard key={`${g.zone}-${p.name}-${i}`} person={p} />
                    ))}
                  </div>
                )}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
