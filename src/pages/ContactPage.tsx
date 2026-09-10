// SPEC 6.7 — ติดต่อเรา tab: three team cards (photo, name, nickname, position, phone) built
// verbatim from TEAM in '@/config'. No charts.
//
// UX-17: the same labelled-contact pattern as the MCATT directory — every value states its field,
// the phone is shown in the normalised Thai grouping, and it only becomes a tel: link when it is
// a valid Thai number.

import { Phone, Users } from 'lucide-react'
import { TEAM } from '@/config'
import { formatThaiPhone, thaiPhoneDigits } from '@/data/mcatt'

const NOT_SPECIFIED = 'ไม่ระบุ'

export default function ContactPage() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
        <Users className="text-s1-600" size={26} strokeWidth={2.25} aria-hidden="true" />
        ทีมงาน Social Listening
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((member) => {
          const phone = formatThaiPhone(member.phone)
          const phoneDigits = thaiPhoneDigits(member.phone)

          return (
            <div key={member.name} className="bg-white rounded-card shadow-card overflow-hidden flex flex-col">
              <img
                src={member.photo}
                alt={`รูปถ่ายของ ${member.name}`}
                className="h-64 w-full object-cover bg-slate-100"
              />
              <div className="flex-1 p-5 space-y-1.5">
                <p className="font-sans font-bold text-cardTitle text-slate-800">{member.name}</p>

                <p className="text-sm">
                  <span className="text-slate-500">ชื่อเล่น: </span>
                  <span className="font-semibold text-s1-700">{member.nickname || NOT_SPECIFIED}</span>
                </p>

                <p className="text-sm">
                  <span className="text-slate-500">ตำแหน่ง: </span>
                  <span className="text-slate-700">{member.position || NOT_SPECIFIED}</span>
                </p>

                <p className="flex items-center gap-2 pt-2 text-sm">
                  <Phone size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="text-slate-500">โทร:</span>
                  {phoneDigits ? (
                    <a
                      href={`tel:${phoneDigits}`}
                      aria-label={`โทรออกหา ${member.name} ${phone}`}
                      className="rounded font-semibold text-s2-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="font-semibold text-slate-700">{phone || NOT_SPECIFIED}</span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
