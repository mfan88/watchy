import "server-only";
import bcrypt from "bcryptjs";

// HTV_USERS="alice:$2b$10$...,bob:$2b$10$..."  (bcrypt hashes never contain "," or ":")
function users(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of (process.env.HTV_USERS ?? "").split(",")) {
    const i = entry.indexOf(":");
    if (i > 0) map.set(entry.slice(0, i).trim().toLowerCase(), entry.slice(i + 1).trim());
  }
  return map;
}

// Valid hash so unknown users cost the same as known ones (no timing oracle).
const DUMMY = bcrypt.hashSync("watchy-dummy", 10);

export async function checkLogin(name: string, password: string): Promise<string | null> {
  const hash = users().get(name.trim().toLowerCase());
  const ok = await bcrypt.compare(password, hash ?? DUMMY);
  return hash && ok ? name.trim().toLowerCase() : null;
}
