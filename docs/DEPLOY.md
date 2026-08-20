# Running TTJ Team OS on Google infrastructure

Everything here is Rishi's to run — the app's code, config and rules live in this
repo, but creating cloud resources needs your Google account.

**Two projects are in play** — worth knowing before anything confuses you:

| What | Project | Why |
|---|---|---|
| App data, Auth, Hosting, Storage | **`kkbpdashv2`** | the Firebase project the app is configured against |
| Git VM (`ttj-git-vm`, `asia-south1-c`) | **`kkbp-dash`** | where the VM was created |

`firebase` commands read `.firebaserc`, so they always target `kkbpdashv2`
regardless of which project `gcloud` has selected. The scripts here pass an
explicit `--project` for VM work, so the two never collide. The account also has
a third, unused `kkbpdash` — consolidating these three someday would remove a
standing source of confusion.

Region for anything new: **`asia-south1` (Mumbai)** — closest to Nagpur.

---

## 0. Where to run these commands

**From an iPad, use Cloud Shell.** The Google Cloud CLI is not available for
iPadOS — no terminal app can install `gcloud`, and the Firebase CLI needs Node,
which isn't there either. Cloud Shell sidesteps all of it: it runs in Safari,
comes with `gcloud`, `git`, `node`, `npm`, Java and Maven pre-installed, and is
already signed in to this project.

Open **[shell.cloud.google.com](https://shell.cloud.google.com)** (or the
terminal icon, top-right of the Cloud console), then once:

```bash
git clone https://github.com/rishiikothari/KKBP.git ttj && cd ttj
npm install     # installs vite AND the firebase CLI locally — no global installs needed
```

Cloud Shell starts with **no project selected**, which makes every `gcloud`
command fail with *"The required property [project] is not currently set"*. Fix
it once — it sticks:

```bash
gcloud projects list                       # find the project ID
gcloud config set project PROJECT_ID
```

If `kkbpdashv2` does **not** appear in that list, the Google account Cloud Shell
is signed in as (shown bottom-right) is not the one that owns the project. Either
open Cloud Shell as that account, or add this account as **Owner** under
IAM & Admin → IAM. Deploys will fail with permission errors otherwise.

Your Cloud Shell home directory persists between sessions, so that clone stays
put. **Do not run `npm config set prefix`** — it breaks nvm, which is how Cloud
Shell provides node, and leaves you with `node: No such file or directory` in
every later session. There's nothing to install globally: `firebase-tools` ships
in the repo as a dev dependency, so `npm install` (below) is all you need.

Do the Google migration **before** making the GitHub repo private, or that clone
step needs credentials.

If a **previous attempt already set the prefix** and node keeps disappearing,
you cannot undo it with npm — npm needs node, and node is what's missing. Repair
the files directly:

```bash
bash scripts/fix-cloudshell-node.sh
exec bash -l
```

From a laptop with the CLIs installed, everything below works the same way.

---

## 1. Hosting the app on Firebase (replaces GitHub Pages)

`firebase` here means `npx firebase` or the copy under `node_modules/.bin` — the
`npm run` scripts already use the local one, so nothing global is required.

Cloud Shell has no browser to bounce through, and stale credentials
make the copy-a-code flow fail with *"Your credentials are no longer valid"*, so
clear them first:

```bash
firebase logout
firebase login --no-localhost --reauth
```

Open the printed URL in a new tab, approve, and paste the code back **at the
`Enter authorization code:` prompt** — not at the shell prompt (pasting it there
just gets you `command not found`).

If that still refuses, use a token instead — this always works headless:

```bash
firebase login:ci --no-localhost          # prints a long token
export FIREBASE_TOKEN="paste-the-token"   # add to ~/.bashrc to keep it
```

Treat that token like a password: it grants deploy rights to the project.

### Provision the Hosting site — once, before the first deploy

A Firebase project has no Hosting site until Hosting is switched on. Deploying
before that fails with *"Assertion failed: resolving hosting target of a site
with no site name or target name"*, which does not explain itself at all.

