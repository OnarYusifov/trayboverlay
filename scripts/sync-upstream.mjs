#!/usr/bin/env node
// Merges an upstream ref into its subtree folder on a sync branch and opens a PR (docs/upstream-sync.md).
//
//   node scripts/sync-upstream.mjs <server|client|frontend> [ref]   ref defaults to the upstream branch
//   node scripts/sync-upstream.mjs --continue                       after resolving conflicts and committing
//   node scripts/sync-upstream.mjs --status                         what's new upstream vs upstream.lock.json
//
// Options: --no-pr (stop after the local merge), --ci (used by .github/workflows/upstream-watch.yml:
// on a conflict it aborts the merge and opens an issue instead of waiting for a human).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(root, "upstream.lock.json");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const positional = args.filter((a) => !a.startsWith("--"));
const CI = flag("--ci");

const run = (cmd, cmdArgs, opts = {}) =>
  execFileSync(cmd, cmdArgs, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts }).trim();
const git = (...a) => run("git", a);
const tryGit = (...a) => {
  try {
    return git(...a);
  } catch {
    return null;
  }
};
const gh = (...a) => run("gh", a);
const readLock = () => JSON.parse(readFileSync(lockPath, "utf8"));
const statePath = () => join(git("rev-parse", "--git-dir"), "trayb-sync.json");

function ensureRemote(entry) {
  if (tryGit("remote", "get-url", entry.remote) === null) {
    git("remote", "add", entry.remote, entry.url);
    git("config", `remote.${entry.remote}.tagOpt`, "--no-tags");
    git("config", "--add", `remote.${entry.remote}.fetch`, `+refs/tags/*:refs/tags/${entry.remote}/*`);
  }
  git("fetch", "--quiet", entry.remote);
}

function resolve(entry, ref) {
  return (
    tryGit("rev-parse", "--verify", "--quiet", `refs/tags/${entry.remote}/${ref}^{commit}`) ??
    tryGit("rev-parse", "--verify", "--quiet", `refs/remotes/${entry.remote}/${ref}^{commit}`) ??
    tryGit("rev-parse", "--verify", "--quiet", `${ref}^{commit}`)
  );
}

function upstreamLog(entry, from, to) {
  return tryGit("log", "--oneline", "--no-merges", `${from}..${to}`) ?? "";
}

function newTags(entry, from, to) {
  const tags = tryGit("tag", "--list", `${entry.remote}/*`, "--contains", from) ?? "";
  return tags
    .split("\n")
    .filter(Boolean)
    .filter((t) => tryGit("merge-base", "--is-ancestor", t, to) !== null)
    .filter((t) => tryGit("rev-parse", `${t}^{commit}`) !== from)
    .map((t) => t.slice(entry.remote.length + 1));
}

