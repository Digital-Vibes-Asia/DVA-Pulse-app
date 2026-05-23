# DVAPulse — Claude Code project guide

DVAPulse is a lead intake, routing, and performance console for Digital Vibes Asia.
It serves three personas: **Marketer** (CSV upload), **Sales Manager** (queue triage),
and **Executive** (analytics + assignment). This repo is the front-end prototype,
running entirely in-browser on seeded mock data — there is no backend yet.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run build` → production bundle in `dist/`. `npm run preview` to serve the build.

## Stack

- **Vite 5** + **React 18** (no TypeScript, no Tailwind)
- **recharts** — funnel bar chart + attribution pie (Executive view)
- **papaparse** — real CSV parsing in the Marketer upload flow
- **lucide-react** — icons
- Styling is **self-contained**: one `<style>` block inside `App.jsx` defines all
  design tokens (CSS variables) and component classes prefixed `dva-`. Layout is done
  with inline `style={{}}`. There is intentionally **no Tailwind** — don't add utility
  classes expecting them to resolve.

## File map

Almost everything lives in **`src/App.jsx`** (single file by design). Sections, top to bottom:

| Region | What it is |
| --- | --- |
| `Style` | All CSS: tokens, fonts (Google Fonts via @import), animations, component classes |
| `STATUS`, `STAGE_ORDER` | Funnel stage definitions + colors |
| MOCK DATA | `MANAGERS_SEED`, `seedLeads()`, name/campus/program/source pools |
| `autoAssign(leads, managers)` | **Fair-rotation assignment engine** (see below) |
| `sla(lead)` | First-contact SLA state (`ok` / `urgent` / `overdue`, 24h window) |
| ATOMS | `Logo`, `Badge`, `SlaBadge` |
| `Nav` | Top nav + mobile menu; drives the `page` state router |
| `Home` | Landing page (hero, live-funnel panel, 3 persona cards) |
| `Marketer` | CSV drag-drop → preview → validate → stage → auto-assign |
| `Manager` | Per-manager queue, SLA timers, stage progression, log contact |
| `Executive` | KPI cards, charts, manager performance, filters, bulk assign, CSV export |
| `Guide` | User-guide content |
| `App` | Root state (`leads`, `managers`, `page`) + mutations |

State lives in the `App` component and flows down via props:
`insert`, `setStatus`, `markContact`, `reassign`.

## Domain logic that must stay correct

**Auto-assignment (`autoAssign`)** — when a lead is `New` and unassigned:
1. Consider only **active** managers.
2. Exclude any manager already at **capacity** (open leads ≥ capacity).
3. Prefer the manager with the **fewest open leads**; ties rotate evenly.
4. On assign: set `manager`, move status `New → Assigned`, stamp `assignedAt`, log the action.
Open leads = status not in `Converted` / `Closed`.

**Conversion %** = `Converted ÷ assigned-leads-in-scope × 100`.

**First-contact SLA** runs from `assignedAt`; `urgent` at ≥18h, `overdue` at ≥24h, cleared once `firstContactAt` is set.

## Conventions

- Keep the `dva-` CSS-class prefix and the CSS-variable palette; don't introduce a CSS framework.
- Mock data resets on every page refresh — that's expected for the prototype.
- Numeric/data values use the `.dva-mono` class (JetBrains Mono).

## Likely next steps (good tasks to ask Claude Code for)

- Split `App.jsx` into per-view files under `src/views/` and shared logic under `src/lib/`.
- Add a real backend (the original target stack was Next.js + Prisma + Postgres):
  move `autoAssign`, SLA, and stats to server actions; persist leads / managers / assignment logs.
- Add auth + role gating per persona.
- Replace seeded data with a real `/api/upload` ingestion endpoint.
