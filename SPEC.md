# Social Listening Dashboard (React) — Specification

Status: agreed with the owner on 2026-09-09 after the grilling session, amended the same day to merge the second old site (option "a"). This is the source of truth for the build.

## 1. Goal

Rebuild the two old sites as one React app:

- **Site 1** https://mhsosociallistening.netlify.app/ — the Social Listening page (ส่วนที่ 1 + ส่วนที่ 2). This is the page the review in `งานแก้.pdf` was written against. It becomes the **Dashboard** tab with every PDF fix applied.
- **Site 2** https://capable-dango-8c52bb.netlify.app/ — "Dashboard สุขภาพจิต", a sidebar app with five tabs. Its four extra tabs (สถานการณ์ปัจจุบันรายเขต, รายงาน, MCATT & SMI-V, ติดต่อเรา) are kept and rebuilt in the same look as the Dashboard tab.

The app

- reads live data from the Google Sheet `1BZahLYr5A1t4SIcLmg6fiHA74-3PPBWU7IWp_lMyy_U`,
- applies every fix requested in `งานแก้.pdf` (11 pages),
- uses ECharts for all charts and Lucide for all icons,
- lets the viewer switch each chart to another chart type from inside the web page.

The `fbclid` parameter on the shared URLs is only Facebook tracking.

## 2. Reference material reviewed

| Source | What it is | Key facts |
|---|---|---|
| Site 1 HTML (`docs/reference/site1/index.html`) | One 1,042-line HTML file | Chart.js + datalabels, D3 v7 (map), PapaParse, Tailwind CDN, Font Awesome, Sarabun font. Reads gid `1523955266`. |
| Site 2 HTML (`docs/reference/site2/index.html`) | One 294 KB HTML file, 45 JS functions | Same libraries. Sidebar + 5 tabs, per-zone view, timeliness score, MCATT directory, report forms, contact page. Reads gid `842224166`, whose CSV is byte-identical to gid `1523955266`. Static files copied to `docs/reference/site2/` (alert_criteria.jpg, form_human.pdf, form_disaster.pdf, 3 team photos). |
| `งานแก้.pdf` | 11 pages of Thai review notes with screenshots of site 1 | Screenshots extracted to `docs/reference/` |
| Google Sheet | 3 tabs: `ชีต2`, `สำเนาของ ชีต2`, `ผอ` | Publicly readable with the link. CSV export works without a key. |

## 3. Data sources

### 3.1 Fetch method (decision: direct CSV export)

- Fetch in the browser with PapaParse `download: true, header: false`.
- URL pattern: `https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>`
- Two fetches on load, in parallel.
- Manual reload button (Lucide `RefreshCw`) and "อัปเดตล่าสุด HH:MM" text in the header.
- Requirement: the sheet must remain "anyone with the link can view".
- Loading overlay while fetching, error banner with retry if a fetch fails.

### 3.2 Section 1 — Social Listening — tab `ชีต2` (gid `1683387958`)

440 data rows, 37 columns, one row per news event. Columns by index (0-based), header, and use:

| # | Header | Used for |
|---|---|---|
| 0 | เขตสุขภาพ | Zone filter (`เขต 8` → 8) |
| 1 | *(blank header)* | Month name in Thai (`พฤศจิกายน`) |
| 2 | ปี | Buddhist year (`2568`) |
| 3 | จังหวัด | Province filter, map, top 10 |
| 4 | เนื้อหา | Headline in events table |
| 5 | link | News link in events table |
| 6 | ช่องทาง Alert | Not displayed (PDF p.11) |
| 7 | ระดับความรุนแรง | KPI black/red/yellow, table badge |
| 8 | การส่งรายงาน | `ตามเกณฑ์` / `ไม่ตามเกณฑ์` → timeliness score (6.4) and table column |
| 9 | เพศ | Gender charts |
| 10 | อายุ | Numeric age or `ไม่ระบุ` → age bands |
| 11 | ช่วงอายุ | `≥ 18 ปี` / `ต่ำกว่า 18` → suicide age split |
| 12 | การวินิจฉัยโรค | 3-group psychiatric pie (PDF p.6) |
| 13 | ผู้ป่วยจิตเวช/อื่นๆ | 5-group patient bar (PDF p.6, p.7) |
| 14 | การจำแนกผู้ป่วย | Old/new patient pie (PDF p.9); denominator for risk factors |
| 15 | ประวัติการรักษา | Treatment history donut (PDF p.9) |
| 16 | การฆ่าตัวตาย | Suicide filter + success/fail pie |
| 17 | วิธีการฆ่าคัวตาย | Suicide method top 5 |
| 18 | สาเหตุการฆ่าตัวตาย | Suicide cause top 5 |
| 19 | สถานที่ก่อเหตุ | Suicide location top 10 |
| 20 | มีผู้ได้รับผลกระทบ | Not displayed |
| 21 | ประเภทผู้ได้รับผลกระทบ | Not displayed |
| 22 | จำนวนผู้ได้บาดเจ็บ | Injured per patient group |
| 23 | จำนวนผู้เสียชีวิต | Deaths per patient group |
| 24 | รายงานข้อเท็จจริงด้านจิตเวช | Not displayed |
| 25 | ผู้ปฏิบัติงาน | Not displayed |
| 26 | การช่วยเหลือผู้ก่อเหตุ | Not displayed |
| 27–30 | ขาดยา, กลับมาเสพซ้ำ, ไม่มาตามนัด, อื่น ๆ | Risk factors (keyword scan, see 4.4) |
| 31–36 | ไม่หลับไม่นอน, เดินไปเดินมา, พูดจาคนเดียว, หงุดหงิด, เที่ยวหวาดระแวง, ไม่มีอาการ | Warning signs (keyword scan, see 4.4) |

