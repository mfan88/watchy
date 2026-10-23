import { NextResponse } from "next/server";
import { getChannels } from "@/lib/data";

export async function GET() {
  const { channels, error } = await getChannels();
  return NextResponse.json({ channels, error }, { status: error ? 502 : 200 });
}
