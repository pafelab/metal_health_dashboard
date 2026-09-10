// SPEC 6.6 — รายงาน tab: the alert criteria and the two DCIR PDF forms.
// UX-16: the criteria are rendered as HTML (AlertCriteriaTable) FIRST; the jpg is kept below as
// the source document (lightbox + download), and every document carries title/format/size/version
// metadata. The PDFs keep the inline iframe preview + open-in-new-tab + download, with an
// always-visible fallback link since an iframe cannot reliably report a failed render.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileText, Image as ImageIcon, Maximize2, X } from 'lucide-react'
import Card from '@/components/layout/Card'
import AlertCriteriaTable from '@/components/widgets/AlertCriteriaTable'

const ALERT_IMAGE = '/reference/alert_criteria.jpg'

const ALERT_IMAGE_ALT =
  'ภาพต้นฉบับ ตารางเกณฑ์การ Alert ข่าว จำแนกตามประเภทภัย (แถว) และระดับสีการแจ้งเตือน ดำ/แดง/เหลือง/เขียว (คอลัมน์) — เนื้อหาทั้งหมดมีให้อ่านเป็นข้อความในตารางด้านบนแล้ว'

/** Document metadata shown next to every downloadable file (UX-16). */
interface DocMeta {
  title: string
  href: string
  fileName: string
  format: string
  /** Byte size of the shipped asset in public/, measured from the file itself. */
  sizeBytes: number
  /** Neither document prints a version or a revision date. */
  version: string
  updated: string
}

const UNKNOWN = 'ไม่ระบุ'

const ALERT_DOC: DocMeta = {
  title: 'เกณฑ์การ Alert ข่าว (Social Listening)',
  href: ALERT_IMAGE,
  fileName: 'alert_criteria.jpg',
  format: 'JPEG (รูปภาพ)',
  sizeBytes: 202727,
  version: UNKNOWN,
  updated: UNKNOWN,
}

const FORMS: DocMeta[] = [
  {
    title: 'แบบฟอร์มภัยน้ำมือมนุษย์',
    href: '/forms/form_human.pdf',
    fileName: 'form_human.pdf',
    format: 'PDF',
    sizeBytes: 113920,
    version: UNKNOWN,
    updated: UNKNOWN,
  },
  {
    title: 'แบบฟอร์มภัยพิบัติ',
    href: '/forms/form_disaster.pdf',
    fileName: 'form_disaster.pdf',
    format: 'PDF',
    sizeBytes: 173270,
    version: UNKNOWN,
    updated: UNKNOWN,
  },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ไบต์`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** title / format / size / version / updated as a definition list — readable, not decorative. */
function DocMetaList({ doc }: { doc: DocMeta }) {
  const items: [string, string][] = [
    ['ชื่อเอกสาร', doc.title],
    ['รูปแบบไฟล์', doc.format],
    ['ขนาดไฟล์', formatBytes(doc.sizeBytes)],
    ['เวอร์ชัน', doc.version],
    ['ปรับปรุงล่าสุด', doc.updated],
  ]
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="shrink-0 text-slate-500">{k}:</dt>
          <dd className="font-medium text-slate-700">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // Restore focus to whatever opened the lightbox (UX-08 focus rule, same idea).
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ภาพต้นฉบับเกณฑ์การ Alert ข่าว"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute right-4 top-4 sm:right-8 sm:top-8 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={ALERT_IMAGE_ALT}
        className="max-h-[90vh] max-w-full rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function FormCard({ def }: { def: DocMeta }) {
  const fileHint = `${def.format}, ${formatBytes(def.sizeBytes)}`
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-white">
        <p className="font-semibold text-slate-700 truncate">{def.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={def.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`เปิด ${def.title} ในหน้าต่างใหม่`}
            aria-label={`เปิด ${def.title} ในหน้าต่างใหม่`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-s2-600 hover:bg-s2-50 hover:border-s2-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400 transition-colors"
          >
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a
            href={def.href}
            download={def.fileName}
            title={`ดาวน์โหลด ${def.title} (${fileHint})`}
            aria-label={`ดาวน์โหลด ${def.title} (${fileHint})`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-s2-600 text-white hover:bg-s2-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400 transition-colors"
          >
            <Download size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b border-slate-100">
        <DocMetaList doc={def} />
      </div>

      <div className="h-[420px] bg-white">
        <iframe
          title={`ตัวอย่างเอกสาร ${def.title} (${def.format})`}
          src={`${def.href}#toolbar=0`}
          className="h-full w-full border-0"
        >
          <p className="p-8 text-center text-sm text-slate-500">
            ไม่สามารถแสดงตัวอย่าง PDF ได้ในเบราว์เซอร์นี้
          </p>
        </iframe>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-4 py-3 text-xs text-slate-500 border-t border-slate-100 bg-white">
        <AlertTriangle size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span>หากไม่สามารถแสดงตัวอย่างได้ กรุณา</span>
        <a
          href={def.href}
          download={def.fileName}
          className="rounded font-semibold text-s2-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s2-400"
        >
          ดาวน์โหลดไฟล์
        </a>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const alertFileHint = `${ALERT_DOC.format}, ${formatBytes(ALERT_DOC.sizeBytes)}`

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto w-full">
      <Card title="เกณฑ์การ Alert ข่าว (SOCIAL LISTENING)" icon={AlertTriangle} accent="s1">
        <AlertCriteriaTable />

        {/* The jpg is now the SOURCE document, not the way the criteria are read. */}
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-slate-700">
              <ImageIcon size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
              เอกสารต้นฉบับ
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="ดูภาพต้นฉบับแบบเต็มจอ"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-s1-700 hover:bg-s1-50 hover:border-s1-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
              >
                <Maximize2 size={16} className="shrink-0" aria-hidden="true" />
                ดูภาพต้นฉบับ
              </button>
              <a
                href={ALERT_IMAGE}
                download="alert_criteria.jpg"
                aria-label={`ดาวน์โหลดภาพต้นฉบับเกณฑ์การ Alert ข่าว (${alertFileHint})`}
                className="inline-flex items-center gap-2 rounded-xl bg-s1-700 px-4 py-2 text-sm font-semibold text-white hover:bg-s1-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400 transition-colors"
              >
                <Download size={16} className="shrink-0" aria-hidden="true" />
                ดาวน์โหลด
              </a>
            </div>
          </div>

          <DocMetaList doc={ALERT_DOC} />

          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400">
              แสดงภาพต้นฉบับในหน้านี้
            </summary>
            <div className="px-4 pb-4">
              <img
                src={ALERT_IMAGE}
                alt={ALERT_IMAGE_ALT}
                className="w-full cursor-zoom-in rounded-xl border border-slate-100"
                onClick={() => setLightboxOpen(true)}
              />
            </div>
          </details>
        </div>
      </Card>

      <Card title="แบบฟอร์มการรายงาน (DCIR)" icon={FileText} accent="s2">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {FORMS.map((def) => (
            <FormCard key={def.href} def={def} />
          ))}
        </div>
      </Card>

      {lightboxOpen && <Lightbox src={ALERT_IMAGE} onClose={() => setLightboxOpen(false)} />}
    </div>
  )
}
