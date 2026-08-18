# Running TTJ Team OS on Google infrastructure

Everything here is Rishi's to run — the app's code, config and rules live in this
repo, but creating cloud resources needs your Google account.

Project: **`kkbpdashv2`** · Region for anything new: **`asia-south1` (Mumbai)** —
closest to Nagpur.

---

## 1. Hosting the app on Firebase (replaces GitHub Pages)

One-time:

```bash
npm install -g firebase-tools
firebase login
```

Then, from the repo root, any time you want to publish:

```bash
npm run deploy
```

That builds the app and uploads it. First run prints a `…web.app` URL — the app
is live there immediately. Every deploy is atomic and reversible: **Firebase
console → Hosting → release history → Rollback**.

GitHub is no longer involved in publishing. Keep the GitHub Pages workflow until
the custom domain is confirmed working, then delete `.github/workflows/deploy.yml`.

### Security rules now live in the repo

`firestore.rules` and `storage.rules` are the source of truth, so rules stop
being hand-pasted into a console text box:

```bash
npm run deploy:rules
```

Publishing from here **replaces** whatever is in the console — check the repo
copies say what you expect before the first run.

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

From your own machine, with `gcloud` installed and logged in:

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

## 5. Order to do it in

1. `npm run deploy` → confirm the app works at the `…web.app` URL.
2. Add `team.kkbusinesspark.com` in Hosting; add the DNS record.
3. Add that host to Auth → Authorized domains. **Sign in there to prove it works.**
4. Set up the VM git remote; push; confirm a scratch clone matches.
5. Make the GitHub repo private; delete the Pages workflow.
6. Tell the team the new address and to re-add the home-screen icon.
