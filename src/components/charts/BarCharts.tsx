import { formatNaira, formatNairaCompact } from "@/lib/format";

export interface Datum {
  key: string;
  label: string;
  value: number;
  icon?: React.ReactNode;
}

/*
 * Single-series magnitude charts in the brand maroon (one hue → no legend; the heading names
 * the series). Marks: ≤24px thick, 4px rounded data-end, square at the baseline, hairline grid.
 * Every mark is focusable and shows its exact value on hover/focus; a table view is provided.
 */

const tooltip =
  "pointer-events-none absolute z-10 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";

/**
 * Horizontal bars — for comparing categories. Value label at each bar tip.
 * `stacked` puts each label on its own line above the bar, for long labels such as bill titles.
 */
export function HorizontalBarChart({ data, caption, stacked = false }: { data: Datum[]; caption: string; stacked?: boolean }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure>
      <ul className="space-y-3.5" aria-label={caption}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <li key={d.key} className={stacked ? "grid gap-1" : "grid grid-cols-[6.5rem_1fr] items-center gap-3"}>
              <span className={`flex items-center gap-1.5 text-sm text-ink-700 ${stacked ? "" : "truncate"}`}>
                {d.icon}
                {d.label}
              </span>
              <span
                tabIndex={0}
                aria-label={`${d.label}: ${formatNaira(d.value)}`}
                className="group relative flex h-7 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                <span
                  className="h-[18px] rounded-r-[4px] bg-maroon-700 transition-[width] duration-700"
                  style={{ width: d.value > 0 ? `max(4px, calc(${pct}% - 4.5rem))` : 0 }}
                />
                <span className={`shrink-0 text-xs font-bold tabular-nums ${d.value > 0 ? "text-ink-900" : "text-ink-400"}`}>
                  {d.value > 0 ? formatNairaCompact(d.value) : "—"}
                </span>
                <span className={`${tooltip} -top-8 left-0`} role="tooltip">
                  {d.label}: {formatNaira(d.value)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <TableView caption={caption} data={data} />
    </figure>
  );
}

/** Vertical columns — for change over time. Labels only on the latest and the peak. */
export function ColumnChart({ data, caption }: { data: Datum[]; caption: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = niceMax(max);
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const ticks = [0, top / 2, top];

  return (
    <figure>
      <div className="relative h-44 pl-10" aria-label={caption} role="list">
        {/* Hairline gridlines + y-axis ticks */}
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-10 border-t border-cream-200" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true">
            <span className="absolute -top-2 -left-10 w-8 text-right text-[0.65rem] text-ink-400 tabular-nums">{formatNairaCompact(t)}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end justify-around gap-1">
          {data.map((d, i) => {
            const h = top ? (d.value / top) * 100 : 0;
            const labelled = d.value > 0 && (i === data.length - 1 || i === peak);
            return (
              <div
                key={d.key}
                role="listitem"
                tabIndex={0}
                aria-label={`${d.label}: ${formatNaira(d.value)}`}
                className="group relative flex h-full w-full max-w-12 flex-col items-center justify-end rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                {labelled && (
                  <span className="mb-1 text-[0.68rem] font-bold text-ink-900 tabular-nums">{formatNairaCompact(d.value)}</span>
                )}
                <span
                  className="w-full max-w-6 rounded-t-[4px] bg-maroon-700 transition-[height] duration-700"
                  style={{ height: d.value > 0 ? `max(4px, ${h}%)` : 0 }}
                />
                <span className={`${tooltip} bottom-full mb-1 left-1/2 -translate-x-1/2`} role="tooltip">
                  {d.label}: {formatNaira(d.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-around gap-1 pl-10 text-[0.7rem] text-ink-500" aria-hidden="true">
        {data.map((d) => (
          <span key={d.key} className="w-full max-w-12 text-center">
            {d.label}
          </span>
        ))}
      </div>
      <TableView caption={caption} data={data} />
    </figure>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v)!;
  return step * mag;
}

function TableView({ caption, data }: { caption: string; data: Datum[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-maroon-700">View as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs text-ink-500">
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-t border-cream-200">
              <td className="py-1.5 text-ink-700">{d.label}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums text-ink-900">{formatNaira(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
