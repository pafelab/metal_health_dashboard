/**
 * Independent VERIFICATION GATE for the data layer (src/config, src/types, src/data).
 *
 * Reads the REAL CSVs from docs/data/ with node:fs + papaparse and feeds them through the
 * project's OWN parsers/aggregators imported from src/data. Every "expected" number is either
 * (a) quoted from SPEC.md / docs/BUILD_NOTES.md, or (b) recomputed here straight off the raw
 * CSV with code that shares nothing with src/ — so the gate cannot pass just because the
 * parser and the test make the same mistake.
 *
 * RUN WITH:   npx tsx scripts/verify-data.ts
 *
 * ---------------------------------------------------------------------------------------------
 * RE-BASELINED 2026-09-12 for the restructured sheet (docs/BUILD_NOTES.md "SHEET SCHEMA
 * REFRESHED 2026-09-12"). Two structural changes to the gate itself:
 *
 * 1. THE FIXTURE MOVED. src/config/sheet.ts has GID_SHEET2 === GID_WIDE === 842224166, so
 *    production parses Section 1 AND Section 2 out of the SAME tab. This gate used to feed
 *    parseSheet2() the legacy narrow tab docs/data/1683387958.csv (37 columns, 440 rows), which
 *    the app never fetches. That made section `o` ("no silent index fallback") a FALSE GREEN:
 *    the legacy header carries all the old SPEC 3.2 names at their old indexes, so every name
 *    resolved there while the live 85-column header shares not one of them. Section 1 is now
 *    parsed from docs/data/842224166.csv (85 columns, 580 Section-1 rows) — production reality —
 *    and the other two fixtures are exercised in section `r` as DEGRADATION checks instead.
 *
 * 2. THE SEMANTICS MOVED. riskFactors() is 4 FLAG columns (74-77) over the 4 psychiatric/
 *    substance ประเภทผู้ป่วย statuses; warningSigns() is 5 FLAG columns (78-82) over all rows;
 *    zoneCounts() labels buckets 'เขตสุขภาพที่ N'. Every raw recompute below was rewritten to
 *    re-derive these from the FLAG COLUMNS — it never calls the app aggregate it is checking.
 *
 * GATE RULE (unchanged): a defect in src/ is a hard FAIL; a defect in the SOURCE SHEET that the
 * code handles correctly is a loud WARN. If an assertion fails because a documented number is
 * wrong about the real data, say so explicitly and mark ok:false anyway — a human needs to see it.
 *
 * How the alias bootstrap works: the `@/*` alias lives in tsconfig.app.json, but tsx reads
 * tsconfig.json from the cwd, and the root tsconfig.json is a solution file (`"files": []`, no
 * `paths`). tsconfig files may not be edited, so this file re-execs itself once through tsx with
 * an explicit `--tsconfig tsconfig.app.json`, inherits the child's stdio and propagates its exit
 * code. Everything below the re-exec block therefore uses `await import(...)` — a static `@/...`
 * import would fail to resolve in the parent process before any of this code could run.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import Papa from 'papaparse'
import type { SLEvent, HazardEvent, McattPerson, Filters } from '@/types'

const SELF = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(SELF), '..')

// ---------------------------------------------------------------- self re-exec (alias bootstrap)

if (!process.env.VERIFY_DATA_CHILD) {
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!fs.existsSync(tsxCli)) {
    console.error(`FATAL: cannot find tsx at ${tsxCli}`)
    process.exit(1)
  }
  const child = spawnSync(process.execPath, [tsxCli, '--tsconfig', path.join(ROOT, 'tsconfig.app.json'), SELF], {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, VERIFY_DATA_CHILD: '1' },
  })
  process.exit(child.status ?? 1)
}

const {
  parseSheet2,
  parseWide,
  parseMcatt,
  buildResolver,
  latestDataMonth,
  earliestDataMonth,
  coverageWindow,
  futureDatedRows,
  outOfPeriodRows,
  ageBandByGender,
  ageBandCounts,
  countBy,
  topN,
  psychiatricDiagnosisCounts,
  patientStatusCounts,
  patientGroup7Counts,
  impactByGroup7,
  severityCounts,
  computeTimeliness,
  suicideSubset,
  monthlyTrend,
  hazardTypeCounts,
  hazardCasualties,
  provinceCounts,
  zoneCounts,
  riskFactors,
  warningSigns,
  genderSplit,
  impactByPatientGroup,
  applyFilters,
  collapseWs,
  collapseDoubledMarks,
  normProvince,
  parseAge,
  parseMonth,
  parseYear,
  severityOf,
  isTruthyCell,
  stripListNumbering,
} = await import('@/data')

const {
  ZONE_PROVINCES,
  ALL_PROVINCES,
  CATEGORY_ORDERS,
  RISK_DENOMINATOR_STATUSES,
  HAZARD_TYPES,
  HAZARD_UNSPECIFIED_LABEL,
  MONTH_ABBR,
  TIMELINESS_LEVELS,
  AGE_BANDS,
  RISK_KEYWORDS,
  SIGN_KEYWORDS,
  GID_SHEET2,
  GID_WIDE,
  GID_WIDE_FALLBACK,
  formatZoneLabel,
} = await import('@/config')

// ---------------------------------------------------------------------------- harness

interface Assertion {
  name: string
  expected: string
  actual: string
  ok: boolean
}
const results: Assertion[] = []

function assert(name: string, expected: unknown, actual: unknown, ok: boolean): void {
  const e = typeof expected === 'string' ? expected : JSON.stringify(expected)
  const a = typeof actual === 'string' ? actual : JSON.stringify(actual)
  results.push({ name, expected: e, actual: a, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n        expected: ${e}\n        actual:   ${a}`)
}

function eq(name: string, expected: unknown, actual: unknown): void {
  assert(name, expected, actual, JSON.stringify(expected) === JSON.stringify(actual))
}

function info(label: string, value: unknown): void {
  console.log(`INFO  ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
}

function warn(msg: string): void {
  console.log(`WARN  ${msg}`)
}

function section(title: string): void {
  console.log(`\n=====  ${title}  =====`)
}

// ---------------------------------------------------------------------------- load CSVs

function readCsv(file: string, skipEmptyLines = false): string[][] {
  const text = fs.readFileSync(path.join(ROOT, 'docs', 'data', file), 'utf8')
  // Same shape as src/data/fetchSheet.ts's Papa.parse call (header: false), synchronous.
  return Papa.parse<string[]>(text, { header: false, skipEmptyLines }).data
}

/**
 * THE tab the app fetches. fetchAllData() takes the `GID_SHEET2 === GID_WIDE` branch and hands
 * the SAME rows to parseSheet2 and parseWide, so one fixture drives both sections here too.
 */
const wideRows = readCsv('842224166.csv')
/** Legacy 84-column tab a failed primary fetch degrades to — exercised in section r, not here. */
const fallbackRows = readCsv('1523955266.csv')
/** The 37-column narrow ชีต2 tab the app no longer fetches — also section r only. */
const legacyRows = readCsv('1683387958.csv')

/** Raw-CSV cell reader used ONLY by the independent recomputations below (shares no code with src/). */
const raw = (r: string[], i: number): string => (typeof r[i] === 'string' ? r[i].trim() : '')
const wideData = wideRows.slice(1)

/**
 * The raw Section-1 row set, derived here with the same MEMBERSHIP RULE parseSheet2 documents
 * ("row must carry a จังหวัด or a หัวข้อข่าว") but with independent code. Every "independent
 * recompute" below iterates THIS, never `events`.
 */
const s1Data = wideData.filter((r) => raw(r, 3) !== '' || raw(r, 4) !== '')

section('CSV load')
assert(
  '0. the gate parses the tab fetchSheet.ts actually fetches (GID_SHEET2 === GID_WIDE === 842224166)',
  '842224166 / 842224166',
  `${GID_SHEET2} / ${GID_WIDE}`,
  GID_SHEET2 === 842224166 && GID_WIDE === 842224166,
)
info('wide raw rows (incl. header)', wideRows.length)
info('wide header columns', wideRows[0].length)
eq('0b. the refreshed wide tab has 85 columns (was 84 before 2026-09-12)', 85, wideRows[0].length)
info('raw Section-1 rows (col 3 or col 4 non-empty)', s1Data.length)
info('fallback tab columns', fallbackRows[0].length)
info('legacy narrow tab columns', legacyRows[0].length)

const events: SLEvent[] = parseSheet2(wideRows)
const hazards: HazardEvent[] = parseWide(wideRows)
const people: McattPerson[] = parseMcatt(wideRows)

// ---------------------------------------------------------------------------- a

section('a. parseSheet2 -> 580 Section-1 events')
eq('a. parseSheet2(wide tab).length', 580, events.length)
assert(
  'a2. ...and that equals the raw count of wide rows carrying a จังหวัด or a หัวข้อข่าว (cols 3/4)',
  String(s1Data.length),
  String(events.length),
  events.length === s1Data.length,
)
// The membership rule is what keeps Section-2-only and MCATT-only rows out of Section 1. It can
// also silently DROP data, so prove no excluded row carries Section-1 content of its own.
{
  const dropped = wideData
    .map((r, i) => ({ i, r }))
    .filter(({ r }) => raw(r, 3) === '' && raw(r, 4) === '')
    .map(({ i, r }) => ({
      row: i + 1,
      cells: [1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        .filter((c) => raw(r, c) !== '')
        .map((c) => `${c}=${JSON.stringify(raw(r, c))}`),
    }))
    .filter((x) => x.cells.length > 0)
  assert(
    'a3. the col-3/4 membership rule drops NO wide row that carries other Section-1 content (cols 1-2, 5-16)',
    '[]',
    JSON.stringify(dropped.slice(0, 5)),
    dropped.length === 0,
  )
}

// ---------------------------------------------------------------------------- b

section('b. parseWide -> Section-2 rows per the col-35/36 rule')
const rawSection2 = wideData.filter((r) => raw(r, 35) !== '' || raw(r, 36) !== '').length
info('raw col-35/36 non-empty rows counted straight off the CSV', rawSection2)
info('parseWide count', hazards.length)
assert(
  'b. parseWide(wide).length === raw col-35-or-36 non-empty count',
  String(rawSection2),
  String(hazards.length),
  hazards.length === rawSection2,
)
assert(
  'b2. parseWide count === 90 (BUILD_NOTES; SPEC 3.3 "749 rows" is the whole tab, not Section 2)',
  '90',
  String(hazards.length),
  hazards.length === 90,
)
info(
  'wide rows that carry BOTH a Section-2 event and an MCATT staff cell (blocks are side by side)',
  wideData.filter((r) => (raw(r, 35) !== '' || raw(r, 36) !== '') && (raw(r, 64) !== '' || raw(r, 65) !== '')).length,
)
// The col-35/36 rule is a MEMBERSHIP test, so it can silently DROP data: a wide row carrying a
// month/year/link/severity/reporting/hazard-flag value (cols 33-34, 37-46) but no province and no
// headline would never reach Section 2. Col 32 (zone) is excluded from this test — it is filled
// down the whole human-hazard block and is non-empty on rows that hold no Section-2 event.
{
  const dropped = wideData
    .map((r, i) => ({ i, r }))
    .filter(({ r }) => raw(r, 35) === '' && raw(r, 36) === '')
    .map(({ i, r }) => ({
      row: i + 1,
      cells: [33, 34, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]
        .filter((c) => raw(r, c) !== '')
        .map((c) => `${c}=${JSON.stringify(raw(r, c))}`),
    }))
    .filter((x) => x.cells.length > 0)
  assert(
    'b3. the col-35/36 membership rule drops NO row that carries other Section-2 content (cols 33-34, 37-46)',
    '[]',
    JSON.stringify(dropped.slice(0, 5)),
    dropped.length === 0,
  )
}
// The Section-1 and Section-2 blocks sit SIDE BY SIDE in the same physical rows, so both parsers
// read the same row objects and a single wrong column index would cross-contaminate one section
// with the other's data. On this fixture all 73 shared rows carry a DIFFERENT จังหวัด in each
// block, which makes province the perfect tracer: if either parser ever read the other's column,
// the two independent province tallies below would diverge.
{
  const both = wideData.filter((r) => (raw(r, 3) !== '' || raw(r, 4) !== '') && (raw(r, 35) !== '' || raw(r, 36) !== ''))
  const differing = both.filter((r) => normProvince(raw(r, 3)) !== normProvince(raw(r, 35)))
  assert(
    'b4. 73 wide rows carry BOTH blocks side by side, and all 73 name a different จังหวัด in each — usable as a cross-read tracer',
    '73 shared rows, 73 with differing จังหวัด',
    `${both.length} shared rows, ${differing.length} with differing จังหวัด`,
    both.length === 73 && differing.length === 73,
  )
  const tally = (rows: string[][], col: number): [string, number][] => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const p = normProvince(raw(r, col))
      if (p === '') continue
      m.set(p, (m.get(p) ?? 0) + 1)
    }
    return [...m.entries()].sort()
  }
  const slTally = provinceCounts(events).filter((c) => c.value > 0).map((c) => [c.name, c.value] as [string, number]).sort()
  const hzTally = provinceCounts(hazards).filter((c) => c.value > 0).map((c) => [c.name, c.value] as [string, number]).sort()
  eq('b5. Section-1 province tally comes from col 3 ONLY (no leak from the Section-2 col 35)', tally(s1Data, 3), slTally)
  eq(
    'b6. Section-2 province tally comes from col 35 ONLY (no leak from the Section-1 col 3)',
    tally(wideData.filter((r) => raw(r, 35) !== '' || raw(r, 36) !== ''), 35),
    hzTally,
  )
}

