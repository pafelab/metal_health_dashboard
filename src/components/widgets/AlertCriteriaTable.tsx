// UX-16 — the alert-criteria sheet as real HTML instead of an image.
// Two renderings of the SAME data, swapped by CSS (`display:none` keeps the hidden one out of the
// accessibility tree, so nothing is announced twice): a matrix table from md up, and native
// <details> sections below md, where an eight-row × four-column Thai matrix is unreadable.

import {
  ALERT_CRITERIA_EMPTY,
  ALERT_CRITERIA_FOOTNOTE,
  ALERT_CRITERIA_ROWS,
  ALERT_LEVELS,
  type AlertCriteriaRow,
  type AlertLevel,
} from '@/config/alertCriteria'

const CAPTION = 'เกณฑ์การ Alert ข่าว จำแนกตามประเภทภัย (แถว) และระดับสีการแจ้งเตือน (คอลัมน์)'

function Swatch({ level }: { level: AlertLevel }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/15"
      style={{ backgroundColor: level.color }}
    />
  )
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-slate-500">{ALERT_CRITERIA_EMPTY}</span>
  }
  if (items.length === 1) {
    return <p className="text-slate-700">{items[0]}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-4 text-slate-700 marker:text-slate-400">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  )
}

/** Groups the column headers exactly as the source sheet does ('ทำระดับสี Alert พื้นที่' × 3). */
function levelGroups(): { group: string; span: number }[] {
  const groups: { group: string; span: number }[] = []
  for (const lv of ALERT_LEVELS) {
    const last = groups[groups.length - 1]
    if (last && last.group === lv.group) last.span += 1
    else groups.push({ group: lv.group, span: 1 })
  }
  return groups
}

function hazardHeading(row: AlertCriteriaRow): string {
  return row.appliesToAll ? `${row.hazard} (ทุกภัย)` : row.hazard
}

export default function AlertCriteriaTable({ className = '' }: { className?: string }) {
  const groups = levelGroups()

  return (
    <div className={className}>
      {/* md+ : the full matrix. Wide by nature, so it owns its own horizontal scroller. */}
      <div className="relative hidden md:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="caption-top px-4 pt-3 pb-2 text-left text-sm text-slate-600">
            {CAPTION}
          </caption>
          <thead>
            <tr>
              <td className="border border-slate-200 bg-slate-50" />
              {groups.map((g) => (
                <th
                  key={g.group}
                  scope="colgroup"
                  colSpan={g.span}
                  className="border border-slate-200 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700"
                >
                  {g.group}
                </th>
              ))}
            </tr>
            <tr>
              <th
                scope="col"
                className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 align-bottom w-40"
              >
                ประเภทภัย
              </th>
              {ALERT_LEVELS.map((lv) => (
                <th
                  key={lv.key}
                  scope="col"
                  className="border border-slate-200 px-3 py-2 text-center align-bottom"
                  style={{ backgroundColor: lv.color, color: lv.onColor }}
                >
                  <span className="block font-semibold">{lv.headline}</span>
                  <span className="block text-xs font-medium opacity-90">{lv.response}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALERT_CRITERIA_ROWS.map((row) => (
              <tr key={row.hazard} className="align-top">
                <th
                  scope="row"
                  className="border border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700"
                >
                  {hazardHeading(row)}
                </th>
                {ALERT_LEVELS.map((lv) => (
                  <td key={lv.key} className="border border-slate-200 px-3 py-3">
                    <Bullets items={row.criteria[lv.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* < md : one expandable section per hazard type. */}
      <div className="md:hidden space-y-2">
        <p className="text-sm text-slate-600">{CAPTION}</p>
        {ALERT_CRITERIA_ROWS.map((row, i) => {
          const levelsWithCriteria = ALERT_LEVELS.filter((lv) => row.criteria[lv.key].length > 0)
          return (
            <details
              key={row.hazard}
              open={i === 0}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s1-400">
                {hazardHeading(row)}
              </summary>
              <div className="space-y-3 px-4 pb-4">
                {levelsWithCriteria.length === 0 ? (
                  <p className="text-sm text-slate-500">{ALERT_CRITERIA_EMPTY}</p>
                ) : (
                  levelsWithCriteria.map((lv) => (
                    <div key={lv.key} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-slate-800">
                        <Swatch level={lv} />
                        {lv.label}
                        <span className="text-xs font-medium text-slate-600">{lv.response}</span>
                      </p>
                      {/* The sheet's column-group heading. The md+ matrix shows it as a <th scope="colgroup">;
                          below md that table is display:none, so it has to be repeated per level card. */}
                      <p className="mt-1 text-xs font-medium text-slate-600">{lv.group}</p>
                      <div className="mt-1.5 text-sm">
                        <Bullets items={row.criteria[lv.key]} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
          )
        })}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">** {ALERT_CRITERIA_FOOTNOTE} **</p>
    </div>
  )
}
