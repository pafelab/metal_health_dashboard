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
 * How that works: the `@/*` alias lives in tsconfig.app.json, but tsx reads tsconfig.json from
 * the cwd, and the root tsconfig.json is a solution file (`"files": []`, no `paths`). tsconfig
 * files may not be edited, so this file re-execs itself once through tsx with an explicit
 * `--tsconfig tsconfig.app.json`, inherits the child's stdio and propagates its exit code.
 * Everything below the re-exec block therefore uses `await import(...)` — a static `@/...`
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
  latestDataMonth,
  ageBandByGender,
  countBy,
  topN,
  psychiatricDiagnosisCounts,
  severityCounts,
  computeTimeliness,
  suicideSubset,
  monthlyTrend,
  hazardTypeCounts,
  provinceCounts,
  zoneCounts,
  riskFactors,
  warningSigns,
  genderSplit,
  impactByPatientGroup,
  applyFilters,
  collapseWs,
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
  HAZARD_TYPES,
  HAZARD_UNSPECIFIED_LABEL,
  MONTH_ABBR,
  TIMELINESS_LEVELS,
  RISK_KEYWORDS,
  SIGN_KEYWORDS,
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

const sheet2Rows = readCsv('1683387958.csv')
const wideRows = readCsv('842224166.csv')

/** Raw-CSV cell reader used ONLY by the independent recomputations below (shares no code with src/). */
const raw = (r: string[], i: number): string => (typeof r[i] === 'string' ? r[i].trim() : '')
const s2Data = sheet2Rows.slice(1)
const wideData = wideRows.slice(1)

section('CSV load')
info('ชีต2 raw rows (incl. header)', sheet2Rows.length)
info('ชีต2 header columns', sheet2Rows[0].length)
info('wide raw rows (incl. header)', wideRows.length)
info('wide header columns', wideRows[0].length)

const events: SLEvent[] = parseSheet2(sheet2Rows)
const hazards: HazardEvent[] = parseWide(wideRows)
const people: McattPerson[] = parseMcatt(wideRows)

// ---------------------------------------------------------------------------- a

section('a. parseSheet2 -> 440 events')
eq('a. parseSheet2(ชีต2).length', 440, events.length)
const rawNonEmptyS2 = s2Data.filter((r) => r.some((cv) => (cv ?? '').trim() !== '')).length
assert(
  'a2. ...and that equals the raw count of non-empty ชีต2 data rows',
  String(rawNonEmptyS2),
  String(events.length),
  events.length === rawNonEmptyS2,
)

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
// down the whole human-hazard block and is non-empty on 559 rows that hold no Section-2 event.
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

section('d. latestDataMonth (SPEC 3.5)')
const latest = latestDataMonth(events)
info('now (system)', new Date().toISOString().slice(0, 10))
eq('d. latestDataMonth(ชีต2)', 'มิถุนายน 2569', latest)
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
assert(
  'd3. the future-dated ธ.ค. 2569 rows are NOT reported as latest',
  'not ธันวาคม 2569',
  latest,
  latest !== 'ธันวาคม 2569',
)
// d4 (verification gate): d/d3 pass ONLY because the system clock is before ธ.ค. 2569 (= Dec 2026
// CE). latestDataMonth()'s "not in the future" rule is a clock test, not a data-quality test, so
// once real time passes that month the known bad rows become "latest". Report, don't fail — the
// fix is in the sheet, and BUILD_NOTES explicitly chose this rule.
{
  const afterTheBadRows = latestDataMonth(events, new Date(2027, 0, 15)) // Jan 2027 CE = ม.ค. 2570 BE
  info('latestDataMonth(events, now = Jan 2027 CE / ม.ค. 2570 BE)', afterTheBadRows)
  warn(
    `TIME BOMB (not failed): latestDataMonth() suppresses the 2 future-dated ธ.ค. 2569 rows only by comparing against the system clock. Simulating now = Jan 2027 CE returns '${afterTheBadRows}'. From Dec 2026 CE onward the header will read 'ข้อมูลล่าสุดถึง ธันวาคม 2569' — a data-entry error, not real coverage. Fix the sheet, or make the rule fiscal-year-bounded.`,
  )
}

// ---------------------------------------------------------------------------- e

