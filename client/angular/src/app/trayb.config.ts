// Trayb defaults for the client. New file (no upstream conflict). The hooks that read it
// are listed in docs/patches.md and guarded by scripts/trayb-hooks.json.
//
// ingestServer carries the :443 port so connectorService doesn't append :5100
// (it adds :5100 only when no port is given).
export const TraybConfig = {
  // Observer and player ingest. Shown in the server picker and used as the default.
  ingestServer: "https://ingest.trayb.az:443",
  // REST extras (the observer key check lives here).
  extrasEndpoint: "https://extras.trayb.az",
  // Where "Copy overlay link" points.
  overlayBaseUrl: "https://overlay.trayb.az",
  // Spectra extras that run on ValoSpectra's closed servers (map ban, player cams,
  // stats breakdowns, support page). Off for Trayb (#17); their buttons are hidden.
  showSpectraExtras: false,
};

// A saved ingest value from an old Spectra install, migrated to our server on load.
const legacyIngestHosts = ["eu.valospectra.com", "na.valospectra.com", "EU Server", "NA Server"];
export function migrateIngest(saved: string | undefined | null): string {
  if (!saved || legacyIngestHosts.includes(saved) || saved.includes("valospectra.com")) {
    return TraybConfig.ingestServer;
  }
  return saved;
}
