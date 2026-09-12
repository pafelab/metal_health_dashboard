# Build notes — verified ground truth (extracted 2026-09-09)

SPEC.md is the source of truth. This file records facts VERIFIED against the real
data/old sites during scaffolding. Where this file and SPEC disagree, this file wins
(it was measured); flag the difference rather than silently diverging.

## Paths (SPEC's `D:\DashboardReport` tree root is stale)
Project root is `I:\healhtdashboard`.

## Local reference material (DO NOT fetch from the network at build time)
- `docs/reference/site1/index.html` — 1,042 lines (site 1)
- `docs/reference/site2/index.html` — 3,728 lines (site 2)
- `docs/data/1683387958.csv` — ชีต2, 440 data rows + header, 37 cols (SPEC 3.2)
- `docs/data/842224166.csv` — wide tab, 748 data rows + header, 84 cols (SPEC 3.3/3.4)
- `docs/data/1523955266.csv` — wide tab duplicate (fallback gid)

## SHEET SCHEMA REFRESHED 2026-09-12 — the fixture above was re-downloaded
`docs/data/842224166.csv` (the tab the app actually fetches, `GID_WIDE`) was re-pulled from the
live sheet on 2026-09-12 and is **85 columns**, not the 84 captured on 2026-09-09. The sheet owner
restructured Section 1 to match the `แก้งับ.pdf` review deck:

| col | was (2026-09-09) | now (2026-09-12) |
|---|---|---|
| 14 `ประเภทผู้ป่วย` | 2 values — `ผู้ป่วยรายเก่า` / `ผู้ป่วยรายใหม่` | **5-way status** — จิตเวชรายเก่า (269) / จิตเวชรายใหม่ (7) / สารเสพติดรายเก่า (67) / สารเสพติดรายใหม่ (73) / `"ไม่ใช่ผู้ป่วยจิตเวช/ ไม่ใช่ผู้ใช้สารเสพติด"` (163), plus 1 stray legacy `ผู้ป่วยรายใหม่` |
| 74 | `ขาดยา` (free text, 10 distinct) | **`ขาดยา/ไม่มาตามนัด`** — single-value flag column (236 rows) |
| 75 | `กลับมาเสพซ้ำ` (free text, 12 distinct) | **`กลับมาใช้สารเสพติดซ้ำ`** — flag (213 rows) |
| 76 | `ไม่มาตามนัด` (free text) | **`มีการใช้สารเสพติดร่วมด้วย`** — flag (105 rows); this is the deck's NEW 4th risk factor |
| 77 | `อื่น ๆ` | `อื่น ๆ` — flag (31 rows) |
| 84 | *(did not exist)* | **`5สัญญาณเตือน`** — the sheet's own มี/ไม่มี answer (355 / 225) |

