"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Game } from "@/lib/nhl";
import { useTheme } from "@/lib/theme";

type View = "day" | "week" | "month" | "oilers";
const VIEWS: [View, string][] = [["day", "Today"], ["week", "Week"], ["month", "Month"], ["oilers", "Oilers only"]];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const addMonths = (s: string, n: number) => { const d = parse(s); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const fmtShort = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const live = (g: Game) => g.state === "LIVE" || g.state === "CRIT";
const done = (g: Game) => g.state === "FINAL" || g.state === "OFF";
const started = (g: Game) => live(g) || done(g);
const isEdm = (g: Game) => g.away.a === "EDM" || g.home.a === "EDM";

function status(g: Game) {
  if (live(g)) return g.period && g.period > 3 ? "LIVE · OT" : `LIVE · P${g.period ?? 1}`;
  if (done(g)) return g.ot ? `Final/${g.ot}` : "Final";
  return fmtTime.format(g.t);
}

function Team({ s, win, show }: { s: Game["away"]; win: boolean; show: boolean }) {
  const theme = useTheme();
  return (
    <div className={win ? "tm win" : "tm"}>
      <img src={theme === "light" ? s.light : s.logo} alt="" width={28} height={28} loading="lazy" decoding="async" />
      <span className="nm">{s.n}</span>
      <span className="sc">{show ? s.s ?? 0 : ""}</span>
    </div>
  );
}

function GameRow({ g }: { g: Game }) {
  const s = started(g);
  const aw = s && (g.away.s ?? 0) > (g.home.s ?? 0) && done(g);
  const hw = s && (g.home.s ?? 0) > (g.away.s ?? 0) && done(g);
  return (
    <article className={`game-row${isEdm(g) ? " edm" : ""}${live(g) ? " is-live" : ""}`}>
      <div className="teams"><Team s={g.away} win={aw} show={s} /><Team s={g.home} win={hw} show={s} /></div>
      <div className="info">
        <div className={live(g) ? "st live" : "st"}>{status(g)}</div>
        <div className="meta">{[g.venue, g.tv.join(", ")].filter(Boolean).join(" · ")}</div>
        {g.type === 3 && <div className="badge">Playoffs</div>}
      </div>
    </article>
  );
}

function resultFor(g: Game) {
  const edmHome = g.home.a === "EDM";
  const me = edmHome ? g.home.s ?? 0 : g.away.s ?? 0;
  const them = edmHome ? g.away.s ?? 0 : g.home.s ?? 0;
  return { won: me > them, text: `${me > them ? "W" : "L"} ${me}–${them}${g.ot ? `/${g.ot}` : ""}` };
}

export function Schedule() {
  const today = useMemo(() => iso(new Date()), []);
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(today);
  const [picked, setPicked] = useState(today);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState(false);
  const seq = useRef(0);

  const key = view === "month" || view === "oilers" ? addMonths(anchor, 0) : anchor;
  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const r = await fetch(`/api/schedule?view=${view}&date=${view === "month" || view === "oilers" ? key : anchor}`);
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { games: Game[] };
      if (n === seq.current) { setGames(j.games); setError(false); }
    } catch {
      if (n === seq.current) setError(true);
    }
  }, [view, anchor, key]);

  useEffect(() => { setGames(null); load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const step = (dir: -1 | 1) => {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else { const a = addMonths(anchor, dir); setAnchor(a); setPicked(a.slice(0, 7) === today.slice(0, 7) ? today : a); }
  };
  const goToday = () => { setAnchor(today); setPicked(today); };
  const switchView = (v: View) => { setView(v); setAnchor(today); setPicked(today); };

  const title = view === "day" ? fmtDay.format(parse(anchor)) : view === "week" ? `${fmtShort.format(parse(anchor))} – ${fmtShort.format(parse(addDays(anchor, 6)))}` : fmtMonth.format(parse(anchor));

  const byDay = useMemo(() => {
    const m = new Map<string, Game[]>();
    for (const g of games ?? []) m.set(g.d, [...(m.get(g.d) ?? []), g]);
    return m;
  }, [games]);

  return (
    <div className="panel">
      <h2>Schedule</h2>
      <div className="seg" role="tablist" aria-label="Schedule view">
        {VIEWS.map(([v, text]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => switchView(v)}>{text}</button>)}
      </div>
      <div className="cal-nav">
        <button className="icon-btn" aria-label="Previous" onClick={() => step(-1)}>‹</button>
        <div className="cal-title">{title}</div>
        <button className="icon-btn" aria-label="Next" onClick={() => step(1)}>›</button>
        <button className="pill" onClick={goToday}>Today</button>
      </div>

      {error && !games ? (
        <div className="empty"><h2>Schedule unavailable</h2><p>Couldn&apos;t load the NHL schedule. Try again in a minute.</p></div>
      ) : !games ? (
        <div className="empty"><div className="spinner" /></div>
      ) : view === "day" ? (
        <DayList games={byDay.get(anchor) ?? []} empty="No games scheduled." />
      ) : view === "week" ? (
        <div className="cards">
          {Array.from({ length: 7 }, (_, i) => addDays(anchor, i)).map((d) => (
            <section key={d}>
              <h3 className="day-h">{fmtDay.format(parse(d))}{d === today && <span className="badge live">Today</span>}</h3>
              <DayList games={byDay.get(d) ?? []} empty="No games." />
            </section>
          ))}
        </div>
      ) : (
        <>
          <Month anchor={anchor} today={today} picked={picked} onPick={setPicked} byDay={byDay} oilers={view === "oilers"} />
          <h3 className="day-h">{fmtDay.format(parse(picked))}</h3>
          <DayList games={byDay.get(picked) ?? []} empty={view === "oilers" ? "No Oilers game." : "No games scheduled."} />
        </>
      )}
    </div>
  );
}

function DayList({ games, empty }: { games: Game[]; empty: string }) {
  if (!games.length) return <p className="meta pad">{empty}</p>;
  return <div className="cards">{games.map((g) => <GameRow key={g.id} g={g} />)}</div>;
}

function Month({ anchor, today, picked, onPick, byDay, oilers }: { anchor: string; today: string; picked: string; onPick: (d: string) => void; byDay: Map<string, Game[]>; oilers: boolean }) {
  const theme = useTheme();
  const first = parse(anchor);
  const lead = first.getDay(); // Sunday-first
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${anchor.slice(0, 8)}${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="cal" role="grid">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="dow" role="columnheader">{d}</div>)}
      {cells.map((d, i) => {
        if (!d) return <div key={i} className="cell blank" />;
        const gs = byDay.get(d) ?? [];
        const g = oilers ? gs[0] : undefined;
        return (
          <button key={d} className={`cell${d === picked ? " sel" : ""}${d === today ? " today" : ""}${gs.length ? " has" : ""}`} onClick={() => onPick(d)} aria-label={`${fmtDay.format(parse(d))}, ${gs.length} games`}>
            <span className="dn">{Number(d.slice(8))}</span>
            {oilers && g ? (
              <span className="opp">
                <img src={theme === "light" ? (g.home.a === "EDM" ? g.away : g.home).light : (g.home.a === "EDM" ? g.away : g.home).logo} alt="" width={22} height={22} loading="lazy" decoding="async" />
                <span className="vs">{g.home.a === "EDM" ? "vs" : "@"} {(g.home.a === "EDM" ? g.away : g.home).a}</span>
                <span className={done(g) ? (resultFor(g).won ? "res w" : "res l") : "res"}>{done(g) ? resultFor(g).text : live(g) ? "LIVE" : fmtTime.format(g.t)}</span>
              </span>
            ) : !oilers && gs.length ? (
              <span className="cnt">{gs.length}<span className="g"> {gs.length === 1 ? "game" : "games"}</span></span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