// ---------------------------------------------------------------------------- c

section('c. parseMcatt (SPEC 3.4)')
const mcattZones = new Set(people.map((p) => p.zone))
eq('c1. distinct zones', 13, mcattZones.size)
eq('c2. people', 67, people.length)
eq('c3. with MCATT', 48, people.filter((p) => p.mcatt).length)
eq('c4. with SMI-V', 20, people.filter((p) => p.smiv).length)
info('zones present', [...mcattZones].sort((a, b) => a - b))
info(
  'people per zone',
  [...mcattZones]
    .sort((a, b) => a - b)
    .map((z) => `${z}:${people.filter((p) => p.zone === z).length}`)
    .join(' '),
)
info('sample person', people[0])

// Independent recompute straight off the CSV (no src/ code).
{
  const isT = (v: string | undefined): boolean => {
    const t = (v ?? '').trim()
    return t !== '' && t !== '-' && t !== '0' && t.toLowerCase() !== 'false' && t !== 'ไม่มีข้อมูล' && t !== 'ไม่มี'
  }
  let cur: number | null = null
  let n = 0
  let mc = 0
  let smi = 0
  const zones = new Set<number>()
  for (const r of wideData) {
    const zc = raw(r, 64)
    if (zc !== '') {
      const m = zc.match(/\d+/)
      if (m) cur = parseInt(m[0], 10)
    }
    const nameCell = raw(r, 65)
    if (nameCell === '' || nameCell === '-' || nameCell === 'ไม่มีข้อมูล') continue
    if (cur === null) continue
    const names = nameCell.split('\n').map((s) => s.trim()).filter((s) => s !== '')
    n += names.length
    zones.add(cur)
    if (isT(r[70])) mc += names.length
    if (isT(r[71])) smi += names.length
  }
  assert(
    'c5. independent raw recompute of people/MCATT/SMI-V/zones agrees with parseMcatt',
    `${n}/${mc}/${smi}/${zones.size}`,
    `${people.length}/${people.filter((p) => p.mcatt).length}/${people.filter((p) => p.smiv).length}/${mcattZones.size}`,
    n === people.length &&
      mc === people.filter((p) => p.mcatt).length &&
      smi === people.filter((p) => p.smiv).length &&
      zones.size === mcattZones.size,
  )
}

// Adversarial: numbering must be stripped, and no header text may leak into a name.
const badNames = people.filter((p) => /^\s*[0-9]/.test(p.name) || p.name.includes('ชื่อ - นามสกุล') || p.name === '')
assert('c6. no person name still carries list numbering or header text', '[]', JSON.stringify(badNames.map((p) => p.name)), badNames.length === 0)
const phonelessPeople = people.filter((p) => p.phone === '')
info('people with an empty phone', phonelessPeople.length)
const badPhones = people.filter((p) => p.phone !== '' && !/\d/.test(p.phone))
assert('c7. every non-empty phone contains a digit', '[]', JSON.stringify(badPhones.map((p) => `${p.name}:${p.phone}`)), badPhones.length === 0)
// A cell that holds ONLY its list-numbering token ('5', '4.', '4.5') has no real value; after
// stripListNumbering it must not survive as junk shown on the MCATT card (SPEC 3.5/6.5 render
// Line ID / Line name "when present").
const junkRe = /^[0-9]{1,2}$/
const junkLine = people.filter((p) => junkRe.test(p.lineId) || junkRe.test(p.lineName))
assert(
  'c8. no person carries a numbering-token-only ID Line / ชื่อไลน์ value',
  '[]',
  JSON.stringify(junkLine.map((p) => `${p.name} lineId=${JSON.stringify(p.lineId)} lineName=${JSON.stringify(p.lineName)}`)),
  junkLine.length === 0,
)
info('stripListNumbering("5")', JSON.stringify(stripListNumbering('5')))
info('stripListNumbering("4.5")', JSON.stringify(stripListNumbering('4.5')))
info('stripListNumbering("5นางสาวชนาพร ฉิมมะลี")', JSON.stringify(stripListNumbering('5นางสาวชนาพร ฉิมมะลี')))
info('stripListNumbering("ุ6. นางสาวพิมพ์ทิชา")', JSON.stringify(stripListNumbering('ุ6. นางสาวพิมพ์ทิชา')))

// ---------------------------------------------------------------------------- d

section('d. latestDataMonth / earliestDataMonth / coverageWindow (SPEC 3.5, UX-02)')
const latest = latestDataMonth(events)
info('now (system)', new Date().toISOString().slice(0, 10))
eq('d. latestDataMonth(wide tab)', 'กันยายน 2569', latest)
eq('d1b. earliestDataMonth(wide tab)', 'ตุลาคม 2568', earliestDataMonth(events))
const monthYearTally = new Map<string, number>()
for (const e of events) monthYearTally.set(`${e.month}/${e.year}`, (monthYearTally.get(`${e.month}/${e.year}`) ?? 0) + 1)
info('month/year tally (month/BE-year)', [...monthYearTally.entries()].sort())
// Not hardcoded: rolling `now` back must roll the answer back too (BUILD_NOTES "Do NOT hardcode").
const latestBack = latestDataMonth(events, new Date(2025, 11, 15))
assert(
  "d2. latestDataMonth is computed, not hardcoded (now=ธ.ค. 2568 -> 'ธันวาคม 2568')",
  'ธันวาคม 2568',
  latestBack,
  latestBack === 'ธันวาคม 2568',
)
// d3 CHANGED MEANING with the fixture. The legacy narrow tab carried 2 future-dated ธ.ค. 2569
// rows; the refreshed wide tab has NONE, so the old "the bad rows are suppressed" assertion has
// no data to bite on here. Assert the clean state, then prove the suppression rule still WORKS
// with a synthetic row — otherwise this check would silently become vacuous on clean data.
assert(
  'd3. the refreshed wide tab carries NO future-dated Section-1 row (the legacy tab had 2)',
  '0',
  String(futureDatedRows(events).length),
  futureDatedRows(events).length === 0,
)
{
  // ม.ค. 2570 BE = Jan 2027 CE, unambiguously in the future relative to any run of this gate that
  // the fixture is valid for. It must NOT be reported as the latest data month.
  // `now` is PINNED to the day the fixture was captured. Both functions compare against the system
  // clock, so leaving it at the default would make d3b/d3c start failing in Jan 2027 for a reason
  // that has nothing to do with the code — the same clock-dependence trap the pre-refresh gate
  // warned about. A fixed fixture deserves a fixed clock.
  const FIXTURE_NOW = new Date(2026, 8, 12) // 2026-09-12 CE = ก.ย. 2569 BE
  const withFuture = [...events, { month: 1, year: 2570, sortKey: 2570 * 12 + 1, monthLabel: 'ม.ค. 70' }]
  const stillLatest = latestDataMonth(withFuture, FIXTURE_NOW)
  assert(
    'd3b. a synthetic future-dated row (ม.ค. 2570) is still excluded from latestDataMonth',
    'กันยายน 2569',
    stillLatest,
    stillLatest === 'กันยายน 2569',
  )
  assert(
    'd3c. ...and futureDatedRows() does find it',
    '1',
    String(futureDatedRows(withFuture, FIXTURE_NOW).length),
    futureDatedRows(withFuture, FIXTURE_NOW).length === 1,
  )
}
const coverage = coverageWindow(events)
info('coverageWindow', coverage)
eq('d4. coverage window labels', ['ตุลาคม 2568', 'กันยายน 2569'], [coverage?.firstLabel, coverage?.lastLabel])
eq('d5. coverage window spans 12 contiguous months', 12, coverage ? coverage.lastKey - coverage.firstKey + 1 : -1)
{
  const oop = outOfPeriodRows(events, coverage)
  assert(
    'd6. no Section-1 row falls outside the validated coverage window (the legacy tab had 2 before + 2 after)',
    'before 0 / after 0',
    `before ${oop.before.length} / after ${oop.after.length}`,
    oop.before.length === 0 && oop.after.length === 0,
  )
}

// ---------------------------------------------------------------------------- e

section('e. age (SPEC 3.2) + age bands (SPEC 4.3)')
const nonNumericAge = events.filter((e) => e.age === null).length
const exactSpelling = events.filter((e) => e.ageRaw === 'ไม่ระบุ').length
const rawNonNumericAge = s1Data.filter((r) => !/^\d+$/.test(raw(r, 10))).length
const ageSpellings = [...new Set(events.filter((e) => e.age === null).map((e) => e.ageRaw))].map((s) => (s === '' ? '(blank)' : s)).sort()
info('ageRaw spellings that are not a number', JSON.stringify(ageSpellings))
info("rows whose ageRaw is exactly 'ไม่ระบุ'", exactSpelling)
info('raw-CSV count of rows whose col-10 is not ^\\d+$', rawNonNumericAge)
// BUILD_NOTES' "Age not specified is spelled three ways" typo class SURVIVED the restructure: the
// refreshed tab still carries 'ไม่่ระบุ' (doubled tone mark), 'ไม่รบุ' and a blank cell alongside
// the canonical 'ไม่ระบุ'. The rule must be "band = ไม่ระบุอายุ whenever the age is not a number",
// never an equality test on the canonical spelling — e0 fails loudly the moment someone narrows it.
eq(
  'e0. the non-numeric age spellings are exactly the 4 BUILD_NOTES documents (canonical + 2 typos + blank)',
  ['(blank)', 'ไม่รบุ', 'ไม่ระบุ', 'ไม่่ระบุ'].sort(),
  ageSpellings,
)
assert(
  "e0b. an equality test on 'ไม่ระบุ' would UNDERCOUNT — the robust rule must catch strictly more rows",
  `more than ${exactSpelling}`,
  String(nonNumericAge),
  nonNumericAge > exactSpelling,
)
assert('e1. exactly 60 rows have a non-numeric age', '60', String(nonNumericAge), nonNumericAge === 60)
assert("e1b. exactly 47 rows spell it 'ไม่ระบุ'", '47', String(exactSpelling), exactSpelling === 47)
assert(
  'e1c. parseAge agrees with a raw ^\\d+$ test on col 10',
  String(rawNonNumericAge),
  String(nonNumericAge),
  rawNonNumericAge === nonNumericAge,
)
const bands = ageBandByGender(events)
const bandSum = bands.reduce((s, b) => s + b.total, 0)
info('bands', bands)
assert('e2. ageBandByGender bands SUM to 580 (SPEC 4.3)', '580', String(bandSum), bandSum === 580)
const unknownBand = bands.find((b) => b.band === 'ไม่ระบุอายุ')
assert(
  'e3. ไม่ระบุอายุ band total === non-numeric age rows',
  String(nonNumericAge),
  String(unknownBand?.total),
  unknownBand?.total === nonNumericAge,
)
const bandGenderSum = bands.reduce((s, b) => s + b.male + b.female, 0)
assert('e4. male+female over all bands === 580 (no third gender value)', '580', String(bandGenderSum), bandGenderSum === 580)
eq('e5. six bands, in SPEC 4.3 order', ['ต่ำกว่า 18', '18–25', '26–45', '46–60', 'มากกว่า 60', 'ไม่ระบุอายุ'], bands.map((b) => b.band))
// No numeric age may fall through to the ไม่ระบุอายุ band (band boundaries must not have a gap).
const ages = events.map((e) => e.age).filter((a): a is number => a !== null)
const gap = ages.filter((a) => !(a < 18 || (a >= 18 && a <= 25) || (a >= 26 && a <= 45) || (a >= 46 && a <= 60) || a > 60))
assert('e6. no numeric age falls between two bands', '[]', JSON.stringify(gap), gap.length === 0)
eq('e7. band totals, independently recomputed off raw col 10', [26, 53, 303, 115, 23, 60], bands.map((b) => b.total))
{
  // Independent recompute of the six bands straight off col 10, sharing nothing with AGE_BANDS.
  const n = (r: string[]) => (/^\d+$/.test(raw(r, 10)) ? parseInt(raw(r, 10), 10) : null)
  const rawBands = [
    s1Data.filter((r) => { const a = n(r); return a !== null && a < 18 }).length,
    s1Data.filter((r) => { const a = n(r); return a !== null && a >= 18 && a <= 25 }).length,
    s1Data.filter((r) => { const a = n(r); return a !== null && a >= 26 && a <= 45 }).length,
    s1Data.filter((r) => { const a = n(r); return a !== null && a >= 46 && a <= 60 }).length,
    s1Data.filter((r) => { const a = n(r); return a !== null && a > 60 }).length,
    s1Data.filter((r) => n(r) === null).length,
  ]
  eq('e7b. raw band tally === ageBandByGender totals', rawBands, bands.map((b) => b.total))
}

// ---------------------------------------------------------------------------- f

