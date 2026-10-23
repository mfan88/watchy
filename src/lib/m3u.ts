export type Channel = {
  id: string; // tvg-id, e.g. htv-8f10348a47
  slug: string; // ch_8f10348a47 (path segment of the stream)
  no: number; // tvg-chno
  name: string; // tvg-name
  game: string; // part before " · "
  provider: string; // part after " · ", or "Main feed"
  away?: string; // team codes when game looks like "AWY @ HOM"
  home?: string;
  logo?: string; // tvg-logo, if the playlist ever provides one
};

const SEP = " · ";

export function parseM3U(text: string): Channel[] {
  const out: Channel[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXTINF:")) continue;
    const attrs: Record<string, string> = {};
    for (const m of line.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    // Display name = everything after the last comma that is outside quotes.
    const title = line.replace(/"[^"]*"/g, '""').split(",").slice(1).join(",").trim();
    let url = "";
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (!l) continue;
      if (!l.startsWith("#")) url = l;
      break;
    }
    const slug = url.match(/\/(ch_[0-9a-f]+)\/index\.m3u8/)?.[1];
    const id = attrs["tvg-id"];
    if (!slug || !id) continue;
    const name = attrs["tvg-name"] || title || id;
    const k = name.indexOf(SEP);
    const game = k === -1 ? name : name.slice(0, k);
    const provider = k === -1 ? "Main feed" : name.slice(k + SEP.length);
    const teams = game.match(/^(\S+)\s+@\s+(\S+)$/);
    out.push({
      id,
      slug,
      no: Number(attrs["tvg-chno"]) || out.length + 1,
      name,
      game,
      provider,
      away: teams?.[1],
      home: teams?.[2],
      logo: attrs["tvg-logo"] || undefined,
    });
  }
  return out;
}
