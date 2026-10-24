"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Channel } from "@/lib/m3u";
import type { Programme } from "@/lib/xmltv";
import { Avatar } from "./Avatar";
import { Guide } from "./Guide";
import { Player } from "./Player";
import { Schedule } from "./Schedule";
import { Stats } from "./Stats";
import { matchupImage } from "@/lib/matchup";
import { providerLogo } from "@/lib/providers";
import { teamLogo } from "@/lib/teams";
import { ThemeToggle } from "./ThemeToggle";
import { IconGuide, IconSchedule, IconStats, IconWifi } from "./icons";

type View = "watch" | "schedule" | "guide" | "stats";
type GuideData = { now: number; programmes: Programme[] };

export function App({ initial, initialError }: { initial: Channel[]; initialError: boolean }) {
  const [channels, setChannels] = useState(initial);
  const [error, setError] = useState(initialError);
  const [view, setView] = useState<View>("watch");
  const [gameName, setGameName] = useState(initial[0]?.game ?? "");
  const [channelId, setChannelId] = useState(initial[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const [guide, setGuide] = useState<GuideData | null | "error">(null);

  // Keep the list fresh without a reload.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/channels", { cache: "no-store" });
        if (r.ok) { setChannels((await r.json()).channels); setError(false); }
      } catch {}
    }, 120000);
    return () => clearInterval(t);
  }, []);

  // Guide loads after the list is on screen.
  useEffect(() => {
    let alive = true;
    fetch("/api/guide").then((r) => (r.ok ? r.json() : Promise.reject())).then((g) => alive && setGuide(g)).catch(() => alive && setGuide("error"));
    return () => { alive = false; };
  }, []);

  const games = useMemo(() => {
    const m = new Map<string, Channel[]>();
    for (const c of channels) m.set(c.game, [...(m.get(c.game) ?? []), c]);
    return m;
  }, [channels]);

  const activeGame = games.has(gameName) ? gameName : [...games.keys()][0] ?? "";
  const providers = games.get(activeGame) ?? [];
  const current = providers.find((c) => c.id === channelId) ?? providers[0];
  const onActive = useCallback((a: boolean) => setPlaying(a), []);

  const nav: { id: Exclude<View, "watch">; label: string; icon: React.ReactNode }[] = [
    { id: "schedule", label: "Schedule", icon: <IconSchedule /> },
    { id: "guide", label: "Guide", icon: <IconGuide /> },
    { id: "stats", label: "Stats", icon: <IconStats /> },
  ];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="page">
      <div className="shell">
        <div className="logo"><span>watchy</span></div>
        <div className="bar">
          <div className="tab"><ThemeToggle /></div>
        </div>

        <aside className="side">
          <div className="label">Menu</div>
          <nav className="nav">
            {nav.map((n) => (
              <button key={n.id} className="nav-item" aria-current={view === n.id} onClick={() => setView(view === n.id ? "watch" : n.id)}>
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
          <div className="hr" />
          <div className="label">Stream providers</div>
          <div className="providers">
            {providers.length === 0 && <div className="label">None live right now</div>}
            {providers.map((c) => {
              const isCur = current?.id === c.id;
              return (
                <button key={c.id} className="provider" aria-current={isCur && view === "watch"} onClick={() => { setChannelId(c.id); setView("watch"); }}>
                  <Avatar label={c.provider} src={providerLogo(c.provider)} />
                  <span className="name">{c.provider}</span>
                  {isCur && playing ? <span style={{ color: "var(--accent-text)" }} title="Playing"><IconWifi /></span> : <span className="dot" title="Live" />}
                </button>
              );
            })}
          </div>
          <div className="logout"><button onClick={logout}>Log out</button></div>
        </aside>

        <main className="main-wrap">
          <div className="main">
            {/* Player stays mounted (hidden) so playback survives switching to Guide etc. */}
            <div hidden={view !== "watch"}>
              {error && channels.length === 0 ? (
                <div className="empty"><h2>Can&apos;t reach the channel source</h2><p>The channel list couldn&apos;t be loaded. It will retry automatically, or reload the page.</p></div>
              ) : channels.length === 0 ? (
                <div className="empty"><h2>No live channels right now</h2><p>Channels appear here when games start. This page checks again every couple of minutes.</p></div>
              ) : (
                <>
                  {games.size > 1 && (
                    <div className="games">
                      {[...games.entries()].map(([g, list]) => (
                        <button key={g} className="game" aria-current={g === activeGame} onClick={() => { setGameName(g); setChannelId(list[0].id); }}>
                          <span className="pair">
                            {[list[0].away, list[0].home].map((code, i) =>
                              teamLogo(code) ? (
                                <img key={i} className="team-badge" src={teamLogo(code)} alt="" width={30} height={30} loading="lazy" decoding="async" />
                              ) : (
                                <Avatar key={i} label={code ?? g} text={code?.slice(0, 3)} />
                              ),
                            )}
                          </span>
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                  {current && <Player channelId={current.id} title={`${current.game} · ${current.provider}`} poster={matchupImage(current)} onActiveChange={onActive} />}
                </>
              )}
            </div>
            {view === "guide" && <Guide channels={channels} guide={guide} onWatch={(c) => { setGameName(c.game); setChannelId(c.id); setView("watch"); }} />}
            {view === "schedule" && <Schedule />}
            {view === "stats" && <Stats />}
          </div>
        </main>
      </div>
    </div>
  );
}
