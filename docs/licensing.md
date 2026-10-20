# Licenses

Each folder keeps its upstream license. This repo only adds our own files around them.

| Folder | License | Licensor | File |
|---|---|---|---|
| `server/` | Elastic License 2.0 (since 2025-07-03; GPL-3.0 before) | Purple Shark UG | `server/LICENSE.md` |
| `client/` | GPL-3.0-only | Purple Shark UG | `client/LICENSE` |
| `frontend/` | Elastic License 2.0 | Purple Shark UG, nobii | `frontend/LICENSE.md` |
| everything else | ours | Trayb | |

`server/package.json` still says `GPL-3.0-only`; that field is stale upstream. `LICENSE.md` is what counts.

## What we must do

- **Keep notices.** Every LICENSE file stays, and so does every licensing or copyright notice of the licensor. ELv2: "You may not alter, remove, or obscure any licensing, copyright, or other notices of the licensor in the software."
- **Mark modifications.** Each folder has a `NOTICE-TRAYB.md` that lists what we changed and when (ELv2 notices clause, GPL-3.0 section 5a). [patches.md](patches.md) has the file-level detail.
- **Client source for every build.** Players who get a Trayb Client installer are entitled to its full source (GPL-3.0). This repo is public and each release is a tag, which covers it. Keep it that way.
- **Internal use only.** ELv2 forbids providing the software "to third parties as a hosted or managed service". We run the server and overlay for Trayb's own broadcasts. Don't host them for other organizations.
- **No getting around the supporter gating.** ELv2: "You may not move, change, disable, or circumvent the license key functionality in the software". Self-hosted, the server marks every org as non-supporter (`server/src/model/Match.ts`). We change that only the way ValoSpectra allows in writing (#8, #20). A breach ends the whole license automatically, including our right to self-host.

## What we may change freely

- Anything in the client (GPL-3.0), as long as the notices stay and the source is published.
- Config, deploy files and env for the server and frontend.
- Our own additions to the overlay (logos, sponsor slides) that don't cover or hide the Spectra watermark (#19).

## Open questions

- Commercial fonts bundled in `frontend/public/assets/fonts/` (#24).
- Whether a renamed ow-electron client needs Overwolf approval (#18).
