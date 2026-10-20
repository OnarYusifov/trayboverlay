# trayboverlay

Trayb's self-hosted [Spectra](https://valospectra.com) VALORANT broadcast overlay. Server, client and the VAL26 overlay live in one repo; we host the server and overlay ourselves, and every player and observer runs a Trayb build of the client that uses our server by default.

Internal use for Trayb broadcasts only. See [Licenses](#licenses).

## How it fits together

```
Observer client ──▶ ingest.trayb.az   server :5100  game data from the observer PC
Player clients  ──▶ ingest.trayb.az   server :5100  per-player data (custom games)
Observer client ──▶ extras.trayb.az   server :5101  previews, team info
OBS browser     ◀── data.trayb.az     server :5200  live match data for the overlay
OBS browser     ──▶ overlay.trayb.az  frontend      the overlay page itself
```

The client is one app with two modes: **Observer** (the full config UI, needs the observer key) and **Player** (`--auxiliary`, only a server picker). The installer creates a shortcut for each.

## Layout

| Path | What | Upstream |
|---|---|---|
| `server/` | Spectra-Server: ingest, REST extras, overlay socket | [ValoSpectra/Spectra-Server](https://github.com/ValoSpectra/Spectra-Server) |
| `client/` | Spectra-Client: observer and player desktop app (Overwolf ow-electron + Angular) | [ValoSpectra/Spectra-Client](https://github.com/ValoSpectra/Spectra-Client) |
| `frontend/` | VAL26 overlay (Angular), loaded as an OBS browser source | [nobiiVAL/Spectra-Frontend-VAL26](https://github.com/nobiiVAL/Spectra-Frontend-VAL26) |
| `deploy/` | Our Dockerfiles, Dokploy compose, overlay config entrypoint (#9, #11) | ours |
| `scripts/` | `sync-upstream.mjs` (pull upstream updates), `check-trayb.mjs` (guards) | ours |
| `docs/` | How we work: sync, patches, decisions, licensing, the upstream review | ours |
| `upstream.lock.json` | Which upstream commit each folder is at | ours |

The three folders are `git subtree`s with full upstream history. Each keeps its own package manager (Yarn 4); there is no root workspace.

## Pulling upstream updates

```bash
node scripts/sync-upstream.mjs --status     # what's new upstream
node scripts/sync-upstream.mjs frontend     # merge it on a sync branch and open a PR
```

A weekly GitHub workflow does the same and opens a PR or a conflict issue. Our changes to upstream files are kept tiny and listed in [docs/patches.md](docs/patches.md). The full method is in **[docs/upstream-sync.md](docs/upstream-sync.md)**.

## Working on it

Every job is a GitHub issue. See [CONTRIBUTING.md](CONTRIBUTING.md) for labels, milestones and the workflow.

Local development of a component works as upstream documents it, from inside its folder:

```bash
cd server && corepack enable && yarn install && yarn start            # ports 5100, 5101, 5200
cd frontend && yarn install && yarn start                             # needs src/environments/environment.dev.ts (copy environment.prod.ts)
cd client && yarn install && yarn start                               # observer; yarn start-aux for player mode
```

## Docs

- [docs/operations.md](docs/operations.md): deploying to Dokploy, checks, rollback, running the stack locally
- [docs/upstream-sync.md](docs/upstream-sync.md): pulling upstream updates safely
- [docs/patches.md](docs/patches.md): every change we made to upstream files
- [docs/upstream-review.md](docs/upstream-review.md): what each upstream repo does, its config, hosts and risks
- [docs/decisions.md](docs/decisions.md): why things are the way they are
- [docs/licensing.md](docs/licensing.md): licenses and what we may change

## Licenses

| Folder | License |
|---|---|
| `server/` | Elastic License 2.0, Purple Shark UG |
| `client/` | GPL-3.0-only, Purple Shark UG |
| `frontend/` | Elastic License 2.0, Purple Shark UG and nobii |

Each folder keeps its LICENSE file and has a `NOTICE-TRAYB.md` listing our modifications. Spectra is made by the [ValoSpectra](https://github.com/ValoSpectra) team; the VAL26 overlay by [nobii](https://github.com/nobiiVAL). Details and obligations: [docs/licensing.md](docs/licensing.md).

Not affiliated with or endorsed by Riot Games.
