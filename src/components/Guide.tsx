"use client";
import { useState } from "react";
import type { Channel } from "@/lib/m3u";
import type { Programme } from "@/lib/xmltv";
import { matchupImage } from "@/lib/matchup";
import { providerLogo } from "@/lib/providers";
import { Avatar } from "./Avatar";

const SEP = " · ";
const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

type Event = { title: string; s: number; e: number; desc?: string; channels: Channel[]; soon: boolean };

export function Guide({ channels, guide, onWatch }: { channels: Channel[]; guide: { now: number; programmes: Programme[] } | null | "error"; onWatch: (c: Channel) => void }) {
  const [open, setOpen] = useState<string | null>(null);

  if (guide === null) return <div className="empty"><div className="spinner" /><p>Loading guide…</p></div>;
  if (guide === "error") return <div className="empty"><h2>Guide unavailable</h2><p>Couldn&apos;t load the programme guide. Try again in a minute.</p></div>;

  // One entry per matchup; each channel's "(starting soon)" placeholder and
  // real programme both fold into it.
  const byId = new Map(channels.map((c) => [c.id, c]));
  const events = new Map<string, Event>();
  for (const p of guide.programmes) {
    if (p.e < guide.now) continue;
    const ch = byId.get(p.c);
    if (!ch) continue;
    const title = p.t.split(SEP)[0];
    const ev = events.get(title) ?? { title, s: p.s, e: p.e, channels: [], soon: true };
    if (!p.soon) { ev.s = p.s; ev.e = p.e; ev.desc = p.d ?? ev.desc; ev.soon = guide.now < p.s; }
    if (!ev.channels.includes(ch)) ev.channels.push(ch);
    events.set(title, ev);
  }
  const list = [...events.values()].sort((a, b) => a.s - b.s);
  if (!list.length) return <div className="empty"><h2>Nothing scheduled</h2><p>No upcoming programmes in the guide.</p></div>;

  return (
    <div className="panel">
      <h2>Guide</h2>
      <div className="cards">
        {list.map((ev) => {
          const isOpen = open === ev.title;
          const img = matchupImage(ev.channels[0]);
          return (
            <article className="card event" key={ev.title}>
              <button className="event-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : ev.title)}>
                {img ? <img className="thumb" src={img} alt="" width={64} height={36} loading="lazy" decoding="async" /> : <span className="thumb ph" />}
                <span className="event-text">
                  <span className="event-title">
                    {ev.title}
                    {ev.soon ? <span className="badge">Starting soon</span> : <span className="badge live">Live</span>}
                  </span>
                  <span className="meta">
                    {fmt.format(ev.s)} – {fmtTime.format(ev.e)}
                    {ev.desc ? ` · ${ev.desc}` : ""}
                  </span>
                </span>
                <span className="count">{ev.channels.length} {ev.channels.length === 1 ? "stream" : "streams"}</span>
                <span className="chev" aria-hidden>{isOpen ? "▴" : "▾"}</span>
              </button>
              {isOpen && (
                <div className="streams">
                  {ev.channels.map((c) => (
                    <button key={c.id} className="stream" onClick={() => onWatch(c)}>
                      <Avatar label={c.provider} src={providerLogo(c.provider)} />
                      <span className="name">{c.provider}</span>
                      <span className="watch">Watch</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
