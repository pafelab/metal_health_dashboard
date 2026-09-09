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
        phone: pick(phones, i2),
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