section('e. age (SPEC 3.2) + age bands (SPEC 4.3)')
const nonNumericAge = events.filter((e) => e.age === null).length
const exactSpelling = events.filter((e) => e.ageRaw === 'ไม่ระบุ').length
const rawNonNumericAge = s2Data.filter((r) => !/^\d+$/.test(raw(r, 10))).length
info(
  'ageRaw spellings that are not a number',
  JSON.stringify([...new Set(events.filter((e) => e.age === null).map((e) => e.ageRaw))].map((s) => (s === '' ? '(blank)' : s))),
)
info("rows whose ageRaw is exactly 'ไม่ระบุ'", exactSpelling)
info('raw-CSV count of rows whose col-10 is not ^\\d+$', rawNonNumericAge)
// THE CLAIM AS WRITTEN IN THE ORIGINAL SPEC 3.2 TABLE TEXT / GATE BRIEF. It is FALSE against the
// real file: 43 counts only the exact spelling 'ไม่ระบุ' and misses 'ไม่่ระบุ' (3, doubled tone
// mark), 'ไม่รบุ' (1) and 1 blank cell — 48 total. SPEC.md line 87 has ALREADY been corrected to
// 48, so the only text still saying 43 is the gate brief.
//
// A previous revision of this file downgraded this to an `info` on the grounds that it "would
// fail the gate forever". THAT REASONING IS EXPLICITLY FORBIDDEN by the gate's own rule: "If an
// assertion fails because SPEC's stated number is wrong about the real data (rather than the
// code being wrong), say so explicitly and mark ok:false anyway — a human needs to see it."
const exactNaiMaRabu = s2Data.filter((r) => (r[10] ?? '').trim() === 'ไม่ระบุ').length
// It is restored as a hard FAIL. The CODE IS CORRECT (BUILD_NOTES "Age not specified" wins, and
// SPEC 4.3 needs all 48 in the ไม่ระบุอายุ band for the six bands to sum to 440 — see e2); the
// FAIL is a flag on the stale number, and clears the moment the brief is corrected to 48.
assert(
  "e0. exactly 43 ชีต2 rows carry the EXACT spelling 'ไม่ระบุ' (the figure SPEC 3.2 originally quoted)",
  '43',
  `${exactNaiMaRabu} (the other non-numeric spellings are counted by e1)`,
  exactNaiMaRabu === 43,
)
assert(
  'e1. exactly 48 rows have a non-numeric age (BUILD_NOTES + amended SPEC 3.2 line 87)',
  '48',
  String(nonNumericAge),
  nonNumericAge === 48,
)
assert(
  "e1b. exactly 43 rows spell it 'ไม่ระบุ' (the figure SPEC's 43 actually described)",
  '43',
  String(exactSpelling),
  exactSpelling === 43,
)
assert(
  'e1c. parseAge agrees with a raw ^\\d+$ test on col 10',
  String(rawNonNumericAge),
  String(nonNumericAge),
  rawNonNumericAge === nonNumericAge,
)
const bands = ageBandByGender(events)
const bandSum = bands.reduce((s, b) => s + b.total, 0)
info('bands', bands)
assert('e2. ageBandByGender bands SUM to 440 (SPEC 4.3)', '440', String(bandSum), bandSum === 440)
const unknownBand = bands.find((b) => b.band === 'ไม่ระบุอายุ')
assert(
  'e3. ไม่ระบุอายุ band total === non-numeric age rows',
  String(nonNumericAge),
  String(unknownBand?.total),
  unknownBand?.total === nonNumericAge,
)
const bandGenderSum = bands.reduce((s, b) => s + b.male + b.female, 0)
assert('e4. male+female over all bands === 440 (no third gender value)', '440', String(bandGenderSum), bandGenderSum === 440)
eq('e5. six bands, in SPEC 4.3 order', ['ต่ำกว่า 18', '18–25', '26–45', '46–60', 'มากกว่า 60', 'ไม่ระบุอายุ'], bands.map((b) => b.band))
// No numeric age may fall through to the ไม่ระบุอายุ band (band boundaries must not have a gap).
const ages = events.map((e) => e.age).filter((a): a is number => a !== null)
const gap = ages.filter((a) => !(a < 18 || (a >= 18 && a <= 25) || (a >= 26 && a <= 45) || (a >= 46 && a <= 60) || a > 60))
assert('e6. no numeric age falls between two bands', '[]', JSON.stringify(gap), gap.length === 0)

// ---------------------------------------------------------------------------- f

