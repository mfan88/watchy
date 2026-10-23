import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/api/login"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const user = await verifySession(req.cookies.get(COOKIE)?.value);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
