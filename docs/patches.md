# Changes to upstream files

Every change we make inside `server/`, `client/` or `frontend/` is listed here. Keep this list short: config belongs in new files (see [upstream-sync.md](upstream-sync.md)). When upstream merges one of these as a PR, remove it here.

New files we add inside the folders (`NOTICE-TRAYB.md`) aren't listed, because they can't conflict.

All client hooks read `client/angular/src/app/trayb.config.ts` (a new file, so it never conflicts). `scripts/trayb-hooks.json` makes CI fail if one of these edits is lost in a sync.

| Folder | Upstream file | Change | Why | Issue | Sent upstream |
|---|---|---|---|---|---|
| `frontend/` | `public/assets/{ability1,ability2,grenades,ultimates}/Aggrobot*.webp` | Removed (identical copies of the `AggroBot*` files) | Paths that differ only in letter case break Windows checkouts and Linux builds | #4 | no (Onar's call, 21 October) |
| `client/` | `angular/src/app/observer/observerinfo/observerinfo.component.ts` | `ingestServerOptions` and the key-check URL come from `TraybConfig` | Default the observer to our server; check keys at `extras.trayb.az` | #13 | no |
| `client/` | `angular/src/app/observer/observer.component.ts` | Default `ingestIp`, migrate a saved valospectra value, overlay link from `TraybConfig`, hide Spectra extras | Observer uses our server with no setup | #13 | no |
| `client/` | `angular/src/app/AuxiliaryComponent/auxiliary.component.ts` | One server option, default to it, migrate saved value | Player uses our server with no setup | #13 | no |
| `client/` | `angular/src/app/observer/observer.component.html` | Preview, map ban, support and player-cam controls wrapped in `@if (showSpectraExtras)` | Those run on ValoSpectra's closed servers; off for Trayb | #13, #17 | no |
| `server/` | `src/model/Match.ts` | `orgIsSupporter` also honours `process.env.TRAYB_SUPPORTER === "true"` | Enable supporter features on a server that can't check ValoSpectra's backend; allowed in writing (`docs/decisions.md`) | #20 | no |
| `client/` | `angular/src/app/observer/observer.component.ts` | `isSupporter` initialised from and floored to `TraybConfig.supporter` | Unlock the supporter UI (custom watermark text, multiple round-win sponsors) without a backend check | #20 | no |
| `client/` | `src/main.ts` | Update check reads `TraybMain` (our releases API and download page) | Installed clients check our releases, not ValoSpectra's; dialog text says "Trayb Client" | #15 | no |
| `client/` | `package.json` | `appId`, `productName` "Trayb Client", `artifactName`, `version` 0.3.4, `publish` → this repo | Trayb-branded installer that updates from our repo (`name` kept as upstream so `yarn.lock` stays valid) | #14, #15 | no |
| `client/` | `build/installer.nsh` | Shortcut and exe names "Trayb Client" (match `productName`) | Otherwise the shortcuts point at a missing exe | #14 | no |
| `client/` | `build/icon.ico`, `angular/public/assets/icon.{ico,webp}` | Replaced with the Trayb mark; added `angular/public/favicon.ico` | Trayb branding (icons) | #14 | no |
| `client/` | `src/main.ts`, `src/services/gepService.ts` | Window title, tray tooltip, status line and dialog titles say "Trayb Client" | Branding | #14 | no |
| `client/` | `angular/src/app/observer/observerinfo/observerinfo.component.{ts,html}` | "Organization Key" relabelled "Access Key"; the "Validate" button (ValoSpectra getOrgForKey) hidden | That check always shows Invalid on a self-hosted server; the key is still checked on connect | #14 | no |
| `client/` | `src/main.ts` | `restartToLatest` drops the `owepm.0008811.xyz` package URL; `openExternalLink` allows only http/https; Overwolf kill uses the matched `p.pid`; the access key is no longer logged in plaintext | Security hardening from the review | #16 | no |
| `client/` | `src/services/connectorService.ts` | `rejectUnauthorized: true` at both ingest sites | Verify TLS so the org key can't be intercepted | #16 | no |