Either open **Firebase console → Hosting → Get started** (click through; no need
to run the commands it shows), or do it from the shell:

```bash
firebase hosting:sites:list                        # is there one already?
firebase hosting:sites:create kkbpdashv2           # if not
```

`firebase.json` pins `"site": "kkbpdashv2"` so the deploy target can never be
ambiguous — which matters when the account can see three similarly-named KKBP
projects.

Then, from the repo root, any time you want to publish:

```bash
npm run deploy
```

If it dies mid-upload with `Error: An unexpected error has occurred`, that is
transient — just run it again (`npx firebase deploy --only hosting` skips the
rebuild). Deploys are idempotent.

That builds the app and uploads it. First run prints a `…web.app` URL — the app
is live there immediately. Every deploy is atomic and reversible: **Firebase
console → Hosting → release history → Rollback**.

GitHub is no longer involved in publishing, but the Pages workflow stays on
deliberately as a spare copy — see §1b for what running two addresses against one
database does and does not mean.

### Security rules now live in the repo

`firestore.rules` and `storage.rules` are the source of truth, so rules stop
being hand-pasted into a console text box:

```bash
npm run deploy:rules
```

Publishing from here **replaces** whatever is in the console — check the repo
copies say what you expect before the first run.

---

## 1b. Two addresses, one database

The app is reachable at two addresses — `kkbpdashv2.web.app` and the GitHub Pages
copy — and both are kept, the second as a spare. Worth understanding exactly what
that means, because the behaviour surprises people:

**Code is per-address. Data is per-database.** The Firebase config is baked into
the source, so wherever the app is served from it opens the same Firestore
document and holds a live listener on it. Add a task on one address and it appears
on the other within a couple of seconds — even if that address is running last
week's code. Only the HTML and JavaScript differ between the two.

That is why GitHub Pages can show a feature the Firebase address does not: Pages
rebuilds automatically on every push, Firebase Hosting only when you run
`npm run deploy`. The data was never behind; the code was.

### What stops that being dangerous

- **A build that finds the workspace newer than itself goes read-only.** It shows
  the team's live data and refuses every write, with a banner saying so. This
  matters: the reconciliation used to reset the workspace to a clean slate on any
  epoch mismatch and push the reset up, which would have destroyed everything the
  moment two builds disagreed. `src/sync.js` owns that decision now and
  `scripts/test-sync.mjs` pins it down.
- **A newer build elsewhere shows a "reload to catch up" notice** — informational
  only, and it ignores the same commit rebuilt at a different time, so it does not
  cry wolf about the two addresses building the same code.
- **The spare address labels itself.** Any host other than the live one carries a
  "spare copy" strip naming the main address.
- **Security → This build** reports the address, the build time, the commit and the
  data epoch, so "which version is this device on?" has an answer.

To exercise read-only mode deliberately, append `?readonly` to the address. It only
ever removes abilities from your own tab and a reload clears it.

### The home-screen icon is bound to its address

An installed icon always opens the address it was installed from, and the service
worker will serve it from cache if that address ever stops answering — so a dead
address does not retire the copies installed from it. **Delete the icon added from
the GitHub address and re-add it from `kkbpdashv2.web.app`** (and again when the
custom domain goes live). Otherwise you are one tap away from the spare without
realising.

### Keeping Pages means keeping the repo public

GitHub Pages on a private repository needs a paid GitHub plan. Keeping the spare
therefore means the repo stays public. That is much less serious than it was — the
passcodes that made a public repo dangerous are deleted, and the Firebase config in
the source is public by design, protected by security rules rather than by being
hidden. The standing risk is future: any secret committed by accident is instantly
public. Worth revisiting when the Java service lands and real secrets start to
exist.

---

## 2. Custom domain — `team.kkbusinesspark.com`

A subdomain needs one CNAME; the bare domain would need apex A/AAAA records and
would squat on a name you may want for a public site.

