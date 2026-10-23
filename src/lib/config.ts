import "server-only";

// All access to the secret path segment goes through this file.
export function htvConfig() {
  const secret = process.env.HTV_SECRET;
  if (!secret) throw new Error("HTV_SECRET is not set");
  const base = (process.env.HTV_BASE_URL || "https://tv.zuxi.me").replace(/\/+$/, "");
  return { base, secret };
}

export function sourceUrl(file: "playlist.m3u" | "guide.xml") {
  const { base, secret } = htvConfig();
  return `${base}/${secret}/${file}`;
}
