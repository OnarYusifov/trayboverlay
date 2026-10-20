# Modified by Trayb

This folder is Spectra-Client by Purple Shark UG (https://github.com/ValoSpectra/Spectra-Client), licensed under the GNU General Public License v3.0 only (see `LICENSE`). Trayb has modified it. The changes are listed below and, file by file, in `docs/patches.md` at the root of https://github.com/OnarYusifov/trayboverlay. The full source of every Trayb Client build is that repository at the build's release tag.

| Date | Change |
|---|---|
| 2026-10-21 | Imported at upstream `v0.3.4` (`a07fd08`). |
| 2026-10-21 | Observer and player default to the Trayb server; a new `trayb.config.ts` holds our endpoints; ValoSpectra-only extras (map ban, player cams, stats, support) are hidden. See `docs/patches.md`. |
| 2026-10-21 | Rebranded to "Trayb Client" (product name, app id, installer, icons pending); the update check reads this repo's releases; builds published from `.github/workflows/client-release.yml`. |
| 2026-10-21 | Security hardening: removed a third-party Overwolf package URL, enabled TLS verification, stopped logging the access key, scheme-checked external links, fixed the Overwolf-kill target. See `docs/patches.md`. |
