import "server-only";

// Public NHL APIs, no secret involved. Responses are cached on the server.
const WEB = "https://api-web.nhle.com";

async function nhl<T>(path: string, revalidate: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${WEB}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error("NHL API unreachable");
  }
  if (!res.ok) throw new Error(`NHL API status ${res.status}`);
  return res.json() as Promise<T>;
}

/* ------------------------------ Schedule ------------------------------ */

export type Game = {
  id: number;
  d: string; // NHL game day, YYYY-MM-DD
  t: number; // start, epoch ms
  state: string; // FUT | PRE | LIVE | CRIT | FINAL | OFF
  type: number; // 1 pre, 2 regular, 3 playoffs
  away: Side;
  home: Side;
  venue?: string;
  tv: string[];
  ot?: "OT" | "SO";
  period?: number;
};
type Side = { a: string; n: string; logo: string; s?: number };

type RawSide = { abbrev: string; commonName?: { default: string }; placeName?: { default: string }; darkLogo?: string; logo?: string; score?: number };
type RawGame = {
  id: number; gameDate?: string; startTimeUTC: string; gameState: string; gameType: number;
  venue?: { default: string }; awayTeam: RawSide; homeTeam: RawSide;
  tvBroadcasts?: { network: string; countryCode: string }[];
  periodDescriptor?: { number: number; periodType: string };
  gameOutcome?: { lastPeriodType: string };
};

const side = (s: RawSide): Side => ({
  a: s.abbrev,
  n: s.commonName?.default ?? s.abbrev,
  logo: s.darkLogo ?? s.logo ?? "",
  s: s.score,
});

function normalize(g: RawGame, day: string): Game {
  const last = g.gameOutcome?.lastPeriodType;
  const networks = [...new Set((g.tvBroadcasts ?? []).filter((b) => b.countryCode === "CA" || b.countryCode === "US").map((b) => b.network))];
  return {
    id: g.id,
    d: g.gameDate ?? day,
    t: Date.parse(g.startTimeUTC),
    state: g.gameState,
    type: g.gameType,
    away: side(g.awayTeam),
    home: side(g.homeTeam),
    venue: g.venue?.default,
    tv: networks.slice(0, 4),
    ot: last === "OT" || last === "SO" ? last : undefined,
    period: g.periodDescriptor?.number,
  };
}

type RawWeek = { gameWeek: { date: string; games: RawGame[] }[] };