Lookup rule: resolve columns by trimmed header name, with the index above as fallback. Column 1 has a blank header and is always resolved by index.

Observed value sets (2026-09-09), used to define fixed category orders:

- ระดับความรุนแรง: `สีเหลือง`, `สีแดง` (no black rows yet; black must still be supported).
- ผู้ป่วยจิตเวช/อื่นๆ: `ไม่พบประวัติ`, `มีประวัติใช้สารเสพติด`, `ผู้ป่วยจิตเวช`, `ผู้ป่วย SMI-V`, `ข้อมูลไม่เพียงพอต่อการตรวจสอบ`.
- การวินิจฉัยโรค (psychiatric subset): `ผู้ป่วยจิตเวช (Dx. F00-F99 ยกเว้น F10-F19)`, `ผู้ป่วยจิตเวชใช้สารเสพติด (ยังไม่ได้รับ Dx. F10.XX-19.XX)`, `ผู้ป่วยจิตเวชจากการใช้สารเสพติด (ได้รับ Dx. F10-F19 ยกเว้น F17)`. Other values in this column (`ไม่พบประวัติ`, `มีประวัติใช้สารเสพติด`, `ผู้ป่วย SMI-V`, `ข้อมูลไม่เพียงพอต่อการตรวจสอบ`) are not psychiatric and are excluded from the pie.
- การจำแนกผู้ป่วย: `ผู้ป่วยรายเก่า`, `ผู้ป่วยรายใหม่`.
- ประวัติการรักษา: `ไม่มีประวัติการรักษา`, `มีประวัติการรักษาแต่ไม่มีข้อมูล`, `โรงพยาบาลสังกัดกรมสุขภาพจิต`, `โรงพยาบาลนอกสังกัดกรมสุขภาพจิต`, `ข้อมูลไม่เพียงพอต่อการตรวจสอบข้อเท็จจริง`, plus `อื่น ๆ` (6 rows, appended as extra category).
- การฆ่าตัวตาย: `-` (not a suicide event), `ฆ่าตัวตายสำเร็จ`, `ฆ่าตัวตายไม่สำเร็จ`.
- อายุ: integers or a non-numeric "not specified" value (48 rows: `ไม่ระบุ` 43, `ไม่่ระบุ` 3 doubled-tone-mark typo, `ไม่รบุ` 1 typo, blank 1). Corrected per docs/BUILD_NOTES.md "Age not specified", which overrides this section; the previously stated 43 undercounted the 3 typo spellings and 1 blank row measured on the real docs/data/1683387958.csv.

### 3.3 Section 2 — ภัยอื่นๆ — wide tab (gid `842224166`)

749 rows, 84 columns. Gid `842224166` (used by site 2) and gid `1523955266` (used by site 1) return identical CSV; the app fetches `842224166` and falls back to `1523955266` if it fails. The ภัยอื่นๆ block starts at index 32. Resolved by index only (headers are inconsistent).