section('f. ประวัติการรักษาจิตเวช (col 15)')
const treatment = countBy(events, (r) => r.treatmentHistory, CATEGORY_ORDERS.treatmentHistory)
info('treatment counts', treatment)
const treatmentFixed = treatment.slice(0, CATEGORY_ORDERS.treatmentHistory.length)
const treatmentExtras = treatment.slice(CATEGORY_ORDERS.treatmentHistory.length)
eq('f1. the 6 fixed categories come first, in SPEC order', CATEGORY_ORDERS.treatmentHistory, treatmentFixed.map((cc) => cc.name))
eq('f2. their counts (refreshed fixture)', [210, 77, 73, 178, 31, 9], treatmentFixed.map((cc) => cc.value))
// SOURCE-DATA DEFECT, not a code defect: one row has a ประเภทผู้ป่วย value ('ผู้ป่วยรายเก่า')
// typed into the ประวัติการรักษา column. SPEC 4.5 says an unlisted value is APPENDED, never
// dropped, so the code is right to surface it — f3 pins the extras to exactly that one known
// stray, and fails loudly if a second one appears.
eq('f3. exactly one appended extra, the known col-15 stray', [{ name: 'ผู้ป่วยรายเก่า', value: 1 }], treatmentExtras)
if (treatmentExtras.length > 0) {
  warn(
    `f3. [SOURCE-DATA — owner must fix the SHEET] col 15 (ประวัติการรักษาจิตเวช) holds ${JSON.stringify(
      treatmentExtras,
    )}, which is a ประเภทผู้ป่วย (col 14) value in the wrong column. countBy() appends it per SPEC 4.5 rather than dropping it, so the chart grows a 7th bar.`,
  )
}
const treatmentSum = treatment.reduce((s, cc) => s + cc.value, 0)
const rawTreatmentBlank = s1Data.filter((r) => raw(r, 15) === '' || raw(r, 15) === '-').length
assert(
  'f4. treatment counts sum === 580 minus the blank col-15 cells (no row silently lost)',
  String(580 - rawTreatmentBlank),
  `${treatmentSum} (${rawTreatmentBlank} blank col-15 cell(s))`,
  treatmentSum === 580 - rawTreatmentBlank,
)
{
  const rawTally = new Map<string, number>()
  for (const r of s1Data) rawTally.set(raw(r, 15), (rawTally.get(raw(r, 15)) ?? 0) + 1)
  const rawFixed = CATEGORY_ORDERS.treatmentHistory.map((l) => rawTally.get(l) ?? 0)
  eq('f5. independent raw col-15 tally === the 6 fixed counts', rawFixed, treatmentFixed.map((cc) => cc.value))
}

// ---------------------------------------------------------------------------- g

section('g. ZONE_PROVINCES vs src/assets/thailand.json')
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'assets', 'thailand.json'), 'utf8')) as {
  features: { properties: { name: string } }[]
}
const flat = Object.keys(ZONE_PROVINCES)
  .map(Number)
  .sort((a, b) => a - b)
  .flatMap((z) => ZONE_PROVINCES[z])
const distinct = new Set(flat)
eq('g1. ZONE_PROVINCES flattens to 77 entries', 77, flat.length)
eq('g2. ...and 77 DISTINCT names', 77, distinct.size)
eq('g3. ALL_PROVINCES.length', 77, ALL_PROVINCES.length)
assert(
  'g4. นครพนม is in zone 8 (BUILD_NOTES data bug fix)',
  'true',
  String(ZONE_PROVINCES[8].includes('นครพนม')),
  ZONE_PROVINCES[8].includes('นครพนม'),
)
const geoNames = geo.features.map((f) => f.properties.name)
const geoSet = new Set(geoNames)
eq('g5. thailand.json feature count', 77, geo.features.length)
const missingInGeo = [...distinct].filter((n) => !geoSet.has(n))
const missingInZones = geoNames.filter((n) => !distinct.has(n))
assert('g6. every ZONE_PROVINCES name matches a properties.name', '[]', JSON.stringify(missingInGeo), missingInGeo.length === 0)
assert('g7. every properties.name appears in ZONE_PROVINCES', '[]', JSON.stringify(missingInZones), missingInZones.length === 0)
// INDEPENDENT SOURCE: the wide tab's own MCATT zone header cells (col 64) carry the official
// zone -> province lists. Diff ZONE_PROVINCES against the sheet itself, not against zones.json.
{
  const fromSheet = new Map<number, string[]>()
  for (const r of wideData) {
    const zc = raw(r, 64)
    if (zc === '') continue
    const parts = zc.split('\n').map((s) => s.trim()).filter((s) => s !== '')
    const num = parts[0].match(/\d+/)
    if (!num) continue
    fromSheet.set(
      parseInt(num[0], 10),
      parts.slice(1).flatMap((p) => p.split(/\s+/)).filter((p) => p !== ''),
    )
  }
  info('zone -> province lists read out of wide col 64', [...fromSheet.entries()].map(([z, ps]) => `${z}:${ps.length}`).join(' '))
  const diffs: string[] = []
  for (const [z, ps] of fromSheet) {
    const mine = [...(ZONE_PROVINCES[z] ?? [])].sort()
    const theirs = [...ps].sort()
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) diffs.push(`zone ${z}: config ${JSON.stringify(mine)} vs sheet ${JSON.stringify(theirs)}`)
  }
  assert(
    "g8. ZONE_PROVINCES === the sheet's own zone lists (wide col 64), incl. นครพนม in zone 8",
    '[]',
    JSON.stringify(diffs),
    diffs.length === 0 && fromSheet.size === 13,
  )
  const sheetTotal = [...fromSheet.values()].reduce((s, ps) => s + ps.length, 0)
  assert('g9. the sheet lists 77 provinces across the 13 zones', '77', String(sheetTotal), sheetTotal === 77)
}
// normProvince must be a no-op on every canonical name (the doubled-combining-mark collapse and
// the จ./จังหวัด strip must not corrupt a legitimate province).
{
  const changed = ALL_PROVINCES.filter((n) => normProvince(n) !== n)
  assert('g10. normProvince() is idempotent on all 77 canonical names', '[]', JSON.stringify(changed), changed.length === 0)
}

// ---------------------------------------------------------------------------- h

section('h. severityCounts')
const sev1 = severityCounts(events)
info('Section 1 severityCounts', sev1)
assert(
  'h1. Section 1 black+red+yellow === total (no unknown-severity row)',
  '580',
  `${sev1.black}+${sev1.red}+${sev1.yellow}=${sev1.black + sev1.red + sev1.yellow} (total ${sev1.total})`,
  sev1.black + sev1.red + sev1.yellow === sev1.total && sev1.total === 580,
)
// CHANGED vs the legacy fixture: SPEC 3.2 / BUILD_NOTES said "no black rows yet in Section 1".
// The refreshed tab has ONE. The old `black === 0` assertion would now fail for the wrong reason.
eq('h2. Section 1 black === 1 (the refreshed tab has one; the legacy tab had none)', 1, sev1.black)
eq('h3. Section 1 red === 5', 5, sev1.red)
eq('h4. Section 1 yellow === 574', 574, sev1.yellow)
{
  const rawSev = new Map<string, number>()
  for (const r of s1Data) rawSev.set(raw(r, 7), (rawSev.get(raw(r, 7)) ?? 0) + 1)
  info('raw col-7 severity spellings', JSON.stringify([...rawSev.entries()]))
  eq(
    'h4b. independent raw col-7 tally === severityCounts (black/red/yellow)',
    [rawSev.get('สีดำ') ?? 0, rawSev.get('สีแดง') ?? 0, rawSev.get('สีเหลือง') ?? 0],
    [sev1.black, sev1.red, sev1.yellow],
  )
}
const sev2 = severityCounts(hazards)
info('Section 2 severityCounts', sev2)
assert(
  "h5. Section 2 red === 16 — proves severityOf() survives the 'สีีแดง' typo (BUILD_NOTES)",
  '16',
  String(sev2.red),
  sev2.red === 16,
)
eq('h6. Section 2 black === 27', 27, sev2.black)
eq('h7. Section 2 yellow === 47', 47, sev2.yellow)
assert(
  'h8. Section 2 black+red+yellow === total 90',
  '90',
  `${sev2.black + sev2.red + sev2.yellow} (total ${sev2.total})`,
  sev2.black + sev2.red + sev2.yellow === 90 && sev2.total === 90,
)
info('severityOf("สีีแดง") (doubled สระอี as it appears in the wide tab)', severityOf('สีีแดง'))
info('severityOf("") / severityOf("-")', `${severityOf('')} / ${severityOf('-')}`)
assert('h9. black is supported by the enum', 'black', severityOf('สีดำ'), severityOf('สีดำ') === 'black')

// ---------------------------------------------------------------------------- i

section('i. psychiatric 3-group pie (SPEC 3.2 / 6.1 widget 8)')
const pie = psychiatricDiagnosisCounts(events)
info('psychiatricDiagnosisCounts(events)', pie)
const psychLabels = CATEGORY_ORDERS.diagnosis.map(collapseWs)
const nonPsych = pie.filter((cc) => !psychLabels.includes(collapseWs(cc.name)))
assert(
  'i1. the pie contains ONLY the 3 SPEC 3.2 psychiatric values',
  '3 categories',
  `${pie.length} categories; non-psychiatric extras: ${JSON.stringify(nonPsych)}`,
  pie.length === 3 && nonPsych.length === 0,
)
const pieSum = pie.reduce((s, cc) => s + cc.value, 0)
// 170 (89+64+17) was the LEGACY tab's total. The refreshed tab reads 230 (88+26+116); what the
// SPEC fixes is the SHAPE (3 slices), not the total.
assert('i2. pie total === 230 (88+26+116 on the refreshed tab)', '230', String(pieSum), pieSum === 230)
eq('i2b. the 3 slice values, in CATEGORY_ORDERS.diagnosis order', [88, 26, 116], pie.map((cc) => cc.value))
const psychOnly = pie.filter((cc) => psychLabels.includes(collapseWs(cc.name)))
info('the 3 psychiatric rows themselves (all matched, incl. the double-space value)', psychOnly)
assert(
  'i3. each of the 3 psychiatric labels resolved a non-zero count (double-space match works)',
  'all > 0',
  JSON.stringify(psychOnly.map((cc) => cc.value)),
  psychOnly.length === 3 && psychOnly.every((cc) => cc.value > 0),
)
// The 4 excluded values must be exactly the non-psychiatric ones named in SPEC 3.2 — nothing else
// may silently vanish from col 12.
{
  const rawTally = new Map<string, number>()
  for (const r of s1Data) {
    const v = raw(r, 12)
    if (v === '' || v === '-') continue
    rawTally.set(v, (rawTally.get(v) ?? 0) + 1)
  }
  const excluded = [...rawTally.entries()].filter(([v]) => !psychLabels.includes(collapseWs(v)))
  info('col-12 values excluded from the pie (must be the 4 SPEC 3.2 non-psychiatric ones)', excluded)
  const expectedExcluded = ['ไม่พบประวัติ', 'มีประวัติใช้สารเสพติด', 'ผู้ป่วย SMI-V', 'ข้อมูลไม่เพียงพอต่อการตรวจสอบ']
  const names = excluded.map(([v]) => v).sort()
  assert(
    'i4. exactly the 4 SPEC 3.2 non-psychiatric values are excluded, no other value is lost',
    JSON.stringify([...expectedExcluded].sort()),
    JSON.stringify(names),
    JSON.stringify(names) === JSON.stringify([...expectedExcluded].sort()),
  )
  const rawPsychSum = [...rawTally.entries()].filter(([v]) => psychLabels.includes(collapseWs(v))).reduce((s, [, n]) => s + n, 0)
  assert('i5. independent raw sum of the 3 psychiatric values === pie total', String(rawPsychSum), String(pieSum), rawPsychSum === pieSum)
}

// ---------------------------------------------------------------------------- j

section('j. countBy on ผู้ป่วยจิตเวช/อื่นๆ (col 13, 5 groups)')
const groups = countBy(events, (r) => r.patientGroup, CATEGORY_ORDERS.patientGroup)
info('patientGroup counts', groups)
eq('j1. exactly 5 groups (no extras appended)', 5, groups.length)
eq('j2. the 5 group names match SPEC 3.2', CATEGORY_ORDERS.patientGroup, groups.map((g) => g.name))
const groupSum = groups.reduce((s, cc) => s + cc.value, 0)
assert('j3. group counts sum === 580', '580', String(groupSum), groupSum === 580)
{
  const rawTally = new Map<string, number>()
  for (const r of s1Data) rawTally.set(raw(r, 13), (rawTally.get(raw(r, 13)) ?? 0) + 1)
  const rawPairs = CATEGORY_ORDERS.patientGroup.map((l) => rawTally.get(l) ?? 0)
  eq('j4. independent raw col-13 counts match countBy', rawPairs, groups.map((g) => g.value))
  eq('j5. and those counts are [144,137,228,44,27]', [144, 137, 228, 44, 27], rawPairs)
}

// ---------------------------------------------------------------------------- k

