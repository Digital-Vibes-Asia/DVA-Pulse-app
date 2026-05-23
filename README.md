# DVAPulse

Lead intake, routing & performance console — **Marketer**, **Sales Manager**, and **Executive** workspaces in one app. Front-end prototype running on in-browser mock data.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Open in Claude Code

```bash
cd dvapulse-app
claude
```

Claude Code reads `CLAUDE.md` automatically for full context on the architecture, the auto-assignment engine, and where to extend things.

## What's inside

- **Landing page** — hero, live funnel pulse, three persona cards.
- **Marketer** — drag-drop a CSV (or "Load sample batch"), preview + validate rows, batch-insert into staging; new leads auto-route to managers.
- **Sales Manager** — switch managers, work the assigned queue, live first-contact SLA timers (24h), advance funnel stages, log first contact.
- **Executive** — KPI cards, funnel-mix + attribution charts, manager performance (daily/overall), filters + search, bulk assignment, filtered CSV export.

## Stack

Vite + React 18 · recharts · papaparse · lucide-react. No Tailwind — styling is self-contained in `src/App.jsx`.

## Notes

- Data is seeded and resets on refresh (no backend / no auth yet).
- The logo and styling are an original interpretation, not a byte-for-byte copy of the source site.
