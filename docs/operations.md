# Operations

How the server and overlay run, deploy and get checked. They run as one Dokploy compose app on the shared VPS (main panel, `server.trayb.az`), defined in `deploy/compose.yaml`.

| Domain | Service | Port | Used by |
|---|---|---|---|
| `ingest.trayb.az` | `server` | 5100 | observer and player clients (socket.io) |
| `extras.trayb.az` | `server` | 5101 | observer client (previews, team info), `GET /status` |
| `data.trayb.az` | `server` | 5200 | overlay page (socket.io) |
| `overlay.trayb.az` | `frontend` | 80 | OBS browser sources |

The DNS records are proxied through Cloudflare (orange cloud), like `server.trayb.az`. Traefik terminates TLS, and the server itself speaks plain HTTP/WS (`INSECURE=true`).

## How a change reaches the VPS

1. Push to `main`. `.github/workflows/images.yml` builds `ghcr.io/onaryusifov/trayboverlay-server` and `-frontend`, tagged `main` and `sha-<7>`. The VPS never builds anything.
2. Press **Deploy** on the `trayboverlay` compose app in Dokploy. `pull_policy: always` makes it pull the new `main` images.
3. Check it (below).

**Rollback:** set `IMAGE_TAG=sha-<7>` in the app's Environment and redeploy. Set it back to `main` afterwards.

**Restarts drop live matches.** All match state is in the server's memory. Deploy outside broadcasts.

## First setup in Dokploy (once)

1. **Images:** `images.yml` publishes the two GHCR packages. They inherit the repo's public visibility, so the VPS pulls them without credentials (checked 21 October). If a pull ever fails with `denied`, check github.com/OnarYusifov → Packages → the package → Package settings.
2. **Project and app:** Create project `trayboverlay`, then Create Service → Compose.
   - Provider: Git with `https://github.com/OnarYusifov/trayboverlay.git`, branch `main`. The repo is public, so no GitHub app access is needed.
   - Compose path: `./deploy/compose.yaml`.
   - Auto-deploy off. Deploys are by hand, outside broadcasts.
3. **Environment tab:** the values from `deploy/.env.example`:
   - `AUTH_KEY=<letters and digits>`: the observer key, which you give to observers privately
   - `PLATFORM_NETWORK=dokploy-network`
   - `IMAGE_TAG=main`
4. **Domains tab:** add the four domains from the table above.
   - Each one: service `server` or `frontend`, the container port from the table, path `/`, HTTPS on, certificate Let's Encrypt.
5. **Deploy**, then check.

## Checks

```bash
curl -s https://extras.trayb.az/status                       # 200 from the server
curl -s https://overlay.trayb.az/assets/config/config.json   # serverEndpoint https://data.trayb.az
```

- **Observer:** start the client, set the server to `https://ingest.trayb.az:443` (until #13 makes it the default), enter the observer key, then connect.
- **Overlay:** add a browser source `https://overlay.trayb.az/overlay?groupCode=<code>` in OBS. It shows live data once the observer is in a match.
- **Players:** start "[Player] Spectra Client" and set the same server. It joins automatically in custom games.

## Logs and state

- Logs are in Dokploy → `trayboverlay` → Logs (service `server` or `frontend`). A refused observer shows up as `Received BAD auth request ...`.
- Replays: one file per match in the `replays` volume (`/app/replays`). `replay-cleanup` deletes files older than `REPLAY_RETENTION_DAYS` (14).
- Memory caps: server 512 MB, frontend 64 MB, cleanup 16 MB (`*_MEM_LIMIT`).

## Running the stack locally

```bash
docker network create trayboverlay-dev
cp deploy/.env.example deploy/.env      # set AUTH_KEY, PLATFORM_NETWORK=trayboverlay-dev
docker compose -f deploy/compose.yaml -f deploy/compose.build.yaml --env-file deploy/.env up -d --build
```

Nothing is published to the host. Test from a container on the `trayboverlay-dev` network (`http://server:5100`, `http://frontend/`).

## Branding the overlay (Trayb)

The overlay renders whatever the observer client sends, so Trayb branding is set there, not in the overlay code — and it never covers the Spectra watermark because it uses the same regions the overlay already has (#19):

- **Watermark text:** in the observer client, the Watermark panel (unlocked as a supporter, #20) sets custom text, e.g. "Powered by Trayb". It shares the top-bar watermark slot.
- **Sponsors:** the Sponsor panel adds Trayb and partner logos to the rotating sponsor box.
- **Tournament:** the Tournament panel sets the event name, logo and backdrop.

We deliberately don't add a separate overlay element that would overlap the watermark region (ELv2 keeps the Spectra watermark legible; the supporter agreement lets us set our own text, not hide the attribution).