function guards() {
  try {
    return { ok: true, output: run("node", ["scripts/check-trayb.mjs"], { stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, output: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() };
  }
}

function status() {
  const lock = readLock();
  for (const [name, entry] of Object.entries(lock)) {
    ensureRemote(entry);
    const head = resolve(entry, entry.branch);
    const log = upstreamLog(entry, entry.commit, head);
    const count = log ? log.split("\n").length : 0;
    console.log(`${name}: at ${entry.commit.slice(0, 7)} (${entry.ref}), upstream ${entry.branch} at ${head.slice(0, 7)}, ${count} new commit(s)`);
    const tags = newTags(entry, entry.commit, head);
    if (tags.length) console.log(`  new tags: ${tags.join(", ")}`);
  }
}

function openOrUpdateIssue(title, body) {
  const existing = gh("issue", "list", "--state", "open", "--search", `in:title "${title}"`, "--json", "number,title");
  const match = JSON.parse(existing).find((i) => i.title === title);
  const bodyFile = join(git("rev-parse", "--git-dir"), "trayb-sync-body.md");
  writeFileSync(bodyFile, body);
  if (match) gh("issue", "comment", String(match.number), "--body-file", bodyFile);
  else gh("issue", "create", "--title", title, "--body-file", bodyFile, "--label", "area: upstream", "--label", "status: needs-triage");
  rmSync(bodyFile);
}

function finish(state) {
  const lock = readLock();
  lock[state.component] = { ...lock[state.component], ref: state.ref, commit: state.commit };
  delete lock[state.component].note;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  git("add", "upstream.lock.json");
  git("commit", "--quiet", "-m", `Update upstream.lock.json: ${state.component} at ${state.ref} (${state.commit.slice(0, 7)})`);
  if (existsSync(statePath())) rmSync(statePath());

  const g = guards();
  console.log(g.output);
  if (flag("--no-pr")) {
    console.log(`\nMerged on ${state.branch}. Push it and open a PR when ready.`);
    return g.ok;
  }

  const entry = lock[state.component];
  const body = [
    `Syncs \`${state.component}/\` with ${entry.url.replace(/\.git$/, "")} at \`${state.ref}\` (\`${state.commit.slice(0, 7)}\`), from \`${state.from.slice(0, 7)}\`.`,
    "",
    "**Upstream commits:**",
    "```",
    upstreamLog(entry, state.from, state.commit) || "(merge commits only)",
    "```",
    "",
    `**Guards:** ${g.ok ? "passed" : "FAILED"}`,
    "```",
    g.output,
    "```",
    "",
    "**Before merging:**",
    "- [ ] CI builds pass (on a PR opened by the watcher, close and reopen it to start CI)",
    "- [ ] Every file in `docs/patches.md` for this component still does what it should",
    "- [ ] Deployed to staging and checked, if the server or frontend changed",
    "",
    "See `docs/upstream-sync.md`.",
  ].join("\n");

  git("push", "--quiet", "-u", "origin", state.branch);
  const open = JSON.parse(gh("pr", "list", "--head", state.branch, "--state", "open", "--json", "number"));
  const bodyFile = join(git("rev-parse", "--git-dir"), "trayb-sync-body.md");
  writeFileSync(bodyFile, body);
  if (open.length) gh("pr", "edit", String(open[0].number), "--body-file", bodyFile);
  else console.log(gh("pr", "create", "--base", "main", "--head", state.branch, "--title", `Sync ${state.component} to ${state.ref} (${state.commit.slice(0, 7)})`, "--body-file", bodyFile, "--label", "area: upstream"));
  rmSync(bodyFile);
  return g.ok;
}

function sync(component, refArg) {
  const lock = readLock();
  const entry = lock[component];
  if (!entry) throw new Error(`unknown component ${component}; expected one of ${Object.keys(lock).join(", ")}`);
  ensureRemote(entry);
  const ref = refArg ?? entry.branch;
  const commit = resolve(entry, ref);
  if (!commit) throw new Error(`can't resolve ${ref} in ${entry.remote}`);
  if (commit === entry.commit || tryGit("merge-base", "--is-ancestor", commit, entry.commit) !== null) {
    console.log(`${component}: already at or past ${ref} (${commit.slice(0, 7)})`);
    return true;
  }
  if (git("status", "--porcelain")) throw new Error("working tree isn't clean; commit or stash first");

  const branch = `sync/${component}-${ref.replace(/[^A-Za-z0-9._-]/g, "-")}-${commit.slice(0, 7)}`;
  if (CI && git("ls-remote", "--heads", "origin", branch)) {
    console.log(`${component}: ${branch} already pushed, its PR is waiting for review`);
    return true;
  }
  if (tryGit("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`) !== null) throw new Error(`branch ${branch} already exists`);
  git("switch", "--quiet", "-c", branch);

  const state = { component, ref, commit, from: entry.commit, branch };
  const message = `Sync ${component} to ${ref} (${commit.slice(0, 7)})\n\nUpstream: ${entry.url.replace(/\.git$/, "")}`;
  try {
    // Same merge `git subtree merge` does for a non-squashed subtree.
    git("merge", "--no-ff", `-Xsubtree=${component}`, "-m", message, commit);
  } catch {
    const conflicts = tryGit("diff", "--name-only", "--diff-filter=U") ?? "";
    if (CI) {
      git("merge", "--abort");
      git("switch", "--quiet", "-");
      git("branch", "-D", branch);
      openOrUpdateIssue(
        `Upstream sync conflict: ${component} ${ref}`,
        [
          `Merging ${entry.url.replace(/\.git$/, "")} \`${ref}\` (\`${commit.slice(0, 7)}\`) into \`${component}/\` conflicts in:`,
          "",
          ...conflicts.split("\n").filter(Boolean).map((f) => `- \`${f}\``),
          "",
          `Resolve locally: \`node scripts/sync-upstream.mjs ${component} ${ref}\`, fix the conflicts, \`git commit\`, then \`node scripts/sync-upstream.mjs --continue\`.`,
        ].join("\n"),
      );
      console.log(`${component}: conflict, issue opened`);
      return true;
    }
    writeFileSync(statePath(), JSON.stringify(state, null, 2));
    console.error(`Conflicts:\n${conflicts}\n\nResolve them, run \`git add\` and \`git commit\`, then: node scripts/sync-upstream.mjs --continue`);
    process.exit(2);
  }
  return finish(state);
}

if (flag("--status")) status();
else if (flag("--continue")) {
  if (!existsSync(statePath())) throw new Error("no sync in progress");
  if (tryGit("rev-parse", "-q", "--verify", "MERGE_HEAD") !== null) throw new Error("merge not committed yet; resolve, git add, git commit");
  process.exit(finish(JSON.parse(readFileSync(statePath(), "utf8"))) ? 0 : 3);
} else if (CI && positional.length === 0) {
  // The watcher opens PRs even when guards fail; the PR body shows the failure.
  for (const component of Object.keys(readLock())) {
    sync(component);
    git("switch", "--quiet", "main");
  }
} else if (positional.length >= 1) process.exit(sync(positional[0], positional[1]) ? 0 : 3);
else {
  console.error("usage: node scripts/sync-upstream.mjs <server|client|frontend> [ref] [--no-pr] | --continue | --status");
  process.exit(1);
}
