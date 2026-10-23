import { NextResponse, type NextRequest } from "next/server";
import { getChannels } from "@/lib/data";
import { getStreamUrl } from "@/lib/stream";

// Returns the playable URL for one channel. Only channels currently in the
// playlist are served. This is the seam for signed URLs later.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { channels } = await getChannels();
  const ch = channels.find((c) => c.id === id);
  if (!ch) return NextResponse.json({ error: "unknown channel" }, { status: 404 });
  return NextResponse.json({ url: getStreamUrl(ch.slug) });
}