// /v1/schedule/{date} returns 7 days starting at `date`.
async function leagueWeek(date: string): Promise<Game[]> {
  const w = await nhl<RawWeek>(`/v1/schedule/${date}`, 60);
  return w.gameWeek.flatMap((day) => day.games.map((g) => normalize(g, day.date)));
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export type ScheduleView = "day" | "week" | "month" | "oilers";

export async function getSchedule(view: ScheduleView, date: string): Promise<Game[]> {
  let games: Game[];
  if (view === "oilers") {
    const raw = await nhl<{ games: RawGame[] }>(`/v1/club-schedule/EDM/month/${date.slice(0, 7)}`, 300);
    games = raw.games.map((g) => normalize(g, g.gameDate ?? date));
  } else if (view === "month") {
    const starts = [1, 8, 15, 22, 29].map((n) => `${date.slice(0, 7)}-${String(n).padStart(2, "0")}`);
    games = (await Promise.all(starts.map(leagueWeek))).flat().filter((g) => g.d.startsWith(date.slice(0, 7)));
  } else if (view === "week") {
    games = await leagueWeek(date);
  } else {
    games = (await leagueWeek(date)).filter((g) => g.d === date);
  }
  const seen = new Set<number>();
  return games.filter((g) => !seen.has(g.id) && seen.add(g.id)).sort((a, b) => a.t - b.t);
}

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
export { addDays };

/* ------------------------------ EDGE stats ------------------------------ */

export type Scope = "team" | "skater" | "defence";
export type Category = "speed" | "shot-speed" | "distance" | "zone-time" | "shot-location";
export type Units = "imperial" | "metric";

export type StatRow = {
  rank: number;
  name: string;
  sub: string; // team abbrev / position
  team: string;
  logo?: string;
  headshot?: string;
  main: string;
  cols: string[];
};
export type StatTable = { head: string[]; rows: StatRow[]; note?: string };

type Measure = { imperial: number; metric: number };
type RawRow = {
  player?: { firstName: { default: string }; lastName: { default: string }; position: string; headshot?: string; team: RawTeam };
  team?: RawTeam;
} & Record<string, unknown>;
type RawTeam = { abbrev: string; commonName: { default: string }; teamLogo?: { dark?: string; light?: string } };

export const STRENGTHS = ["all", "es", "pp", "pk"] as const;
export const ZONES = ["offensive", "neutral", "defensive"] as const;
export const SHOT_KINDS = ["sog", "goals"] as const;

export type StatsQuery = {
  scope: Scope;
  cat: Category;
  strength: (typeof STRENGTHS)[number];
  zone: (typeof ZONES)[number];
  shots: (typeof SHOT_KINDS)[number];
  units: Units;
};

function path(q: StatsQuery): string | null {
  const pos = q.scope === "defence" ? "D" : "all";
  const sk = q.scope !== "team";
  switch (q.cat) {
    case "speed": return sk ? `skater-speed-top-10/${pos}/max` : "team-skating-speed-top-10/all/max";
    case "shot-speed": return sk ? `skater-shot-speed-top-10/${pos}/max` : "team-shot-speed-top-10/all/max";
    case "distance": return sk ? `skater-distance-top-10/${pos}/${q.strength}/total` : `team-skating-distance-top-10/all/${q.strength}/total`;
    case "zone-time": return sk ? `skater-zone-time-top-10/${pos}/${q.strength}/${q.zone}` : `team-zone-time-top-10/${q.strength}/${q.zone}`;
    case "shot-location":
      if (q.scope === "defence") return null; // API only offers all-position skaters
      return sk ? `skater-shot-location-top-10/all/${q.shots}/all` : `team-shot-location-top-10/all/${q.shots}/all`;
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : 0);
const pct = (v: unknown) => `${(num(v) * 100).toFixed(1)}%`;

export async function getStats(q: StatsQuery): Promise<StatTable | null> {
  const p = path(q);
  if (!p) return null;
  const raw = await nhl<RawRow[]>(`/v1/edge/${p}/now`, 600);
  const m = (v: unknown, un: Units, dec = 1) => num((v as Measure | undefined)?.[un]).toFixed(dec);
  const u = q.units;
  const speedU = u === "imperial" ? "mph" : "km/h";
  const distU = u === "imperial" ? "mi" : "km";

  let head: string[] = [];
  let fmt: (r: RawRow) => { main: string; cols: string[] };
  switch (q.cat) {
    case "speed":
      head = [`Top speed (${speedU})`, "Bursts 22+ mph", "20–22", "18–20"];
      fmt = (r) => ({ main: m(r.maxSkatingSpeed ?? r.maxSpeed, u), cols: [String(r.burstsOver22), String(r.bursts20To22), String(r.bursts18To20)] });
      break;
    case "shot-speed":
      head = [`Hardest shot (${speedU})`, "100+ mph", "90–100", "80–90", "70–80"];
      fmt = (r) => ({ main: m(r.hardestShot, u), cols: [r.shotAttemptsOver100, r.shotAttempts90To100, r.shotAttempts80To90, r.shotAttempts70To80].map(String) });
      break;
    case "distance":
      head = [`Total (${distU})`, `Per 60 (${distU})`, `Best game (${distU})`, `Best period (${distU})`];
      fmt = (r) => ({ main: m(r.distanceTotal, u), cols: [m(r.distancePer60, u, 2), m(r.distanceMaxPerGame, u, 2), m(r.distanceMaxPerPeriod, u, 2)] });
      break;
    case "zone-time":
      head = [`${q.zone[0].toUpperCase()}${q.zone.slice(1)} zone`, "Offensive", "Neutral", "Defensive"];
      fmt = (r) => ({ main: pct(r[`${q.zone}ZoneTime`]), cols: [pct(r.offensiveZoneTime), pct(r.neutralZoneTime), pct(r.defensiveZoneTime)] });
      break;
    case "shot-location":
      head = [q.shots === "sog" ? "Shots on goal" : "Goals", "High danger", "Mid range", "Long range"];
      fmt = (r) => ({ main: String(r.all), cols: [String(r.highDanger), String(r.midRange), String(r.longRange)] });
      break;
  }

  const rows: StatRow[] = raw.slice(0, 10).map((r, i) => {
    const t = r.player?.team ?? r.team!;
    const { main, cols } = fmt(r);
    return {
      rank: i + 1,
      name: r.player ? `${r.player.firstName.default} ${r.player.lastName.default}` : t.commonName.default,
      sub: r.player ? r.player.position : t.abbrev,
      team: t.abbrev,
      logo: t.teamLogo?.dark ?? t.teamLogo?.light,
      headshot: r.player?.headshot,
      main,
      cols,
    };
  });
  const note = q.cat === "shot-location" && q.scope === "skater" ? "All skaters (forwards and defence)." : undefined;
  return { head, rows, note };
}
