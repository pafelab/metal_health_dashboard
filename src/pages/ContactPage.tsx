// SPEC 6.7 — ติดต่อเรา tab: three team cards (photo, name, nickname, position, phone) built
// verbatim from TEAM in '@/config'. No charts.

import { Phone, Users } from 'lucide-react'
import { TEAM } from '@/config'

export default function ContactPage() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
        <Users className="text-s1-600" size={26} strokeWidth={2.25} />
        ทีมงาน Social Listening
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((member) => (
          <div key={member.name} className="bg-white rounded-card shadow-card overflow-hidden flex flex-col">
            <img src={member.photo} alt={member.name} className="h-64 w-full object-cover bg-slate-100" />
            <div className="flex-1 p-5 space-y-1.5">
              <p className="font-sans font-bold text-cardTitle text-slate-800">{member.name}</p>
              <p className="text-sm font-semibold text-s1-600">&ldquo;{member.nickname}&rdquo;</p>
              <p className="text-sm text-slate-500">{member.position}</p>
              <a
                href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-s2-600 hover:underline"
              >
                <Phone size={16} />
                {member.phone}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
