#!/usr/bin/env node
// Guards that keep our setup intact after an upstream sync (see docs/upstream-sync.md).
//
//   node scripts/check-trayb.mjs                     run every check
//   node scripts/check-trayb.mjs --update-baseline   rewrite scripts/valospectra-baseline.json
//
// Checks:
//   1. No paths that differ only in letter case (they break Windows checkouts and Linux builds).
//   2. No new valospectra.com hosts in client/ or frontend/ beyond the baseline. A new upstream
//      endpoint would send traffic past our server. The baseline only ever shrinks (#13).
//   3. Every hook listed in scripts/trayb-hooks.json is still present in its file.
//   4. The client version is inside the server's CompatibleClients range.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(root, "scripts", "valospectra-baseline.json");
const hooksPath = join(root, "scripts", "trayb-hooks.json");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

// 1. Case collisions
function checkCaseCollisions() {
  const seen = new Map();
  for (const path of git("ls-files", "-z").split("\0").filter(Boolean)) {
    const key = path.toLowerCase();
    if (seen.has(key)) fail("case", `${seen.get(key)} and ${path} differ only in letter case`);
    else seen.set(key, path);
  }
}

// 2. valospectra.com hosts, counted per file and host
function scanValospectra() {
  let out = "";
  try {
    out = git("grep", "-I", "-o", "-E", "[a-z0-9.-]*valospectra\\.com", "--", "client", "frontend");
  } catch (e) {
    if (e.status !== 1) throw e; // 1 = no matches
  }
  const counts = {};
  for (const line of out.split("\n").filter(Boolean)) {
    const idx = line.indexOf(":");
    const file = line.slice(0, idx);
    const host = line.slice(idx + 1);
    counts[file] ??= {};
    counts[file][host] = (counts[file][host] ?? 0) + 1;
  }
  return counts;
}

function checkValospectra() {
  const current = scanValospectra();
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  for (const [file, hosts] of Object.entries(current)) {
    for (const [host, n] of Object.entries(hosts)) {
      const allowed = baseline[file]?.[host] ?? 0;
      if (n > allowed) {
        fail("hosts", `${file}: ${host} appears ${n}x (baseline ${allowed}). Route it to our server or add it to the baseline on purpose.`);
      }
    }
  }
}

// 3. Hooks
function checkHooks() {
  if (!existsSync(hooksPath)) return;
  const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
  for (const { file, contains, issue } of hooks) {
    const path = join(root, file);
    if (!existsSync(path)) {
      fail("hooks", `${file} is gone (hook for #${issue})`);
      continue;
    }
    if (!readFileSync(path, "utf8").includes(contains)) {
      fail("hooks", `${file} no longer contains ${JSON.stringify(contains)} (hook for #${issue})`);
    }
  }
}

// 4. Client version vs server CompatibleClients range
const parseVersion = (v) => v.replace(/^v/, "").split(/[-+]/)[0].split(".").map(Number);
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
function satisfies(version, range) {
  const v = parseVersion(version);
  return range.trim().split(/\s+/).every((part) => {
    const m = part.match(/^(>=|<=|>|<|=)?(.+)$/);
    const c = cmp(v, parseVersion(m[2]));
    switch (m[1] ?? "=") {
      case ">=": return c >= 0;
      case "<=": return c <= 0;
      case ">": return c > 0;
      case "<": return c < 0;
      default: return c === 0;
    }
  });
}

function checkClientVersion() {
  const src = readFileSync(join(root, "server/src/util/CompatibleClients.ts"), "utf8");
  const m = src.match(/satisfies\(\s*version\s*,\s*[`'"]([^`'"]+)[`'"]/);
  if (!m) {
    fail("version", "could not find the range in server/src/util/CompatibleClients.ts; update this check");
    return;
  }
  const { version } = JSON.parse(readFileSync(join(root, "client/package.json"), "utf8"));
  if (!satisfies(version, m[1])) fail("version", `client ${version} is outside the server's range ${m[1]}`);
}

if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselinePath, JSON.stringify(scanValospectra(), null, 2) + "\n");
  console.log(`wrote ${baselinePath}`);
  process.exit(0);
}

checkCaseCollisions();
checkValospectra();
checkHooks();
checkClientVersion();

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("check-trayb: all checks passed");