| # | Header | Used for |
|---|---|---|
| 32 | เขตสุขภาพที่ 1 *(sic)* | Zone (`เขตสุขภาพที่ 1` → 1) |
| 33 | เดือนภัยอื่นๆ | Month |
| 34 | ปีภัยอื่นๆ | Year |
| 35 | จังหวัดภัยอื่นๆ | Province, map, top 10 |
| 36 | หัวข้อข่าวภัยอื่นๆ | Headline |
| 37 | Link ภัยอื่นๆ | News link |
| 38 | ช่องทาง alert | Not displayed (PDF p.11) |
| 39 | ระดับความรุนแรงภัยอื่นๆ | KPI + badge |
| 40 | รายงานการส่งข่าวภัยอื่นๆ | `ตามเกณฑ์` / `ไม่ตามเกณฑ์` → timeliness score (6.4) and table column |
| 41 | ภัยทางชีวภาพ | Hazard type flag |
| 42 | ภัยสารเคมีและรังสี | Hazard type flag |
| 43 | ภัยธรรมชาติ | Hazard type flag |
| 44 | ภัยทางสิ่งแวดล้อม | Hazard type flag |
| 45 | ภัยจากอุบัติเหตุ (ขนส่ง) | Hazard type flag |
| 46 | ด้านความมั่นคง | Hazard type flag |
| 47–62 | staff/public impact, d/c, admit, refer, hospital, สถานที่เกิดเหตุ, actions, ผู้ปฏิบัติงาน | Not displayed (PDF p.11 removes location, actions, staff) |

A row belongs to Section 2 only if column 35 or 36 is non-empty. A flag is "true" when the cell is non-empty and not `0`, `-`, `ไม่มีข้อมูล`, `false`. A row with no flag is counted as `ภัยอื่นๆ (ไม่ระบุ)`. A row can carry several flags and is counted once per flag in the hazard pie.

### 3.4 MCATT & SMI-V directory — wide tab, staff block (indexes 64–71)

Same CSV as 3.3. Thirteen rows carry a zone in column 64; the block is not aligned with the event rows. Parsed exactly as site 2 does:

| # | Header | Rule |
|---|---|---|
| 64 | เขตสุุขภาพ | `เขตสุขภาพที่ N` + province list on following lines. Zone number from the digits; carried forward to later rows until a new zone appears. |
| 65 | ชื่อ - นามสกุล ผู้รับผิดชอบ | One or more names separated by newlines (`1.นาง…`). Leading `1.`/`1 ` numbering is stripped for display. A blank, `-` or `ไม่มีข้อมูล` cell means no person. |
| 66 | เบอร์โทรติดต่อ | Newline-separated, index-aligned with names; falls back to the first value. |
| 67 | หน่วยงาน | Same alignment rule. |
| 68 | ID Line | Same alignment rule; shown when present. |
| 69 | ชื่อไลน์ | Same alignment rule; shown when present. |
| 70 | MCATT | Non-empty and not `-`/`ไม่มี`/`0` → role badge MCATT. |
| 71 | SMI-V | Same rule → role badge SMI-V. |
| 72 | ลิงค์ไฟล์PDF | Empty today; ignored. |

Observed on 2026-09-09: 67 names across the 13 zones, 48 with MCATT, 20 with SMI-V.

### 3.5 Data coverage note and assumption

`ชีต2` (440 rows) is a subset of the wide tab's human-hazard block (580 rows, indexes 0–29). Its rows match the wide tab by link (406 of 407 links in common) but it stops at มิถุนายน 2569 while the wide tab already has rows through กันยายน 2569. The wide tab also has the same risk/sign columns at indexes 74–83 that `ชีต2` has at 27–36, but it lacks การวินิจฉัยโรค, ผู้ป่วยจิตเวช/อื่นๆ (5 groups), การจำแนกผู้ป่วย and ประวัติการรักษา, which the PDF fixes require.

Assumption (owner decision Q1 stands): `ชีต2` is the going-forward source for every human-hazard widget, on every tab. The header of Section 1 shows `ข้อมูลล่าสุดถึง <เดือน ปี>` computed from the data so the lag is visible. Nothing is read from wide-tab indexes 0–29 or 74–83.

## 4. Data normalisation rules

### 4.1 Month and year

- Month: Thai full name or abbreviation or number → 1–12 (same table as the old site: `ม.ค.`/`มกรา` → 1, …).
- Year: 4-digit Buddhist; if < 2500 add 543. Fallback to 2-digit heuristics as in the old site.
- Sort key: `year * 12 + month`. Trend labels: `ต.ค. 68` style (abbreviated month + 2-digit BE year).
- The trend shows every month present in the filtered data, sorted chronologically. Title keeps "ปีงบประมาณ 2569".

### 4.2 Province and zone

