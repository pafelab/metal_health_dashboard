// Parses the MCATT & SMI-V staff directory block of the wide tab (cols 64-71). SPEC 3.4.
// Not aligned with the event rows — thirteen rows carry a zone in col 64, and the block runs
// to the end of the sheet. Pure, no I/O.

import type { McattPerson } from '@/types'
import { cell, isBlankCell, isTruthyCell, parseZone, splitLines, stripListNumbering } from './normalize'

const IDX = {
  zone: 64,
  names: 65,
  phones: 66,
  agencies: 67,
  lineIds: 68,
  lineNames: 69,
  mcatt: 70,
  smiv: 71,
} as const

/** Newline-separated, index-aligned with names; falls back to the first value. SPEC 3.4. */
function pick(values: string[], i: number): string {
  if (values.length === 0) return ''
  return values[i] ?? values[0] ?? ''
}

/** Characters a phone-number cell may contain. Anything else (letters, Thai, 'ต่อ') disqualifies
 *  it — UX-17 only allows a tel: link where the channel is verified. */
const PHONE_CHARS = /^[0-9+\-().\s]+$/

/**
 * Digits of a Thai phone number, or null when the value is not a single valid one.
 * Accepts the +66 international form and returns it in national 0-leading form.
 * Valid lengths: 10 (mobile) and 9 (landline).
 */
export function thaiPhoneDigits(raw: string): string | null {
  const t = raw.trim()
  if (t === '' || !PHONE_CHARS.test(t)) return null
  let digits = t.replace(/\D/g, '')
  if (!digits.startsWith('0') && digits.startsWith('66')) digits = `0${digits.slice(2)}`
  if (!digits.startsWith('0')) return null
  return digits.length === 10 || digits.length === 9 ? digits : null
}

/**
 * Display grouping: 10-digit mobile 0XX-XXX-XXXX; 9-digit landline 0X-XXX-XXXX for the two-digit
 * Bangkok code (02-590-8000) and 0XX-XXX-XXX for the three-digit provincial codes (043-123-456),
 * which is how those numbers are written in Thailand.
 * Values that are not a valid Thai number are returned trimmed but otherwise untouched.
 */
export function formatThaiPhone(raw: string): string {
  const digits = thaiPhoneDigits(raw)
  if (digits === null) return raw.trim()
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** A single sheet cell sometimes carries two numbers ('081-2345678 / 042-123456'). */
export function formatPhoneCell(raw: string): string {
  const parts = raw.split(/\s*[,/]\s*/).filter((p) => p.trim() !== '')
  if (parts.length <= 1) return formatThaiPhone(raw)
  return parts.map(formatThaiPhone).join(' / ')
}

/** Skips rows[0] (header). Zone is carried forward from col 64 until a new zone appears;
 *  people found before the first zone cell are dropped (McattPerson.zone is non-nullable). */
export function parseMcatt(rows: string[][]): McattPerson[] {
  const people: McattPerson[] = []
  let currentZone: number | null = null

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const zoneCell = cell(row, IDX.zone)
    if (zoneCell !== '') {
      const z = parseZone(zoneCell)
      if (z !== null) currentZone = z
    }

    const namesRaw = cell(row, IDX.names)
    if (isBlankCell(namesRaw)) continue
    if (currentZone === null) continue

    const names = splitLines(namesRaw).map(stripListNumbering).filter((n) => n !== '')
    if (names.length === 0) continue

    const phones = splitLines(cell(row, IDX.phones)).map(stripListNumbering)
    const agencies = splitLines(cell(row, IDX.agencies)).map(stripListNumbering)
    const lineIds = splitLines(cell(row, IDX.lineIds)).map(stripListNumbering)
    const lineNames = splitLines(cell(row, IDX.lineNames)).map(stripListNumbering)

    const mcattRaw = cell(row, IDX.mcatt)
    const smivRaw = cell(row, IDX.smiv)
    const mcatt = isTruthyCell(mcattRaw)
    const smiv = isTruthyCell(smivRaw)

    names.forEach((name, i2) => {
      people.push({
        zone: currentZone as number,
        name,
        // Display form is normalised once, here, so every consumer shows the same grouping (UX-17).
        phone: formatPhoneCell(pick(phones, i2)),
        agency: pick(agencies, i2),
        lineId: pick(lineIds, i2),
        lineName: pick(lineNames, i2),
        mcatt,
        smiv,
      })
    })
  }

  return people
}
