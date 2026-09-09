// SPEC 6.6 — รายงาน tab: the alert-criteria image (lightbox + download) and the two DCIR PDF
// forms (inline iframe preview + open-in-new-tab + download, with an always-visible fallback
// link since an iframe can't reliably report "the PDF failed to render").

import { useEffect, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileText, Maximize2, X } from 'lucide-react'
import Card from '@/components/layout/Card'

const ALERT_IMAGE = '/reference/alert_criteria.jpg'

interface FormDef {
  title: string
  href: string
  fileName: string
}

const FORMS: FormDef[] = [
  { title: 'แบบฟอร์มภัยน้ำมือมนุษย์', href: '/forms/form_human.pdf', fileName: 'form_human.pdf' },
  { title: 'แบบฟอร์มภัยพิบัติ', href: '/forms/form_disaster.pdf', fileName: 'form_disaster.pdf' },
]

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute right-4 top-4 sm:right-8 sm:top-8 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt="เกณฑ์การ Alert ข่าว"
        className="max-h-[90vh] max-w-full rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function FormCard({ def }: { def: FormDef }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-white">
        <p className="font-semibold text-slate-700 truncate">{def.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={def.href}
            target="_blank"
            rel="noopener noreferrer"
            title="เปิดหน้าต่างใหม่"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-s2-600 hover:bg-s2-50 hover:border-s2-300 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
          <a
            href={def.href}
            download={def.fileName}
            title="ดาวน์โหลดไฟล์"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-s2-600 text-white hover:bg-s2-700 transition-colors"
          >
            <Download size={16} />
          </a>
        </div>
      </div>

      <div className="h-[420px] bg-white">
        <iframe title={def.title} src={`${def.href}#toolbar=0`} className="h-full w-full border-0">
          <p className="p-8 text-center text-sm text-slate-500">
            ไม่สามารถแสดงตัวอย่าง PDF ได้ในเบราว์เซอร์นี้
          </p>
        </iframe>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 border-t border-slate-100 bg-white">
        <AlertTriangle size={14} className="shrink-0 text-slate-400" />
        หากไม่สามารถแสดงตัวอย่างได้ กรุณา{' '}
        <a href={def.href} download={def.fileName} className="font-semibold text-s2-600 hover:underline">
          ดาวน์โหลดไฟล์
        </a>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto w-full">
      <Card
        title="เกณฑ์การ Alert ข่าว (SOCIAL LISTENING)"
        icon={AlertTriangle}
        accent="s1"
        right={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-s1-600 hover:bg-s1-50 hover:border-s1-300 transition-colors"
            >
              <Maximize2 size={16} /> ดูรูปเต็มจอ
            </button>
            <a
              href={ALERT_IMAGE}
              download="alert_criteria.jpg"
              className="inline-flex items-center gap-2 rounded-xl bg-s1-600 px-4 py-2 text-sm font-semibold text-white hover:bg-s1-700 transition-colors"
            >
              <Download size={16} /> ดาวน์โหลด
            </a>
          </div>
        }
      >
        <img
          src={ALERT_IMAGE}
          alt="เกณฑ์การ Alert ข่าว (Social Listening)"
          className="w-full rounded-xl border border-slate-100 cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        />
      </Card>

      <Card title="แบบฟอร์มการรายงาน (DCIR)" icon={FileText} accent="s2">
        <div className="grid gap-6 md:grid-cols-2">
          {FORMS.map((def) => (
            <FormCard key={def.href} def={def} />
          ))}
        </div>
      </Card>

      {lightboxOpen && <Lightbox src={ALERT_IMAGE} onClose={() => setLightboxOpen(false)} />}
    </div>
  )
}