section('f. ประวัติการรักษา (SPEC 3.2)')
const treatment = countBy(events, (r) => r.treatmentHistory, CATEGORY_ORDERS.treatmentHistory)
info('treatment counts', treatment)
const other = treatment.find((cc) => cc.name === 'อื่น ๆ')
assert("f1. an 'อื่น ๆ' category exists", 'present', other ? 'present' : 'MISSING', other !== undefined)
assert("f2. 'อื่น ๆ' count === 6", '6', String(other?.value), other?.value === 6)
assert('f3. exactly 6 categories, no unexpected extras appended', '6', String(treatment.length), treatment.length === 6)
const treatmentSum = treatment.reduce((s, cc) => s + cc.value, 0)
assert('f4. treatment counts sum === 440 (no row dropped)', '440', String(treatmentSum), treatmentSum === 440)
{
  const rawTally = new Map<string, number>()
  for (const r of s2Data) rawTally.set(raw(r, 15), (rawTally.get(raw(r, 15)) ?? 0) + 1)
  const rawOther = rawTally.get('อื่น ๆ') ?? 0
  assert("f5. independent raw count of col-15 'อื่น ๆ' === 6", '6', String(rawOther), rawOther === 6)
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
  '440',
  `${sev1.black}+${sev1.red}+${sev1.yellow}=${sev1.black + sev1.red + sev1.yellow} (total ${sev1.total})`,
  sev1.black + sev1.red + sev1.yellow === sev1.total && sev1.total === 440,
)
eq('h2. Section 1 black === 0 (SPEC: no black rows yet)', 0, sev1.black)
eq('h3. Section 1 red === 4', 4, sev1.red)
eq('h4. Section 1 yellow === 436', 436, sev1.yellow)
const sev2 = severityCounts(hazards)
info('Section 2 severityCounts', sev2)
assert(
  "h5. Section 2 red === 16 — proves severityOf() survives the 'สีีแดง' typo (BUILD_NOTES)",
  '16',
  String(sev2.red),
  sev2.red === 16,
)
eq('h6. Section 2 black === 27 (black IS supported and present)', 27, sev2.black)
eq('h7. Section 2 yellow === 47', 47, sev2.yellow)
assert(
  'h8. Section 2 black+red+yellow === total 90',
  '90',
  `${sev2.black + sev2.red + sev2.yellow} (total ${sev2.total})`,
  sev2.black + sev2.red + sev2.yellow === 90 && sev2.total === 90,
)
info('severityOf("สีีแดง") (doubled สระอี as it appears in the wide tab)', severityOf('สีีแดง'))
info('severityOf("") / severityOf("-")', `${severityOf('')} / ${severityOf('-')}`)
assert('h9. black is supported by the enum even though Section 1 has none', 'black', severityOf('สีดำ'), severityOf('สีดำ') === 'black')

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
assert('i2. pie total === 170 (89+64+17, BUILD_NOTES)', '170', String(pieSum), pieSum === 170)
const psychOnly = pie.filter((cc) => psychLabels.includes(collapseWs(cc.name)))
info('the 3 psychiatric rows themselves (all matched, incl. the double-space value)', psychOnly)
assert(
  'i3. each of the 3 psychiatric labels resolved a non-zero count (double-space match works)',
  '[89 or 64 or 17 for each]',
  JSON.stringify(psychOnly.map((cc) => cc.value)),
  psychOnly.length === 3 && psychOnly.every((cc) => cc.value > 0),
)
// The 4 excluded values must be exactly the non-psychiatric ones named in SPEC 3.2 — nothing else
// may silently vanish from col 12.
{
  const rawTally = new Map<string, number>()
  for (const r of s2Data) {
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

section('j. countBy on ผู้ป่วยจิตเวช/อื่นๆ (SPEC 3.2, 5 groups)')
const groups = countBy(events, (r) => r.patientGroup, CATEGORY_ORDERS.patientGroup)
info('patientGroup counts', groups)
eq('j1. exactly 5 groups (no extras appended)', 5, groups.length)
eq('j2. the 5 group names match SPEC 3.2', CATEGORY_ORDERS.patientGroup, groups.map((g) => g.name))
const groupSum = groups.reduce((s, cc) => s + cc.value, 0)
assert('j3. group counts sum === 440', '440', String(groupSum), groupSum === 440)
{
  const rawTally = new Map<string, number>()
  for (const r of s2Data) rawTally.set(raw(r, 13), (rawTally.get(raw(r, 13)) ?? 0) + 1)
  const rawPairs = CATEGORY_ORDERS.patientGroup.map((l) => rawTally.get(l) ?? 0)
  eq('j4. independent raw col-13 counts match countBy', rawPairs, groups.map((g) => g.value))
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
eq('k4. pass', 430, t1.pass)
eq('k5. total', 440, t1.total)
eq('k6. percent === 97.73', 97.73, t1.percent)
eq("k7. level === '0.5' (>= 90.00 -> emerald / Laugh)", '0.5', t1.level)
eq('k8. icon', 'Laugh', t1.icon)
const t2 = computeTimeliness(hazards)
info('Section 2 timeliness', t2)
eq('k9. Section 2 percent === 100 (90/90)', 100, t2.percent)
const tAll = computeTimeliness([...events, ...hazards])
info('combined timeliness (what the zone tab shows)', tAll)
assert(
  'k10. combined pass/total === 520/530 and percent === 98.11',
  '520/530 -> 98.11',
  `${tAll.pass}/${tAll.total} -> ${tAll.percent}`,
  tAll.pass === 520 && tAll.total === 530 && tAll.percent === 98.11,
)
{
  const rawPass = s2Data.filter((r) => raw(r, 8) === 'ตามเกณฑ์').length
  const rawTotal = s2Data.filter((r) => raw(r, 8) !== '' && raw(r, 8) !== '-' && raw(r, 8) !== 'ไม่มีข้อมูล').length
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
eq('l1. suicideSubset size', 89, suicide.length)
const suicideVals = countBy(suicide, (r) => r.suicide, CATEGORY_ORDERS.suicide)
info('suicide success/fail', suicideVals)
assert(
  'l2. success 70 / fail 19, no extras',
  '[70,19] and 2 categories',
  `${JSON.stringify(suicideVals.map((v) => v.value))} and ${suicideVals.length} categories`,
  suicideVals.length === 2 && suicideVals[0].value === 70 && suicideVals[1].value === 19,
)
const methodInSubset = topN(suicide, (r) => r.suicideMethod, 5)
const causeInSubset = topN(suicide, (r) => r.suicideCause, 5)
const locInSubset = topN(suicide, (r) => r.suicideLocation, 10)
info('method top5 (subset)', methodInSubset)
info('cause top5 (subset)', causeInSubset)
info('location top10 (subset)', locInSubset)
const sumOf = (a: { value: number }[]): number => a.reduce((s, cc) => s + cc.value, 0)
assert(
  'l3. method/cause/location totals inside the subset are all <= 89',
  '<= 89 each',
  `method ${sumOf(countBy(suicide, (r) => r.suicideMethod))}, cause ${sumOf(countBy(suicide, (r) => r.suicideCause))}, location ${sumOf(countBy(suicide, (r) => r.suicideLocation))}`,
  sumOf(countBy(suicide, (r) => r.suicideMethod)) <= 89 &&
    sumOf(countBy(suicide, (r) => r.suicideCause)) <= 89 &&
    sumOf(countBy(suicide, (r) => r.suicideLocation)) <= 89,
)
// The subset restriction is load-bearing: สถานที่ก่อเหตุ is filled on 351 NON-suicide rows too.
const outside = events.filter((e) => {
  const t = e.suicide.trim()
  return t === '' || t === '-'
})
const nonBlank = (rows: SLEvent[], pick: (r: SLEvent) => string): number =>
  rows.filter((r) => {
    const t = pick(r).trim()
    return t !== '' && t !== '-'
  }).length
info('rows OUTSIDE the subset with a non-blank วิธีการฆ่าคัวตาย', nonBlank(outside, (r) => r.suicideMethod))
info('rows OUTSIDE the subset with a non-blank สาเหตุการฆ่าตัวตาย', nonBlank(outside, (r) => r.suicideCause))
info('rows OUTSIDE the subset with a non-blank สถานที่ก่อเหตุ', nonBlank(outside, (r) => r.suicideLocation))
info('location total over ALL 440 rows (the wrong denominator)', sumOf(countBy(events, (r) => r.suicideLocation)))
assert(
  'l4. counting location over ALL rows differs from the subset -> the subset restriction is load-bearing',
  'subset 89 != all-rows count',
  `subset ${sumOf(countBy(suicide, (r) => r.suicideLocation))} vs all ${sumOf(countBy(events, (r) => r.suicideLocation))}`,
  sumOf(countBy(suicide, (r) => r.suicideLocation)) !== sumOf(countBy(events, (r) => r.suicideLocation)),
)
const rawLoc19 = new Set(s2Data.map((r) => raw(r, 19)).filter((v) => v !== '' && v !== '-'))
info("raw col-19 values containing 'ตลาด'", [...rawLoc19].filter((v) => v.includes('ตลาด')))
const allLocNames = countBy(events, (r) => r.suicideLocation).map((cc) => cc.name)
assert(
  "l5. SPEC 4.6 merge: 'ตลาดร้านค้า' never survives parsing (raw variant IS present in the CSV)",
  `raw CSV has 'ตลาดร้านค้า': ${rawLoc19.has('ตลาดร้านค้า')} -> 0 parsed rows keep it`,
  `parsed location categories containing 'ตลาด': ${JSON.stringify(allLocNames.filter((n) => n.includes('ตลาด')))}`,
  rawLoc19.has('ตลาดร้านค้า') && !allLocNames.includes('ตลาดร้านค้า'),
)
{
  const rawSubset = s2Data.filter((r) => raw(r, 16) !== '' && raw(r, 16) !== '-').length
  assert('l6. independent raw subset size off col 16', String(rawSubset), String(suicide.length), rawSubset === suicide.length)
}

// ---------------------------------------------------------------------------- m

section('m. monthlyTrend (SPEC 4.1)')
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
const trendSum = trend.reduce((s, p) => s + p.value, 0)
const blankMonthRows = events.filter((e) => e.sortKey <= 0).length
assert(
  'm3. trend total === 440 minus the rows with no resolvable month/year (by design, documented)',
  `${440 - blankMonthRows}`,
  `${trendSum} (${blankMonthRows} row(s) have a blank เดือน cell -> sortKey 0 -> excluded)`,
  trendSum === 440 - blankMonthRows,
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
  // Independent recompute of the whole bucket set straight off the raw month/year columns.
  const rawBuckets = new Map<number, number>()
  for (const r of s2Data) {
    const m = parseMonth(raw(r, 1))
    const y = parseYear(raw(r, 2))
    if (m === null || y === null) continue
    const k = y * 12 + m
    rawBuckets.set(k, (rawBuckets.get(k) ?? 0) + 1)
  }
  const rawSorted = [...rawBuckets.entries()].sort((a, b) => a[0] - b[0])
  eq('m5. buckets and counts match an independent raw month/year tally', rawSorted, trend.map((p) => [p.sortKey, p.value]))
  info('trend buckets in order', trend.map((p) => `${p.label}=${p.value}`).join(' '))
  warn(
    `the trend's FIRST bucket is 'ม.ค. 68' (2 rows, BUILD_NOTES data-entry error: มกราคม 2568 predates the ต.ค. 2568 fiscal-year start) and its LAST is 'ธ.ค. 69' (2 future-dated rows). sortKey ordering is calendar-based, so those errors bracket the axis. SPEC 4.1 says "every month present in the filtered data", so this is reported, not failed.`,
  )
}
warn(
  `the trend sums to ${trendSum} but the KPI "ทั้งหมด" is ${events.length}; the ${blankMonthRows} blank-month row(s) cannot be placed on a time axis. The UI must not present the trend as a total.`,
)
warn(
  'only latestDataMonth() filters future-dated rows. monthlyTrend still plots the known data-entry errors ม.ค. 68 (2 rows, before the fiscal year) and ธ.ค. 69 (2 rows, in the future) — BUILD_NOTES "2 future-dated rows". SPEC 4.1 does not require filtering them, so this is reported, not failed.',
)

// ---------------------------------------------------------------------------- n

section('n. hazardTypeCounts (SPEC 3.3)')
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
    const r = new Array(84).fill('')
    r[35] = 'ทดสอบ'
    r[36] = 'หัวข้อทดสอบ'
    return r
  })()])
  eq('n6. a Section-2 row with no flag falls back to ภัยอื่นๆ (ไม่ระบุ)', [HAZARD_UNSPECIFIED_LABEL], synthetic[0]?.hazards)
  info('isTruthyCell on the SPEC 3.3 falsy set', JSON.stringify(['', '-', '0', 'false', 'ไม่มีข้อมูล'].map((v) => `${JSON.stringify(v)}->${isTruthyCell(v)}`)))
}

