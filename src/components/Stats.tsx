"use client";
import { useEffect, useRef, useState } from "react";
import type { StatTable } from "@/lib/nhl";
import { useTheme } from "@/lib/theme";

type Scope = "team" | "skater" | "defence";
type Cat = "speed" | "shot-speed" | "distance" | "zone-time" | "shot-location";

const SCOPES: [Scope, string][] = [["team", "Teams"], ["skater", "Skaters"], ["defence", "Defencemen"]];
const CATS: [Cat, string][] = [["speed", "Skating speed"], ["shot-speed", "Shot speed"], ["distance", "Distance"], ["zone-time", "Zone time"], ["shot-location", "Shot location"]];
const STRENGTHS = [["all", "All"], ["es", "Even"], ["pp", "Power play"], ["pk", "Penalty kill"]] as const;
const ZONES = [["offensive", "Offensive"], ["neutral", "Neutral"], ["defensive", "Defensive"]] as const;

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} className="pill" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Stats() {
  const [scope, setScope] = useState<Scope>("team");
  const [cat, setCat] = useState<Cat>("speed");
  const [strength, setStrength] = useState<(typeof STRENGTHS)[number][0]>("all");
  const [zone, setZone] = useState<(typeof ZONES)[number][0]>("offensive");
  const [shots, setShots] = useState<"sog" | "goals">("sog");
  const [units, setUnits] = useState<"imperial" | "metric">("imperial");
  const [table, setTable] = useState<StatTable | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const cache = useRef(new Map<string, StatTable | null>());
  const theme = useTheme();

  // Shot location isn't offered for defencemen by the API.
  const effCat: Cat = scope === "defence" && cat === "shot-location" ? "speed" : cat;

  useEffect(() => {
    const qs = new URLSearchParams({ scope, cat: effCat, strength, zone, shots, units }).toString();
    const hit = cache.current.get(qs);
    if (hit !== undefined) { setTable(hit); setState("ok"); return; }
    const ctl = new AbortController();
    setState("loading");
    fetch(`/api/stats?${qs}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { table: StatTable | null }) => { cache.current.set(qs, j.table); setTable(j.table); setState("ok"); })
      .catch(() => { if (!ctl.signal.aborted) setState("error"); });
    return () => ctl.abort();
  }, [scope, effCat, strength, zone, shots, units]);

  const showStrength = effCat === "distance" || effCat === "zone-time";
  const showUnits = effCat === "speed" || effCat === "shot-speed" || effCat === "distance";

  return (
    <div className="panel">
      <h2>Stats</h2>
      <p className="sub">NHL EDGE puck and player tracking · top 10 this season</p>
      <div className="seg" role="tablist" aria-label="Group">
        {SCOPES.map(([v, text]) => (
          <button key={v} role="tab" aria-selected={scope === v} onClick={() => setScope(v)}>{text}</button>
        ))}
      </div>
      <Chips label="Category" value={effCat} options={CATS.filter(([c]) => !(scope === "defence" && c === "shot-location"))} onChange={setCat} />
      <div className="filters">
        {showStrength && <Chips label="Strength" value={strength} options={STRENGTHS} onChange={setStrength} />}
        {effCat === "zone-time" && <Chips label="Zone" value={zone} options={ZONES} onChange={setZone} />}
        {effCat === "shot-location" && <Chips label="Shot type" value={shots} options={[["sog", "Shots on goal"], ["goals", "Goals"]] as const} onChange={setShots} />}
        {showUnits && <Chips label="Units" value={units} options={[["imperial", "Imperial"], ["metric", "Metric"]] as const} onChange={setUnits} />}
      </div>

      {state === "loading" && !table ? (
        <div className="empty"><div className="spinner" /></div>
      ) : state === "error" ? (
        <div className="empty"><h2>Stats unavailable</h2><p>Couldn&apos;t load NHL EDGE data. Try again in a minute.</p></div>
      ) : !table ? (
        <div className="empty"><p>Not available for this selection.</p></div>
      ) : (
        <div className="table-wrap" aria-busy={state === "loading"}>
          <table className="stat-table">
            <thead>
              <tr><th className="rank">#</th><th>{scope === "team" ? "Team" : "Player"}</th>{table.head.map((h, i) => <th key={h} className={i === 0 ? "val" : "num"}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.rank} className={r.team === "EDM" ? "edm" : undefined}>
                  <td className="rank">{r.rank}</td>
                  <td>
                    <div className="who">
                      {r.headshot ? <img className="mug" src={r.headshot} alt="" width={36} height={36} loading="lazy" decoding="async" /> : r.logo ? <img className="tlogo" src={theme === "light" ? r.logoLight ?? r.logo : r.logo} alt="" width={30} height={30} loading="lazy" decoding="async" /> : <span className="mug" />}
                      <div><div className="nm">{r.name}</div><div className="meta">{scope === "team" ? "" : `${r.sub} · ${r.team}`}</div></div>
                    </div>
                  </td>
                  <td className="val">{r.main}</td>
                  {r.cols.map((c, i) => <td key={i} className="num">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {table.note && <p className="meta note">{table.note}</p>}
        </div>
      )}
    </div>
  );
}
