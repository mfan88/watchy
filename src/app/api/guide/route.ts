import { NextResponse } from "next/server";
import { getChannels, getGuide } from "@/lib/data";

// Compact guide: only programmes for channels that are in the playlist.
export async function GET() {
  const [{ channels }, guide] = await Promise.all([getChannels(), getGuide()]);
  const ids = new Set(channels.map((c) => c.id));
  return NextResponse.json({ now: Date.now(), programmes: guide.filter((p) => ids.has(p.c)) });
}
