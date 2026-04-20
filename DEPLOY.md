# Deploying FORGE

Repo is already live: https://github.com/crastatelvin/forge-mcp-server

This guide takes you from a pushed repo to `https://forge-mcp-server.onrender.com`
and `https://forge-dashboard.vercel.app` in ~10 minutes. Two free tiers, zero
cost, no CLI required from here on.

---

## Step 1 — Deploy the server to Render (5 min)

1. Go to https://dashboard.render.com/select-repo?type=blueprint
2. Sign in with GitHub and grant access to `forge-mcp-server`.
3. Render auto-detects `render.yaml` and asks for the four secret values. Paste:

   | Key                 | Value                                                |
   | ------------------- | ---------------------------------------------------- |
   | `FORGE_API_KEY`     | `forge_AqvQ2fvFF75FS7vFt4hPQ4Cmdl7RK5xkOZFJy5CjcfU`  |
   | `CORS_ORIGINS`      | `*`  *(tighten in Step 3)*                           |
   | `ANTHROPIC_API_KEY` | leave blank for now (chat tab stays disabled)        |
   | `WEATHER_API_KEY`   | leave blank (falls back to wttr.in)                  |

4. Click **Apply**. First build takes ~3 minutes.
5. When it's up, copy the URL (e.g. `https://forge-mcp-server.onrender.com`)
   and confirm:

   - `<URL>/health` returns `{"status":"ok","auth_enabled":true,...}`
   - `<URL>/docs` shows the Swagger UI

---

## Step 2 — Deploy the dashboard to Vercel (3 min)

1. Go to https://vercel.com/new
2. Sign in with GitHub and import `forge-mcp-server`.
3. Under **Root Directory**, click "Edit" and select `dashboard`.
4. Framework preset auto-detects as Create React App. Leave the defaults.
5. Expand **Environment Variables** and add:

   | Key                   | Value                                             |
   | --------------------- | ------------------------------------------------- |
   | `REACT_APP_API_URL`   | `https://forge-mcp-server.onrender.com`           |
   | `REACT_APP_WS_URL`    | `wss://forge-mcp-server.onrender.com/ws`          |

   (Replace with the URL Render gave you in Step 1.)

6. Click **Deploy**. Build takes ~1 minute.
7. Vercel returns a URL like `https://forge-mcp-server-<hash>.vercel.app`.

---

## Step 3 — Lock down CORS & paste your API key

1. **Tighten CORS on Render.** Dashboard -> your service -> Environment ->
   edit `CORS_ORIGINS` and set it to your Vercel URL, e.g.
   `https://forge-mcp-server.vercel.app`. Save -> Render auto-redeploys.

2. **Authenticate the dashboard.** Open the Vercel URL. Click the gear icon in
   the top-right -> paste the `FORGE_API_KEY` value from Step 1 -> **Save**.
   Live call stream and tool invocation will start working.

3. **Sanity check.**

   ```
   curl -H "Authorization: Bearer <FORGE_API_KEY>" \
        https://forge-mcp-server.onrender.com/tools
   ```

   Should return the 10-tool registry.

---

## Step 4 — (Optional) Enable Claude chat

1. Get an API key at https://console.anthropic.com/
2. On Render -> Environment -> set `ANTHROPIC_API_KEY`. Save -> auto-redeploys.
3. Refresh the dashboard and switch to the **Chat** tab. The banner disappears
   and you can chat with Claude using all 10 FORGE tools.

---

## Post-deploy polish

- **Pin a custom domain**: Vercel Domains or Render Custom Domains (free).
- **Rotate `FORGE_API_KEY`**: generate a new one with
  `python -c "import secrets; print('forge_' + secrets.token_urlsafe(32))"`,
  update Render, update the dashboard Settings menu.
- **Tail logs**: Render Service -> Logs tab. Every tool call appears as
  `POST /call/<name> 200 OK`.
- **Read [SECURITY.md](./SECURITY.md)** before exposing `run_code` or
  widening `ALLOWED_DIRS`.

---

## Trouble?

| Symptom                               | Fix                                                           |
| ------------------------------------- | ------------------------------------------------------------- |
| Dashboard loads but tools are empty    | CORS not tightened to Vercel origin, or API key not set in Settings |
| `401 Missing bearer token`             | Click the gear icon, paste `FORGE_API_KEY`, Save              |
| `403 Invalid API key`                  | Key on Render doesn't match what's in the dashboard Settings  |
| WebSocket won't connect                | Make sure `REACT_APP_WS_URL` uses `wss://` and matches Render host |
| Chat tab shows "unavailable" banner    | `ANTHROPIC_API_KEY` not set on Render (or you skipped Step 4) |
| Render free tier is slow on first hit  | Free dynos cold-start after ~15 min idle; upgrade or self-pinger |