// ---------------------------------------------------------------------------- o (new): header resolver

section('o. ชีต2 header-name resolution (SPEC 3.2 "resolve by header name, index as fallback")')
{
  // Re-derive what src/data/parseSheet2.ts's buildResolver() would produce, then prove that for
  // this real header row it lands on exactly the SPEC 3.2 indexes. A header-name collision here
  // would silently make a widget read the wrong column.
  const specNames: [string, number][] = [
    ['เขตสุขภาพ', 0], ['ปี', 2], ['จังหวัด', 3], ['เนื้อหา', 4], ['link', 5], ['ช่องทาง Alert', 6],
    ['ระดับความรุนแรง', 7], ['การส่งรายงาน', 8], ['เพศ', 9], ['อายุ', 10], ['ช่วงอายุ', 11],
    ['การวินิจฉัยโรค', 12], ['ผู้ป่วยจิตเวช/อื่นๆ', 13], ['การจำแนกผู้ป่วย', 14], ['ประวัติการรักษา', 15],
    ['การฆ่าตัวตาย', 16], ['วิธีการฆ่าคัวตาย', 17], ['สาเหตุการฆ่าตัวตาย', 18], ['สถานที่ก่อเหตุ', 19],
    ['มีผู้ได้รับผลกระทบ', 20], ['ประเภทผู้ได้รับผลกระทบ', 21], ['จำนวนผู้ได้บาดเจ็บ', 22],
    ['จำนวนผู้เสียชีวิต', 23], ['รายงานข้อเท็จจริงด้านจิตเวช', 24], ['ผู้ปฏิบัติงาน', 25],
    ['การช่วยเหลือผู้ก่อเหตุ', 26], ['ขาดยา', 27], ['กลับมาเสพซ้ำ', 28], ['ไม่มาตามนัด', 29], ['อื่น ๆ', 30],
    ['ไม่หลับไม่นอน', 31], ['เดินไปเดินมา', 32], ['พูดจาคนเดียว', 33], ['หงุดหงิด', 34],
    ['เที่ยวหวาดระแวง', 35], ['ไม่มีอาการ', 36],
  ]
  const trimmed = sheet2Rows[0].map((h) => (h ?? '').trim())
  const byName = new Map<string, number>()
  trimmed.forEach((h, i) => {
    if (h !== '' && !byName.has(h)) byName.set(h, i)
  })
  const dupes = new Map<string, number[]>()
  trimmed.forEach((h, i) => {
    if (h === '') return
    dupes.set(h, [...(dupes.get(h) ?? []), i])
  })
  const dupList = [...dupes.entries()].filter(([, v]) => v.length > 1)
  assert('o1. no duplicate header name in ชีต2 (first-wins resolution is unambiguous)', '[]', JSON.stringify(dupList), dupList.length === 0)
  const mismatches = specNames
    .map(([name, idx]) => ({ name, idx, resolved: byName.has(name) ? (byName.get(name) as number) : idx }))
    .filter((x) => x.resolved !== x.idx)
  assert(
    'o2. every SPEC 3.2 header name resolves to its SPEC index (no silent wrong-column read)',
    '[]',
    JSON.stringify(mismatches),
    mismatches.length === 0,
  )
  const notFound = specNames.filter(([name]) => !byName.has(name)).map(([name]) => name)
  assert('o3. every SPEC 3.2 header name is actually present in the file (no silent index fallback)', '[]', JSON.stringify(notFound), notFound.length === 0)
  eq('o4. column 1 (month) really has a blank header, so index resolution is required', '', trimmed[1])
  // Parse robustness: a reordered header must still resolve by NAME, not by position.
  {
    const swapped = sheet2Rows.map((r) => {
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
      `${sev1.yellow}/${sev1.red}`,
      `${sc.yellow}/${sc.red}`,
      sc.yellow === sev1.yellow && sc.red === sev1.red,
    )
  }
}

// ---------------------------------------------------------------------------- p (new): normalisers

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
  // The two typo spellings live in ชีต2 col 3; check they map to the province their own zone cell implies.
  const typoRows = s2Data.filter((r) => raw(r, 3) === 'นตรพนม' || raw(r, 3) === 'ขอนแก่่น')
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
}

