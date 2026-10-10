// Graphiques en HTML pur (une seule série → une seule teinte, valeurs affichées, infobulle au survol)

export function BarList({ rows, unit = "membres" }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group relative grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate font-medium text-ink/80">{r.label}</span>
          <span className="h-3 rounded-full bg-mist">
            <span className="block h-full rounded-full bg-navy transition-colors group-hover:bg-navy-700" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold text-navy tabular-nums">{r.value}</span>
          <span role="tooltip" className="pointer-events-none absolute -top-9 left-32 z-10 hidden rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white group-hover:block">
            {r.label} : {r.value} {unit} ({Math.round((r.value / total) * 100)} %)
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Columns({ rows }: { rows: { label: string; value: number; title: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 border-b border-navy/10" role="img" aria-label={rows.map((r) => `${r.title} : ${r.value}`).join(", ")}>
        {rows.map((r, i) => (
          <div key={r.title} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className={`rounded-t-md transition-colors group-hover:bg-rouge ${i === rows.length - 1 ? "bg-navy" : "bg-navy/35"}`} style={{ height: `${Math.max(2, (r.value / max) * 100)}%` }} />
            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white group-hover:block">
              {r.title} : {r.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-[11px] text-ink/65">
        {rows.map((r, i) => <span key={r.title} className="flex-1 text-center">{i % 2 === rows.length % 2 ? "" : r.label}</span>)}
      </div>
    </div>
  );
}
