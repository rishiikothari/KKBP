# KKBP Team OS

The official channel for the **Karan Kothari Business Park** team — one dashboard for
tasks, approvals, announcements, the leasing rent-roll, capex & works, the marketing
content studio, admin & compliance, drawings & RFIs, the mall stacking plan, documents,
meetings with AI notes, and the KKBP constitution.

Built with React + Vite. No server required — it ships as a static site.

---

## Quick start (run it on your computer)

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). To create a production build:

```bash
npm run build     # output goes to dist/
npm run preview   # serves the built app locally
```

## How to use the app

1. **Log in** — pick your seat on the login screen and enter your 4-digit PIN.
   Default PINs ship with the seed data and are visible to the Owner under
   **Team & Access** (Owner login: *Rishi Kothari*, PIN `7001`). Change them on first run.
2. **Daily pages** — everyone gets Overview (your KPIs + open work), Tasks (kanban),
   Approvals (money moves only through here, routed per the Delegation of Authority),
   and Announcements.
3. **Workspaces** — each department sees its own registers: Leasing gets the rent-roll,
   Projects get Capex & Works and Drawings/RFIs, Marketing gets the campaign + content
   studio, Admin gets licences & vendors. Executives see everything.
4. **External partners** (agencies, consultants, brokers) log in the same way but only
   see their own tasks, briefs, and documents.
5. **Meetings & AI Notes** — record a meeting (or paste a transcript), let the AI
   notetaker extract the summary, decisions, and action items, review them, then
   publish: action items land on each person's dashboard as real tasks.
   In this standalone build the AI analysis needs an Anthropic API key
   (from console.anthropic.com), entered once per browser on the review screen.

## How to share it with the team (deployment)

### Option A — GitHub Pages (recommended, free, already wired up)

1. Merge this branch into the default branch.
2. In the GitHub repo: **Settings → Pages → Build and deployment → Source →
   "GitHub Actions"** (one-time switch).
3. Every push now auto-builds and publishes. Your team opens:
   **`https://rishiikothari.github.io/KKBP/`**

### Option B — Netlify or Vercel

Both are pre-configured (`netlify.toml` / `vercel.json`). Sign in with GitHub on
[netlify.com](https://netlify.com) or [vercel.com](https://vercel.com), click
"Import project", pick this repo — done. You get a URL like `kkbp.netlify.app`
and can attach a custom domain later.

### Option C — any static host / office NAS

`npm run build`, then copy the `dist/` folder anywhere that can serve files.
The build uses relative paths, so it works from any folder or subpath.

## Where the data lives (important)

This build stores all data in **each device's browser** (localStorage) — there is no
shared database yet. Practical implications:

- Each person's device keeps its own copy of the data.
- To move data between devices, use **Team & Access → Export all data (JSON)** and
  **Import JSON** (Owner only). Treat the export as your backup.
- The PIN screen is a discipline gate, not security — anyone with the link can open
  the app shell. Keep the URL internal.

The register schema is deliberately designed to map 1:1 onto a real backend
(FastAPI + Postgres with server-side auth) when the team is ready for shared,
access-controlled data.

## Project layout

```
index.html                    entry page
src/main.jsx                  React bootstrap
src/App.jsx                   the entire app (theme, seed data, all pages)
.github/workflows/deploy.yml  auto-deploy to GitHub Pages
netlify.toml / vercel.json    zero-config deploys on Netlify / Vercel
```
