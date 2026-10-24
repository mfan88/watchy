import missing from "./matchups-missing.json" with { type: "json" };
import type { Channel } from "./m3u";
import { isTeam } from "./teams.ts";

const MISSING = new Set<string>(missing);

// "CAR @ EDM" -> /matchups/CAR_vs_EDM.webp (away_vs_home), if we have an image.
export function matchupImage(ch: Pick<Channel, "away" | "home">): string | undefined {
  if (!isTeam(ch.away) || !isTeam(ch.home) || ch.away === ch.home) return undefined;
  const key = `${ch.away}_vs_${ch.home}`;
  return MISSING.has(key) ? undefined : `/matchups/${key}.webp`;
}
