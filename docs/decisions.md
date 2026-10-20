# Decisions

Why things are the way they are. Newest first. Each decision links its issue.

| Decision | Why |
|---|---|
| **Images are built in GitHub Actions and pulled from GHCR** (21 October, #9). Dokploy only pulls them, with `pull_policy: always`. | The shared VPS runs other production apps. An Angular build takes GBs of RAM and minutes of CPU there, and pulling a prebuilt image doesn't. It also gives `sha-<7>` tags for rollbacks. |
| **The four overlay domains go through Cloudflare's proxy** (21 October, #10), like `server.trayb.az`. | Same setup as the panel, origin IP stays hidden, WebSockets work through the proxy. |
| **The Gekko case-collision fix isn't sent upstream** (21 October, #4). | Onar's call. It stays a local patch in `docs/patches.md`; the guard keeps new collisions out. |
| **The sync tool is a Node script** (`scripts/sync-upstream.mjs`), not PowerShell (21 October, #2). | The weekly GitHub watcher runs the same script on Linux that we run on Windows. |
| **The server is imported at `main` `64782ac`, not tag `v0.3.5`** (21 October, #1). | `main` is `v0.3.5` plus one fix: the correct in-game name for the BattleRiffle. |
| **One public monorepo with three `git subtree`s, full history, no squash** (21 October, #1). | One place for issues, CI and deploys. Full history keeps `git log` and blame useful and lets us send fixes upstream. Public covers the client's GPL source requirement. |
| **Upstream changes arrive as reviewed PRs, with guards** (21 October, #2). | A sync can silently add a new valospectra.com endpoint or drop one of our hooks; the guards catch that before merge. |
| **Supporter features stay gated until ValoSpectra allows it in writing** (21 October, #8, #20). | ELv2 forbids getting around license-key functionality, and a breach ends the license for everything. The gating only covers the small watermark, the Spectra logo in sponsor slides, custom watermark text and multiple round-win sponsors. The written OK (a screenshot that shows the sender and their team role) goes here, then #20 is unblocked. |
| **Self-hosting with our own key is fine** (21 October, #8). | nobii (ValoSpectra staff, co-licensor of the VAL26 frontend) posted in ValoSpectra's Discord on 2026-08-09: "I strongly recommend self-hosting Spectra to bypass the need for a key." Onar has the screenshot. This covers our own server and `AUTH_KEY`; it doesn't cover the supporter features. |
| **Internal use only** (21 October). | Trayb uses the stack for its own broadcasts, no revenue from it, no hosting for other organizations (ELv2 hosted-service clause). |
| **Hosting: the shared 12 GB VPS, main Dokploy panel** (21 October, #9). | Onar's call. The stack is light (one Node process and nginx); it gets hard memory caps like every app on that box. |
| **The old Trayb-* forks are archived as tags here, then deleted** (21 October, #7). | Their useful parts are ported. Installed clients don't depend on them: their update check reads `Trayb/Trayb-Client`, which doesn't exist. |
