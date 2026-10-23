"use client";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
    }).catch(() => null);
    if (res?.ok) {
      const next = new URLSearchParams(location.search).get("next") ?? "/";
      location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setError(res ? ((await res.json().catch(() => null))?.error ?? "Login failed.") : "Network error.");
    setBusy(false);
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1 className="logo-lg">watchy</h1>
      <label htmlFor="u">Username</label>
      <input id="u" name="username" autoComplete="username" autoCapitalize="none" required />
      <label htmlFor="p">Password</label>
      <input id="p" name="password" type="password" autoComplete="current-password" required />
      <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="err" role="alert">{error}</p>
    </form>
  );
}