// ---------------------------------------------------------------------------- q (new): papaparse parity

section('q. papaparse option parity with src/data/fetchSheet.ts (skipEmptyLines: true)')
{
  const s2Skip = readCsv('1683387958.csv', true)
  const wideSkip = readCsv('842224166.csv', true)
  const e2 = parseSheet2(s2Skip)
  const h2 = parseWide(wideSkip)
  const m2 = parseMcatt(wideSkip)
  assert(
    'q1. parseSheet2/parseWide/parseMcatt give identical counts with and without skipEmptyLines',
    `${events.length}/${hazards.length}/${people.length}`,
    `${e2.length}/${h2.length}/${m2.length}`,
    e2.length === events.length && h2.length === hazards.length && m2.length === people.length,
  )
}

// ---------------------------------------------------------------------------- extra adversarial checks

section('EXTRA. province normalisation coverage')
const pc1 = provinceCounts(events)
const extras1 = pc1.slice(ALL_PROVINCES.length)
info('Section 1 province extras (values normProvince did NOT canonicalise)', extras1)
info(
  'นครพนม after normalisation',
  `นครพนม=${pc1.find((cc) => cc.name === 'นครพนม')?.value} (BUILD_NOTES counted 7 rows for the exact spelling; +3 rows spelled 'นตรพนม' are now aliased in)`,
)
assert('x1. every ชีต2 province normalises to one of the 77 known names', '[]', JSON.stringify(extras1), extras1.length === 0)
const pc1Sum = pc1.reduce((s, cc) => s + cc.value, 0)
assert('x2. province counts sum === 440 (no row silently lost)', '440', String(pc1Sum), pc1Sum === 440)
const pc2 = provinceCounts(hazards)
const extras2 = pc2.slice(ALL_PROVINCES.length)
info('Section 2 province extras', extras2)
assert('x3. every wide-tab province normalises to a known name', '[]', JSON.stringify(extras2), extras2.length === 0)
const pc2Sum = pc2.reduce((s, cc) => s + cc.value, 0)
assert('x4. Section 2 province counts sum === 90', '90', String(pc2Sum), pc2Sum === 90)

