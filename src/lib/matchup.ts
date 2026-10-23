import keys from "./matchups.json";
import type { Channel } from "./m3u";

const available = new Set<string>(keys);

// "CAR @ EDM" -> /matchups/CAR_vs_EDM.webp (away_vs_home), if we have an image.
export function matchupImage(ch: Pick<Channel, "away" | "home">): string | undefined {
  if (!ch.away || !ch.home) return undefined;
  const key = `${ch.away}_vs_${ch.home}`;
  return available.has(key) ? `/matchups/${key}.webp` : undefined;
}
