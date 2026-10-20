# Changes to upstream files

Every change we make inside `server/`, `client/` or `frontend/` is listed here. Keep this list short: config belongs in new files (see [upstream-sync.md](upstream-sync.md)). When upstream merges one of these as a PR, remove it here.

New files we add inside the folders (`NOTICE-TRAYB.md`) aren't listed, because they can't conflict.

| Folder | Upstream file | Change | Why | Issue | Sent upstream |
|---|---|---|---|---|---|
| `frontend/` | `public/assets/{ability1,ability2,grenades,ultimates}/Aggrobot*.webp` | Removed (identical copies of the `AggroBot*` files) | Paths that differ only in letter case break Windows checkouts and Linux builds | #4 | not yet |
