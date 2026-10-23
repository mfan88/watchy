import "server-only";
import { htvConfig } from "./config";

// The single place that turns a channel into a playable URL. To move to
// short-lived signed URLs later, change only this function (and make it async).
export function getStreamUrl(slug: string): string {
  if (!/^ch_[0-9a-f]+$/.test(slug)) throw new Error("bad channel slug");
  const { base, secret } = htvConfig();
  return `${base}/${secret}/${slug}/index.m3u8`;
}