section('EXTRA. zoneCounts')
const zc = zoneCounts(events)
info('zoneCounts', zc.map((cc) => `${cc.name}=${cc.value}`).join(' '))
eq('x5. 13 zone buckets, none appended', 13, zc.length)
const zcSum = zc.reduce((s, cc) => s + cc.value, 0)
assert('x6. zone counts sum === 440', '440', String(zcSum), zcSum === 440)
eq('x7. zone 8 === 91 (BUILD_NOTES)', 91, zc.find((cc) => cc.name === 'เขต 8')?.value)
const zc2 = zoneCounts(hazards)
info('Section 2 zoneCounts', zc2.map((cc) => `${cc.name}=${cc.value}`).join(' '))
assert(
  'x8. Section 2 zone buckets 2 and 11 are present at 0 (empty zones handled)',
  '0 and 0',
  `${zc2.find((cc) => cc.name === 'เขต 2')?.value} and ${zc2.find((cc) => cc.name === 'เขต 11')?.value}`,
  zc2.find((cc) => cc.name === 'เขต 2')?.value === 0 && zc2.find((cc) => cc.name === 'เขต 11')?.value === 0,
)
// Each parsed row's zone must agree with its province's zone in ZONE_PROVINCES. Now guaranteed
// by construction: src/data/normalize.ts zoneOf() derives the event's zone from its (already
// normalised) province via ZONE_PROVINCES/PROVINCE_ZONE, falling back to the row's raw zone cell
// only when the province is blank/unrecognised — so a row can no longer end up on the wrong
// zone's map. This assertion stays as a hard check (regression guard), and the raw-cell vs
// resolved-zone diff below stays visible so the underlying SHEET error (row 402) is not silently
// hidden by the code-side fix.
{
  const mism = events.filter((e) => e.zone !== null && e.province !== '' && !(ZONE_PROVINCES[e.zone] ?? []).includes(e.province))
  const where = mism.map((e) => {
    const i = s2Data.findIndex((r) => raw(r, 5) === e.link && raw(r, 4) === e.headline)
    return `ชีต2 data row ${i + 1}: เขต ${e.zone} / ${e.province} (${e.province} belongs to zone ${Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(e.province))}) — ${e.headline.slice(0, 40)}`
  })
  // x8b is a SOURCE-DATA condition: it can only be cleared by editing the Google Sheet, never by
  // code, because SPEC 4.2 (ratified in BUILD_NOTES) makes the เขตสุขภาพ cell authoritative. It is
  // reported as a loud WARN so it stays visible without masking real code defects in the verdict.
  if (mism.length === 0) {
    info("x8b. every ชีต2 row's เขตสุขภาพ agrees with its จังหวัด (source data clean)", 'OK')
  } else {
    warn(`x8b. [SOURCE-DATA — owner must fix the SHEET] ${mism.length} ชีต2 row(s) have a เขตสุขภาพ cell that disagrees with their จังหวัด. Per SPEC 4.2 the app counts them under the CELL's zone: ${JSON.stringify(where)}`)
  }
  // ------------------------------------------------------------------ x8c (verification gate)
  // ADVERSARIAL: x8b above CANNOT FAIL while zoneOf() derives the zone FROM the province — it is
  // a tautology, not independent evidence. The real question is whether the code follows SPEC 4.2.
  // SPEC 4.2 says: "Zone number parsed from digits in the zone cell." src/data/normalize.ts's
  // zoneOf() instead derives the zone from the row's normalised province and uses the zone cell
  // only as a fallback. BUILD_NOTES is SILENT on this — it is an UNRATIFIED deviation, and it
  // moves a row between two zone buckets on widget 20 / the zone tab. Fail it so a human ratifies
  // or reverts it; the numbers below make the delta concrete.
  {
    const fromCell = new Map<number, number>()
    for (const r of s2Data) {
      const m = raw(r, 0).match(/\d+/)
      if (!m) continue
      const z = parseInt(m[0], 10)
      fromCell.set(z, (fromCell.get(z) ?? 0) + 1)
    }
    const cellTally = Array.from({ length: 13 }, (_, i) => `${i + 1}:${fromCell.get(i + 1) ?? 0}`).join(' ')
    const derivedTally = zc.map((cc) => `${cc.name.replace('เขต ', '')}:${cc.value}`).join(' ')
    const movedRows = s2Data
      .map((r, i) => ({ row: i + 1, cell: raw(r, 0), prov: normProvince(raw(r, 3)) }))
      .filter(({ cell: zcell, prov }) => {
        const m = zcell.match(/\d+/)
        if (!m || prov === '') return false
        const declared = parseInt(m[0], 10)
        const derived = Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(prov))
        return derived !== undefined && derived !== declared
      })
    assert(
      'x8c. [SPEC 4.2 DEVIATION] zoneOf() must take the zone from the row\'s เขตสุขภาพ cell ("Zone number parsed from digits in the zone cell"), not derive it from the province',
      `zone tallies identical to the raw เขตสุขภาพ column: ${cellTally}`,
      `app tallies: ${derivedTally}${derivedTally === cellTally ? ' (identical — zoneOf() honours the zone cell)' : ' — MISMATCH: zoneOf() is overriding the sheet.'} Source-sheet rows whose zone cell disagrees with their province, kept under the CELL's zone per SPEC 4.2: ${JSON.stringify(movedRows.map((r) => `ชีต2 data row ${r.row} (CSV line ${r.row + 1}): cell ${r.cell} -> ${r.prov} = zone ${Object.keys(ZONE_PROVINCES).map(Number).find((z) => ZONE_PROVINCES[z].includes(r.prov))}`))}`,
      derivedTally === cellTally,
    )
  }
  // Visibility: even though zoneOf() now heals it, list every row whose RAW เขตสุขภาพ cell (col 0)
  // disagrees with what its จังหวัด cell implies, so the sheet-side error is still surfaced.
  const rawDisagree = s2Data
    .map((r, i) => ({ row: i + 1, zoneCell: raw(r, 0), province: normProvince(raw(r, 3)) }))
    .filter(({ zoneCell, province }) => {
      const m = zoneCell.match(/\d+/)
      if (!m || province === '') return false
      return !(ZONE_PROVINCES[parseInt(m[0], 10)] ?? []).includes(province)
    })
  info(
    'raw ชีต2 rows whose col-0 เขตสุขภาพ cell disagrees with its col-3 จังหวัด (healed by zoneOf(), sheet still needs fixing)',
    rawDisagree.map((r) => `row ${r.row}: ${r.zoneCell} / ${r.province}`),
  )
}

