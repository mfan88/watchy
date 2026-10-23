// Local stand-in for the home server, for dev/testing only.
//   node scripts/mock-upstream.mjs   (needs ffmpeg for the sample stream)
// Env: MOCK_SECRET (default TESTSECRET), MOCK_PORT (default 9000),
//      MOCK_CODEC=vp9 for a VP9/Opus stream (for browsers without H.264/AAC, e.g. Playwright Chromium)
import http from "node:http";
import { readFileSync, mkdirSync, existsSync, createReadStream } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";

const SECRET = process.env.MOCK_SECRET || "TESTSECRET";
const PORT = Number(process.env.MOCK_PORT || 9000);
const VP9 = process.env.MOCK_CODEC === "vp9";
const fx = new URL("../tests/fixtures/", import.meta.url);
const dir = join(tmpdir(), "watchy-mock-hls");
mkdirSync(dir, { recursive: true });

// Make a small looping fMP4 HLS stream (H.264 + AAC, 2 s segments).
const started = new Map(); // slug -> {t0, hits}
function startStream(slug) {
  const out = join(dir, slug);
  mkdirSync(out, { recursive: true });
  spawn("ffmpeg", ["-loglevel", "error", "-re", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=25", "-f", "lavfi", "-i", "sine=frequency=440",
    ...(VP9 ? ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-b:v", "1M", "-g", "50", "-c:a", "libopus"] : ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "50", "-c:a", "aac"]), "-t", "3600",
    "-f", "hls", "-hls_time", "2", "-hls_list_size", "6", "-hls_flags", "delete_segments+independent_segments",
    "-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", join(out, "s%d.m4s"), join(out, "index.m3u8")],
    { stdio: "inherit" }).unref();
}
// The fixture guide is a fixed day; shift it so its 02:00Z 2026-10-23 is "now".
const pad = (n) => String(n).padStart(2, "0");
function shiftGuide(xml) {
  const delta = Date.now() - Date.UTC(2026, 9, 23, 2, 0);
  return xml.replace(/(start|stop)="(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) \+0000"/g, (_m, k, y, mo, d, h, mi, s) => {
    const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) + delta);
    return `${k}="${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())} +0000"`;
  });
}
const MIME = { ".m3u8": "application/vnd.apple.mpegurl", ".m4s": "video/mp4", ".mp4": "video/mp4" };

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const url = new URL(req.url, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== SECRET) { res.writeHead(404).end(); return; }
  if (parts[1] === "playlist.m3u" || parts[1] === "guide.xml") {
    let body = readFileSync(new URL(parts[1], fx), "utf8").replaceAll("https://tv.zuxi.me", `http://localhost:${PORT}`);
    if (parts[1] === "guide.xml") body = shiftGuide(body);
    res.writeHead(200, { "content-type": parts[1].endsWith("m3u") ? "audio/x-mpegurl" : "application/xml" }).end(body);
    return;
  }
  const m = parts[1]?.match(/^ch_[0-9a-f]+$/) && parts[2];
  if (!m) { res.writeHead(404).end(); return; }
  let st = started.get(parts[1]);
  if (!st) { st = { t0: Date.now(), hits: 0 }; started.set(parts[1], st); startStream(parts[1]); }
  if (parts[2] === "index.m3u8" && st.hits++ === 0) { res.writeHead(500).end("boom"); return; } // first request 500s
  const file = join(dir, parts[1], parts[2]);
  if (!existsSync(file) || Date.now() - st.t0 < 4000 && parts[2] === "index.m3u8") { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`mock upstream on :${PORT}`));
