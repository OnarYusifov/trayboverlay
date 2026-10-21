# Modified by Trayb

This folder is Spectra-Server by Purple Shark UG (https://github.com/ValoSpectra/Spectra-Server), licensed under the Elastic License 2.0 (see `LICENSE.md`). Trayb has modified it for internal use. The changes are listed below and, file by file, in `docs/patches.md` at the root of https://github.com/OnarYusifov/trayboverlay.

| Date | Change |
|---|---|
| 2026-10-21 | Imported at upstream `main` `64782ac`. No source changes yet. |
| 2026-10-21 | `Match.ts` honours `TRAYB_SUPPORTER=true` to enable the supporter features on this self-hosted server, allowed in writing by ValoSpectra (#20). See `docs/patches.md`. |
| 2026-10-21 | Security hardening: match data bound to the authenticated socket, group-code validation, key redaction in logs, client-list cleanup, replay stream error handling. See `docs/patches.md`. |
