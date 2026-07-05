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

1. **Log in** — enter your username and password. Defaults ship with the seed data
   and are visible to the Owner under **Team & Access** (Owner login: username
   `rishi`, password `7001`; every other seat's default password equals their old
   4-digit PIN). Change all of them on first run.
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

## Live updates — one shared workspace for the whole team

Out of the box the app runs standalone (data stays in each device's browser).
To make every device share one live dataset — edits appear everywhere within a
second or two — connect the free Firebase backend once:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   create a project (any name, Analytics off is fine).
2. **Build → Firestore Database → Create database → Start in test mode.**
3. **Project settings (gear) → Your apps → Web app (`</>`)** → register it, then
   copy the `firebaseConfig = { … }` block it shows you.
4. In the app, log in as Owner → **Team & Access → Live shared workspace** →
   paste the config → **Connect shared workspace**.
5. Repeat step 4 (paste + connect) on every device that should share data —
   or just send teammates the config block to paste once.

The sidebar shows **● Live · shared** when connected. The first connected device
seeds the cloud with its data; after that the cloud copy wins everywhere.

Notes:
- Everything still saves locally too, so a device that drops offline keeps working
  and the Export/Import JSON buttons remain your backup.
- Test-mode Firestore rules are open — treat the config block like a key and keep
  it internal. Firebase will email you to extend the rules after 30 days; set the
  rule expiry far out or switch rules to `allow read, write: if true;` knowingly.
- The login screen is a discipline gate, not bank-grade security. For hard
  per-role isolation the next step is a real backend with server-side auth;
  the register schema maps to it 1:1.

## Project layout

```
index.html                    entry page
src/main.jsx                  React bootstrap
src/App.jsx                   the entire app (theme, seed data, all pages)
.github/workflows/deploy.yml  auto-deploy to GitHub Pages
netlify.toml / vercel.json    zero-config deploys on Netlify / Vercel
```