section('k. computeTimeliness (SPEC 6.4)')
const t1 = computeTimeliness(events)
info('Section 1 timeliness', t1)
const twoDecimals = (n: number | null): boolean => n !== null && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9
assert('k1. percent in [0,100]', '0 <= p <= 100', String(t1.percent), t1.percent !== null && t1.percent >= 0 && t1.percent <= 100)
assert('k2. percent has at most 2 decimals', 'true', String(twoDecimals(t1.percent)), twoDecimals(t1.percent))
const levels = TIMELINESS_LEVELS.map((l) => l.level)
assert('k3. level is one of the SPEC 6.4 table levels', JSON.stringify(levels), t1.level, levels.includes(t1.level))
eq('k4. pass', 571, t1.pass)
eq('k5. total', 580, t1.total)
eq('k6. percent === 98.45', 98.45, t1.percent)
eq("k7. level === '0.5' (>= 90.00 -> emerald / Laugh)", '0.5', t1.level)
eq('k8. icon', 'Laugh', t1.icon)
const t2 = computeTimeliness(hazards)
info('Section 2 timeliness', t2)
eq('k9. Section 2 percent === 100 (90/90)', 100, t2.percent)
const tAll = computeTimeliness([...events, ...hazards])
info('combined timeliness (what the zone tab shows)', tAll)
assert(
  'k10. combined pass/total === 661/670 and percent === 98.66',
  '661/670 -> 98.66',
  `${tAll.pass}/${tAll.total} -> ${tAll.percent}`,
  tAll.pass === 661 && tAll.total === 670 && tAll.percent === 98.66,
)
{
  const rawPass = s1Data.filter((r) => raw(r, 8) === 'ตามเกณฑ์').length
  const rawTotal = s1Data.filter((r) => raw(r, 8) !== '' && raw(r, 8) !== '-' && raw(r, 8) !== 'ไม่มีข้อมูล').length
  assert('k11. independent raw pass/total off col 8', `${rawPass}/${rawTotal}`, `${t1.pass}/${t1.total}`, rawPass === t1.pass && rawTotal === t1.total)
}
// The whole SPEC 6.4 level table must be reachable, not just the 0.5 row the live data lands on.
{
  const probe = (percent: number): string => {
    const n = Math.round(percent)
    const rows = Array.from({ length: 100 }, (_, i) => ({ reporting: i < n ? 'ตามเกณฑ์' : 'ไม่ตามเกณฑ์' }))
    return computeTimeliness(rows).level
  }
  const table = [95, 87, 82, 77, 72, 50].map(probe)
  eq('k12. SPEC 6.4 thresholds map 95/87/82/77/72/50 -> 0.5/0.4/0.3/0.2/0.1/0.0', ['0.5', '0.4', '0.3', '0.2', '0.1', '0.0'], table)
  const empty = computeTimeliness([])
  assert(
    "k13. total = 0 -> percent null, level 'ไม่มีข้อมูล' (SPEC 6.4)",
    'null / ไม่มีข้อมูล',
    `${empty.percent} / ${empty.level}`,
    empty.percent === null && empty.level === 'ไม่มีข้อมูล',
  )
  const boundary = computeTimeliness(Array.from({ length: 10000 }, (_, i) => ({ reporting: i < 8999 ? 'ตามเกณฑ์' : 'ไม่ตามเกณฑ์' })))
  assert(
    "k14. 89.99% is level 0.4, not 0.5 (boundary is '>= 90.00')",
    '89.99 -> 0.4',
    `${boundary.percent} -> ${boundary.level}`,
    boundary.percent === 89.99 && boundary.level === '0.4',
  )
}

// ---------------------------------------------------------------------------- l

section('l. suicide subset (SPEC 4.6)')
const suicide = suicideSubset(events)
eq('l1. suicideSubset size', 108, suicide.length)
const suicideVals = countBy(suicide, (r) => r.suicide, CATEGORY_ORDERS.suicide)
info('suicide success/fail', suicideVals)
assert(
  'l2. success 89 / fail 19, no extras',
  '[89,19] and 2 categories',
  `${JSON.stringify(suicideVals.map((v) => v.value))} and ${suicideVals.length} categories`,
  suicideVals.length === 2 && suicideVals[0].value === 89 && suicideVals[1].value === 19,
)
const methodInSubset = topN(suicide, (r) => r.suicideMethod, 5)
const causeInSubset = topN(suicide, (r) => r.suicideCause, 5)
const locInSubset = topN(suicide, (r) => r.suicideLocation, 10)
info('method top5 (subset)', methodInSubset)
info('cause top5 (subset)', causeInSubset)
info('location top10 (subset)', locInSubset)
const sumOf = (a: { value: number }[]): number => a.reduce((s, cc) => s + cc.value, 0)
assert(
  'l3. method/cause/location totals inside the subset are all <= 108',
  '<= 108 each',
  `method ${sumOf(countBy(suicide, (r) => r.suicideMethod))}, cause ${sumOf(countBy(suicide, (r) => r.suicideCause))}, location ${sumOf(countBy(suicide, (r) => r.suicideLocation))}`,
  sumOf(countBy(suicide, (r) => r.suicideMethod)) <= 108 &&
    sumOf(countBy(suicide, (r) => r.suicideCause)) <= 108 &&
    sumOf(countBy(suicide, (r) => r.suicideLocation)) <= 108,
)
// The subset restriction is load-bearing: สถานที่ is filled on the NON-suicide rows too.
const outside = events.filter((e) => {
  const t = e.suicide.trim()
  return t === '' || t === '-'
})
const nonBlank = (rows: SLEvent[], pick: (r: SLEvent) => string): number =>
  rows.filter((r) => {
    const t = pick(r).trim()
    return t !== '' && t !== '-'
  }).length
info('rows OUTSIDE the subset with a non-blank วิธีฆ่าตัวตาย', nonBlank(outside, (r) => r.suicideMethod))
info('rows OUTSIDE the subset with a non-blank สาเหตุการฆ่าตัวตาย', nonBlank(outside, (r) => r.suicideCause))
info('rows OUTSIDE the subset with a non-blank สถานที่', nonBlank(outside, (r) => r.suicideLocation))
info('location total over ALL 580 rows (the wrong denominator)', sumOf(countBy(events, (r) => r.suicideLocation)))
assert(
  'l4. counting location over ALL rows differs from the subset -> the subset restriction is load-bearing',
  'subset != all-rows count',
  `subset ${sumOf(countBy(suicide, (r) => r.suicideLocation))} vs all ${sumOf(countBy(events, (r) => r.suicideLocation))}`,
  sumOf(countBy(suicide, (r) => r.suicideLocation)) !== sumOf(countBy(events, (r) => r.suicideLocation)),
)
const rawLoc19 = new Set(s1Data.map((r) => raw(r, 19)).filter((v) => v !== '' && v !== '-'))
info("raw col-19 values containing 'ตลาด'", [...rawLoc19].filter((v) => v.includes('ตลาด')))
const allLocNames = countBy(events, (r) => r.suicideLocation).map((cc) => cc.name)
assert(
  "l5. SPEC 4.6 merge: 'ตลาดร้านค้า' never survives parsing (raw variant IS present in the CSV)",
  `raw CSV has 'ตลาดร้านค้า': ${rawLoc19.has('ตลาดร้านค้า')} -> 0 parsed rows keep it`,
  `parsed location categories containing 'ตลาด': ${JSON.stringify(allLocNames.filter((n) => n.includes('ตลาด')))}`,
  rawLoc19.has('ตลาดร้านค้า') && !allLocNames.includes('ตลาดร้านค้า'),
)
// ------------------------------------------------------------------ l5b (verification gate)
// SPEC 4.6 says the market/shop location is ONE category. The refreshed tab spells it THREE ways
// (`ตลาด / ร้านค้า` 7, `ตลาด/ร้านค้า` 2, `ตลาดร้านค้า` 1) and mergeSuicideLocation() in
// src/data/parseSheet2.ts lists only the first and third, so the spaceless middle spelling stays
// a separate slice. l5 above passes and still misses this — it only checks the ONE variant that
// happens to be listed. Fail on the CATEGORY COUNT instead, which is what SPEC 4.6 actually fixes.
assert(
  'l5b. [src BUG] the market/shop location is ONE parsed category (SPEC 4.6 merge)',
  "1 category containing 'ตลาด'",
  `${JSON.stringify(allLocNames.filter((n) => n.includes('ตลาด')))} — mergeSuicideLocation() (src/data/parseSheet2.ts) merges 'ตลาด / ร้านค้า' and 'ตลาดร้านค้า' but NOT the spaceless 'ตลาด/ร้านค้า' (2 rows), so the pie shows two slices for one place`,
  allLocNames.filter((n) => n.includes('ตลาด')).length === 1,
)
{
  const rawSubset = s1Data.filter((r) => raw(r, 16) !== '' && raw(r, 16) !== '-').length
  assert('l6. independent raw subset size off col 16', String(rawSubset), String(suicide.length), rawSubset === suicide.length)
}

// ---------------------------------------------------------------------------- m

section('m. monthlyTrend (SPEC 4.1 + UX-02 continuous axis)')
const trend = monthlyTrend(events)
info('trend', trend)
const labelOk = trend.every((p) => MONTH_ABBR.some((a) => p.label.startsWith(a + ' ')) && /\s\d{2}$/.test(p.label))
assert(
  "m1. every label looks like 'ต.ค. 68' (abbr + space + 2-digit BE year)",
  'all match',
  labelOk ? 'all match' : JSON.stringify(trend.map((p) => p.label)),
  labelOk,
)
const sortedOk = trend.every((p, i) => i === 0 || p.sortKey > trend[i - 1].sortKey)
assert('m2. sorted ascending by sortKey', 'true', String(sortedOk), sortedOk)
const trendSum = trend.reduce((s, p) => s + (p.value ?? 0), 0)
const blankMonthRows = events.filter((e) => e.sortKey <= 0).length
assert(
  'm3. trend total === 580 minus the rows with no resolvable month/year (by design, documented)',
  `${580 - blankMonthRows}`,
  `${trendSum} (${blankMonthRows} row(s) have a blank เดือน cell -> sortKey 0 -> excluded)`,
  trendSum === 580 - blankMonthRows,
)
// sortKey must be year*12+month and consistent with the label (SPEC 4.1).
{
  const bad = trend.filter((p) => {
    const yy = Number(p.label.slice(-2))
    const abbr = p.label.slice(0, p.label.length - 3)
    const mi = MONTH_ABBR.indexOf(abbr) + 1
    return mi === 0 || p.sortKey !== (2500 + yy) * 12 + mi
  })
  assert('m4. every label decodes back to its sortKey (year*12+month)', '[]', JSON.stringify(bad), bad.length === 0)

  // ------------------------------------------------------------------ m5 (was a KNOWN-BAD check)
  // PRE-EXISTING FAILURE, now fixed properly. The old m5 compared monthlyTrend()'s axis against a
  // SPARSE raw tally (only the months that have rows). Since UX-02 monthlyTrend() emits a
  // CONTINUOUS month sequence — every month between the first and the last, gaps filled — the two
  // shapes could never match and m5 failed by construction, not because anything was wrong.
  // The fix is to build the expectation the same way the CONTRACT says: gap-fill the independent
  // raw tally across first..last. Still fully independent — it reads cols 1/2 of the raw CSV and
  // never touches `trend`, `events` or any src aggregate for its counts.
  const rawBuckets = new Map<number, number>()
  for (const r of s1Data) {
    const m = parseMonth(raw(r, 1))
    const y = parseYear(raw(r, 2))
    if (m === null || y === null) continue
    const k = y * 12 + m
    rawBuckets.set(k, (rawBuckets.get(k) ?? 0) + 1)
  }
  const rawKeys = [...rawBuckets.keys()].sort((a, b) => a - b)
  const rawGapFilled: [number, number][] = []
  for (let k = rawKeys[0]; k <= rawKeys[rawKeys.length - 1]; k++) rawGapFilled.push([k, rawBuckets.get(k) ?? 0])
  eq(
    'm5. buckets and counts match an independent raw month/year tally, GAP-FILLED across the span (UX-02 continuous axis)',
    rawGapFilled,
    trend.map((p) => [p.sortKey, p.value]),
  )
  info(
    'm5 note',
    `the refreshed tab happens to report all ${rawKeys.length} months contiguously (no hole), so m5b below is what actually exercises the gap-filling`,
  )
  info('trend buckets in order', trend.map((p) => `${p.label}=${p.value}`).join(' '))

  // ------------------------------------------------------------------ m5b/m5c (verification gate)
  // m5 above can only prove the gap-fill when the DATA has a gap, and the refreshed fixture has
  // none. Feed monthlyTrend a hand-built row set with a hole so the UX-02 behaviour is tested
  // directly: a hole is a CONFIRMED ZERO by default, and a NULL/missing point when reportedKeys
  // says that month was never reported at all.
  const K = (m: number) => 2569 * 12 + m
  const synth = [
    { sortKey: K(1), monthLabel: 'ม.ค. 69' },
    { sortKey: K(1), monthLabel: 'ม.ค. 69' },
    { sortKey: K(4), monthLabel: 'เม.ย. 69' },
  ]
  eq(
    'm5b. a hole in the data becomes a CONTIGUOUS axis of confirmed zeros (no reportedKeys)',
    [[K(1), 2, false], [K(2), 0, false], [K(3), 0, false], [K(4), 1, false]],
    monthlyTrend(synth).map((p) => [p.sortKey, p.value, p.missing]),
  )
  eq(
    'm5c. a month NOT in reportedKeys is null+missing, not a fabricated 0 (UX-02 fix item 4)',
    [[K(1), 2, false], [K(2), null, true], [K(3), 0, false], [K(4), 1, false]],
    monthlyTrend(synth, { reportedKeys: new Set([K(1), K(3), K(4)]) }).map((p) => [p.sortKey, p.value, p.missing]),
  )
  eq(
    'm5d. fromKey/toKey clip the axis to the coverage window',
    [[K(2), 0, false], [K(3), 0, false]],
    monthlyTrend(synth, { fromKey: K(2), toKey: K(3) }).map((p) => [p.sortKey, p.value, p.missing]),
  )
}
warn(
  `the trend sums to ${trendSum} but the KPI "ทั้งหมด" is ${events.length}; the ${blankMonthRows} blank-month row(s) cannot be placed on a time axis. The UI must not present the trend as a total.`,
)
if (blankMonthRows > 0) {
  warn(
    `[SOURCE-DATA] ${blankMonthRows} Section-1 row(s) have a blank เดือน cell (col 1) while carrying a ปี — they are invisible on every time-based chart. Owner to fill the month in the sheet.`,
  )
}

// ---------------------------------------------------------------------------- n

