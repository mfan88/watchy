import { NextResponse, type NextRequest } from "next/server";
import { getStats, SHOT_KINDS, STRENGTHS, ZONES, type Category, type Scope, type Units } from "@/lib/nhl";

const SCOPES: Scope[] = ["team", "skater", "defence"];
const CATS: Category[] = ["speed", "shot-speed", "distance", "zone-time", "shot-location"];

function pick<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T | null {
  if (v === null) return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = pick(sp.get("scope"), SCOPES, "team");
  const cat = pick(sp.get("cat"), CATS, "speed");
  const strength = pick(sp.get("strength"), STRENGTHS, "all");
  const zone = pick(sp.get("zone"), ZONES, "offensive");
  const shots = pick(sp.get("shots"), SHOT_KINDS, "sog");
  const units = pick<Units>(sp.get("units"), ["imperial", "metric"], "imperial");
  if (!scope || !cat || !strength || !zone || !shots || !units) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const table = await getStats({ scope, cat, strength, zone, shots, units });
    return NextResponse.json({ table });
  } catch (e) {
    console.error("stats failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
