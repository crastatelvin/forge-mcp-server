# FORGE Security Model

Author: Telvin Crasta · License: CC BY-NC 4.0

FORGE is a tool server designed to be safe enough for personal deployments and
controlled demos. It is **not** a zero-trust multi-tenant platform. This
document states exactly what FORGE defends against and what it does not, so you
can make informed deployment choices.

## Threat model

**Defends against**

- Unauthenticated access to tools (when `FORGE_API_KEY` is set).
- Cross-origin access from arbitrary domains (when `CORS_ORIGINS` is set).
- Filesystem escape out of `ALLOWED_DIRS` via path traversal.
- Oversized reads that could OOM the process (`MAX_FILE_SIZE_MB`).
- Obvious malicious Python in `run_code` (token blocklist + restricted builtins).
- Brute-force and traffic spikes (sliding-window rate limiter).
- Unbounded inputs on `run_code` / `calculate` / `fetch_url` (size caps).

**Does NOT defend against**

- A determined attacker with the API key. Rotate it like any other secret.
- Sandbox escape from `run_code`. The sandbox restricts builtins and blocks
  dangerous tokens, but **Python is not a security boundary**. If you expose
  `run_code` publicly, containerize the runner separately (e.g. a short-lived
  Firecracker VM, gVisor, or a Docker-in-Docker worker with no host mounts and
  no egress network).
- Abuse of upstream APIs (DuckDuckGo, wttr.in, OpenWeatherMap). FORGE forwards
  traffic; respect their ToS.
- Resource exhaustion via clever inputs (tiny scripts that loop forever,
  extremely deep recursion, etc.). Run behind a process manager with CPU/memory
  caps and a request timeout.
- Side-channel leaks from `read_file` / `list_directory` against secrets
  accidentally placed inside `ALLOWED_DIRS`. Treat `ALLOWED_DIRS` as public.

## Hardening checklist for public deploys

1. **Set `FORGE_API_KEY`.** Long random string (>= 32 chars). Store in your
   platform's secret manager. The dashboard reads it from browser localStorage
   only; never commit it to the repo.
2. **Lock `CORS_ORIGINS`** to your dashboard's exact origin
   (`https://your-dashboard.vercel.app`). Never ship `*` to production.
3. **Leave `RATE_LIMIT_ENABLED=true`** and pick a value appropriate for your
   tier. The limiter is per-IP and in-memory, so it resets on dyno restart —
   for robust limits back it with Redis.
4. **Audit `ALLOWED_DIRS`.** Mount a clean directory; do not point it at your
   home directory or anything containing secrets, SSH keys, etc.
5. **Consider disabling `run_code` in public deployments** by removing it from
   `TOOL_REGISTRY` in `server.py`. The sandbox is best-effort.
6. **Put it behind HTTPS.** Render and Vercel do this for you.
7. **Rotate the key** if you suspect exposure and check `storage/tool_calls.jsonl`
   for anomalous activity.

## Reporting vulnerabilities

Email the project author. Please do not file a public issue for security bugs
until a fix is available.