section('n. hazardTypeCounts + hazardCasualties (SPEC 3.3, deck slide 22)')
const hz = hazardTypeCounts(hazards)
info('hazardTypeCounts', hz)
const expectedHazardOrder = [...HAZARD_TYPES.map((h) => h.label), HAZARD_UNSPECIFIED_LABEL]
eq('n1. covers the 6 SPEC hazard categories + the ไม่ระบุ fallback, in order', expectedHazardOrder, hz.map((cc) => cc.name))
const hzSum = hz.reduce((s, cc) => s + cc.value, 0)
assert(
  'n2. sum of counts >= number of Section-2 rows (a row can carry several flags)',
  `>= ${hazards.length}`,
  String(hzSum),
  hzSum >= hazards.length,
)
eq('n3. per-category counts match BUILD_NOTES (0/5/15/1/57/12 + 0 unspecified)', [0, 5, 15, 1, 57, 12, 0], hz.map((cc) => cc.value))
{
  const isT = (v: string | undefined): boolean => {
    const t = (v ?? '').trim()
    return t !== '' && t !== '-' && t !== '0' && t.toLowerCase() !== 'false' && t !== 'ไม่มีข้อมูล'
  }
  const sec = wideData.filter((r) => raw(r, 35) !== '' || raw(r, 36) !== '')
  const rawFlags = [41, 42, 43, 44, 45, 46].map((i) => sec.filter((r) => isT(r[i])).length)
  eq('n4. independent raw flag counts off cols 41-46', rawFlags, hz.slice(0, 6).map((cc) => cc.value))
  const rawNoFlag = sec.filter((r) => ![41, 42, 43, 44, 45, 46].some((i) => isT(r[i]))).length
  assert('n5. raw rows with no flag === the ไม่ระบุ bucket', String(rawNoFlag), String(hz[6].value), rawNoFlag === hz[6].value)
  // The fallback must still WORK even though no row needs it today (SPEC 3.3).
  const synthetic = parseWide([wideRows[0], (() => {
    const r = new Array<string>(85).fill('')
    r[35] = 'ทดสอบ'
    r[36] = 'หัวข้อทดสอบ'
    return r
  })()])
  eq('n6. a Section-2 row with no flag falls back to ภัยอื่นๆ (ไม่ระบุ)', [HAZARD_UNSPECIFIED_LABEL], synthetic[0]?.hazards)
  info('isTruthyCell on the SPEC 3.3 falsy set', JSON.stringify(['', '-', '0', 'false', 'ไม่มีข้อมูล'].map((v) => `${JSON.stringify(v)}->${isTruthyCell(v)}`)))

  // NEW AGGREGATE (deck slide 22) — Section-2 casualty totals off cols 47/48/50/51.
  const cas = hazardCasualties(hazards)
  info('hazardCasualties', cas)
  eq(
    'n7. hazardCasualties === 16 / 13 / 672 / 151 (BUILD_NOTES), total 852',
    { officerInjured: 16, officerDead: 13, publicInjured: 672, publicDead: 151, total: 852 },
    cas,
  )
  const rawCas = [47, 48, 50, 51].map((i) => sec.reduce((s, r) => s + (/^\d+$/.test(raw(r, i)) ? parseInt(raw(r, i), 10) : 0), 0))
  eq(
    'n8. independent raw sums off cols 47/48/50/51 agree (col 49 is อาชีพ text and must NOT be summed)',
    rawCas,
    [cas.officerInjured, cas.officerDead, cas.publicInjured, cas.publicDead],
  )
  assert(
    'n9. total is the four summed, nothing double-counted',
    String(rawCas.reduce((s, v) => s + v, 0)),
    String(cas.total),
    cas.total === rawCas.reduce((s, v) => s + v, 0),
  )
}

// ---------------------------------------------------------------------------- o: header resolver

section('o. Section-1 header-name resolution on the LIVE 85-column tab')
{
  /**
   * THE TABLE THAT MAKES THIS GATE MEAN SOMETHING. Every Section-1 field the app reads, with the
   * header name the LIVE tab spells it and the column it must land on. Written out here from the
   * fixture's own header row rather than imported from src/ — if parseSheet2's COLUMNS map drifts
   * from the sheet, exactly one of the two changes and o2/o3 catch it.
   *
   * The old version of this table held the 36 LEGACY ชีต2 names at their legacy indexes. Paired
   * with the legacy fixture that made o3 a false green: every legacy name resolved there, while
   * on the tab fetchSheet.ts actually downloads not one of them exists.
   */
  const specNames: [string, number][] = [
    // core Section-1 block, cols 0-26 (every live header carries a ' ภัยน้ำมือมนุษย์' suffix)
    ['เขตสุขภาพที่ ภัยน้ำมือมนุษย์', 0], ['เดือนภัยน้ำมือมนุษย์', 1], ['ปีภัยน้ำมือมนุษย์', 2],
    ['จังหวัดภัยน้ำมือมนุษย์', 3], ['หัวข้อข่าวภัยน้ำมือมนุษย์', 4], ['linkภัยน้ำมือมนุษย์', 5],
    ['ช่องทางAlertข่าวภัยน้ำมือมนุษย์', 6], ['ระดับความรุนแรง ภัยน้ำมือมนุษย์', 7],
    ['รายงานการส่งข่าว ภัยน้ำมือมนุษย์', 8], ['เพศ ภัยน้ำมือมนุษย์', 9], ['อายุ ภัยน้ำมือมนุษย์', 10],
    ['ช่วงอายุวัย ภัยน้ำมือมนุษย์', 11], ['การประเมินกลุ่มผู้ป่วย ภัยน้ำมือมนุษย์', 12],
    ['ผู้ป่วยจิตเวช/อื่นๆ ภัยน้ำมือมนุษย์', 13], ['ประเภทผู้ป่วย ภัยน้ำมือมนุษย์', 14],
    ['ประวัติการรักษาจิตเวช ภัยน้ำมือมนุษย์', 15], ['พยายามฆ่าตัวตาย ภัยน้ำมือมนุษย์', 16],
    ['วิธีฆ่าตัวตาย ภัยน้ำมือมนุษย์', 17], ['สาเหตุการฆ่าตัวตาย ภัยน้ำมือมนุษย์', 18],
    // the live header really does spell สถานที่ with a doubled สระอี — verbatim, it is the key
    ['สถานที่ี่การฆ่าตัวตาย ภัยน้ำมือมนุษย์', 19], ['มีผู้ได้รับผลกระทบ ภัยน้ำมือมนุษย์', 20],
    ['ประเภทผู้ได้รับผลกระทบ ภัยน้ำมือมนุษย์', 21], ['ประชาชนที่ได้รับผลกระทบบาดเจ็บ ภัยน้ำมือมนุษย์', 22],
    ['ประชาชนที่ได้รับผลกระทบเสียชีวิต ภัยน้ำมือมนุษย์', 23], ['ข้อเท็จจริงจากสื่อออนไลน์ ภัยน้ำมือมนุษย์', 24],
    ['ผู้ปฏิบัติงานภัยน้ำมือมนุษย์', 25], ['การช่วยเหลือส่งต่อผู้ป่วย ภัยน้ำมือมนุษย์', 26],
    // ปัจจัยเสี่ยง flag columns, 74-77 (74/75 carry a trailing \r\n in the real header)
    ['ขาดยา/ไม่มาตามนัด', 74], ['กลับมาใช้สารเสพติดซ้ำ', 75], ['มีการใช้สารเสพติดร่วมด้วย', 76], ['อื่น ๆ', 77],
    // สัญญาณเตือน flag columns, 78-82 — COLUMN order, which is NOT the display order
    ['ไม่หลับไม่นอน', 78], ['เดินไปเดินมา', 79], ['พูดจาคนเดียว', 80], ['หงุดหงิดฉุนเฉียว', 81], ['เที่ยวหวาดระแวง', 82],
    // 83 carries the sheet's own typo (missing สระอา), transcribed verbatim; 84 is the new answer
    ['ไม่มีอการทางจิตเวช', 83], ['5สัญญาณเตือน', 84],
  ]
  // collapseWs on BOTH sides: header 21 has a double space, 74/75 end with \r\n, 77/79/80/82/83
  // have trailing spaces. That whitespace tolerance is part of the contract, not a shortcut.
  const trimmed = wideRows[0].map((h) => collapseWs(h ?? ''))
  const byName = new Map<string, number[]>()
  trimmed.forEach((h, i) => {
    if (h === '') return
    const hit = byName.get(h)
    if (hit) hit.push(i)
    else byName.set(h, [i])
  })
  const dupList = [...byName.entries()].filter(([, v]) => v.length > 1)
  // CHANGED: the live tab DOES repeat a header name. '5สัญญาณเตือน' sits at col 29 (the sheet's
  // older, superseded answer) and col 84 (the authoritative one BUILD_NOTES measured), so a
  // blanket "no duplicates" assertion is simply false here. Pin the duplicate set to exactly that
  // one known pair — a SECOND repeated name would still fail, which is the property that matters.
  eq('o1. the only repeated Section-1 header name is the known 5สัญญาณเตือน pair (cols 29 and 84)', [['5สัญญาณเตือน', [29, 84]]], dupList)
  info('empty header cells (block separators)', JSON.stringify(trimmed.map((h, i) => (h === '' ? i : -1)).filter((i) => i >= 0)))

  // Resolution rule under test (SPEC 3.2 + parseSheet2's documented tie-break): resolve by NAME;
  // when several columns share the name, the DECLARED index wins; only then fall back to index.
  const resolve = (name: string, idx: number): number => {
    const hits = byName.get(collapseWs(name))
    if (!hits || hits.length === 0) return idx
    return hits.includes(idx) ? idx : hits[0]
  }
  const mismatches = specNames
    .map(([name, idx]) => ({ name, idx, resolved: resolve(name, idx) }))
    .filter((x) => x.resolved !== x.idx)
  assert(
    'o2. every live Section-1 header name resolves to its declared index (no silent wrong-column read)',
    '[]',
    JSON.stringify(mismatches),
    mismatches.length === 0,
  )
  const notFound = specNames.filter(([name]) => !byName.has(collapseWs(name))).map(([name]) => name)
  assert(
    'o3. every live Section-1 header name is actually PRESENT in the tab the app fetches (no silent index fallback)',
    '[]',
    JSON.stringify(notFound),
    notFound.length === 0,
  )
  // o3b is the teeth behind o3: prove the resolver the APP builds lands on the same 39 columns.
  const res = buildResolver(wideRows[0])
  info('buildResolver(wide header)', res)
  eq(
    'o3b. buildResolver() core indexes match the declared table (nothing resolved to -1 / "absent")',
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 83, 84],
    [
      res.core.zone, res.core.month, res.core.year, res.core.province, res.core.headline, res.core.link,
      res.core.channel, res.core.severity, res.core.reporting, res.core.gender, res.core.age,
      res.core.suicideAgeGroup, res.core.diagnosis, res.core.patientGroup, res.core.patientClass,
      res.core.treatmentHistory, res.core.suicide, res.core.suicideMethod, res.core.suicideCause,
      res.core.suicideLocation, res.core.affected, res.core.affectedType, res.core.injured,
      res.core.deaths, res.core.factReport, res.core.operator, res.core.assistance,
      res.core.noSymptoms, res.core.fiveSignsAnswer,
    ],
  )
  eq('o3c. the 4 risk factors resolve to cols 74-77, one column each', [[74], [75], [76], [77]], res.risk)
  eq('o3d. the 5 warning signs resolve to their own columns in DISPLAY order (81,82,80,78,79 — not 78..82)', [[81], [82], [80], [78], [79]], res.signs)

  // o1b: the concrete consequence of the duplicate-name tie-break. Col 29 answers 332 มี / 244
  // ไม่มี; col 84 answers 355 / 225. If the resolver took the FIRST match instead of the declared
  // index, fiveSignsAnswer would silently carry the superseded column's answer.
  const fiveTally = countBy(events, (r) => r.fiveSignsAnswer)
  info('countBy(fiveSignsAnswer)', fiveTally)
  const col29 = new Map<string, number>()
  const col84 = new Map<string, number>()
  for (const r of s1Data) {
    col29.set(raw(r, 29), (col29.get(raw(r, 29)) ?? 0) + 1)
    col84.set(raw(r, 84), (col84.get(raw(r, 84)) ?? 0) + 1)
  }
  info('raw col-29 tally (superseded)', JSON.stringify([...col29.entries()]))
  info('raw col-84 tally (authoritative)', JSON.stringify([...col84.entries()]))
  assert(
    'o1b. fiveSignsAnswer reads the AUTHORITATIVE col 84 (355 มี / 225 ไม่มี), not the superseded col 29 (332 / 244)',
    'มี 355 / ไม่มี 225',
    `มี ${fiveTally.find((c) => c.name === 'มี')?.value} / ไม่มี ${fiveTally.find((c) => c.name === 'ไม่มี')?.value}`,
    fiveTally.find((c) => c.name === 'มี')?.value === 355 && fiveTally.find((c) => c.name === 'ไม่มี')?.value === 225,
  )
  {
    const disagree = s1Data.filter((r) => collapseDoubledMarks(raw(r, 29)) !== raw(r, 84)).length
    warn(
      `[SOURCE-DATA] the two '5สัญญาณเตือน' columns disagree on ${disagree} of ${s1Data.length} rows (col 29: ${JSON.stringify(
        [...col29.entries()],
      )}; col 84: ${JSON.stringify([...col84.entries()])}). The app takes col 84. The owner should delete col 29 from the sheet.`,
    )
  }

  // o4 FLIPPED with the fixture. On the legacy narrow tab col 1 (เดือน) had a BLANK header, which
  // is why parseSheet2 marks `month` silentFallback. The live tab NAMES it, so on production data
  // no Section-1 field needs an index fallback at all. The blank-header path is exercised in
  // section r against the legacy fixture, where it still applies.
  eq('o4. the live tab NAMES the month column (the legacy narrow tab left it blank)', 'เดือนภัยน้ำมือมนุษย์', trimmed[1])
  // Parse robustness: a reordered header must still resolve by NAME, not by position.
  {
    const swapped = wideRows.map((r) => {
      const copy = [...r]
      const a = copy[7]
      copy[7] = copy[9]
      copy[9] = a
      return copy
    })
    const swappedEvents = parseSheet2(swapped)
    const sc = severityCounts(swappedEvents)
    assert(
      'o5. swapping two columns (7<->9) still yields the same severity counts -> resolution is by header name, not position',
      `${sev1.yellow}/${sev1.red}/${sev1.black}`,
      `${sc.yellow}/${sc.red}/${sc.black}`,
      sc.yellow === sev1.yellow && sc.red === sev1.red && sc.black === sev1.black,
    )
  }
}

