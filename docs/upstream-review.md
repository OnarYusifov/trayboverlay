# Upstream review (October 2026)

What the review of the three upstream repos found, at the commits in `upstream.lock.json`. Line numbers refer to those commits and drift as upstream changes. Tracked work is linked as issues.

## How the pieces connect

```
Observer client ──obs_logon/obs_data──▶ server :5100 (ingest, socket.io)
Player clients  ──aux_logon/aux_data──▶ server :5100
Observer client ──HTTP───────────────▶ server :5101 (REST extras: previews, team info)
Overlay (OBS)   ◀──logon / match_data── server :5200 (overlay socket, every 100 ms on change)
```

Our domains (#9): `ingest.trayb.az` → 5100, `extras.trayb.az` → 5101, `data.trayb.az` → 5200, `overlay.trayb.az` → the frontend.

## Server (`server/`, ValoSpectra/Spectra-Server)

- **Stack:**
  - TypeScript on Node 22, Express 4 and socket.io 4, Yarn 4.7.
  - Entry point `src/index.ts`. Docker runs `tsx` on the source.
- **Ports:** 5100, 5101 and 5200 are hardcoded and bind all interfaces. CORS is `*`.
  - `INSECURE=true` means plain HTTP/WS; otherwise it uses the `SERVER_KEY`/`SERVER_CERT` files, read once at start.
- **Env:**

  | Var | Meaning |
  |---|---|
  | `INSECURE` | `true` = plain HTTP/WS |
  | `REQUIRE_AUTH_KEY` | `false` accepts any key |
  | `AUTH_KEY` | one shared observer key |
  | `USE_BACKEND` | turns on calls to ValoSpectra's private backend |
  | `BACKEND_URL`, `BACKEND_TOKEN` | that backend |
  | `SUPPORTER_CHECK_URL` | supporter lookup |
  | `PLAYERCAM_URL` | playercams |
  | `STATS_BACKEND_URL`, `STATS_BACKEND_TOKEN` | stats |
  | Tebex and Discord OAuth vars | support page |

  We set only the first three (#12).
- **Auth:** the observer sends a key in `obs_logon` (`src/connector/websocketIncoming.ts:275-287`). Players send no key, only the in-game match id.
  - If `AUTH_KEY` is unset and the client sends no key, `undefined === undefined` passes (`:279`). Setting `AUTH_KEY` closes it.
- **Supporter gating** (`src/model/Match.ts:92-115`): a non-supporter gets:
  - the Spectra watermark forced on;
  - custom text forced off;
  - the Spectra logo appended to sponsors;
  - one round-win sponsor.

  Self-hosted, `isSupporter` is always false (#8, #20).
- **State:** everything is in memory (matches, previews, authed clients), so a restart drops live matches and only one instance can run.
  - Each match writes `./replays/Match_<code>_<ts>.replay`, never rotated (#9).
  - Matches end on `game_end` or after 30 minutes idle.
- **Phone-home:** nothing unless `USE_BACKEND=true`. Overlays still load the gated Spectra logo from `auto.valospectra.com` (`Match.ts:96`).
- **Client version range:** `src/util/CompatibleClients.ts` accepts `>=0.3.3 <0.3.25` (guarded by `check-trayb.mjs`).
- **Risks** (#21):
  - `obs_data`/`aux_data` are routed by the group code inside the payload, not by the logged-in socket, so anyone who knows a group code can push data into that match.
  - Group codes aren't validated, and the replay stream has no error handler (a probable crash).
  - Keys are logged at info level.
  - Some maps never shrink.
  - The Docker image runs as root on Alpine 3.19, with a broad build context (#9 uses our own Dockerfile).
- **Activity:** 42 commits in 2026, bursty.
  - Most game updates are one-line changes in `ValorantInternalTranslator.ts`.
  - Hot files: `package.json`, `Match.ts`, `ToolsData.ts`.

## Client (`client/`, ValoSpectra/Spectra-Client)

- **Stack:** Overwolf ow-electron 37 (Electron 37), Angular 19 renderer (PrimeNG, Tailwind), Yarn 4.10.
  - Built with ow-electron-builder into an `nsis-web` installer.
  - No `appId`, no code signing, no CI upstream.
- **Game data:** only Overwolf GEP (VALORANT game id 21640). There is no Riot API and no memory reading.
- **Modes:** one app.
  - The Observer is the default route. The Player is the `--auxiliary` switch (`src/main.ts:73`), shown as a 750×320 window with only a server picker.
  - The installer creates "Spectra Client" and "[Player] Spectra Client" shortcuts (`build/installer.nsh:83-91`).
  - A single-instance lock means both modes can't run on one PC.
- **Server choice:** no default.
  - Observer list `eu`/`na.valospectra.com` (`observerinfo.component.ts:188`, default `undefined` at `observer.component.ts:206`).
  - Player list "EU/NA Server" (`auxiliary.component.ts:54-55,88,108-113`).
  - A URL without a port gets `:5100` (`src/services/connectorService.ts:96-104,213-221`).
  - Saved in localStorage only (#13).
- **Other hosts:**
  - key check `eu.valospectra.com:5101/getOrgForKey`
  - support page `eu-extras` plus Tebex plus Discord OAuth
  - map ban `mapban.valospectra.com`
  - preview `eu-extras.../createPreview` and `auto.valospectra.com/testing`
  - playercams
  - update check `api.github.com/repos/ValoSpectra/Spectra-Client/releases` and `valospectra.com/download`
  - Google Fonts
  - Overwolf GEP status
  - The full list is in `scripts/valospectra-baseline.json`.
- **Updates:** there is no auto-updater. At start it reads `releases[0]` from GitHub and forces a download-page dialog when newer (#15).
- **Supporter gating:** client-side, from `getOrgForKey`'s `isSupporter`. It locks the watermark panel, forces the Spectra logo into sponsors and limits the round-win box.
- **Risks** (#16):
  - The restart hotkey loads native Overwolf packages from `owepm.0008811.xyz`.
  - TLS verification is off.
  - The org key is logged in plain text and sent as a GET query.
  - `openExternal` accepts any scheme.
  - The kill-Overwolf code has a pid bug.
- **Activity:** 26 commits in 2026, the last on 2026-04-02 (v0.3.4; `package.json` still says 0.3.3).

## Frontend (`frontend/`, nobiiVAL/Spectra-Frontend-VAL26)

- **Stack:** Angular 20 (esbuild builder), socket.io-client 4.8, Tailwind 4, Yarn 4.7.
  - Output `dist/spectra-frontend/browser`, served by nginx 1.27 (`Dockerfile`, SPA fallback in `nginx.conf`).
  - The dev config needs a gitignored `environment.dev.ts`.
- **Config:** `src/main.ts` fetches `/assets/config/config.json` before bootstrapping and merges it over `src/app/shared/config.ts`. Any key can be set there, including `extrasEndpoint`, `statsEndpoint` and `mapbanEndpoint`, which the committed `config.json` doesn't contain (#11).
  - There is no `?server=` parameter: one deployment talks to one server.
- **Query params:**
  - `groupCode` (most routes), `sessionId` (map ban)
  - `lang`, `hideAuxiliary`, `hideAuxiliaryText`
  - `hideBg` (breakdowns), `team=left|right` (listen-in)
- **Routes:**
  - `/overlay`, `/overlay/minimal`, `/agent-select`, `/autoswitch`
  - `/timeout`, `/toast`, `/roundwinbox`, `/playercams`, `/listen-in`
  - `/team-breakdown`, `/map-breakdown` (these need the stats backend)
  - `/mapban`, `/mapban-fs` (these need the map ban backend)
  - `/testing/*` (mock data)
- **Other hosts:** vdo.ninja (playercams), Google Fonts, one 7TV GIF. Agent, map and rank assets are local.
- **Supporter gating:** none in the frontend; it renders what the server sends in `match.tools`.
- **History:**
  - Carries ValoSpectra/Spectra-Frontend history up to v0.2.43 (2025-09), then nobii's VAL26 work.
  - ValoSpectra staff commit and merge PRs directly in nobiiVAL's repo, so it is the right upstream.
- **Activity:** very active: 113 commits in 2026, the last on 2026-10-11.
  - No tags since v0.1.5 (April).
  - `config.json` and `config.ts` flip between NA, EU and localhost often, so we never edit them.
- **Fixed here:** four Gekko asset paths that differ only in letter case (#4).

## The old forks (June 2026)

| Fork | Kept | Not kept |
|---|---|---|
| Trayb-Server (1 ahead / 4 behind) | `expose` instead of `ports` for a proxy, env defaults | supporter bypass, logo swap, `spectraWatermark` rename, rebrand of upstream notices, an overlay token |
| Trayb-Client (5 ahead) | trayb.az domain layout, release workflow | supporter bypass, internal renames, wire field rename |
| Trayb-Frontend-VAL26 (2 ahead / 35 behind) | env → `config.json` entrypoint (#11) | "Powered by Trayb" watermark, field rename, lang-file edits |

Their branches and tags are archived here as `archive/old-trayb-*` tags (#7).

## Licenses

See [licensing.md](licensing.md). Server and frontend: Elastic License 2.0. Client: GPL-3.0.
