// Accessible table equivalent of a chart (audit UX-13): every analytical chart card can swap
// its plot for this table, and always renders summaryText() underneath the plot so the key
// numbers are available as text even when the plot itself is not readable.

export interface DataTableSeries {
  name: string
  /** null = the category was never reported (UX-02) — rendered as '—', never as a zero. */
  values: (number | null)[]
}

export interface DataTableProps {
  /** Rendered as the table's <caption> — pass the card title. */
  caption: string
  categories: string[]
  /** One entry for a single-series chart, one per series for a multi-series chart. */
  series: DataTableSeries[]
  /** Header of the first (row-header) column. */
  categoryHeader?: string
  /** Percentage base. Defaults to the sum of every value. */
  total?: number
  valueSuffix?: string
  maxHeight?: number
}

function num(v: number | null | undefined): number {
  return Number.isFinite(v) ? (v as number) : 0
}

function fmt(v: number | null | undefined): string {
  return num(v).toLocaleString('en-US')
}

/** Cell text for one value: a null is "not reported", which is not the same as a counted zero. */
function cellText(v: number | null | undefined, valueSuffix: string): string {
  return v === null ? 'ไม่มีรายงาน' : `${fmt(v)}${valueSuffix}`
}

function pctText(value: number, base: number): string {
  return base > 0 ? `${((num(value) / base) * 100).toFixed(1)}%` : '—'
}

/** Row totals across every series (identical to the single value for a single-series chart). */
function rowTotals(props: Pick<DataTableProps, 'categories' | 'series'>): number[] {
  return props.categories.map((_, i) => props.series.reduce((acc, s) => acc + num(s.values[i]), 0))
}

/**
 * One-line textual summary shown under every plot, e.g.
 * `รวม 440 รายการ · สูงสุด: กรุงเทพมหานคร 56 (12.7%)`.
 */
export function summaryText(props: {
  categories: string[]
  series: DataTableSeries[]
  total?: number
  unit?: string
}): string {
  const totals = rowTotals(props)
  const sum = totals.reduce((a, b) => a + b, 0)
  const base = props.total ?? sum
  const unit = props.unit?.trim() || 'รายการ'
  if (!totals.length || sum <= 0) return `รวม 0 ${unit}`

  let topIdx = 0
  for (let i = 1; i < totals.length; i += 1) if (totals[i] > totals[topIdx]) topIdx = i
  const topName = props.categories[topIdx] ?? '-'
  // A top-N chart shows only part of its data: say so rather than presenting the visible subset
  // as the grand total (audit UX-13 — the stated denominator must be the real one).
  const head =
    base > sum
      ? `แสดง ${totals.length} อันดับแรก รวม ${fmt(sum)} จากทั้งหมด ${fmt(base)} ${unit}`
      : `รวม ${fmt(sum)} ${unit}`
  return `${head} · สูงสุด: ${topName} ${fmt(totals[topIdx])} (${pctText(totals[topIdx], base)})`
}

export default function DataTable({
  caption,
  categories,
  series,
  categoryHeader = 'หมวด',
  total,
  valueSuffix = '',
  maxHeight = 340,
}: DataTableProps): JSX.Element {
  const isMulti = series.length > 1
  const totals = rowTotals({ categories, series })
  const grand = totals.reduce((a, b) => a + b, 0)
  const base = total ?? grand
  const seriesTotals = series.map((s) => categories.reduce((acc, _, i) => acc + num(s.values[i]), 0))
  // The displayed rows are a truncated top-N of a larger set (audit UX-13): the footer must then
  // separate "sum of what is shown" from the real grand total the percentages are measured against.
  const isTruncated = base > grand

  const headCls = 'px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap'
  const cellCls = 'px-3 py-2 text-right tabular-nums text-slate-700'

  return (
    <div className="w-full overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-tableText border-collapse">
        <caption className="sr-only">{`${caption} — ตารางข้อมูล`}</caption>
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-slate-200">
            <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-700">
              {categoryHeader}
            </th>
            {isMulti ? (
              series.map((s) => (
                <th key={s.name} scope="col" className={headCls}>
                  {s.name}
                </th>
              ))
            ) : (
              <th scope="col" className={headCls}>
                จำนวน
              </th>
            )}
            {isMulti && (
              <th scope="col" className={headCls}>
                รวม
              </th>
            )}
            <th scope="col" className={headCls}>
              {isTruncated ? '% ของทั้งหมด' : '% ของรวม'}
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((name, i) => (
            <tr key={`${name}-${i}`} className="border-b border-slate-100">
              <th scope="row" className="px-3 py-2 text-left font-normal text-slate-700">
                {name}
              </th>
              {isMulti ? (
                series.map((s) => (
                  <td key={s.name} className={cellCls}>
                    {cellText(s.values[i], valueSuffix)}
                  </td>
                ))
              ) : (
                <td className={cellCls}>{cellText(series[0]?.values[i] ?? 0, valueSuffix)}</td>
              )}
              {isMulti && (
                <td className={`${cellCls} font-semibold`}>
                  {fmt(totals[i])}
                  {valueSuffix}
                </td>
              )}
              {/* No report means no share of the total either — '—', not '0.0%'. */}
              <td className={cellCls}>
                {!isMulti && series[0]?.values[i] === null ? '—' : pctText(totals[i], base)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold">
            <th scope="row" className="px-3 py-2 text-left text-slate-800">
              {isTruncated ? `รวมที่แสดง (${categories.length} อันดับแรก)` : 'รวมทั้งหมด'}
            </th>
            {isMulti ? (
              seriesTotals.map((t, i) => (
                <td key={series[i].name} className={`${cellCls} text-slate-800`}>
                  {fmt(t)}
                  {valueSuffix}
                </td>
              ))
            ) : (
              <td className={`${cellCls} text-slate-800`}>
                {fmt(grand)}
                {valueSuffix}
              </td>
            )}
            {isMulti && (
              <td className={`${cellCls} text-slate-800`}>
                {fmt(grand)}
                {valueSuffix}
              </td>
            )}
            <td className={`${cellCls} text-slate-800`}>{pctText(grand, base)}</td>
          </tr>
          {isTruncated && (
            <tr className="border-t border-slate-200 font-semibold">
              <th scope="row" className="px-3 py-2 text-left text-slate-800">
                รวมทั้งหมด
              </th>
              {isMulti &&
                series.map((s) => (
                  <td key={s.name} className={`${cellCls} text-slate-500`}>
                    —
                  </td>
                ))}
              <td className={`${cellCls} text-slate-800`}>
                {fmt(base)}
                {valueSuffix}
              </td>
              <td className={`${cellCls} text-slate-800`}>{pctText(base, base)}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}