// ---------------------------------------------------------------------------- p: normalisers

section('p. normalisers (SPEC 4.1/4.2)')
eq('p1. parseMonth full/abbr/short/numeric', [11, 11, 11, 11, null], ['พฤศจิกายน', 'พ.ย.', 'พฤศจิกา', '11', ''].map(parseMonth))
eq('p2. parseYear 4-digit BE / 2-digit / CE', [2569, 2569, 2569, null], ['2569', '69', '2026', '-'].map(parseYear))
eq('p3. parseAge integer / typo spellings / blank', [45, null, null, null, null], ['45', 'ไม่ระบุ', 'ไม่่ระบุ', 'ไม่รบุ', ''].map(parseAge))
eq(
  'p4. normProvince strips จ./จังหวัด and applies SPEC 4.2 aliases',
  ['เชียงใหม่', 'เชียงใหม่', 'กรุงเทพมหานคร', 'นครราชสีมา', 'พระนครศรีอยุธยา', 'หนองบัวลำภู'],
  ['จ.เชียงใหม่', 'จังหวัดเชียงใหม่', 'กทม', 'โคราช', 'อยุธยา', 'หนองบัวลำพู'].map(normProvince),
)
{
  // The typo spellings live in wide col 3; check they map to the province their own zone cell implies.
  const rawProvinces = [...new Set(s1Data.map((r) => raw(r, 3)))].filter((v) => v !== '' && !ALL_PROVINCES.includes(v))
  info('raw col-3 spellings that are not already a canonical province name', JSON.stringify(rawProvinces))
  const typoRows = s1Data.filter((r) => rawProvinces.includes(raw(r, 3)))
  info('typo province rows (zone -> raw -> normalised)', typoRows.map((r) => `${raw(r, 0)} ${raw(r, 3)} -> ${normProvince(raw(r, 3))}`))
  const wrongZone = typoRows.filter((r) => {
    const z = parseInt((raw(r, 0).match(/\d+/) || ['0'])[0], 10)
    return !(ZONE_PROVINCES[z] ?? []).includes(normProvince(raw(r, 3)))
  })
  assert(
    'p5. every typo-aliased province lands in the zone its own เขตสุขภาพ cell names',
    '[]',
    JSON.stringify(wrongZone.map((r) => `${raw(r, 0)}/${raw(r, 3)}`)),
    wrongZone.length === 0,
  )
  assert(
    'p6. every non-canonical col-3 spelling is repaired by normProvince (none left unresolved)',
    '[]',
    JSON.stringify(rawProvinces.filter((v) => !ALL_PROVINCES.includes(normProvince(v)))),
    rawProvinces.every((v) => ALL_PROVINCES.includes(normProvince(v))),
  )
}
eq(
  'p7. collapseDoubledMarks heals the observed doubled-mark typo class',
  ['ขอนแก่น', 'หญิง', 'ไม่มี', 'ต่ำกว่า 18 ปี'],
  ['ขอนแก่่น', 'หญิิง', 'ไม่่มี', 'ต่ำ่กว่า 18 ปี'].map(collapseDoubledMarks),
)

// ---------------------------------------------------------------------------- q: papaparse parity

section('q. papaparse option parity with src/data/fetchSheet.ts (skipEmptyLines: true)')
{
  const wideSkip = readCsv('842224166.csv', true)
  const e2 = parseSheet2(wideSkip)
  const h2 = parseWide(wideSkip)
  const m2 = parseMcatt(wideSkip)
  assert(
    'q1. parseSheet2/parseWide/parseMcatt give identical counts with and without skipEmptyLines',
    `${events.length}/${hazards.length}/${people.length}`,
    `${e2.length}/${h2.length}/${m2.length}`,
    e2.length === events.length && h2.length === hazards.length && m2.length === people.length,
  )
}

// ---------------------------------------------------------------------------- r: degraded sources

section('r. fallback / legacy schemas — the DOCUMENTED degradation must actually happen')
{
  // src/config/sheet.ts and docs/BUILD_NOTES.md both state that GID_WIDE_FALLBACK is NO LONGER a
  // duplicate: it still serves the pre-restructure 84-column layout. A fallback fetch must
  // therefore DEGRADE in a known, loggable way — never silently read a neighbouring column.
  // Number() keeps tsc from narrowing these to literal types and calling the comparison unintentional.
  eq('r1. GID_WIDE_FALLBACK is a different gid from GID_WIDE', true, Number(GID_WIDE_FALLBACK) !== Number(GID_WIDE))
  eq('r2. the fallback fixture still has the OLD 84-column schema', 84, fallbackRows[0].length)
  const fbRes = buildResolver(fallbackRows[0])
  eq(
    "r3. on the old schema 'ขาดยา'+'ไม่มาตามนัด' (74, 76) OR into ONE factor, and the deck's new 4th factor has NO column at all",
    [[74, 76], [75], [], [77]],
    fbRes.risk,
  )
  const fbEvents = parseSheet2(fallbackRows)
  const fbRisk = riskFactors(fbEvents)
  assert(
    'r4. มีการใช้สารเสพติดร่วมด้วย counts 0 on a fallback fetch — it must NOT borrow col 76 (which the old schema calls ไม่มาตามนัด)',
    '0',
    String(fbRisk.items[2].value),
    fbRisk.items[2].value === 0,
  )
  const fbStatus = patientStatusCounts(fbEvents)
  info('fallback patientStatusCounts', fbStatus)
  assert(
    "r5. on the old 2-value col 14 the majority 'ผู้ป่วยรายเก่า' is APPENDED verbatim (340), never retagged as ผู้ป่วยจิตเวชรายเก่า",
    'appended extra ผู้ป่วยรายเก่า=340, ผู้ป่วยจิตเวชรายเก่า=0',
    JSON.stringify(fbStatus.map((c) => `${c.name}=${c.value}`)),
    fbStatus[0].value === 0 && fbStatus.length === 6 && fbStatus[5].name === 'ผู้ป่วยรายเก่า' && fbStatus[5].value === 340,
  )
  assert(
    'r6. ...so the risk denominator collapses to the 240 aliased ผู้ป่วยรายใหม่ rows (a visibly degraded, not silently wrong, number)',
    '240',
    String(fbRisk.denominator),
    fbRisk.denominator === 240,
  )
  warn(
    'r4-r6 describe a DEGRADED render, not a correct one. If fetchAllData() ever falls back, the ปัจจัยเสี่ยง chart is wrong in a way only the console.warn reveals. Fix the primary gid, do not rely on the fallback.',
  )

  // The legacy narrow ชีต2 tab (37 cols) is the layout the LEGACY ALIASES in parseSheet2's COLUMNS
  // map exist for, and the only one where col 1 really has a blank header — i.e. the only place
  // the documented `silentFallback` index path is exercised. Keep it under test so the aliases
  // cannot rot unnoticed, even though the app no longer fetches this tab.
  eq('r7. the legacy narrow tab has 37 columns', 37, legacyRows[0].length)
  eq('r8. ...and really does leave the เดือน header blank (this is what silentFallback is for)', '', collapseWs(legacyRows[0][1] ?? ''))
  const legacyEvents = parseSheet2(legacyRows)
  assert('r9. the legacy aliases still parse it to 440 events', '440', String(legacyEvents.length), legacyEvents.length === 440)
  const legacySev = severityCounts(legacyEvents)
  eq('r10. ...with the legacy tab\'s own severity tally (0 black / 4 red / 436 yellow)', [0, 4, 436], [legacySev.black, legacySev.red, legacySev.yellow])
}

// ---------------------------------------------------------------------------- extra adversarial

section('EXTRA. province normalisation coverage')
const pc1 = provinceCounts(events)
const extras1 = pc1.slice(ALL_PROVINCES.length)
info('Section 1 province extras (values normProvince did NOT canonicalise)', extras1)
info(
  'นครพนม after normalisation',
  `นครพนม=${pc1.find((cc) => cc.name === 'นครพนม')?.value} (the 'นตรพนม' typo rows are aliased in)`,
)
assert('x1. every Section-1 province normalises to one of the 77 known names', '[]', JSON.stringify(extras1), extras1.length === 0)
const pc1Sum = pc1.reduce((s, cc) => s + cc.value, 0)
assert('x2. province counts sum === 580 (no row silently lost)', '580', String(pc1Sum), pc1Sum === 580)
const pc2 = provinceCounts(hazards)
const extras2 = pc2.slice(ALL_PROVINCES.length)
info('Section 2 province extras', extras2)
assert('x3. every wide-tab Section-2 province normalises to a known name', '[]', JSON.stringify(extras2), extras2.length === 0)
const pc2Sum = pc2.reduce((s, cc) => s + cc.value, 0)
assert('x4. Section 2 province counts sum === 90', '90', String(pc2Sum), pc2Sum === 90)

section('EXTRA. zoneCounts')
const zc = zoneCounts(events)
info('zoneCounts', zc.map((cc) => `${cc.name}=${cc.value}`).join(' '))
eq('x5. 13 zone buckets, none appended', 13, zc.length)
const zcSum = zc.reduce((s, cc) => s + cc.value, 0)
assert('x6. zone counts sum === 580', '580', String(zcSum), zcSum === 580)
// LABEL CHANGE: zoneCounts() now spells the unit out (review deck slide 10) — 'เขตสุขภาพที่ 8',
// not the clipped 'เขต 8'. x6b pins the label to config's own formatZoneLabel() so the two cannot
// drift; x7 then reads the bucket by that label.
eq('x6b. bucket labels are formatZoneLabel(n) === "เขตสุขภาพที่ N"', Array.from({ length: 13 }, (_, i) => formatZoneLabel(i + 1)), zc.map((cc) => cc.name))
eq('x7. เขตสุขภาพที่ 8 === 114 (the largest zone on the refreshed tab)', 114, zc.find((cc) => cc.name === 'เขตสุขภาพที่ 8')?.value)
const zc2 = zoneCounts(hazards)
info('Section 2 zoneCounts', zc2.map((cc) => `${cc.name}=${cc.value}`).join(' '))
assert(
  'x8. Section 2 zone buckets 2 and 11 are present at 0 (empty zones handled)',
  '0 and 0',
  `${zc2.find((cc) => cc.name === 'เขตสุขภาพที่ 2')?.value} and ${zc2.find((cc) => cc.name === 'เขตสุขภาพที่ 11')?.value}`,
  zc2.find((cc) => cc.name === 'เขตสุขภาพที่ 2')?.value === 0 && zc2.find((cc) => cc.name === 'เขตสุขภาพที่ 11')?.value === 0,
)
{
  const mism = events.filter((e) => e.zone !== null && e.province !== '' && !(ZONE_PROVINCES[e.zone] ?? []).includes(e.province))
  const where = mism.map((e) => {
    const i = s1Data.findIndex((r) => raw(r, 5) === e.link && raw(r, 4) === e.headline)
    return `Section-1 data row ${i + 1}: เขต ${e.zone} / ${e.province} (${e.province} belongs to zone ${Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(e.province))}) — ${e.headline.slice(0, 40)}`
  })
  // x8b is a SOURCE-DATA condition: it can only be cleared by editing the Google Sheet, never by
  // code, because SPEC 4.2 (ratified in BUILD_NOTES) makes the เขตสุขภาพ cell authoritative.
  if (mism.length === 0) {
    info("x8b. every Section-1 row's เขตสุขภาพ agrees with its จังหวัด (source data clean)", 'OK')
  } else {
    warn(`x8b. [SOURCE-DATA — owner must fix the SHEET] ${mism.length} row(s) have a เขตสุขภาพ cell that disagrees with their จังหวัด. Per SPEC 4.2 the app counts them under the CELL's zone: ${JSON.stringify(where)}`)
  }
  // ------------------------------------------------------------------ x8c (verification gate)
  // x8b above cannot fail whenever zoneOf() derives the zone FROM the province — it would be a
  // tautology. x8c is the independent half: SPEC 4.2 says "Zone number parsed from digits in the
  // zone cell", so the app's 13 tallies must equal a raw tally of col 0 EXACTLY, including the
  // rows whose zone cell disagrees with their province. (This assertion previously reported a
  // real DEVIATION — zoneOf() derived the zone from the province; normalize.ts now reads the cell
  // first, so it stands as a regression guard against that deviation coming back.)
  const fromCell = new Map<number, number>()
  for (const r of s1Data) {
    const m = raw(r, 0).match(/\d+/)
    if (!m) continue
    const z = parseInt(m[0], 10)
    fromCell.set(z, (fromCell.get(z) ?? 0) + 1)
  }
  const cellTally = Array.from({ length: 13 }, (_, i) => `${i + 1}:${fromCell.get(i + 1) ?? 0}`).join(' ')
  // NOTE the strip: the bucket label is 'เขตสุขภาพที่ N' now, not 'เขต N'. Stripping the old
  // prefix would leave 'สุขภาพที่ 8' and make this comparison fail for a purely cosmetic reason.
  const derivedTally = zc.map((cc) => `${cc.name.replace('เขตสุขภาพที่ ', '')}:${cc.value}`).join(' ')
  const movedRows = s1Data
    .map((r, i) => ({ row: i + 1, cell: raw(r, 0), prov: normProvince(raw(r, 3)) }))
    .filter(({ cell: zcell, prov }) => {
      const m = zcell.match(/\d+/)
      if (!m || prov === '') return false
      const declared = parseInt(m[0], 10)
      const derived = Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(prov))
      return derived !== undefined && derived !== declared
    })
  assert(
    'x8c. [SPEC 4.2 regression guard] zoneOf() takes the zone from the row\'s เขตสุขภาพ cell, never from the province',
    `zone tallies identical to the raw เขตสุขภาพ column: ${cellTally}`,
    `app tallies: ${derivedTally}${derivedTally === cellTally ? ' (identical — zoneOf() honours the zone cell)' : ' — MISMATCH: zoneOf() is overriding the sheet.'}`,
    derivedTally === cellTally,
  )
  if (movedRows.length > 0) {
    warn(
      `[SOURCE-DATA] ${movedRows.length} Section-1 row(s) have a เขตสุขภาพ cell that contradicts their จังหวัด; SPEC 4.2 keeps them under the CELL's zone: ${JSON.stringify(
        movedRows.map((r) => `row ${r.row} (CSV line ${r.row + 1}): cell ${r.cell} -> ${r.prov} = zone ${Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(r.prov))}`),
      )}`,
    )
  }
}