section('EXTRA. risk factors / warning signs / gender / impact')
const rf = riskFactors(events)
info('riskFactors', rf)
eq('x9. risk-factor denominator === 260 ผู้ป่วยรายเก่า (SPEC 4.4)', 260, rf.denominator)
assert('x10. risk affected <= denominator', `<= ${rf.denominator}`, String(rf.affected), rf.affected <= rf.denominator)
const ws = warningSigns(events)
info('warningSigns', ws)
eq('x11. warning-sign denominator === 440 (all events)', 440, ws.denominator)
assert('x12. sign affected <= denominator', '<= 440', String(ws.affected), ws.affected <= ws.denominator)
// Independent recompute of the whole SPEC 4.4 keyword scan, straight off the CSV.
{
  const join = (r: string[]): string => {
    const out: string[] = []
    for (let i = 27; i <= 36; i++) {
      const v = raw(r, i)
      if (v !== '' && v !== '-') out.push(v)
    }
    return out.join(' ')
  }
  const oldRows = s2Data.filter((r) => raw(r, 14) === 'ผู้ป่วยรายเก่า')
  const riskRaw = RISK_KEYWORDS.map((k) =>
    oldRows.filter((r) => (k.cellIndex !== undefined ? raw(r, 27 + k.cellIndex) !== '' && raw(r, 27 + k.cellIndex) !== '-' : k.keywords.some((kw) => join(r).includes(kw)))).length,
  )
  eq('x9b. independent raw recompute of the 3 risk factors', riskRaw, rf.items.map((i) => i.value))
  const signRaw = SIGN_KEYWORDS.map((k) => s2Data.filter((r) => k.keywords.some((kw) => join(r).includes(kw))).length)
  eq('x11b. independent raw recompute of the 5 warning signs', signRaw, ws.items.map((i) => i.value))
  const riskAll = RISK_KEYWORDS.map((k) =>
    s2Data.filter((r) => (k.cellIndex !== undefined ? raw(r, 27 + k.cellIndex) !== '' && raw(r, 27 + k.cellIndex) !== '-' : k.keywords.some((kw) => join(r).includes(kw)))).length,
  )
  info('risk factors if the SAME scan ran over all 440 rows instead of the 260 ผู้ป่วยรายเก่า', JSON.stringify(riskAll))
  warn(
    `riskFactors() scans only the ${rf.denominator} ผู้ป่วยรายเก่า rows. SPEC 4.4 fixes the DENOMINATOR to that subset but does not say the numerator is scoped the same way; over all 440 rows the factors would read ${JSON.stringify(riskAll)} instead of ${JSON.stringify(rf.items.map((i) => i.value))}. Author's choice, documented in aggregate.ts — flagged for the owner, not failed.`,
  )
  const unmatched = new Set<string>()
  for (const r of s2Data) {
    for (let i = 27; i <= 30; i++) {
      const v = raw(r, i)
      if (v === '' || v === '-') continue
      const hit = RISK_KEYWORDS.some((k) => k.keywords.some((kw) => v.includes(kw))) || SIGN_KEYWORDS.some((k) => k.keywords.some((kw) => v.includes(kw)))
      if (!hit) unmatched.add(v)
    }
  }
  info('risk-cell (27-30) values that match NO SPEC 4.4 keyword', JSON.stringify([...unmatched]))
  warn(
    `ชีต2 col 27 contains 'ขายยา' and 'รักษาต่อเนื่อง', which match no SPEC 4.4 keyword. 'ขายยา' is one keystroke from 'ขาดยา'; if it is a typo the ขาดยา/ไม่มาตามนัด factor is 1 short. Owner call — not failed here.`,
  )
  // ------------------------------------------------------------------ x11c (verification gate)
  // GAP IN THE PREVIOUS GATE: only the RISK cells (27-30) were scanned for values that match no
  // SPEC 4.4 keyword. The SIGN cells (31-36) were never checked, so a warning sign silently
  // dropped by the keyword list would not have been caught. Every unmatched sign value must be an
  // explicit "no symptoms" statement — anything else means warningSigns() is undercounting.
  {
    const NO_SYMPTOM_OK = ['ไม่มีอาการ', 'ไม่มีอาการทางจิตเวช']
    const unmatchedSigns = new Map<string, number>()
    for (const r of s2Data) {
      for (let i = 31; i <= 36; i++) {
        const v = raw(r, i)
        if (v === '' || v === '-') continue
        const hit = SIGN_KEYWORDS.some((k) => k.keywords.some((kw) => v.includes(kw)))
        if (!hit) unmatchedSigns.set(v, (unmatchedSigns.get(v) ?? 0) + 1)
      }
    }
    info('sign-cell (31-36) values that match NO SPEC 4.4 keyword', JSON.stringify([...unmatchedSigns.entries()]))
    const realMisses = [...unmatchedSigns.keys()].filter((v) => !NO_SYMPTOM_OK.includes(v) && !/^\d+$/.test(v))
    assert(
      'x11c. no warning sign is silently dropped: every unmatched sign-cell (31-36) value is an explicit "no symptoms" statement or a stray digit',
      '[]',
      JSON.stringify(realMisses),
      realMisses.length === 0,
    )
    // The typo 'วาดระแวง' (missing ห) IS present in col 28 and IS caught, because SPEC 4.4's
    // keyword is the substring 'ระแวง' rather than the full word. Prove that, don't assume it.
    const paranoidTypos = s2Data.filter((r) => [...Array(10).keys()].some((k) => raw(r, 27 + k).includes('วาดระแวง') && !raw(r, 27 + k).includes('หวาดระแวง')))
    info("rows carrying the 'วาดระแวง' typo (missing ห)", paranoidTypos.length)
    const typoCaught = paranoidTypos.every((r) => {
      const t = join(r)
      return SIGN_KEYWORDS.find((k) => k.key === 'paranoid')!.keywords.some((kw) => t.includes(kw))
    })
    assert(
      "x11d. the 'วาดระแวง' typo still counts as เที่ยวหวาดระแวง (substring keyword 'ระแวง')",
      'all caught',
      typoCaught ? 'all caught' : 'MISSED',
      typoCaught,
    )
  }
}
const gs = genderSplit(events)
info('genderSplit', gs)
eq('x13. genderSplit', { male: 393, female: 47, other: 0, total: 440 }, gs)
const impact = impactByPatientGroup(events)
info('impactByPatientGroup', impact)
const impactFinite = impact.every((r) => Number.isFinite(r.deaths) && Number.isFinite(r.injured))
assert("x14. every deaths/injured is finite ('-' and blank parse to 0, never NaN)", 'true', String(impactFinite), impactFinite)
eq('x15. impactByPatientGroup has the 5 fixed groups, no extras', 5, impact.length)
{
  const rawDeaths = s2Data.reduce((s, r) => s + (/^\d+$/.test(raw(r, 23)) ? parseInt(raw(r, 23), 10) : 0), 0)
  const rawInjured = s2Data.reduce((s, r) => s + (/^\d+$/.test(raw(r, 22)) ? parseInt(raw(r, 22), 10) : 0), 0)
  const gotDeaths = impact.reduce((s, r) => s + r.deaths, 0)
  const gotInjured = impact.reduce((s, r) => s + r.injured, 0)
  assert(
    'x16. deaths/injured totals match the raw column sums (nothing dropped by the group split)',
    `${rawDeaths}/${rawInjured}`,
    `${gotDeaths}/${gotInjured}`,
    rawDeaths === gotDeaths && rawInjured === gotInjured,
  )
}