Warning-sign flags now sit at **78–82** (ไม่หลับไม่นอน / เดินไปเดินมา / พูดจาคนเดียว /
หงุดหงิดฉุนเฉียว / เที่ยวหวาดระแวง) with 83 = `ไม่มีอการทางจิตเวช` (sheet's own typo, verbatim).

Measured on the refreshed fixture (580 Section-1 rows):
- 4-factor denominator (col 14 in the four psychiatric/substance statuses, i.e. excluding
  `ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด`) = **417**; 413 of those carry >=1 factor (99.0%).
- Warning signs over ALL 580 rows: 350 carry >=1 sign (60.3%).
- Hazard casualties (cols 47/48/50/51): officer injured 16, officer dead 13, public injured 672,
  public dead 151.

### The fallback gid is NO LONGER a duplicate
`GID_WIDE_FALLBACK` (1523955266) still returns the **old 84-column schema** — it was re-pulled the
same day and is byte-for-byte the pre-restructure layout. SPEC's "byte-identical" claim is stale.
If the fallback ever fires, col 14 degrades to 2 values and cols 74-76 to free text. Parsers must
therefore resolve these columns by header name with the OLD names kept as aliases, so a fallback
fetch degrades gracefully instead of reading the wrong columns.
- `docs/data/zones.json` — zone → province table lifted from site 2
- `docs/data/provEnToTh.json` — 78-entry EN→TH province map lifted from site 1
- Assets already copied to `public/forms`, `public/reference`, `public/team`.

## Map asset — ALREADY BUILT, do not rebuild
`src/assets/thailand.json` is apisit/thailand.json (77 features) with
`properties.name` **already rewritten to Thai** (`properties.nameEn` keeps the English).
So `echarts.registerMap('thailand', geo)` + `data:[{name:'เชียงใหม่',value:n}]` matches directly.
No EN→TH lookup is needed at runtime.
Zone map (SPEC 6.4 item 2): filter features by the zone's province list, then
`registerMap('zone-N', {type:'FeatureCollection', features})`.

## DATA BUG FOUND — นครพนม
The old sites' zone table lists only **76** provinces: **นครพนม is missing from zone 8**.
ชีต2 has **7 rows** spelled exactly `นครพนม`, so those rows are unreachable in the old zone-8
dropdown. FIX: zone 8 = อุดรธานี, สกลนคร, หนองคาย, เลย, หนองบัวลำภู, บึงกาฬ, **นครพนม** (7 provinces),
giving 77 provinces total, which is what SPEC 6.4 expects ("77 จังหวัด").

UPDATE (verification gate, `provinceCounts` on the real CSV): with the `นตรพนม` → `นครพนม` typo
alias also in place (3 more rows, ต for ค — see PROVINCE_ALIASES in `src/config/zones.ts`), the
resolved province count for นครพนม is **10**, not 7. The "7 rows" above is only the exact-spelling
count in the raw sheet; both the exact spelling and the 3-row typo were independently confirmed
against their own row's เขตสุขภาพ cell = เขต 8.

## Team photos (SPEC 6.7) — renamed on copy
| Person | File |
|---|---|
| นางอุษา วิศาลวาณิชย์ (เก๋) | `/team/usa.jpg` |
| นางสาวรมิดา แจ้งกัน (ทราย) | `/team/ramida.jpg` (7 MB PNG → 492×600 JPEG, 29 KB) |
| นางสาวณ.ฤดี วิทพันธ์ (ไอซ์) | `/team/naruedee.jpg` |

## Severity tooltips — VERBATIM from the old sites

### Section 1 (Social Listening)
- **ระดับสีดำ (รุนแรงมาก – ฉุกเฉินภายใน 1 ชม.)**
  - เหตุรุนแรงระดับวิกฤต เช่นยิงกราด (Mass shooting)
  - ก่อการร้าย / จับตัวประกันมีผู้เสียชีวิตจำนวนมาก / เหตุสะเทือนขวัญ
- **ระดับสีแดง (รุนแรงสูง – ตอบสนองภายใน 24 ชม.)**
  - ก่อเหตุรุนแรงชัดเจน เช่น ฆาตกรรม/ทำร้ายร่างกาย
  - ฆ่าตัวตายสำเร็จ (โดยเฉพาะคนมีชื่อเสียง / กระทบสังคมสูง)
  - พฤติกรรมเสี่ยงซ้ำ มีอาวุธ หรือมีแนวโน้มทำร้ายผู้อื่น
- **ระดับสีเหลือง (รุนแรงปานกลาง – ตอบสนองภายใน 72 ชม.)**
  - มีแนวโน้มใช้ความรุนแรง (ยังไม่เกิดเหตุหนัก)
  - ข่มขู่ คุกคาม หรือมีความคิดฆ่าตัวตาย
  - พยายามฆ่าตัวตายแต่ไม่สำเร็จ
  - ข่าวเริ่มเป็นกระแส (engagement สูง)

### Section 2 (ภัยอื่นๆ)
- **ระดับสีดำ** — เหตุการณ์ที่ส่งผลกระทบด้านจิตใจในวงกว้าง (ตอบสนองใน 1 ชม.)
- **ระดับสีแดง (รุนแรงมาก – ตอบสนองใน 24 ชม.)**
  ใช้กับ "อุบัติเหตุคมนาคม/ขนส่ง" เป็นหลัก อุบัติเหตุใหญ่
  → เสียชีวิต ≥ 10 คน  → หรือบาดเจ็บ ≥ 15 คน  → หรือมีผู้สูญหายจำนวนมาก
- **ระดับสีเหลือง (รุนแรงปานกลาง-สูง – ตอบสนองใน 72 ชม.)**
  - มีผลกระทบต่อสุขภาพหรือความปลอดภัยของประชาชน แล้วมีผู้บาดเจ็บ / ผู้ป่วย / ผู้เสียชีวิต (แต่ยังไม่ถึงขั้นวิกฤตสูงสุด)
  - เหตุการณ์ขยายวงกว้าง ไม่ใช่เฉพาะจุดเล็ก ๆ อาจมีการอพยพ / ระบบบริการหยุดชะงัก / สิ่งแวดล้อมเสียหาย ต้องมีการเฝ้าระวังและบริหารจัดการอย่างใกล้ชิด

## Age bands
Follow **SPEC 4.3** (ต่ำกว่า 18 / 18–25 / 26–45 / 46–60 / มากกว่า 60 / ไม่ระบุอายุ).
The PDF's p.8 wording ("25–45", "45–60") overlaps at the boundaries; SPEC 4.3 is the agreed fix.

## Toolchain (already installed and verified green)
Vite 5 + React 18 + TS 5 + Tailwind 3 + echarts 5 + echarts-for-react + lucide-react + papaparse.
`npx tsc --noEmit -p tsconfig.app.json` and `npx vite build` both pass on the stub entry.
Path alias `@/*` → `src/*` is configured in BOTH `tsconfig.app.json` and `vite.config.ts`.

---

# VERIFIED DATA FACTS — measured directly from docs/data/*.csv on 2026-09-09
These were computed independently. Where SPEC states a different number, **SPEC is stale — trust this.**

## Row counts
- ชีต2 (`1683387958.csv`): **440** data rows. ✔ matches SPEC.
- wide tab (`842224166.csv`): **748** data rows.
- **Section 2 events = 90 rows only** (rows where col 35 or col 36 is non-empty).
  SPEC 3.3's "749 rows" is the size of the whole tab, NOT the Section-2 event count.

## MCATT (SPEC 3.4) — ✔ SPEC is correct
13 zones, **67 people, 48 MCATT, 20 SMI-V**.

## ⚠ DATA TYPOS THAT MUST BE NORMALISED

### 1. Severity is misspelled in the wide tab
`ระดับความรุนแรงภัยอื่นๆ` (wide col 39) over the 90 Section-2 rows:
`สีเหลือง` 47, **`สีีแดง` 16** (note the DOUBLED สระอี), `สีดำ` 27.
A naive equality test on `สีแดง` yields **0 red**. Normalise by collapsing repeated Thai
vowel/tone marks (or match on a `แดง` / `เหลือง` / `ดำ` substring after stripping `สี`).
NOTE: Section 2 **does** contain black rows (27), unlike Section 1.

### 2. Age "not specified" is spelled three ways
ชีต2 col 10: `ไม่ระบุ` 43, **`ไม่่ระบุ` 3** (doubled tone mark), **`ไม่รบุ` 1**, empty 1 → **48 non-numeric**.
SPEC 3.2's "43 rows" counts only the exact spelling. The `ไม่ระบุอายุ` band must capture **all 48**
so the six bands sum to 440 (SPEC 4.3). Rule: band = ไม่ระบุอายุ whenever the age is not a number.

### 3. ชีต2 has 2 future-dated rows
Month × year in ชีต2:
ต.ค.2568=2, พ.ย.2568=21, ธ.ค.2568=77, **ม.ค.2568=2**, ม.ค.2569=44, ก.พ.2569=67, มี.ค.2569=63,
เม.ย.2569=57, พ.ค.2569=60, มิ.ย.2569=44, **ธ.ค.2569=2**, blank month=1.
Today is 2569-09 BE. `ธันวาคม 2569` is in the **future** and `มกราคม 2568` is before the
fiscal year start — both are data-entry errors.
**Decision:** `latestDataMonth()` must return the newest month that is **not in the future**
relative to now. That yields **`มิถุนายน 2569`**, which is what SPEC 3.5 expects, and it keeps
self-updating as the sheet grows. Do NOT hardcode the string.

## Value distributions (all of ชีต2, n=440)
- `ระดับความรุนแรง` col 7: `สีเหลือง` 436, `สีแดง` 4. **No black rows** (SPEC correct); still support black.
- `เพศ` col 9: `ชาย` 393, `หญิง` 47. No other values.
- `ช่วงอายุ` col 11: `≥ 18 ปี` 421, `ต่ำกว่า 18` 19.
- `การจำแนกผู้ป่วย` col 14: `ผู้ป่วยรายใหม่` 180, **`ผู้ป่วยรายเก่า` 260** ← risk-factor denominator.
- `ประวัติการรักษา` col 15: ไม่มีประวัติการรักษา 159, โรงพยาบาลนอกสังกัดฯ 127,
  มีประวัติการรักษาแต่ไม่มีข้อมูล 65, โรงพยาบาลสังกัดกรมสุขภาพจิต 62,
  ข้อมูลไม่เพียงพอต่อการตรวจสอบข้อเท็จจริง 21, **`อื่น ๆ` 6** ✔ matches SPEC.
- `ผู้ป่วยจิตเวช/อื่นๆ` col 13: ผู้ป่วยจิตเวช 168, ไม่พบประวัติ 120, มีประวัติใช้สารเสพติด 98,
  ผู้ป่วย SMI-V 37, ข้อมูลไม่เพียงพอต่อการตรวจสอบ 17. (5 groups ✔)
- `การวินิจฉัยโรค` col 12 — the **3 psychiatric values only** (pie total = 170):
  `ผู้ป่วยจิตเวชจากการใช้สารเสพติด (ได้รับ Dx. F10-F19  ยกเว้น F17)` 89  ← NOTE the DOUBLE SPACE before ยกเว้น
  `ผู้ป่วยจิตเวช (Dx. F00-F99 ยกเว้น F10-F19)` 64
  `ผู้ป่วยจิตเวชใช้สารเสพติด (ยังไม่ได้รับ Dx. F10.XX-19.XX)` 17
  Excluded non-psychiatric values: ไม่พบประวัติ 120, มีประวัติใช้สารเสพติด 99, ผู้ป่วย SMI-V 33,
  ข้อมูลไม่เพียงพอต่อการตรวจสอบ 18.
  ⚠ Match these robustly (collapse runs of whitespace) — do not rely on an exact literal.
- `การฆ่าตัวตาย` col 16: `-` 350, `ฆ่าตัวตายสำเร็จ` 70, `ฆ่าตัวตายไม่สำเร็จ` 19, empty 1.
  → **suicide subset = 89 rows.**
- `การส่งรายงาน` col 8: `ตามเกณฑ์` 430, `ไม่ตามเกณฑ์` 10 → timeliness = 430/440 = **97.73% → level 0.5 (emerald, Laugh)**.
- `การช่วยเหลือผู้ก่อเหตุ` col 26 (widget 21): เข้าสู่กระบวนการทางกฎหมาย 195,
  เข้าสู่กระบวนการรักษา 129, เสียชีวิต 89, ข้อมูลไม่เพียงพอ 27.
- `เขตสุขภาพ` col 0: values look like `เขต 8`. All 13 zones present. Zone 8 = 91 rows (largest).
- `จำนวนผู้ได้บาดเจ็บ` col 22 / `จำนวนผู้เสียชีวิต` col 23: mostly `-` (355 / 334) or blank.
  **`-` and blank must parse to 0**, not NaN.

## Section 2 (the 90 rows)
- `รายงานการส่งข่าว` col 40: `ตามเกณฑ์` for all 90 → Section-2 timeliness = 100.00%.
- Hazard flags — every row carries **exactly one** flag today; **0 rows have no flag**
  (the `ภัยอื่นๆ (ไม่ระบุ)` fallback is still required for future data):
  col41 ภัยทางชีวภาพ **0**; col42 ภัยสารเคมีและรังสี **5**; col43 ภัยธรรมชาติ **15**;
  col44 ภัยทางสิ่งแวดล้อม **1**; col45 ภัยจากอุบัติเหตุ (ขนส่ง) **57**; col46 ด้านความมั่นคง **12**.
  Cells hold a descriptive sub-value (e.g. `อุบัติเหตุหมู่`, `ภัยจากอัคคีภัย`, `ภัยหนาว`), not a
  boolean — so truthiness is "non-empty and not `0`/`-`/`ไม่มีข้อมูล`/`false`", per SPEC 3.3.
- Zone col 32 (`เขตสุขภาพที่ N`): zones 2 and 11 have **no** Section-2 rows. Handle empty zones.

---

# RATIFIED DECISIONS + UI HAZARDS (after the data-layer verification gate, 128/128 PASS)

## 1. ⚠⚠ CRITICAL UI HAZARD — month inputs are GREGORIAN, filters are BUDDHIST
`Filters.fromMonth` / `Filters.toMonth` are `'YYYY-MM'` with a **BUDDHIST** year.
An HTML `<input type="month">` returns a **GREGORIAN** year (`2026-06`).
Proven by the gate: `2569-01..2569-06` matches **335** rows; `2026-01..2026-06` matches **0**.
**The FilterBar MUST convert CE → BE (+543) before calling `applyFilters`, and BE → CE (−543)
when writing the value back into the input**, or every chart on the page silently goes empty.
This is the single most likely way to ship a broken dashboard. Test it.

## 2. Zone is taken from the sheet's เขตสุขภาพ cell (SPEC 4.2) — RATIFIED
`zoneOf()` reads the row's zone cell first and only falls back to the province when that cell has
no digits. The app therefore reproduces the source sheet's own zone tallies exactly:
`1:38 2:9 3:14 4:50 5:19 6:52 7:25 8:91 9:42 10:28 11:30 12:20 13:22`.
Known source-data conflict, for the OWNER to fix in the sheet (not worked around in code):
**ชีต2 data row 402 (CSV line 403) has `เขต 11` but `จังหวัด = ตรัง`**, and ตรัง is a zone-12
province. Per SPEC 4.2 that row counts under zone 11.

## 3. The psychiatric pie needs its own aggregator
Use **`psychiatricDiagnosisCounts(rows)`** for SPEC 6.1 widget 8 — NOT `countBy(..., diagnosis)`.
`countBy` implements SPEC 4.5 ("extras are appended, never dropped"), which for this one column
contradicts SPEC 3.2 ("the other values are excluded from the pie"). The dedicated aggregator
pre-filters to the 3 psychiatric values → 3 slices totalling **170**.

## 4. The monthly trend sums to 439, not 440
One ชีต2 row has a blank `เดือน` cell and cannot be placed on a time axis.
**Do not label the trend as a total**, and do not derive "all events" from it.
The trend axis is also bracketed by two known bad rows (`ม.ค. 68`, before the fiscal-year start,
and `ธ.ค. 69`, future-dated) because SPEC 4.1 says to plot every month present in the data.

## 5. Other verified facts for the UI
- `riskFactors()` scans only the 260 `ผู้ป่วยรายเก่า` rows (numerator AND denominator), so
  `M ≤ N` holds in "จาก N ผู้ป่วยรายเก่า · มีปัจจัยเสี่ยง M ราย". Values today: [53, 22, 4], affected 64.
- `warningSigns()` denominator is all 440 events; affected 64.
- Timeliness: Section 1 430/440 = **97.73%** (level 0.5, emerald, `Laugh`);
  Section 2 90/90 = **100.00%**; combined zone-tab figure 520/530 = **98.11%**.
- `genderSplit` = ชาย 393 / หญิง 47 / other 0.
- Suicide subset 89 rows: สำเร็จ 70 / ไม่สำเร็จ 19.
- `latestDataMonth()` suppresses future-dated rows by comparing against the system clock. It
  returns `มิถุนายน 2569` today. **Known time bomb:** from December 2026 CE the two bad
  `ธันวาคม 2569` rows stop being "future" and the header will show them. Fix the sheet.

## 6. Run the gate after any data-layer change
    npx tsx --tsconfig tsconfig.app.json scripts/verify-data.ts    # 128/128, exits 1 on failure
    npx tsc --noEmit -p tsconfig.app.json
`tsconfig.app.json` only includes `src`, so `scripts/` is NOT type-checked by that command.

---

# ACCEPTANCE AUDIT OUTCOME (10 auditors, adversarial verification, 2026-09-09)

8 raw findings → **4 confirmed and fixed**, 4 refuted by a second agent that tried to disprove them.

## Fixed
1. **Donut gradients were missing** (`src/components/charts/chartOptions.ts`). `buildPieFamilyOption`
   dropped the `gradient` field, so donuts rendered flat — PDF p.9 asks for "ดูมีมิติ".
   Now `sliceGradient()` builds a per-slice radial gradient (guarded to 6-digit hex only).
2. **`ล้าง` did nothing on the first click** (`src/hooks/useFilters.ts`). `draft` and `applied` were
   seeded with the SAME object reference, so `clear()` passed React an identical reference and the
   update was skipped, leaving the user's uncommitted selections on screen. `clear()` now builds a
   fresh object. **Verified in-browser:** draft เขต 4 → one click of ล้าง → ทั้งหมด, total back to 440.
3. **`GroupImpactTable` used labels below the SPEC 8 14px chart-label size.**
4. **Section-2 severity tooltips gained a spurious `- ` prefix**, corrupting the verbatim wording
   (the red card's arrow line became `- → เสียชีวิต ≥ 10 คน`). `SeverityMetaEntry` now has an
   optional `bullet`, set to `''` for `section2.black` and `section2.red`.

## Refuted (correctly — do not "fix" these)
- Per-band combined count+% on widget 11 — SPEC 4.3 does not require it.
- MCATT per-person tile card style — SPEC 8's "MCATT cards" means the zone cards.
- Risk header `<span>` spacing — SPEC does not demand character-exact DOM here.
- `ไม่ระบุอายุ` grey being unused by the gender-split chart — the grey applies to the band, and the
  chart is coloured by gender by design.

## ⚠ UNREQUESTED CHANGE — `SearchableSelect` (owner should decide)
An agent replaced the three native `<select>` filter dropdowns with a new
`src/components/ui/SearchableSelect.tsx` (searchable, `role="combobox"`, keyboard + ARIA), and
rewired `src/components/layout/FilterBar.tsx`. **This was in no confirmed finding**, and the agent's
own report claimed it made "no src/ edits". It was KEPT because it is genuinely better for a
77-item province list and was verified working end-to-end (เขต 8 → 91 events; ล้าง resets on the
first click; tsc + build + data gate all green). SPEC 5.2 only says "dropdown", so this is a UX
upgrade, not a spec violation — but reverting to native `<select>` is a small, safe change if the
owner prefers the original behaviour.

## Final state
    npx tsc --noEmit -p tsconfig.app.json                        -> clean
    npx vite build                                               -> clean, 3 cacheable chunks
    npx tsx --tsconfig tsconfig.app.json scripts/verify-data.ts  -> 128/128 PASS
Bundle: app 214 kB gzip · thailand-geo 382 kB gzip · echarts 352 kB gzip
(was a single 950 kB gzip chunk before `manualChunks`).

## Responsive audit (2026-09-09) — 5 pages × 13 viewport widths, measured not eyeballed

Driven headlessly over CDP (`--headless=new` + `Emulation.setDeviceMetricsOverride`, which fires a
real window resize) at 320/360/390/414/640/768/1024/1280/1300/1366/1400/1440/1920. 65 page×width
combinations, each checked for: elements escaping the viewport (ignoring anything inside an
`overflow-x` scroller or a `position:fixed` ancestor), ECharts instances whose zrender surface
disagrees with its container, tables not inside a scroller, and card-title clientWidth.

**Do NOT audit layout through a background browser tab.** `echarts-for-react@3.0.6` resolves
`initEchartsInstance()` on ECharts' `'finished'` event, which is rAF-driven. In a tab where
`document.hidden === true` (any non-selected tab) that promise never settles: no canvas is ever
painted, `size-sensor`'s `bind()` is never reached, and every chart looks like it has a broken
autoResize. That produced a completely false "ECharts never resizes" reading. Headless (always
visible) shows 0 unpainted and 0 container/surface mismatches at all 13 widths.

Five real defects were found and fixed:

1. **`grid` with no `grid-cols-1`** (`McattPage`, `ContactPage`, `ReportPage`). Below the first
   `sm:`/`md:` breakpoint these had no `grid-template-columns` at all, so the implicit `auto` track
   kept its min-content floor. Thai has no word spaces, so one agency name's min-content is the
   whole string: the MCATT person grid measured 390px wide inside a 310px card and pushed 241
   elements off-screen at 390px (417 at 320px). `grid-cols-1` is `repeat(1,minmax(0,1fr))`, which
   removes the floor and lets the existing `truncate` do its job. This is why 640px looked fine —
   `sm:grid-cols-2` already used `minmax(0,1fr)`.
2. **FilterBar's `xl:grid-cols-6`** gave the คัดกรอง+ล้าง pair a 152px track for ~178px of
   content, so ล้าง hung 27px off the right edge for every width from 1280 to ~1439 — i.e. exactly
   the 1280/1366/1400 laptops. Now `xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(max-content,1fr)]`:
   the button track can't go below its content width but still shares free space, so ≥1440 looks
   the same as before.
3. **`Card`'s header could not wrap.** `right` (usually ChartTypeSwitcher, up to six icon buttons)
   is `shrink-0`, so the `min-w-0 truncate` title absorbed the whole shortfall: measured 3 dashboard
   titles at literally **0px** wide at 390px, 1 at 768px and **8 at 1024px**, plus 8 more under
   60px. No horizontal overflow, so an overflow-only check called it clean — titles must be
   measured. Now `flex-wrap xl:flex-nowrap` + `ml-auto` on the right slot, so the switcher drops to
   its own right-aligned line precisely when the untruncated title would not fit beside it.
   Result: 0 zero-width titles at every width; ≥1280 keeps its single-line header (worst case there
   is 86px of title, which is legible).
4. **ReportPage's Alert-card actions** (ดูรูปเต็มจอ + ดาวน์โหลด) are 288px of `shrink-0` content,
   which overflowed at 320px and starved the title to 5 glyphs at 390px. Labels are now
   `hidden sm:inline`, matching what PageHeader already does with โหลดข้อมูลใหม่ and what FormCard's
   header already looks like.
5. **The sticky FilterBar covered the phone screen — SPEC-ADJACENT, owner should confirm.** Nothing
   in a horizontal-overflow audit can see this; it needs the bar's height against the viewport.
   Measured `sticky` heights: 569px at 390×820, so header+bar pinned **641px of 820 = 78%** of the
   screen and the first card's title sat behind it; at 640×360 (landscape phone) the 445px pinned
   block is **taller than the whole viewport (124%)**, which puts คัดกรอง permanently off-screen and
   makes the bar unusable. From `md` up the bar is at most two rows — 215px at 768 (28%), 139px at
   1280 (26%) — which is fine. Changed `sticky` → `md:sticky` in `FilterBar.tsx`, so on phones the
   bar scrolls away like normal content and stays pinned everywhere it fits. `top` is inert while
   the element is static, so no second breakpoint was needed. **SPEC 5.2 says "sticky" without
   qualification**, so this narrows the spec's literal wording on phones only; revert by dropping
   the `md:` prefix if the owner wants it pinned at every width.

Verified-correct, no change needed: sidebar is a drawer below `lg` and a fixed 256px column at
≥1024 at every width tested; all 3 dashboard / 4 zone tables sit in `overflow-x` scrollers and
actually scroll on phones; every section grid collapses 4 → 2 → 1; all 16 charts resize with their
container at every width.

**Reported, deliberately NOT changed:** category axis labels collide on narrow charts (~330px wide
at 768px, 2-up grid) because `chartOptions.ts` sets `interval: 0` with `hideOverlap: false` — every
label always renders, wrapped by `wrapThaiLabel`. That is an explicit "show all labels" choice, so
trading it for `hideOverlap: true` (legible but some labels hidden) is the owner's call, not a bug
fix. Also unchanged: touch-target sizes below the 44px guideline — the 24×24 hamburger, 23px `tel:`
links on MCATT, 26px "เปิดลิงก์" links — which is an a11y question, not a layout one.

Re-verified after the fixes: 65/65 combinations with zero escaping elements, zero unpainted or
mis-sized charts, zero unwrapped wide tables; `tsc` clean; `vite build` clean; data gate 128/128.
