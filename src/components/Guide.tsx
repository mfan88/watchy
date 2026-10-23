"use client";
import type { Channel } from "@/lib/m3u";
import type { Programme } from "@/lib/xmltv";

const SEP = " · ";
const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function Guide({ channels, guide }: { channels: Channel[]; guide: { now: number; programmes: Programme[] } | null | "error" }) {
  if (guide === null) return <div className="empty"><div className="spinner" /><p>Loading guide…</p></div>;
  if (guide === "error") return <div className="empty"><h2>Guide unavailable</h2><p>Couldn&apos;t load the programme guide. Try again in a minute.</p></div>;

  const byId = new Map(channels.map((c) => [c.id, c]));
  const events = new Map<string, { title: string; s: number; e: number; desc?: string; providers: Set<string>; soon: boolean }>();
  for (const p of guide.programmes) {
    if (p.e < guide.now) continue;
    const ch = byId.get(p.c);
    if (!ch) continue;
    const title = p.t.split(SEP)[0];
    const real = !p.soon;
    const key = title;
    const ev = events.get(key) ?? { title, s: p.s, e: p.e, providers: new Set<string>(), soon: true };
    if (real) { ev.s = p.s; ev.e = p.e; ev.desc = p.d ?? ev.desc; ev.soon = guide.now < p.s; }
    ev.providers.add(ch.provider);
    events.set(key, ev);
  }
  const list = [...events.values()].sort((a, b) => a.s - b.s);
  if (!list.length) return <div className="empty"><h2>Nothing scheduled</h2><p>No upcoming programmes in the guide.</p></div>;

  return (
    <div className="panel">
      <h2>Guide</h2>
      <div className="cards">
        {list.map((ev) => (
          <article className="card" key={ev.title}>
            <h3>
              {ev.title}
              {ev.soon ? <span className="badge">Starting soon</span> : <span className="badge live">Live</span>}
            </h3>
            <p className="meta">
              {fmt.format(ev.s)} – {fmtTime.format(ev.e)}
              {ev.desc ? ` · ${ev.desc}` : ""}
            </p>
            <div className="chips">{[...ev.providers].map((p) => <span className="chip" key={p}>{p}</span>)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