// ---------------------------------------------------------------------------- risk / signs

section('EXTRA. risk factors / warning signs (deck slides 13-14, FLAG columns)')

/**
 * INDEPENDENT re-implementation of the ประเภทผู้ป่วย normalisation, written from the deck /
 * BUILD_NOTES rules rather than by calling normPatientStatus(): strip the literal quote wrapper,
 * collapse whitespace (including around the '/'), alias the single surviving legacy spelling.
 * Everything in this section derives its denominator from THIS, not from the app.
 */
const indepStatus = (v: string): string => {
  let t = v.trim().replace(/\s+/g, ' ')
  if (t === '' || t === '-') return ''
  t = t.replace(/^"+/, '').replace(/"+$/, '').trim()
  t = t.replace(/\s*\/\s*/g, '/')
  if (t === 'ผู้ป่วยรายใหม่') return 'ผู้ป่วยจิตเวชรายใหม่'
  return t
}
const FOUR_STATUSES = ['ผู้ป่วยจิตเวชรายเก่า', 'ผู้ป่วยจิตเวชรายใหม่', 'ผู้ใช้สารเสพติดรายเก่า', 'ผู้ใช้สารเสพติดรายใหม่']
/** A flag column is "set" iff its own cell is non-blank — the whole point of the 2026-09-12 refresh. */
const flagSet = (r: string[], col: number): boolean => {
  const v = raw(r, col)
  return v !== '' && v !== '-'
}
const RISK_COLS = [74, 75, 76, 77]
/** DISPLAY order (SIGN_KEYWORDS order), which is deliberately NOT the column order 78..82. */
const SIGN_COLS_IN_DISPLAY_ORDER = [81, 82, 80, 78, 79]

const rf = riskFactors(events)
info('riskFactors', rf)
eq('x9. risk-factor denominator === 417 (the 4 psychiatric/substance ประเภทผู้ป่วย statuses, ไม่ใช่ฯ excluded)', 417, rf.denominator)
eq('x9a. the denominator statuses are the first 4 of CATEGORY_ORDERS.patientStatus5', FOUR_STATUSES, RISK_DENOMINATOR_STATUSES)
assert('x10. risk affected <= denominator', `<= ${rf.denominator}`, String(rf.affected), rf.affected <= rf.denominator)
eq('x10b. risk affected === 413 (99.0% of the denominator carry >= 1 factor)', 413, rf.affected)
eq('x10c. the 4 factor labels, in deck slide-13 order', RISK_KEYWORDS.map((k) => k.label), rf.items.map((i) => i.name))

const ws = warningSigns(events)
info('warningSigns', ws)
eq('x11. warning-sign denominator === 580 (ALL events — deck slide 14)', 580, ws.denominator)
assert('x12. sign affected <= denominator', '<= 580', String(ws.affected), ws.affected <= ws.denominator)
eq('x12b. sign affected === 350 (60.3% of all rows carry >= 1 sign)', 350, ws.affected)
eq('x12c. the 5 sign labels, in SIGN_KEYWORDS display order', SIGN_KEYWORDS.map((k) => k.label), ws.items.map((i) => i.name))

// INDEPENDENT recompute of the whole deck slide-13/14 calculation, straight off the raw flag
// columns. This shares NOTHING with riskFactors()/warningSigns(): its own status normaliser, its
// own denominator, its own column list, its own flag test.
{
  const denomRows = s1Data.filter((r) => FOUR_STATUSES.includes(indepStatus(raw(r, 14))))
  eq('x9c. independent raw denominator off col 14 === 417', 417, denomRows.length)
  const riskRaw = RISK_COLS.map((c) => denomRows.filter((r) => flagSet(r, c)).length)
  eq('x9b. independent raw recompute of the 4 risk factors off cols 74-77', riskRaw, rf.items.map((i) => i.value))
  eq('x9d. ...and those values are [236, 213, 105, 31] (BUILD_NOTES)', [236, 213, 105, 31], riskRaw)
  const riskAffected = denomRows.filter((r) => RISK_COLS.some((c) => flagSet(r, c))).length
  eq('x9e. independent raw "at least one factor" count === 413', riskAffected, rf.affected)

  // The denominator rule is load-bearing ONLY if scoping actually changes something. Prove that
  // the excluded ไม่ใช่ฯ rows really are excluded, and that no risk flag is being thrown away.
  const riskAll = RISK_COLS.map((c) => s1Data.filter((r) => flagSet(r, c)).length)
  info('the same flag counts over ALL 580 rows (the wrong denominator)', JSON.stringify(riskAll))
  eq(
    'x9f. no risk flag sits on an excluded ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด row (scoping drops rows, never flags)',
    riskAll,
    riskRaw,
  )
  const excludedRows = s1Data.length - denomRows.length
  assert(
    'x9g. the denominator rule really excludes the 163 ไม่ใช่ฯ rows (580 - 417)',
    '163',
    String(excludedRows),
    excludedRows === 163,
  )

  const signRaw = SIGN_COLS_IN_DISPLAY_ORDER.map((c) => s1Data.filter((r) => flagSet(r, c)).length)
  eq('x11b. independent raw recompute of the 5 warning signs off cols 78-82, in display order', signRaw, ws.items.map((i) => i.value))
  eq('x11e. ...and those values are [231, 147, 146, 165, 108] (BUILD_NOTES)', [231, 147, 146, 165, 108], signRaw)
  const signAffected = s1Data.filter((r) => SIGN_COLS_IN_DISPLAY_ORDER.some((c) => flagSet(r, c))).length
  eq('x11f. independent raw "at least one sign" count === 350', signAffected, ws.affected)
  // The display-order mapping is the subtle part: SIGN_KEYWORDS[i] must own COLUMN
  // SIGN_COLS_IN_DISPLAY_ORDER[i]. Reading 78..82 in column order instead would shuffle every bar.
  eq(
    'x11g. reading the sign columns in COLUMN order (78..82) gives a DIFFERENT vector — the display-order mapping is load-bearing',
    false,
    JSON.stringify([78, 79, 80, 81, 82].map((c) => s1Data.filter((r) => flagSet(r, c)).length)) === JSON.stringify(signRaw),
  )

  // ------------------------------------------------------------------ x11c (verification gate)
  // The redesign's core assumption is that cols 74-82 are CLEAN SINGLE-VALUE flag columns (the old
  // free-text keyword scan is gone). If any of them ever carries a second value, a flag test on
  // "non-blank" silently counts something else. Pin each column to exactly one non-blank value,
  // equal to its own header.
  const impure: string[] = []
  for (const c of [...RISK_COLS, 78, 79, 80, 81, 82, 83]) {
    const vals = [...new Set(s1Data.map((r) => raw(r, c)).filter((v) => v !== ''))]
    const header = collapseWs(wideRows[0][c] ?? '')
    if (vals.length !== 1 || vals[0] !== header) impure.push(`col ${c} (header ${JSON.stringify(header)}): ${JSON.stringify(vals)}`)
  }
  assert(
    'x11c. every flag column (74-77, 78-82, 83) holds exactly ONE non-blank value, equal to its own header',
    '[]',
    JSON.stringify(impure),
    impure.length === 0,
  )
  info(
    'flag column fill counts 74-83',
    JSON.stringify([...RISK_COLS, 78, 79, 80, 81, 82, 83].map((c) => `${c}:${s1Data.filter((r) => flagSet(r, c)).length}`)),
  )

  // ------------------------------------------------------------------ x11d: the sheet's own answer
  // Col 84 ('5สัญญาณเตือน' มี/ไม่มี) and col 83 ('ไม่มีอการทางจิตเวช') are the sheet's OWN answers
  // to the same question the 78-82 flags encode. They are an independent editorial cross-check,
  // so a disagreement is a SOURCE-DATA finding, not a code defect — reported, not failed.
  const answerVsFlags = events.filter((e) => (e.fiveSignsAnswer === 'มี') !== e.signFlags.some(Boolean)).length
  const neither = s1Data.filter((r) => !SIGN_COLS_IN_DISPLAY_ORDER.some((c) => flagSet(r, c)) && !flagSet(r, 83)).length
  const both = s1Data.filter((r) => SIGN_COLS_IN_DISPLAY_ORDER.some((c) => flagSet(r, c)) && flagSet(r, 83)).length
  info("col-84 'มี' count vs flag-derived affected", `${s1Data.filter((r) => raw(r, 84) === 'มี').length} vs ${ws.affected}`)
  assert(
    'x11d. the app reproduces the FLAG-derived answer (350), not the sheet\'s col-84 answer (355) — the two are different questions',
    '350 from flags',
    `${ws.affected} from flags, ${s1Data.filter((r) => raw(r, 84) === 'มี').length} from col 84`,
    ws.affected === 350,
  )
  warn(
    `[SOURCE-DATA] the sheet's own 5สัญญาณเตือน answer (col 84) disagrees with its own 78-82 flag columns on ${answerVsFlags} row(s); ${neither} row(s) carry neither a sign flag nor the 'ไม่มีอการทางจิตเวช' flag (col 83), and ${both} row(s) carry BOTH. The charts follow the flag columns. Owner to reconcile the sheet.`,
  )
}

// ---------------------------------------------------------------------------- gender / impact

section('EXTRA. gender / impact')
const gs = genderSplit(events)
info('genderSplit', gs)
eq('x13. genderSplit', { male: 520, female: 60, other: 0, total: 580 }, gs)
{
  // normGender() must fold the single 'หญิิง' (doubled สระอิ) row into หญิง — otherwise it lands
  // in `other` and the gender donut quietly grows a third slice.
  const rawGender = new Map<string, number>()
  for (const r of s1Data) rawGender.set(raw(r, 9), (rawGender.get(raw(r, 9)) ?? 0) + 1)
  info('raw col-9 spellings', JSON.stringify([...rawGender.entries()]))
  const rawMale = rawGender.get('ชาย') ?? 0
  const rawFemaleExact = rawGender.get('หญิง') ?? 0
  const rawFemaleAll = [...rawGender.entries()].filter(([k]) => collapseDoubledMarks(k) === 'หญิง').reduce((s, [, n]) => s + n, 0)
  assert(
    'x13b. the doubled-mark หญิิง row is folded into หญิง (an exact-match count would be 1 short)',
    `${rawMale}/${rawFemaleAll} (exact-หญิง would be ${rawFemaleExact})`,
    `${gs.male}/${gs.female}`,
    gs.male === rawMale && gs.female === rawFemaleAll && rawFemaleAll > rawFemaleExact,
  )
}
const impact = impactByPatientGroup(events)
info('impactByPatientGroup', impact)
const impactFinite = impact.every((r) => Number.isFinite(r.deaths) && Number.isFinite(r.injured))
assert("x14. every deaths/injured is finite ('-' and blank parse to 0, never NaN)", 'true', String(impactFinite), impactFinite)
eq('x15. impactByPatientGroup has the 5 fixed groups, no extras', 5, impact.length)
const rawDeaths = s1Data.reduce((s, r) => s + (/^\d+$/.test(raw(r, 23)) ? parseInt(raw(r, 23), 10) : 0), 0)
const rawInjured = s1Data.reduce((s, r) => s + (/^\d+$/.test(raw(r, 22)) ? parseInt(raw(r, 22), 10) : 0), 0)
{
  const gotDeaths = impact.reduce((s, r) => s + r.deaths, 0)
  const gotInjured = impact.reduce((s, r) => s + r.injured, 0)
  assert(
    'x16. deaths/injured totals match the raw column sums (nothing dropped by the group split)',
    `${rawDeaths}/${rawInjured}`,
    `${gotDeaths}/${gotInjured}`,
    rawDeaths === gotDeaths && rawInjured === gotInjured,
  )
  eq('x16b. ...and those raw sums are 150 deaths / 227 injured', [150, 227], [rawDeaths, rawInjured])
}

// ---------------------------------------------------------------------------- NEW deck aggregates

section('EXTRA. new deck aggregates (patientStatus / group7 / ageBand / suicideAgeGroup)')

