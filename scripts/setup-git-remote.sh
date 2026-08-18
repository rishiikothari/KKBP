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

# ---- 1. find the VM and the zone it landed in -------------------------------
say "Looking for the VM"
if [ $# -ge 1 ]; then
  VM="$1"
  ZONE=$(gcloud compute instances list --filter="name=$VM" --format="value(zone)" | head -1)
  [ -n "$ZONE" ] || die "No VM named '$VM' in this project. Run: gcloud compute instances list"
else
  MATCHES=$(gcloud compute instances list --format="value(name,zone)" | grep -i git || true)
  COUNT=$(printf '%s' "$MATCHES" | grep -c . || true)
  if [ "$COUNT" -eq 0 ]; then
    echo "Couldn't spot a VM with 'git' in the name. Your instances:"
    gcloud compute instances list --format="table(name,zone,status)"
    die "Re-run with the name: ./scripts/setup-git-remote.sh <vm-name>"
  elif [ "$COUNT" -gt 1 ]; then
    echo "More than one candidate:"; printf '%s\n' "$MATCHES"
    die "Re-run with the name you want: ./scripts/setup-git-remote.sh <vm-name>"
  fi
  VM=$(printf '%s' "$MATCHES" | awk '{print $1}')
  ZONE=$(printf '%s' "$MATCHES" | awk '{print $2}')
fi
ZONE=${ZONE##*/}                      # the API returns a full URL; keep the last segment
PROJECT=$(gcloud config get-value project 2>/dev/null)
echo "  VM      : $VM"
echo "  Zone    : $ZONE"
echo "  Project : $PROJECT"

# ---- 2. create the bare repo on the VM (idempotent) -------------------------
say "Preparing the bare repository on the VM"
gcloud compute ssh "$VM" --zone="$ZONE" --command "
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
gcloud compute config-ssh --quiet >/dev/null
HOST="$VM.$ZONE.$PROJECT"
ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" true \
  || die "SSH to $HOST failed. Try 'gcloud compute ssh $VM --zone=$ZONE' once by hand, then re-run."

# ---- 4. wire up the remote and push ---------------------------------------
say "Pointing this repo at it"
git remote remove "$REMOTE" 2>/dev/null || true
git remote add "$REMOTE" "ssh://$HOST$REPO_PATH"
git push "$REMOTE" --all
git push "$REMOTE" --tags

# ---- 5. prove it actually holds the history -------------------------------
say "Verifying"
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git ls-remote "$REMOTE" HEAD | awk '{print $1}')
echo "  local  HEAD: $LOCAL_HEAD"
echo "  remote HEAD: $REMOTE_HEAD"
[ "$LOCAL_HEAD" = "$REMOTE_HEAD" ] || die "Remote HEAD doesn't match — do not retire GitHub yet."
echo "  branches on the VM:"; git ls-remote --heads "$REMOTE" | sed 's/^/    /'

cat <<DONE

✓ Done. From now on:  npm run push:google

Two things worth knowing:
  • If you stop and start the VM its external IP changes — re-run
    'gcloud compute config-ssh' and this remote keeps working.
  • Confirm it's a real copy before retiring GitHub:
      git clone ssh://$HOST$REPO_PATH /tmp/ttj-verify && git -C /tmp/ttj-verify log --oneline -3
DONE
