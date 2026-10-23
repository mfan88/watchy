"use client";
import { useEffect, useRef, useState } from "react";
import { IconPlay, IconRefresh, IconStop } from "./icons";

type Status = "idle" | "starting" | "playing" | "error";

const BACKOFF = [1500, 3000, 5000, 8000, 10000, 10000]; // up to 6 tries
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("aborted", "AbortError")); }, { once: true });
  });

// The server may need ~30 s to start a channel and sometimes 500s on the first
// hit. Poll the playlist until it answers 200 before handing it to the player.
async function waitUntilReady(url: string, signal: AbortSignal, onAttempt: (n: number) => void) {
  for (let i = 0; i < BACKOFF.length; i++) {
    onAttempt(i + 1);
    try {
      const res = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(40000)]), cache: "no-store" });
      if (res.ok) return;
    } catch (e) {
      if (signal.aborted) throw e;
    }
    if (i < BACKOFF.length - 1) await sleep(BACKOFF[i], signal);
  }
  throw new Error("Stream did not start in time.");
}

export function Player({ channelId, title, onActiveChange }: { channelId: string; title: string; onActiveChange?: (active: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [want, setWant] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    onActiveChange?.(status === "playing");
  }, [status, onActiveChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!want || !video) { setStatus("idle"); return; }
    const ctl = new AbortController();
    let hls: import("hls.js").default | undefined;
    const fail = (msg: string) => { if (!ctl.signal.aborted) { setError(msg); setStatus("error"); } };

    (async () => {
      setStatus("starting"); setAttempt(1); setError("");
      const r = await fetch(`/api/stream?id=${encodeURIComponent(channelId)}`, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) return fail("This channel is no longer available.");
      const { url } = (await r.json()) as { url: string };
      await waitUntilReady(url, ctl.signal, setAttempt);
      if (ctl.signal.aborted) return;

      const onPlaying = () => setStatus("playing");
      video.addEventListener("playing", onPlaying);
      ctl.signal.addEventListener("abort", () => video.removeEventListener("playing", onPlaying));
      const tryPlay = () => video.play().catch(() => { if (!ctl.signal.aborted) setWant(false); }); // autoplay blocked: wait for a tap

      if (video.canPlayType("application/vnd.apple.mpegurl")) { // Safari / iOS
        video.addEventListener("error", () => fail("Playback error."), { once: true });
        video.src = url;
        tryPlay();
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (ctl.signal.aborted) return;
      if (!Hls.isSupported()) return fail("This browser can't play HLS.");
      hls = new Hls({ maxBufferLength: 20, liveSyncDurationCount: 3 });
      let netRetries = 0, mediaRetries = 0;
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries++ < 4) setTimeout(() => hls?.startLoad(), 2000 * netRetries);
        else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries++ < 3) hls?.recoverMediaError();
        else fail("The stream stopped unexpectedly.");
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    })().catch((e) => { if (!ctl.signal.aborted) fail(e instanceof Error && e.name !== "AbortError" ? e.message : "Couldn't start the stream."); });

    return () => {
      ctl.abort();
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [want, channelId, nonce]);

  const active = want && status !== "error";
  return (
    <>
      <div className="player">
        <video ref={videoRef} playsInline controls={status === "playing"} aria-label={title} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "starting" ? (
              <div className="status" role="status">
                <div className="spinner" />
                <div>Starting stream…</div>
                <small>{attempt > 1 ? `Still waiting for the server (try ${attempt}/${BACKOFF.length})` : "This can take up to 30 seconds."}</small>
              </div>
            ) : status === "error" ? (
              <div className="status" role="alert">
                <div>{error}</div>
                <button className="btn btn-ghost" onClick={() => setNonce((n) => n + 1)}>Try again</button>
              </div>
            ) : (
              <button className="big-play" onClick={() => setWant(true)} aria-label="Play"><IconPlay size={38} /></button>
            )}
          </div>
        )}
      </div>
      <div className="controls">
        {active ? (
          <button className="btn btn-primary stop" onClick={() => setWant(false)}><IconStop /> Stop</button>
        ) : (
          <button className="btn btn-primary" onClick={() => { setNonce((n) => n + 1); setWant(true); }}><IconPlay size={16} /> Play</button>
        )}
        <button className="btn btn-ghost" onClick={() => { setNonce((n) => n + 1); setWant(true); }} aria-label="Refresh stream"><IconRefresh /> Refresh</button>
      </div>
    </>
  );
}