const status5 = patientStatusCounts(events)
info('patientStatusCounts', status5)
eq('x24. the 5 statuses, in CATEGORY_ORDERS.patientStatus5 order, no extras', CATEGORY_ORDERS.patientStatus5, status5.map((c) => c.name))
eq('x24b. counts === [269, 8, 67, 73, 163] (BUILD_NOTES: 7 จิตเวชรายใหม่ + 1 aliased legacy row)', [269, 8, 67, 73, 163], status5.map((c) => c.value))
assert('x24c. they sum to 580 — every Section-1 row has a status', '580', String(status5.reduce((s, c) => s + c.value, 0)), status5.reduce((s, c) => s + c.value, 0) === 580)
{
  // Independent recompute with the gate's OWN normaliser (indepStatus), not normPatientStatus().
  const tally = new Map<string, number>()
  for (const r of s1Data) tally.set(indepStatus(raw(r, 14)), (tally.get(indepStatus(raw(r, 14))) ?? 0) + 1)
  info('independent raw col-14 tally', JSON.stringify([...tally.entries()]))
  eq('x24d. independent raw col-14 tally matches patientStatusCounts', CATEGORY_ORDERS.patientStatus5.map((l) => tally.get(l) ?? 0), status5.map((c) => c.value))
  const rawExact = s1Data.filter((r) => raw(r, 14) === 'ผู้ป่วยจิตเวชรายใหม่').length
  const rawLegacy = s1Data.filter((r) => raw(r, 14) === 'ผู้ป่วยรายใหม่').length
  assert(
    'x24e. the 8 ผู้ป่วยจิตเวชรายใหม่ are 7 exact + 1 aliased legacy ผู้ป่วยรายใหม่ row (a documented judgement call, not data)',
    '7 + 1',
    `${rawExact} + ${rawLegacy}`,
    rawExact === 7 && rawLegacy === 1,
  )
  const quoted = s1Data.filter((r) => raw(r, 14).startsWith('"')).length
  assert(
    'x24f. the 163 ไม่ใช่ฯ rows arrive quote-wrapped and are unwrapped into ONE slice, not a look-alike 6th',
    '163 quote-wrapped, 0 extras appended',
    `${quoted} quote-wrapped, ${status5.length - 5} extras`,
    quoted === 163 && status5.length === 5,
  )
}

const g7 = patientGroup7Counts(events)
info('patientGroup7Counts', g7)
eq('x25. the deck\'s 7 short group labels, in order, no extras', CATEGORY_ORDERS.patientGroup7, g7.map((c) => c.name))
eq('x25b. counts === [88, 26, 116, 43, 140, 26, 141]', [88, 26, 116, 43, 140, 26, 141], g7.map((c) => c.value))
assert('x25c. they sum to 580', '580', String(g7.reduce((s, c) => s + c.value, 0)), g7.reduce((s, c) => s + c.value, 0) === 580)
{
  // Independent recompute: "text before the first ' ('", applied straight to raw col 12. No alias
  // table, so this also proves PATIENT_GROUP7_ALIASES agrees with the plain structural rule.
  const shortOf = (v: string): string => {
    const t = v.trim().replace(/\s+/g, ' ')
    const i = t.indexOf(' (')
    return i > 0 ? t.slice(0, i).trim() : t
  }
  const tally = new Map<string, number>()
  for (const r of s1Data) {
    const k = shortOf(raw(r, 12))
    if (k === '' || k === '-') continue
    tally.set(k, (tally.get(k) ?? 0) + 1)
  }
  info('independent raw col-12 short-label tally', JSON.stringify([...tally.entries()]))
  eq('x25d. independent raw col-12 tally matches patientGroup7Counts', CATEGORY_ORDERS.patientGroup7.map((l) => tally.get(l) ?? 0), g7.map((c) => c.value))
  const unknown = [...tally.keys()].filter((k) => !CATEGORY_ORDERS.patientGroup7.includes(k))
  assert('x25e. no col-12 value falls outside the 7 groups', '[]', JSON.stringify(unknown), unknown.length === 0)
  // The 3-slice pie and the 7-group chart read the SAME column and must not contradict each other.
  eq(
    'x25f. the 3 psychiatric slices of the pie === the first 3 groups of the 7-group chart',
    pie.map((c) => c.value),
    g7.slice(0, 3).map((c) => c.value),
  )
}

const i7 = impactByGroup7(events)
info('impactByGroup7', i7)
eq('x26. the 7 deck groups, in order, no extras', CATEGORY_ORDERS.patientGroup7, i7.map((r) => r.group))
assert(
  'x26b. its deaths/injured totals equal the raw col-22/23 sums (nothing lost by the 7-way split)',
  `${rawDeaths}/${rawInjured}`,
  `${i7.reduce((s, r) => s + r.deaths, 0)}/${i7.reduce((s, r) => s + r.injured, 0)}`,
  i7.reduce((s, r) => s + r.deaths, 0) === rawDeaths && i7.reduce((s, r) => s + r.injured, 0) === rawInjured,
)
eq(
  'x26c. ...and so do impactByPatientGroup\'s — two different splits of the same two columns must agree on the total',
  [impact.reduce((s, r) => s + r.deaths, 0), impact.reduce((s, r) => s + r.injured, 0)],
  [i7.reduce((s, r) => s + r.deaths, 0), i7.reduce((s, r) => s + r.injured, 0)],
)
eq('x26d. per-group deaths === [31, 4, 27, 11, 25, 3, 49]', [31, 4, 27, 11, 25, 3, 49], i7.map((r) => r.deaths))
eq('x26e. per-group injured === [41, 12, 38, 15, 50, 7, 64]', [41, 12, 38, 15, 50, 7, 64], i7.map((r) => r.injured))

const abc = ageBandCounts(events)
info('ageBandCounts', abc)
eq('x27. the 6 SPEC 4.3 bands, in order', AGE_BANDS.map((b) => b.label), abc.map((c) => c.name))
eq('x27b. ageBandCounts values === ageBandByGender totals (the two views cannot disagree)', bands.map((b) => b.total), abc.map((c) => c.value))
assert('x27c. they sum to 580', '580', String(abc.reduce((s, c) => s + c.value, 0)), abc.reduce((s, c) => s + c.value, 0) === 580)

{
  const sag = countBy(events, (r) => r.suicideAgeGroup, CATEGORY_ORDERS.suicideAgeGroup)
  info('ช่วงอายุวัย (col 11) counts', sag)
  eq('x28. the 2 fixed ช่วงอายุวัย values, no extras', CATEGORY_ORDERS.suicideAgeGroup, sag.map((c) => c.name))
  eq('x28b. counts === [27, 553]', [27, 553], sag.map((c) => c.value))
  // normSuicideAgeGroup() does two repairs; both must be load-bearing, or the under-18 bar empties.
  const rawUnder18Exact = s1Data.filter((r) => raw(r, 11) === 'ต่ำกว่า 18 ปี').length
  const rawUnder18NoUnit = s1Data.filter((r) => raw(r, 11) === 'ต่ำกว่า 18').length
  const rawUnder18Typo = s1Data.filter((r) => raw(r, 11) === 'ต่ำ่กว่า 18 ปี').length
  info('raw col-11 under-18 spellings', `'ต่ำกว่า 18 ปี'=${rawUnder18Exact} 'ต่ำกว่า 18'=${rawUnder18NoUnit} 'ต่ำ่กว่า 18 ปี'=${rawUnder18Typo}`)
  assert(
    "x28c. the deck's 'ต่ำกว่า 18 ปี' bar is built ENTIRELY from rows the sheet spells differently (0 exact matches) — an unnormalised countBy would show 0",
    '0 exact, 26 without ปี, 1 doubled-mark typo',
    `${rawUnder18Exact} exact, ${rawUnder18NoUnit} without ปี, ${rawUnder18Typo} typo`,
    rawUnder18Exact === 0 && rawUnder18NoUnit + rawUnder18Typo === 27,
  )
}

// ---------------------------------------------------------------------------- typo-class sweep

section('EXTRA. doubled-combining-mark typo sweep across every categorical column')
{
  // normalize.ts heals the doubled-mark typo class (BUILD_NOTES) for province, gender,
  // ช่วงอายุวัย and ประเภทผู้ป่วย. Any OTHER categorical column where two parsed categories
  // collapse to the same string under collapseDoubledMarks is the SAME defect left unhealed: the
  // chart renders two look-alike slices for one value. Sweep them all rather than guessing.
  const fields: [string, (e: SLEvent) => string][] = [
    ['province', (e) => e.province],
    ['gender', (e) => e.gender],
    ['patientStatus', (e) => e.patientStatus],
    ['patientGroup', (e) => e.patientGroup],
    ['diagnosis', (e) => e.diagnosis],
    ['treatmentHistory', (e) => e.treatmentHistory],
    ['suicide', (e) => e.suicide],
    ['suicideMethod', (e) => e.suicideMethod],
    ['suicideCause', (e) => e.suicideCause],
    ['suicideLocation', (e) => e.suicideLocation],
    ['suicideAgeGroup', (e) => e.suicideAgeGroup],
    ['assistance', (e) => e.assistance],
    ['reporting', (e) => e.reporting],
  ]
  const collisions: string[] = []
  for (const [name, pick] of fields) {
    const cats = countBy(events, pick)
    const byHealed = new Map<string, { name: string; value: number }[]>()
    for (const c of cats) {
      const key = collapseDoubledMarks(collapseWs(c.name))
      byHealed.set(key, [...(byHealed.get(key) ?? []), c])
    }
    for (const [key, group] of byHealed) {
      if (group.length > 1) collisions.push(`${name}: ${JSON.stringify(group)} all collapse to ${JSON.stringify(key)}`)
    }
  }
  assert(
    'x29. [src BUG when non-empty] no categorical column splits one value into two look-alike categories that differ only by a doubled Thai combining mark',
    '[]',
    JSON.stringify(collisions),
    collisions.length === 0,
  )
  if (collisions.length > 0) {
    warn(
      'x29. normalize.ts already heals this exact typo class for province / gender / ช่วงอายุวัย / ประเภทผู้ป่วย (collapseDoubledMarks). The column(s) listed above are NOT passed through it in src/data/parseSheet2.ts, so their chart shows two slices for one value. Fix is in src/, not in the sheet.',
    )
  }
}

// ---------------------------------------------------------------------------- applyFilters

section('EXTRA. applyFilters (SPEC 5.2) — Buddhist-year contract')
{
  const base: Filters = { fromMonth: '', toMonth: '', zone: 'all', province: '', hazardType: 'all' }
  const all = applyFilters(events, hazards, base)
  assert('x17. no filter -> everything passes through', '580/90', `${all.sl.length}/${all.hz.length}`, all.sl.length === 580 && all.hz.length === 90)
  const social = applyFilters(events, hazards, { ...base, hazardType: 'social' })
  assert('x18. ประเภทภัย = Social Listening hides Section 2', '580/0', `${social.sl.length}/${social.hz.length}`, social.sl.length === 580 && social.hz.length === 0)
  const hazAll = applyFilters(events, hazards, { ...base, hazardType: 'hazards' })
  assert('x19. ภัยอื่นๆ (รวม) hides Section 1', '0/90', `${hazAll.sl.length}/${hazAll.hz.length}`, hazAll.sl.length === 0 && hazAll.hz.length === 90)
  const transport = applyFilters(events, hazards, { ...base, hazardType: 'transport' })
  assert('x20. a single hazard key restricts Section 2 to that flag (transport = 57)', '0/57', `${transport.sl.length}/${transport.hz.length}`, transport.sl.length === 0 && transport.hz.length === 57)
  const zone8 = applyFilters(events, hazards, { ...base, zone: 8 })
  assert('x21. zone filter 8 -> 114 Section-1 rows (agrees with zoneCounts)', '114', String(zone8.sl.length), zone8.sl.length === 114)
  const be = applyFilters(events, hazards, { ...base, fromMonth: '2569-01', toMonth: '2569-06' })
  const rawBe = events.filter((e) => e.sortKey >= 2569 * 12 + 1 && e.sortKey <= 2569 * 12 + 6).length
  assert('x22. month range is read as a BUDDHIST year (2569-01..2569-06)', String(rawBe), String(be.sl.length), be.sl.length === rawBe && rawBe > 0)
  eq('x22b. ...and that range holds 346 rows', 346, be.sl.length)
  const ce = applyFilters(events, hazards, { ...base, fromMonth: '2026-01', toMonth: '2026-06' })
  assert(
    'x23. a GREGORIAN month-input value matches nothing — the UI must convert CE->BE before calling applyFilters',
    '0',
    String(ce.sl.length),
    ce.sl.length === 0,
  )
  warn(
    'Filters.fromMonth/toMonth are documented as BUDDHIST "YYYY-MM", but an HTML <input type="month"> yields a GREGORIAN year. The UI layer MUST add 543 before calling applyFilters or every chart silently empties (proved by x23).',
  )
}

// ---------------------------------------------------------------------------- summary

section('SUMMARY')
const failed = results.filter((r) => !r.ok)
console.log(`${results.length - failed.length}/${results.length} assertions passed`)
if (failed.length > 0) {
  console.log('\nFAILED:')
  for (const f of failed) console.log(`  - ${f.name}\n      expected: ${f.expected}\n      actual:   ${f.actual}`)
}
console.log(`\nVERDICT: ${failed.length === 0 ? 'PASS' : 'FAIL'}`)

const out = process.env.VERIFY_DATA_JSON
if (out) {
  fs.writeFileSync(out, JSON.stringify(results, null, 2), 'utf8')
  console.log(`(results written to ${out})`)
}

process.exitCode = failed.length === 0 ? 0 : 1