- Province name normalisation: strip `จ.`/`จังหวัด`, map aliases (`กทม`, `กรุงเทพ`, `กรุงเทพฯ` → `กรุงเทพมหานคร`, `โคราช` → `นครราชสีมา`, `อยุธยา` → `พระนครศรีอยุธยา`, `เมืองคอน` → `นครศรีธรรมราช`, `แปดริ้ว` → `ฉะเชิงเทรา`, `หนองบัวลำพู` → `หนองบัวลำภู`, `ประจวบ` → `ประจวบคีรีขันธ์`, `มหาสารคราม` → `มหาสารคาม`).
- Zone → provinces table copied from the old site (13 health zones). Zone number parsed from digits in the zone cell.
- Province dropdown lists provinces of the selected zone (all 77 when zone = all).

### 4.3 Age bands (PDF p.8, agreed design)

| Band | Rule |
|---|---|
| ต่ำกว่า 18 | age < 18 |
| 18–25 | 18 ≤ age ≤ 25 |
| 26–45 | 26 ≤ age ≤ 45 |
| 46–60 | 46 ≤ age ≤ 60 |
| มากกว่า 60 | age > 60 |
| ไม่ระบุอายุ | non-numeric age (shown last, grey) |

All six bands sum to the total events, so nothing is hidden. Each band shows count + percent of all events, split by gender (ชาย/หญิง).

### 4.4 Risk factors and warning signs (PDF p.2, agreed keyword scan)

Join the ten cells (indexes 27–36) of a row into one string. Ignore `-` and blanks. Detect:

| Item | Keywords |
|---|---|
| ปัจจัย 1 ขาดยา/ไม่มาตามนัด | `ขาดยา`, `ขาดการรักษา`, `รักษาไม่ต่อเนื่อง`, `ไม่มาตามนัด` |
| ปัจจัย 2 เสพซ้ำ | `เสพซ้ำ`, `กลีบมาเสพ` (typo seen in data) |
| ปัจจัย 3 อื่นๆ | cell 30 (`อื่น ๆ`) non-empty and not `-` |
| สัญญาณ หงุดหงิดฉุนเฉียว | `หงุดหงิด` |
| สัญญาณ เที่ยวหวาดระแวง | `ระแวง` |
| สัญญาณ พูดจาคนเดียว | `พูดคนเดียว`, `พูดจาคนเดียว`, `พูดตนเดียว`, `หูแวว`, `หลอน` |
| สัญญาณ ไม่หลับไม่นอน | `ไม่หลับ`, `นอนไม่หลับ` |
| สัญญาณ เดินไปเดินมา | `เดินไป` |

Percent rules:

- Risk factors: denominator = number of `ผู้ป่วยรายเก่า` rows in the filtered data. Header line: `จาก N ผู้ป่วยรายเก่า · มีปัจจัยเสี่ยง M ราย (X%)`.
- Warning signs: denominator = all filtered events. Header line: `จาก N เหตุการณ์ · มีสัญญาณเตือน M เหตุการณ์ (X%)`. Footnote: `หมายเหตุ: 1 เหตุการณ์สามารถมีได้มากกว่า 1 สัญญาณเตือน`.

### 4.5 Categories

- Category order follows the PDF list for each chart. Values in the data that are not in the list are appended after the fixed ones, never dropped.
- Blank and `-` cells are excluded from category charts.
- Percent inside a chart = value / that chart's own total, formatted `123 (45.6%)`.

### 4.6 Suicide subset

Rows where การฆ่าตัวตาย is not blank and not `-`. Method, cause and location are counted only inside this subset (as the old site did). Location values `ตลาด / ร้านค้า` and `ตลาดร้านค้า` are merged.

## 5. App shell, navigation and filters

### 5.1 Shell (from site 2)

- Left sidebar, 256 px on desktop, collapsible top bar with a hamburger on phones. Brand block at the top: small "MHSO / DMH · Social Listening" label and the title "Dashboard สุขภาพจิต". Footer of the sidebar: `กองบริหารระบบบริการสุขภาพจิต กรมสุขภาพจิต · อาคาร 2 ชั้น 3 ต.ตลาดขวัญ อ.เมือง จ.นนทบุรี 11000 · โทร 0 2590 8220, 0 2590 8578` and a "โหลดข้อมูลใหม่" button.
- Five tabs with Lucide icons: Dashboard (`LayoutDashboard`), สถานการณ์ปัจจุบันรายเขต (`MapPinned`), รายงาน (`FileText`), MCATT & SMI-V (`Users`), ติดต่อเรา (`Phone`).
- Hash routes `#/dashboard`, `#/zone`, `#/report`, `#/mcatt`, `#/contact` so a link can open a tab directly; no router library, one small hook.
- Sticky page header shows the tab title (for the zone tab: `สถานการณ์ปัจจุบันรายเขต (เขต N)` or `(ภาพรวม)`) and `อัปเดต: HH:MM`.
- Both sheet fetches happen once at app start and are shared by all tabs; the reload button refetches both.

