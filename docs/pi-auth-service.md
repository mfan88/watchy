# Pi task: add a login endpoint that hands out the stream key

Give this to the agent that manages the Pi / Docker host serving `https://tv.zuxi.me`.

---

## Goal

The Watchy apps (Android TV, Samsung Tizen TV, macOS, Windows, Linux) are being published
as **public** downloads, so they no longer contain the stream server's secret path segment
(`<SECRET>` in `https://tv.zuxi.me/<SECRET>/playlist.m3u`, `/<SECRET>/guide.xml` and
`/<SECRET>/ch_xxxx/index.m3u8`). Instead, each app asks the user for a **username and
password** and exchanges them for the secret by calling a new endpoint on this same host.

Please investigate how this host is set up (custom Docker image serving HLS through
mediamtx, plus whatever serves `playlist.m3u` / `guide.xml` and terminates HTTPS) and add
a small accounts service in the way that fits best. Do not change how the existing
playlist, guide or stream URLs work: the apps keep fetching them directly with the secret.

## The contract the apps already implement (please match exactly)

```
POST https://tv.zuxi.me/auth/key
Content-Type: application/json

{"username": "alice", "password": "…"}
```

- **200** on success:
  ```json
  {"base": "https://tv.zuxi.me", "secret": "<SECRET>"}
  ```
  `base` is the public origin the apps prefix to `/<secret>/playlist.m3u` etc.
- **401** `{"error": "Invalid username or password."}` for unknown user or wrong password
  (same response for both).
- **429** `{"error": "Too many attempts. Try again later."}` when rate limited.
- **400** for a malformed body.
- Responses are JSON with `Cache-Control: no-store`. Add
  `Access-Control-Allow-Origin: *` and answer `OPTIONS` preflights (harmless, and keeps
  web-based clients working).
- Optional: `GET /auth/health` → `200 {"ok": true}`.

The apps call this on **every launch** (and when the stream server starts returning
401/403/404). If the call returns 401 they sign the user out; if the server is
unreachable they keep using the key they already have. So deleting a user signs them out
on their next launch, and changing the secret makes every app pick up the new one
automatically.

## Requirements

- **Users live on this host**, in a small persistent store (SQLite or a JSON file on a
  Docker volume), never in the image itself.
- **Passwords are hashed** with a slow, salted KDF (bcrypt, scrypt or argon2). Compare in
  constant time, and do the same work for unknown users so timing doesn't reveal which
  usernames exist.
- **A simple admin CLI** (or `docker exec` script) to add a user, remove a user, change a
  password and list users. No web admin UI is needed.
- **Rate limiting:** after about 8 failed attempts per client IP in 15 minutes, return 429
  until the window passes. Respect `X-Forwarded-For` only if it is set by your own reverse
  proxy.
- **Read the secret from the same place the stream server gets it** (env var / config), so
  rotating it is a single change. Never log the secret, passwords or request bodies.
- **Expose it on the existing HTTPS origin** at path `/auth/` (reverse-proxy route), not on
  a new port or domain, so the apps need no extra config.
- **Make it start with the rest of the stack** (docker-compose service or same container)
  and survive reboots.
- **Keep it small:** standard library or one well-known dependency. No external database
  server.

## Done when

```bash
curl -s -X POST https://tv.zuxi.me/auth/key -H 'Content-Type: application/json' \
  -d '{"username":"<test user>","password":"<their password>"}'
# -> {"base":"https://tv.zuxi.me","secret":"…"}  and the secret works for /playlist.m3u

curl -s -o /dev/null -w '%{http_code}\n' -X POST https://tv.zuxi.me/auth/key \
  -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}'
# -> 401
```

Then report back: how to add/remove users, where the user store lives, and how to rotate
the secret.
