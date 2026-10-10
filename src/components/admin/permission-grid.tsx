"use client";

import { useState } from "react";
import { ACTION_LABELS, ACTIONS, MODULES, type Action, type Perms } from "@/lib/permissions";

/** Grille modules × actions (cases « p.MODULE.action »). Décocher « Voir » retire tout le module. */
export function PermissionGrid({ initial, disabled = false }: { initial: Perms; disabled?: boolean }) {
  const [grid, setGrid] = useState(initial);
  const toggle = (m: keyof Perms, a: Action, on: boolean) =>
    setGrid((g) => ({
      ...g,
      [m]: a === "voir" && !on ? Object.fromEntries(ACTIONS.map((x) => [x, false])) : { ...g[m], [a]: on, ...(on && { voir: true }) },
    }));

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-navy/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-mist/70 text-ink/70">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Module</th>
            {ACTIONS.map((a) => <th key={a} className="px-2 py-2 font-semibold">{ACTION_LABELS[a]}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/5">
          {MODULES.map(({ key, label }) => (
            <tr key={key} className={grid[key].voir ? "" : "text-ink/50"}>
              <td className="px-3 py-1.5 font-medium">{label}</td>
              {ACTIONS.map((a) => (
                <td key={a} className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox" name={`p.${key}.${a}`} checked={grid[key][a]} disabled={disabled}
                    onChange={(e) => toggle(key, a, e.target.checked)}
                    aria-label={`${label} : ${ACTION_LABELS[a]}`} className="size-5 accent-navy"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
