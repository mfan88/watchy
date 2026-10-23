export type Programme = {
  c: string; // channel id
  s: number; // start, epoch ms
  e: number; // stop, epoch ms
  t: string; // title
  d?: string; // description
  soon?: boolean; // title carried "(starting soon)"
};

function unescapeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// "20261022130000 +0000" -> epoch ms
export function parseXmltvTime(v: string): number {
  const m = v.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi, s = "0", tz = "+0000"] = m;
  const offset = (tz[0] === "-" ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)));
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offset * 60000;
}

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? unescapeXml(m[1].replace(/\s+/g, " ").trim()) : undefined;
}

export function parseXmltv(xml: string): Programme[] {
  const out: Programme[] = [];
  for (const m of xml.matchAll(/<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const s = parseXmltvTime(attrs.start ?? "");
    const e = parseXmltvTime(attrs.stop ?? "");
    let t = tag(m[2], "title");
    if (!attrs.channel || !t || isNaN(s) || isNaN(e)) continue;
    const soon = /\(starting soon\)\s*$/i.test(t);
    if (soon) t = t.replace(/\s*\(starting soon\)\s*$/i, "");
    out.push({ c: attrs.channel, s, e, t, d: tag(m[2], "desc"), soon: soon || undefined });
  }
  return out;
}