### 5.2 Filters (unchanged from site 1, PDF p.1)

Sticky bar under the page header on the Dashboard and zone tabs: ตั้งแต่เดือน (month input), ถึงเดือน (month input), เขตสุขภาพ (ทั้งหมด + 13 zones), จังหวัด (depends on zone), ประเภทภัย (ทั้งหมด, Social Listening, ภัยอื่นๆ (รวม), ภัยชีวภาพ, ภัยเคมีและรังสี, ภัยธรรมชาติ, ภัยสิ่งแวดล้อม, อุบัติเหตุขนส่ง, ความมั่นคง), buttons คัดกรอง and ล้าง.

- Filters apply on คัดกรอง, not live.
- ประเภทภัย = Social Listening hides Section 2; any ภัยอื่นๆ value hides Section 1; ทั้งหมด shows both.
- Clicking a province on either map sets the province filter and applies.
- A small jump menu (Lucide icons) scrolls to Section 1 / Section 2.
- The Dashboard tab and the zone tab each keep their own filter state (as site 2 does). Dashboard defaults to เขตสุขภาพ = ทั้งหมด; the zone tab defaults to เขตสุขภาพที่ 1 and its zone select also offers ทั้งหมด.

## 6. Widgets

### 6.1 Section 1 — ข้อมูล Social Listening

| # | Widget | PDF fix | Default chart | Switchable to |
|---|---|---|---|---|
| 1 | 3 ปัจจัยเสี่ยงหลัก infographic | p.2: prettier, count + %, denominator = old patients | Infographic | — |
| 2 | 5 สัญญาณเตือน infographic | p.2: like risk factors, add header line and footnote | Infographic | — |
| 3 | KPI cards: ทั้งหมด, ดำ, แดง, เหลือง | p.3: keep text, hover tooltip with criteria | Cards | — |
| 4 | แนวโน้มรายเดือน | p.4: monthly, line with gradient area, count + % | Area line | line, area, bar, step |
| 5 | แผนที่ความหนาแน่น | p.5: keep scale 1–15 / 16–30 / 31–45 / 46–60 / ≥61, darker = more | ECharts map | — |
| 6 | 10 อันดับจังหวัด | p.5: count + % | Horizontal bar | bar, pie, donut, treemap, funnel |
| 7 | จำนวนผู้ป่วย 5 กลุ่ม | p.6: bar with 5 types, count + % | Vertical bar | h-bar, pie, donut, rose, treemap |
| 8 | กลุ่มผู้ป่วยจิตเวช 3 ประเภท | p.6: pie, count + % | Pie | donut, rose, bar, h-bar |
| 9 | ผู้เสียชีวิต / บาดเจ็บ ตามกลุ่มผู้ป่วย | p.7: 5 groups, deaths and injuries | Table with mini bars | grouped bar, h-bar |
| 10 | เพศ | p.8: prettier, count + % | Figure infographic | — |
| 11 | ช่วงวัย × เพศ | p.8: 6 bands (see 4.3), count + % | Grouped bar | stacked bar, h-bar |
| 12 | ประเภทผู้ป่วย เก่า/ใหม่ | p.9 | Pie | donut, bar |
| 13 | ประวัติการรักษา | p.9: pie with depth, 5 categories, count + % | Donut | pie, rose, bar, h-bar |
| 14 | ฆ่าตัวตาย: สำเร็จ/ไม่สำเร็จ | p.10 (1): pie, count + % | Pie | donut, bar |
| 15 | ฆ่าตัวตาย: สถานที่ 10 อันดับ | p.10 (2) | Horizontal bar | bar, pie, donut, treemap |
| 16 | ฆ่าตัวตาย: เพศ และช่วงวัย (<18 / ≥18) | p.10 (3) | Figure infographic | — |
| 17 | ฆ่าตัวตาย: สาเหตุ 5 อันดับ | p.10 (4) | Horizontal bar | bar, pie, donut, funnel |
| 18 | ฆ่าตัวตาย: วิธี 5 อันดับ | p.10 (5) | Vertical bar | h-bar, pie, donut, funnel |
| 19 | ตารางเหตุการณ์ | keep | Table | — |
| 20 | จำนวนเหตุการณ์รายเขตสุขภาพ (เขต 1–13) | from site 2's Dashboard, not in the PDF; count + % | Vertical bar | line, h-bar |
| 21 | การช่วยเหลือผู้ก่อเหตุ (column 26: กฎหมาย / รักษา / เสียชีวิต / ข้อมูลไม่เพียงพอ) | from site 2's Dashboard, not in the PDF; count + % | Donut | pie, bar, h-bar |