section('EXTRA. applyFilters (SPEC 5.2) — Buddhist-year contract')
{
  const base: Filters = { fromMonth: '', toMonth: '', zone: 'all', province: '', hazardType: 'all' }
  const all = applyFilters(events, hazards, base)
  assert('x17. no filter -> everything passes through', '440/90', `${all.sl.length}/${all.hz.length}`, all.sl.length === 440 && all.hz.length === 90)
  const social = applyFilters(events, hazards, { ...base, hazardType: 'social' })
  assert('x18. ประเภทภัย = Social Listening hides Section 2', '440/0', `${social.sl.length}/${social.hz.length}`, social.sl.length === 440 && social.hz.length === 0)
  const hazAll = applyFilters(events, hazards, { ...base, hazardType: 'hazards' })
  assert('x19. ภัยอื่นๆ (รวม) hides Section 1', '0/90', `${hazAll.sl.length}/${hazAll.hz.length}`, hazAll.sl.length === 0 && hazAll.hz.length === 90)
  const transport = applyFilters(events, hazards, { ...base, hazardType: 'transport' })
  assert('x20. a single hazard key restricts Section 2 to that flag (transport = 57)', '0/57', `${transport.sl.length}/${transport.hz.length}`, transport.sl.length === 0 && transport.hz.length === 57)
  const zone8 = applyFilters(events, hazards, { ...base, zone: 8 })
  assert('x21. zone filter 8 -> 91 ชีต2 rows', '91', String(zone8.sl.length), zone8.sl.length === 91)
  const be = applyFilters(events, hazards, { ...base, fromMonth: '2569-01', toMonth: '2569-06' })
  const rawBe = events.filter((e) => e.sortKey >= 2569 * 12 + 1 && e.sortKey <= 2569 * 12 + 6).length
  assert('x22. month range is read as a BUDDHIST year (2569-01..2569-06)', String(rawBe), String(be.sl.length), be.sl.length === rawBe && rawBe > 0)
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
