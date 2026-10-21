# Branding assets

Trayb broadcast logos, hosted here so the observer client can pull them by raw URL into the
overlay's sponsor / tournament / watermark slots. They live at the repo root, outside the
`server/`, `client/` and `frontend/` subtrees, so upstream syncs never touch them.

Raw URL pattern: `https://raw.githubusercontent.com/OnarYusifov/trayboverlay/main/assets/branding/<file>`

| File | What it is | Notes |
|---|---|---|
| `production.png` | Production team logo | white, transparent — for dark overlay regions |
| `sponsor-bizoncyber.png` | Main sponsor (Bizon Cyber) | white, transparent |
| `venue-ugc.png` | Gaming club / venue (UNEC Gaming Club, UGC) | full-colour, 1000×1000 |
| `organizer.png` | Organizer | full-colour, 1000×1000 |

The two white logos are invisible on a white background by design; they read correctly on the
overlay's dark panels. Set them in the observer client (Sponsor and Tournament panels), not in
overlay code — see `docs/operations.md` → "Branding the overlay".
