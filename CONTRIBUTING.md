# Working on trayboverlay

**Every job is a GitHub issue.** That includes bugs, config changes, setup work, upstream syncs and decisions. Nothing starts without an issue, so the [issue list](../../issues) always shows what's planned, who's doing it and what's blocked.

## Filing an issue

Use **New issue** and pick a form:

| Form | Use it for | Gets labeled |
|---|---|---|
| Bug | Something is broken in the client, server or overlay | `type: bug`, `status: needs-triage` |
| Task | Planned work: a feature, config change, setup, a sync | `type: task`, `status: needs-triage` |
| Decision | A choice that must be made before work can continue | `type: decision`, `status: needs-triage` |

One issue per job. Big jobs get a checklist in the issue, or several issues that link to each other with `#N`. Upstream conflicts found by the weekly watcher open their own issues.

## Triage

An issue is triaged when it has **one label from each required group** and `status: needs-triage` is removed.

| Group | Required | Labels | Meaning |
|---|---|---|---|
| Type | one | `type: bug`, `type: feature`, `type: task`, `type: decision`, `type: chore`, `type: docs` | What kind of work it is |
| Priority | one | `P0: critical` | Blocks the next milestone or breaks a live broadcast. Drop other work |
| | | `P1: high` | Needed for the next milestone |
| | | `P2: medium` | Needed before the first broadcast |
| | | `P3: low` | Nice to have, or after the first broadcast |
| Area | one or more | `area: server`, `area: client`, `area: frontend`, `area: infra`, `area: upstream`, `area: security`, `area: legal`, `area: testing` | Which part of the project |
| Owner | one | `owner: onar` | Onar acts: decisions, accounts, purchases, DNS, reviews. Also assigned on GitHub |
| | | `owner: claude` | Claude (the AI assistant) does the work in the repo |
| Size | one | `size: S` (under 2 h), `size: M` (half a day), `size: L` (a day or more) | Rough effort |
| Environment | if relevant | `env: dev`, `env: staging`, `env: prod` | Where it happens |
| Status | if relevant | `status: blocked` | Waiting on someone or something outside the repo. Say what in a comment |
| | | `status: in-progress` | Someone is working on it now |
| | | `status: needs-info` | Can't proceed without more information |

Set a **milestone**: **M1 Monorepo ready**, **M2 Staging live**, **M3 Client release** or **M4 First broadcast**.

Resolution labels for closing without doing the work: `duplicate`, `invalid`, `wontfix`, `question`.

## Working an issue

1. Add `status: in-progress`. If you're the owner and not yet assigned, assign yourself.
2. Make the change in git, following the rules in [CLAUDE.md](CLAUDE.md#rules). Changes inside `server/`, `client/` or `frontend/` go into [docs/patches.md](docs/patches.md) and that folder's `NOTICE-TRAYB.md`.
3. Reference the issue in every commit: `Refs #12` while it's still open, `Closes #12` on the commit that finishes it. GitHub closes it when that commit reaches `main`.
4. CI must be green (`node scripts/check-trayb.mjs` locally runs the same guards).
5. Comment with what was verified, then close it, or let the `Closes` commit close it.

Decisions: write the outcome in the issue, add it to [docs/decisions.md](docs/decisions.md), then close it.

Upstream syncs: see [docs/upstream-sync.md](docs/upstream-sync.md).

## Finding work

- Mine (Onar): [`owner: onar`](../../issues?q=is%3Aopen+label%3A%22owner%3A+onar%22)
- Claude: [`owner: claude`](../../issues?q=is%3Aopen+label%3A%22owner%3A+claude%22)
- Blocked: [`status: blocked`](../../issues?q=is%3Aopen+label%3A%22status%3A+blocked%22)
- Not triaged yet: [`status: needs-triage`](../../issues?q=is%3Aopen+label%3A%22status%3A+needs-triage%22)
- Most urgent first: sort by label `P0` and `P1`, or open a milestone
