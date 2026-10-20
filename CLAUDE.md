# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Trayb's self-hosted Spectra VALORANT broadcast overlay, used internally for Trayb broadcasts. Three upstream projects are `git subtree`s with full history: `server/` (ValoSpectra/Spectra-Server), `client/` (ValoSpectra/Spectra-Client) and `frontend/` (nobiiVAL/Spectra-Frontend-VAL26). We host the server and overlay on the shared VPS (Dokploy, `server.trayb.az`) and ship a Trayb build of the client that uses our server by default. `docs/upstream-review.md` describes each component: ports, config, every external host, risks.

## Where things are documented

- `README.md` (overview), `docs/upstream-sync.md` (pulling upstream), `docs/patches.md` (every change to upstream files), `docs/decisions.md`, `docs/licensing.md`, `docs/upstream-review.md`.
- **Open work is tracked in GitHub Issues** (`gh issue list -R OnarYusifov/trayboverlay`), grouped by milestones M1 Monorepo ready, M2 Staging live, M3 Client release, M4 First broadcast. Update or close issues as work lands, and record new decisions in `docs/decisions.md`.

## Commands

```bash
node scripts/check-trayb.mjs                     # guards: case collisions, new valospectra hosts, hooks, client version range
node scripts/sync-upstream.mjs --status          # what's new upstream vs upstream.lock.json
node scripts/sync-upstream.mjs <server|client|frontend> [ref]   # merge upstream on a sync branch, open a PR
node scripts/sync-upstream.mjs --continue        # after resolving a sync conflict and committing
```

Each component builds from its own folder with Yarn 4 (`corepack enable` first): server `yarn build`, frontend `yarn build`, client `yarn workspace angular build && yarn tsc` (installers: `yarn build` on Windows). CI sets `HUSKY=0` and `YARN_IGNORE_PATH=1`.

## Rules

- **Every job needs a GitHub issue first**, triaged per `CONTRIBUTING.md`. Reference it in commits (`Refs #N`, `Closes #N`).
- **Keep the diff against upstream tiny**, or syncs turn into conflict work:
  - Config goes in our own files: `deploy/`, env vars, the frontend `config.json` generated at container start, `client/trayb.config.json`.
  - Edits to upstream files are small hooks only, and each one is added to `docs/patches.md` and the folder's `NOTICE-TRAYB.md`.
  - When a hook must survive syncs, add it to `scripts/trayb-hooks.json`.
  - **Never rename upstream identifiers or wire fields** (for example `spectraWatermark`). Never edit `frontend/src/app/shared/config.ts` or `frontend/public/assets/config/config.json`; upstream changes them constantly.
- **Upstream code arrives only through `scripts/sync-upstream.mjs`** and a reviewed PR. Don't copy files from upstream by hand.
- **Licenses** (`docs/licensing.md`): keep every LICENSE file and copyright notice. Server and frontend are Elastic License 2.0: no hosting for other organizations, and no getting around the supporter gating (`server/src/model/Match.ts`). That changes only the way ValoSpectra has allowed in writing, recorded in `docs/decisions.md` (#8, #20).
- When `check-trayb.mjs` flags a new `valospectra.com` host, route it to our server. Only run `--update-baseline` when keeping that host is a deliberate decision.
- The server keeps all match state in memory: deploying or restarting it drops live matches. Deploy outside broadcasts.
- `.env` files and secrets are never committed. Keys are letters and digits only.
- Don't add Claude attribution (co-author trailers, "Generated with" lines) to commits or PRs.
