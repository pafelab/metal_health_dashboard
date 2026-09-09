// SPEC 6.5 — MCATT & SMI-V tab: 13 zone groups in order, each headed 'เขตสุขภาพที่ N' with its
// province list as subtitle, one card per person. Search (name/agency/province) + role toggle.
// No charts, so no chart-type switcher.

import { useMemo, useState } from 'react'
import { Building2, MessageCircle, Phone, Search, UserRound, Users } from 'lucide-react'
import type { McattPerson } from '@/types'
import { ZONE_PROVINCES } from '@/config'
import { useSheetData } from '@/hooks/useSheetData'
import Card from '@/components/layout/Card'

type RoleFilter = 'all' | 'mcatt' | 'smiv'

const ROLE_OPTIONS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'mcatt', label: 'MCATT' },
  { key: 'smiv', label: 'SMI-V' },
]

const ZONE_NUMBERS = Array.from({ length: 13 }, (_, i) => i + 1)

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

function PersonCard({ person }: { person: McattPerson }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserRound size={18} className="shrink-0 text-slate-400" />
          <p className="font-semibold text-slate-800 truncate">{person.name}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
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
        </div>
      </div>

      {person.agency && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Building2 size={15} className="shrink-0" />
          <span className="truncate">{person.agency}</span>
        </div>
      )}

      {person.phone && (
        <a
          href={`tel:${person.phone.replace(/[^0-9+]/g, '')}`}
          className="flex items-center gap-2 text-sm font-medium text-s2-600 hover:underline w-fit"
        >
          <Phone size={15} className="shrink-0" />
          {person.phone}
        </a>
      )}

      {(person.lineId || person.lineName) && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MessageCircle size={15} className="shrink-0" />
          <span className="truncate">{[person.lineName, person.lineId].filter(Boolean).join(' · ')}</span>
        </div>
      )}
    </div>
  )
}

export default function McattPage() {
  const { mcatt } = useSheetData()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')

  const byZone = useMemo(() => {
    const map = new Map<number, McattPerson[]>()
    for (const z of ZONE_NUMBERS) map.set(z, [])
    for (const p of mcatt) {
      if (!map.has(p.zone)) map.set(p.zone, [])
      map.get(p.zone)!.push(p)
    }
    return map
  }, [mcatt])

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หน่วยงาน หรือจังหวัด..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-body text-slate-700 focus:outline-none focus:ring-2 focus:ring-s1-300 focus:border-s1-400 transition-shadow"
          />
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shrink-0">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRole(opt.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                role === opt.key ? 'bg-s1-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {ZONE_NUMBERS.map((zone) => {
        const provinces = ZONE_PROVINCES[zone] ?? []
        const zonePeople = byZone.get(zone) ?? []
        const visiblePeople = zonePeople.filter(
          (p) => matchesSearch(p, provinces, search) && matchesRole(p, role),
        )

        return (
          <Card
            key={zone}
            title={`เขตสุขภาพที่ ${zone}`}
            subtitle={provinces.join(', ')}
            icon={Users}
            accent="s1"
          >
            {zonePeople.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีข้อมูลบุคลากรในเขตนี้</p>
            ) : visiblePeople.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่พบผลการค้นหาในเขตนี้</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visiblePeople.map((p, i) => (
                  <PersonCard key={`${zone}-${p.name}-${i}`} person={p} />
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
