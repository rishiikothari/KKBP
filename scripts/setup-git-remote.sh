#!/usr/bin/env bash
# Point this repo at the bare git repo on your Compute Engine VM.
#
#   ./scripts/setup-git-remote.sh [vm-name]
#
# Run it on your own machine (needs gcloud, already logged in). Safe to re-run —
# every step checks before it acts. Nothing here touches GitHub.
set -euo pipefail

REPO_PATH="/srv/git/ttj-team-os.git"
REMOTE="google"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud not found. On an iPad there is no way to install it — use Cloud Shell instead: https://shell.cloud.google.com"
command -v git   >/dev/null || die "git isn't installed."

# ---- 1. find the VM: name, zone AND project ---------------------------------
# The VM may well live in a different project from the app's Firebase project,
# so every gcloud call below carries an explicit --project rather than trusting
# whatever happens to be selected.
say "Looking for the VM"
find_in() {  # $1 = project, $2 = optional name filter
  if [ -n "${2:-}" ]; then
    gcloud compute instances list --project="$1" --filter="name=$2" --format="value(name,zone)" 2>/dev/null
  else
    gcloud compute instances list --project="$1" --format="value(name,zone)" 2>/dev/null | grep -i git || true
  fi
}

WANT="${1:-}"
VM=""; ZONE=""; PROJECT=""
CURRENT=$(gcloud config get-value project 2>/dev/null | grep -viE '^(|unset)$' || true)

# try the selected project first, then every project the account can see
for P in $CURRENT $(gcloud projects list --format="value(projectId)" 2>/dev/null); do
  [ -n "$P" ] || continue
  HIT=$(find_in "$P" "$WANT" | head -1)
  if [ -n "$HIT" ]; then
    VM=$(printf '%s' "$HIT" | awk '{print $1}')
    ZONE=$(printf '%s' "$HIT" | awk '{print $2}')
    PROJECT="$P"
    break
  fi
done

if [ -z "$VM" ]; then
  echo "Couldn't find a VM${WANT:+ named '$WANT'} in any project you can see."
  echo "Your instances:"
  for P in $(gcloud projects list --format="value(projectId)" 2>/dev/null); do
    gcloud compute instances list --project="$P" --format="value(name,zone,status)" 2>/dev/null | sed "s/^/  [$P] /"
  done
  die "Re-run with the name: ./scripts/setup-git-remote.sh <vm-name>"
fi
ZONE=${ZONE##*/}
echo "  VM      : $VM"
echo "  Zone    : $ZONE"
echo "  Project : $PROJECT"

G=(--project "$PROJECT" --zone "$ZONE")

# ---- 2. create the bare repo on the VM (idempotent) -------------------------
say "Preparing the bare repository on the VM"
gcloud compute ssh "$VM" "${G[@]}" --command "
  set -e
  if ! command -v git >/dev/null; then
    echo '  installing git…'
    sudo apt-get update -qq && sudo apt-get install -y -qq git
  fi
  sudo mkdir -p $REPO_PATH
  sudo chown -R \"\$USER\":\"\$USER\" /srv/git
  if [ ! -f $REPO_PATH/HEAD ]; then
    git init --bare --quiet $REPO_PATH
    git -C $REPO_PATH symbolic-ref HEAD refs/heads/main
    echo '  bare repo created'
  else
    echo '  bare repo already there — leaving it alone'
  fi
"

# ---- 3. teach ssh (and therefore git) how to reach it ----------------------
say "Writing SSH host entries"
gcloud compute config-ssh --project "$PROJECT" --quiet >/dev/null
HOST="$VM.$ZONE.$PROJECT"
ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" true \
  || die "SSH to $HOST failed. Try 'gcloud compute ssh $VM --project=$PROJECT --zone=$ZONE' once by hand, then re-run."

# ---- 4. wire up the remote and push ---------------------------------------
say "Pointing this repo at it"
git remote remove "$REMOTE" 2>/dev/null || true
git remote add "$REMOTE" "ssh://$HOST$REPO_PATH"
git push "$REMOTE" --all
git push "$REMOTE" --tags

# The bare repo's HEAD points at refs/heads/main. If this clone is sitting on a
# different branch, --all never creates main, HEAD stays dangling, and the repo
# looks empty to anyone cloning it. Make sure main exists.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if ! git ls-remote --heads "$REMOTE" main | grep -q 'refs/heads/main'; then
  say "Creating main on the VM (this clone is on '$BRANCH')"
  git push "$REMOTE" "HEAD:refs/heads/main"
fi

# ---- 5. prove it actually holds the history -------------------------------
say "Verifying"
LOCAL=$(git rev-parse HEAD)
REMOTE_BRANCH=$(git ls-remote "$REMOTE" "refs/heads/$BRANCH" | awk '{print $1}')
REMOTE_MAIN=$(git ls-remote "$REMOTE" refs/heads/main | awk '{print $1}')
echo "  local HEAD ($BRANCH) : $LOCAL"
echo "  remote $BRANCH        : ${REMOTE_BRANCH:-(missing)}"
echo "  remote main           : ${REMOTE_MAIN:-(missing)}"
[ "$LOCAL" = "$REMOTE_BRANCH" ] || die "The VM's copy of '$BRANCH' doesn't match — do not retire GitHub yet."
[ -n "$REMOTE_MAIN" ]           || die "No main branch on the VM — a fresh clone of it would look empty."
echo "  branches on the VM:"; git ls-remote --heads "$REMOTE" | sed 's/^/    /'

cat <<DONE

Done. From now on:  npm run push:google

Two things worth knowing:
  - If you stop and start the VM its external IP changes — re-run
    'gcloud compute config-ssh --project $PROJECT' and this remote keeps working.
  - Confirm it's a real copy before retiring GitHub:
      git clone ssh://$HOST$REPO_PATH /tmp/ttj-verify && git -C /tmp/ttj-verify log --oneline -3
DONE
