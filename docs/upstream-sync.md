# Pulling upstream updates

`server/`, `client/` and `frontend/` are `git subtree`s of their upstream repos, imported with full history (#1). An upstream update is a normal three-way merge into the folder, so our changes and upstream's combine like any two branches. `upstream.lock.json` records which upstream commit each folder is at.

| Folder | Remote | Upstream | Branch |
|---|---|---|---|
| `server/` | `upstream-server` | ValoSpectra/Spectra-Server | `main` |
| `client/` | `upstream-client` | ValoSpectra/Spectra-Client | `main` |
| `frontend/` | `upstream-frontend` | nobiiVAL/Spectra-Frontend-VAL26 | `master` |

Upstream tags land in their own namespace (`refs/tags/upstream-server/v0.3.5`), because the server and the client both use `v0.3.x` tags. The sync script adds the remotes on a fresh clone.

## Rules that keep syncs cheap

1. **Our config lives in files upstream never touches:** `deploy/`, the frontend `config.json` generated at container start, server env vars, `client/trayb.config.json` and the `NOTICE-TRAYB.md` files.
2. **Upstream files get small hook edits only**, for example a hardcoded default becomes a read from our config. Every one is listed in [patches.md](patches.md) with the reason and the issue.
3. **Never rename upstream identifiers or wire fields.** The June 2026 forks renamed `spectraWatermark` and internal names, which broke compatibility and caused most of their merge conflicts.
4. **Our Dockerfiles live in `deploy/`**, so upstream Dockerfile changes never conflict.
5. **Fixes upstream would want go to them as PRs.** When one is merged, drop our copy from `patches.md`.

## Syncing by hand

```bash
node scripts/sync-upstream.mjs --status                 # what's new upstream, and new tags
node scripts/sync-upstream.mjs server                   # merge the upstream branch head
node scripts/sync-upstream.mjs server v0.3.6            # or a tag / commit
```

The script:
1. creates the branch `sync/<component>-<ref>-<sha>`;
2. merges with `-Xsubtree=<component>`, the same merge `git subtree merge` does;
3. updates `upstream.lock.json`;
4. runs the guards;
5. pushes the branch and opens a PR. Pass `--no-pr` to stop after the local merge.

**On a conflict** it stops. Resolve the files, `git add` them and `git commit`, then run `node scripts/sync-upstream.mjs --continue`. Turn on `git config rerere.enabled true` once per clone, so a conflict resolved once is resolved the same way the next time.

Prefer release tags for the server and client. The frontend has no recent tags; pick a master commit.

## Guards (`scripts/check-trayb.mjs`)

CI runs these on every push and PR, and the sync script runs them after each merge:

- **No paths that differ only in letter case.** They break Windows checkouts and ship wrong file names to Linux (#4).
- **No new `valospectra.com` host in `client/` or `frontend/`.** The hosts that exist today are recorded in `scripts/valospectra-baseline.json`. A new file, a new host or a higher count fails, because a new upstream endpoint would send traffic past our server. Route it to our server (or allow it on purpose with `--update-baseline`). The baseline only shrinks as #13 replaces the defaults.
- **Our hooks are still there.** Each entry in `scripts/trayb-hooks.json` is a file plus a string it must contain.
- **The client version is inside the server's `CompatibleClients` range.**

CI also builds all three components.

## The weekly watcher

`.github/workflows/upstream-watch.yml` runs every Monday at 06:00 UTC, and on demand from the Actions tab. For each folder it merges the upstream branch head:

- **Clean merge:** it opens a PR with the upstream commit list and the guard result. Guards that fail are shown in the PR, not hidden.
- **Conflict:** it opens an issue listing the conflicting files. Resolve it locally with the commands above.

PRs opened by the workflow don't start CI on their own (a GitHub rule for `GITHUB_TOKEN`). Close and reopen the PR to run it.

## Before merging a sync PR

- [ ] CI is green
- [ ] Every entry in `patches.md` for that folder still does its job
- [ ] Server or overlay changes are deployed to staging and checked, outside broadcast hours (a server restart drops live matches)
