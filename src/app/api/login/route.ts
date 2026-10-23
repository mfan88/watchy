import { NextResponse, type NextRequest } from "next/server";
import { checkLogin } from "@/lib/users";
import { clearFailures, recordFailure, tooMany } from "@/lib/ratelimit";
import { COOKIE, cookieOptions, signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooMany(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  let body: { username?: unknown; password?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const username = typeof body.username === "string" ? body.username.slice(0, 64) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  const user = username && password ? await checkLogin(username, password) : null;
  if (!user) {
    recordFailure(ip);
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }
  clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signSession(user), cookieOptions);
  return res;
}
