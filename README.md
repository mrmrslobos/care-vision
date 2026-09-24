# Unraid Dashboard

![Dashboard screenshot (demo data)](docs/screenshot.png)

A good-looking, LAN-only home server dashboard for Unraid. One page shows:

- **Unraid**: CPU, memory, array usage, disk temperatures and usage, uptime, running containers
- **AdGuard Home**: queries, block rate, response time, a 24-hour query chart, top blocked domains
- **Plex**: recently added posters plus anything currently streaming
- **Coming up**: one combined calendar for **Sonarr** (TV), **Radarr** (movies) and **Bookshelf** (books), which you can filter by source
- **Immich**: photo and video counts, library size, storage, per-user usage
- **Tdarr**: queue, processed, errors, space saved, live worker progress

All API calls happen on the dashboard's server, so your API keys and Plex token never reach the browser. Posters go through the dashboard too. The page refreshes itself (Unraid every 10 s, AdGuard every 30 s, calendars every 5 min) and pauses when the tab is hidden. It works on phones and follows your light/dark system setting.

---

## Try it with sample data

```bash
npm install
DEMO_MODE=true npm run dev     # http://localhost:3030
```

## Install on Unraid

### Option A: Docker Compose (needs the *Docker Compose Manager* plugin, or a terminal)

```bash
cd /mnt/user/appdata
git clone https://github.com/mrmrslobos/care-vision.git unraid-dashboard
cd unraid-dashboard
cp .env.example .env
nano .env                      # fill in your keys (see below)
docker compose up -d --build
```

Then open **http://10.10.10.10:3030**.

To update later: `git pull && docker compose up -d --build`.

### Option B: pre-built image from GitHub

On every push to `main`, the included GitHub Action publishes `ghcr.io/mrmrslobos/care-vision:latest`. If the repository is private, open the package on GitHub and set it to **public** first, or run `docker login ghcr.io` on the server. Then in Unraid go to **Docker → Add Container**:

| Field | Value |
|---|---|
| Repository | `ghcr.io/mrmrslobos/care-vision:latest` |
| Network | `bridge` |
| Port | container `3030` → host `3030` |
| Variables | add each setting from `.env.example` you need, e.g. `SONARR_API_KEY` |

## Where to find each key

| Service | Setting | Where |
|---|---|---|
| Unraid | `UNRAID_API_KEY` | Unraid 7.2+: **Settings → Management Access → API Keys → Create**, with the *viewer* role. Older 7.x versions need the **Unraid Connect** plugin, which adds the same page. |
| AdGuard Home | `ADGUARD_USERNAME` / `ADGUARD_PASSWORD` | The login you use for the AdGuard web UI |
| Plex | `PLEX_TOKEN` | In Plex Web, open any item, then **⋯ → Get Info → View XML**. The token is the `X-Plex-Token=` value in the URL. |
| Sonarr / Radarr / Bookshelf | `*_API_KEY` | **Settings → General → Security → API Key** |
| Immich | `IMMICH_API_KEY` | **Account Settings → API Keys → New API Key**. Give it `server.statistics` and `server.storage`, or *all*. Server statistics require an **admin** account's key. |
| Tdarr | `TDARR_URL` | No key is needed unless you enabled auth in Tdarr, in which case set `TDARR_API_KEY` |

Each card appears only once its service is configured. Delete a service's lines to hide its card. If your apps don't use the default ports, change the `*_URL` values.

## Troubleshooting

- **A card shows "unreachable":** the dashboard container can't reach that address. If the app runs on a custom network (`br0`, or anything with its own IP), enable **Settings → Docker → Host access to custom networks** (stop Docker to change it), or run the dashboard on the same network.
- **"HTTP 401 — check the API key":** the key is wrong or doesn't have enough permissions.
- **Unraid card fails but the others work:** make sure `UNRAID_URL` matches how you reach the web UI. If you use HTTPS with a self-signed certificate, add `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- **A card shows a "Stale" badge:** the last refresh failed, so it is showing the previous data. Hover over the badge to see why.
- **Calendar days are off by one:** set `TZ` to your timezone.

## Development

```bash
npm run dev        # http://localhost:3030
npm run lint
npm run typecheck
npm run build
```

Built with Next.js (App Router) and has no database. The integrations live in `src/lib/services/*`, and the cards in `src/components/cards/*`.
