import "server-only";
import { sourceUrl } from "./config";
import { parseM3U, type Channel } from "./m3u";
import { parseXmltv, type Programme } from "./xmltv";

const REVALIDATE = 90; // seconds; the home server refreshes about every 5 min

async function fetchText(file: "playlist.m3u" | "guide.xml"): Promise<string> {
  // Never include the URL in errors/logs: it contains the secret.
  let res: Response;
  try {
    res = await fetch(sourceUrl(file), {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(`${file}: upstream unreachable`);
  }
  if (!res.ok) throw new Error(`${file}: upstream status ${res.status}`);
  return res.text();
}

export type ChannelsResult = { channels: Channel[]; error: boolean };

export async function getChannels(): Promise<ChannelsResult> {
  try {
    return { channels: parseM3U(await fetchText("playlist.m3u")), error: false };
  } catch (e) {
    console.error("getChannels failed:", e instanceof Error ? e.message : "unknown");
    return { channels: [], error: true };
  }
}

export async function getGuide(): Promise<Programme[]> {
  try {
    return parseXmltv(await fetchText("guide.xml"));
  } catch (e) {
    console.error("getGuide failed:", e instanceof Error ? e.message : "unknown");
    return [];
  }
}