1. Firebase console → **Hosting → Add custom domain** → `team.kkbusinesspark.com`
2. Add the DNS record it gives you at your registrar (a `CNAME` → the value
   Firebase shows). Propagation is usually minutes; the certificate can take up
   to ~24 hours.
3. **Authentication → Settings → Authorized domains → Add** `team.kkbusinesspark.com`.
   Sign-in fails on any host not in this list — do this *before* telling the team
   the new address.
4. Once it resolves, tell everyone to re-add the home-screen icon at the new
   address. The old install keeps pointing at the old host.

Using the bare `kkbusinesspark.com` as well is fine — add it as a second custom
domain and let Firebase redirect it to the subdomain.

---

## 3. Source code on your own VM

The VM is a filing cabinet: it holds the git repo and nothing else runs on it.

### The service account it asked for

The VM needs **no** Google API access. Create one named `ttj-git-vm` with **no
IAM roles**, and set the VM's access scopes to *"Allow full access to all Cloud
APIs"* — scopes are a legacy control, and an account with no roles can do
nothing regardless. Later this account gets exactly one role
(`roles/storage.objectCreator`, on the backup bucket only) so the VM can push
git bundles for backup. Nothing else, ever.

You connect as yourself over SSH, not as this account.

### Create the repo and wire it up — one command

From Cloud Shell (or a laptop with `gcloud`):

```bash
./scripts/setup-git-remote.sh
```

It finds the VM and the zone it landed in, installs git there if needed, creates
the bare repo at `/srv/git/ttj-team-os.git`, writes the SSH host entries
(`gcloud compute config-ssh`), adds a `google` remote, pushes every branch and
tag, then compares local and remote HEAD and refuses to claim success if they
differ. Safe to run more than once. If it can't guess the VM, pass the name:
`./scripts/setup-git-remote.sh ttj-git-vm`.

Everyday pushes after that:

```bash
npm run push:google
```

If you ever stop and start the VM its external IP changes — re-run
`gcloud compute config-ssh` and the remote keeps working.

### Then retire GitHub

Once `google` has all branches and tags, and Firebase Hosting is serving the
custom domain, set the GitHub repo to **private** (or delete it). Keep it private
rather than deleted for a month as a third copy.

**A single VM is a single point of failure.** Turn on daily disk snapshots
(Compute Engine → Snapshots → schedule) and keep the weekly bundle-to-Cloud-Storage
job from the backup phase. Two copies in one project is not a backup strategy.

---

## 4. Cost expectation

| Item | Roughly per month |
|---|---|
| Firebase Hosting, Firestore, Auth | ₹0 (free tier at this usage) |
| `e2-micro` VM, `asia-south1` | ₹600–900 |
| Cloud Storage backups | ₹20–50 |
| Cloud Run (later, scales to zero) | ₹0–300 |
| Secret Manager (later) | ~₹6 |

Domain renewal is separate, ~₹800–1,500/year.

Set a budget alert: **Billing → Budgets & alerts** → ₹2,000/month, email at 50%
and 100%. It won't stop spend, but nothing surprises you.

---

## 5. Where things stand

- **Source on the VM** — done. `ttj-git-vm` / `asia-south1-c` / `kkbp-dash`,
  both branches verified against local SHAs.
- **Hosting live** — done. <https://kkbpdashv2.web.app>, serving from
  `kkbpdashv2` with the security headers from `firebase.json` applied.
- **Version skew made safe** — done. A build behind the shared workspace goes
  read-only instead of resetting it; the spare address labels itself.
- **Remaining** — custom domain, authorized domains, and re-adding the home-screen
  icon from the Firebase address.

## 6. Order to do it in

1. `npm run deploy` → confirm the app works at the `…web.app` URL.
2. Add `team.kkbusinesspark.com` in Hosting; add the DNS record.
3. Add that host to Auth → Authorized domains. **Sign in there to prove it works.**
4. Set up the VM git remote; push; confirm a scratch clone matches.
5. Delete the home-screen icon added from the GitHub address; re-add from the
   Firebase one (or the custom domain once it resolves).
6. Tell the team the new address and to re-add the home-screen icon.
