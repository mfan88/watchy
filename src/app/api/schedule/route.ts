import { NextResponse, type NextRequest } from "next/server";
import { getSchedule, isDate, type ScheduleView } from "@/lib/nhl";

const VIEWS: ScheduleView[] = ["day", "week", "month", "oilers"];

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") as ScheduleView;
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!VIEWS.includes(view) || !isDate(date)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const year = Number(date.slice(0, 4));
  if (year < 2020 || year > 2100) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    return NextResponse.json({ games: await getSchedule(view, date) });
  } catch (e) {
    console.error("schedule failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