Widgets 20 and 21 are the only things taken from site 2 into the Dashboard tab. The owner can strike them.

Severity tooltip texts (from the old site, keep verbatim):

- ระดับสีดำ (รุนแรงมาก – ฉุกเฉินภายใน 1 ชม.): เหตุรุนแรงระดับวิกฤต เช่นยิงกราด (Mass shooting); ก่อการร้าย / จับตัวประกันมีผู้เสียชีวิตจำนวนมาก / เหตุสะเทือนขวัญ
- ระดับสีแดง (รุนแรงสูง – ตอบสนองภายใน 24 ชม.): ฆาตกรรม; ฆ่าตัวตายสำเร็จของบุคคลสาธารณะ; พฤติกรรมเสี่ยงก่อความรุนแรง
- ระดับสีเหลือง (รุนแรงปานกลาง – ตอบสนองภายใน 72 ชม.): พฤติกรรมข่มขู่; พยายามฆ่าตัวตาย; ข่าวกระแสสูงมี engagement มาก

### 6.2 Section 2 — ข้อมูลภัยอื่นๆ (6 หมวดหมู่)

| # | Widget | PDF fix | Default chart | Switchable to |
|---|---|---|---|---|
| 1 | KPI cards ทั้งหมด, ดำ, แดง, เหลือง | p.11: prettier, tooltips | Cards | — |
| 2 | แผนที่ (ภัยอื่นๆ) | keep blue buckets ≥13 / 10–12 / 7–9 / 4–6 / 1–3 | ECharts map | — |
| 3 | 10 อันดับจังหวัด | count + % | Horizontal bar | bar, pie, donut, treemap |
| 4 | สัดส่วนประเภทภัย 6 หมวด | count + % | Pie | donut, rose, bar, h-bar |
| 5 | ตารางเหตุการณ์ | p.11: no location, actions, staff, alert channel | Table | — |

