import { useState } from 'react'
import { PhoneCall, AlertTriangle, ShieldCheck, ShieldAlert, X } from 'lucide-react'

export interface SafetyBannerProps {
  privacyMode: boolean
  onTogglePrivacyMode: (val: boolean) => void
}

export default function SafetyBanner({ privacyMode, onTogglePrivacyMode }: SafetyBannerProps) {
  const [showWarning, setShowWarning] = useState(true)

  return (
    <div className="bg-slate-900 text-white text-xs sm:text-sm">
      {/* 1323 Hotline & Privacy Bar */}
      <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300 font-bold border border-emerald-500/30">
            <PhoneCall size={14} className="animate-pulse" />
            สายด่วนสุขภาพจิต 1323
          </span>
          <span className="hidden md:inline text-slate-300">
            โทรฟรีตลอด 24 ชั่วโมง · กรมสุขภาพจิต กระทรวงสาธารณสุข
          </span>
          <a
            href="tel:1323"
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            โทรเลย 1323
          </a>
        </div>

        {/* PDPA Privacy Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTogglePrivacyMode(!privacyMode)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              privacyMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title="สลับโหมดคุ้มครองข้อมูลส่วนบุคคล (PDPA)"
          >
            {privacyMode ? (
              <>
                <ShieldCheck size={14} className="text-amber-400" />
                <span>โหมด PDPA (ปกปิดชื่อบุคคล)</span>
              </>
            ) : (
              <>
                <ShieldAlert size={14} className="text-slate-400" />
                <span>โหมดเจ้าหน้าที่ (แสดงชื่อเต็ม)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trigger Warning Banner */}
      {showWarning && (
        <div className="px-4 sm:px-6 py-2 bg-rose-950/80 border-b border-rose-900/50 flex items-center justify-between gap-3 text-rose-200">
          <div className="flex items-start sm:items-center gap-2 text-xs leading-relaxed">
            <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5 sm:mt-0" />
            <span>
              <strong>คำเตือนเนื้อหา (Trigger Warning):</strong> แดชบอร์ดนี้มีข้อมูลและรายงานข่าวเกี่ยวกับภาวะวิกฤตสุขภาพจิตและการพยายามฆ่าตัวตาย ผู้ที่มีความเครียดสามารถปรึกษาสายด่วน 1323
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowWarning(false)}
            aria-label="ปิดคำเตือน"
            className="shrink-0 p-1 text-rose-300 hover:text-white hover:bg-rose-900/50 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
