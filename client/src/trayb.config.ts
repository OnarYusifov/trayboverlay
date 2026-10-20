// Trayb defaults for the Electron main process. New file (no upstream conflict).
// The renderer has its own copy at angular/src/app/trayb.config.ts.
export const TraybMain = {
  // Update check reads this repo's releases; see updateCheck() in main.ts (#15).
  releasesApi: "https://api.github.com/repos/OnarYusifov/trayboverlay/releases",
  // Opened when a newer release exists.
  downloadUrl: "https://github.com/OnarYusifov/trayboverlay/releases/latest",
};