Section 2 KPI tooltip texts: ระดับสีดำ = เหตุการณ์ที่ส่งผลกระทบด้านจิตใจในวงกว้าง; ระดับสีแดง = อุบัติเหตุขนส่งใหญ่ (เสียชีวิต ≥10 หรือบาดเจ็บ ≥15) และเหตุรุนแรงมาก – ตอบสนองใน 24 ชม.; ระดับสีเหลือง = ผลกระทบด้านสาธารณสุข/ความปลอดภัยในวงกว้าง – ตอบสนองใน 72 ชม. (wording to be copied from the old page's hidden text during build).

### 6.3 Tables

- Columns Section 1: ลำดับ, เดือน/ปี, เขต, จังหวัด, หัวข้อข่าว, ลิงก์, ระดับ, การส่งรายงาน (green pill ตามเกณฑ์ / red pill ไม่ตามเกณฑ์, as in site 2's table).
- Columns Section 2: ลำดับ, เดือน/ปี, เขต, จังหวัด, ประเภทภัย (pills), หัวข้อข่าว, ลิงก์, ระดับ, การส่งรายงาน.
- Search box (headline/province), 20 rows per page with pagination, newest first.

### 6.4 Tab สถานการณ์ปัจจุบันรายเขต (from site 2)

One `DashboardView` component rendered in "zone mode". Same Section 1 and Section 2 widgets as the Dashboard tab (same ids, same switcher choices), with these differences:

1. **Timeliness score card** at the top: `เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา)`. Over the filtered rows of both sections, count rows whose การส่งรายงาน (ชีต2 col 8, wide col 40) is non-empty and not `-`/`ไม่มีข้อมูล` as `total`, and rows containing `ตามเกณฑ์` without `ไม่` as `pass`. Show `pass/total` as a percent with two decimals, the level, a Lucide face icon, and the line `(ดำเนินการทันเวลา {pass} จากรวมทั้งหมด {total} เหตุการณ์)`; `ไม่มีข้อมูล` when total = 0. A small legend table shows the criteria.

   | Percent | Level | Colour | Icon |
   |---|---|---|---|
   | ≥ 90.00 | 0.5 | emerald | `Laugh` |
   | 85.00–89.99 | 0.4 | blue | `Smile` |
   | 80.00–84.99 | 0.3 | amber | `Meh` |
   | 75.00–79.99 | 0.2 | orange | `Frown` |
   | 70.00–74.99 | 0.1 | rose | `Annoyed` |
   | < 70.00 | 0.0 | red | `Skull` |

2. **Map zoomed to the zone.** The GeoJSON features of the selected zone's provinces are registered as their own ECharts map (`zone-N`), so the zone fills the card; subtitle `N จังหวัด`. Zone = ทั้งหมด shows the whole country (77 จังหวัด). Same colour buckets as the Dashboard maps.
3. **Trend by province** replaces the zone bar (widget 20): one bar per province of the zone, count + %, switchable to line / h-bar. The monthly trend (widget 4) stays.
4. Section titles read `(เขตสุขภาพที่ N)`.

### 6.5 Tab MCATT & SMI-V (from site 2)

- Data from 3.4. Thirteen zone groups in order, each with a header `เขตสุขภาพที่ N` and the zone's province list from 4.2 as subtitle.
- One card per person: name, agency (`Building2`), phone as a `tel:` link (`Phone`), Line ID and Line name when present (`MessageCircle`), role badges MCATT (orange) and SMI-V (blue). A zone with no people shows `ยังไม่มีข้อมูลบุคลากรในเขตนี้`.
- Search box filters by name, agency or province; a role toggle (ทั้งหมด / MCATT / SMI-V).
- No charts on this tab, so no switcher.

### 6.6 Tab รายงาน (from site 2)

- Card `เกณฑ์การ Alert ข่าว (SOCIAL LISTENING)`: the image `public/reference/alert_criteria.jpg` (copied from site 2) with buttons ดูรูปเต็มจอ (lightbox) and ดาวน์โหลด.
- Card `แบบฟอร์มการรายงาน (DCIR)`: two sub-cards, `แบบฟอร์มภัยน้ำมือมนุษย์` → `public/forms/form_human.pdf` and `แบบฟอร์มภัยพิบัติ` → `public/forms/form_disaster.pdf`, each with an inline PDF viewer (`<iframe>`), an open-in-new-tab button and a download button. If the browser cannot render the PDF the card still offers the download link.

### 6.7 Tab ติดต่อเรา (from site 2)

`ทีมงาน Social Listening`, three cards with photo, name, nickname, position and phone, copied verbatim from site 2:

| Name | Nickname | Position | Phone | Photo |
|---|---|---|---|---|
| นางอุษา วิศาลวาณิชย์ | เก๋ | นักจิตวิทยาคลินิกชำนาญการพิเศษ | 081-4893148 | S__89161737.jpg |
| นางสาวรมิดา แจ้งกัน | ทราย | นักวิชาการสาธารณสุข | 095-9687704 | Gemini_Generated_Image_bepz99bepz99bepz.png |
| นางสาวณ.ฤดี วิทพันธ์ | ไอซ์ | นักวิชาการสาธารณสุข | 085-0869470 | S__88465427.jpg |

Photos are copied to `public/team/` and the 7 MB PNG is resized to a 600 px JPEG before bundling.

## 7. Chart-type switcher (agreed scope: option A)

- Every chart card header has a switcher: a row of Lucide icon buttons (`BarChart3`, `BarChartHorizontal`, `LineChart`, `AreaChart`, `PieChart`, `Donut`, `Flower2` for rose, `LayoutGrid` for treemap, `Filter` for funnel). Only types valid for that widget's data shape are shown (see tables above).
- Every chart keeps count + percent labels in every type.
- Choice persisted per widget id in `localStorage` key `sl-dashboard:chartTypes`.
- A "รีเซ็ตรูปแบบกราฟ" button in the header restores defaults.
- Non-chart widgets (KPI cards, infographics, maps, figures, tables) have no switcher.
- The zone tab reuses the Dashboard widget ids, so a choice made on one tab applies on the other.

## 8. Visual design (agreed: refine, not redesign)

- Font: Sarabun (Google Fonts), weights 300–800.
- Sizes: body 18px, card title 22px, section title 28px, KPI number 56px, chart labels 14px, table 16px.
- Background `#F5F7FB`; cards white, radius 24px, soft shadow.
- Palette: Section 1 orange family (`#EA580C` primary), Section 2 blue family (`#2563EB`), severity black `#1E293B`, red `#E11D48`, yellow `#F59E0B`, gender ชาย `#2563EB` / หญิง `#EC4899`, suicide success `#FCA5A5` / fail `#6EE7B7`, categorical pastel set for pies.
- Gradient fills on the trend area and donuts for the "มีมิติ" look.
- Responsive: 1 column on phones, 2 on tablets, up to 4 on desktop.
- Icons: lucide-react only. No Font Awesome.
- Sidebar: white with a thin border, active tab with an orange left bar and pale orange background (site 2 used a pastel-orange sidebar `#FFDCA8`; the new one follows the Dashboard palette instead so all tabs match). Brand title in Sarabun 800.
- Timeliness card, MCATT cards, report cards and contact cards use the same card style (white, radius 24, soft shadow) and the same font sizes as the Dashboard.

## 9. Tech stack and structure

- Vite 5, React 18, TypeScript, Tailwind CSS 3, `echarts` 5 + `echarts-for-react`, `lucide-react`, `papaparse`.
- Thailand province GeoJSON bundled at `src/assets/thailand.json` (from apisit/thailand.json), registered with `echarts.registerMap`.
- No router library (hash hook), no backend, no state library; React context for data, per-tab filter state.

```
D:\DashboardReport
├── SPEC.md
├── งานแก้.pdf
├── docs/reference/            PDF screenshots, site1/ and site2/ HTML + assets
├── index.html
├── package.json, vite.config.ts, tailwind.config.js, tsconfig.json
├── netlify.toml
├── public/
│   ├── forms/         form_human.pdf, form_disaster.pdf
│   ├── reference/     alert_criteria.jpg
│   └── team/          three photos
└── src/
    ├── main.tsx, App.tsx, index.css
    ├── config/        sheet ids, zones, categories, palettes, keywords, team, nav
    ├── data/          fetchSheet.ts, parse*.ts, normalize.ts, aggregate*.ts, mcatt.ts, timeliness.ts
    ├── hooks/         useSheetData, useFilters, useChartType, useHashRoute
    ├── components/
    │   ├── layout/    Sidebar, PageHeader, FilterBar, SectionNav, Card
    │   ├── charts/    SwitchableChart, ThailandMap (country + zone maps), chart option builders
    │   ├── widgets/   KpiCards, RiskWarning, GenderFigure, AgeBands, GroupImpactTable, EventsTable, TimelinessCard
    │   └── sections/  SocialListeningSection, OtherHazardsSection
    ├── pages/         DashboardPage, ZonePage, ReportPage, McattPage, ContactPage
    └── types/
```

## 10. Build and deploy

- `npm install`, `npm run dev` for local, `npm run build` → `dist/`.
- `netlify.toml`: publish `dist`, build `npm run build`, SPA redirect.
- No git for now (owner decision). Deployment is done by the owner.

## 11. Acceptance checklist (maps to PDF pages)

- [ ] p.1 Filters unchanged; all text noticeably larger.
- [ ] p.2 Risk factors prettier, count + %, denominator = old patients. Warning signs header line and footnote.
- [ ] p.3 Severity cards keep wording; hover tooltip explains each level.
- [ ] p.4 Monthly trend as gradient area line with count + %.
- [ ] p.5 Map scale kept; top 10 provinces with count + %.
- [ ] p.6 5-group patient bar and 3-group psychiatric pie, count + %.
- [ ] p.7 Deaths and injuries per 5 groups.
- [ ] p.8 Gender and 6 age bands with count + %, unspecified age shown.
- [ ] p.9 Old/new pie; treatment history donut, count + %.
- [ ] p.10 Suicide: success/fail pie, top 10 locations, gender with 2 age bands, top 5 causes, top 5 methods.
- [ ] p.11 Section 2 kept and prettier; location, actions, staff, alert channel removed.
- [ ] Every chart uses ECharts; every icon is Lucide; every chart has a working type switcher that persists.
- [ ] Data refreshes from the sheet on load and on reload button.
- [ ] Sidebar with 5 tabs; hash links open the right tab; works on phone width.
- [ ] Zone tab: timeliness score matches site 2's formula and levels; map zooms to the zone; trend by province.
- [ ] MCATT tab: 13 zones, 67 people today, roles and phones correct against the sheet; search works.
- [ ] Report tab: criteria image with lightbox and download; both DCIR PDFs viewable and downloadable.
- [ ] Contact tab: three team cards with photos.
- [ ] Section 1 header shows the latest data month so the ชีต2 lag is visible.
