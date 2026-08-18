#!/usr/bin/env bash
# Check every prerequisite for deploying TTJ Team OS and say exactly what's wrong.
#   ./scripts/doctor.sh
# Read-only: changes nothing. Paste the output back if you want help reading it.

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; FAILED+=("$*"); }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$*"; }
FAILED=()
FIRST_FIX=""
fix() { [ -z "$FIRST_FIX" ] && FIRST_FIX="$1"; }

head_ "Where this is running"
if [ -n "${CLOUD_SHELL:-}" ] || [ -n "${DEVSHELL_PROJECT_ID:-}" ]; then
  ok "Google Cloud Shell"
else
  warn "Not Cloud Shell (that's fine if the CLIs are installed locally)"
fi
echo "  directory : $(pwd)"

head_ "Google Cloud CLI"
if command -v gcloud >/dev/null 2>&1; then
  ok "gcloud present"
  ACCT=$(gcloud config get-value account 2>/dev/null | grep -v '^$' || true)
  [ -n "$ACCT" ] && ok "signed in as: $ACCT" || { bad "no active gcloud account"; fix "gcloud auth login"; }
  PROJ=$(gcloud config get-value project 2>/dev/null | grep -viE '^(|unset)$' || true)
  if [ -n "$PROJ" ]; then
    ok "project set: $PROJ"
  else
    bad "no project selected — this breaks every gcloud command"
    fix "gcloud projects list   then   gcloud config set project PROJECT_ID"
    echo "     projects this account can see:"
    gcloud projects list --format="value(projectId,name)" 2>/dev/null | sed 's/^/       /' || echo "       (none — wrong account?)"
  fi
  if [ -n "$PROJ" ]; then
    if gcloud projects describe "$PROJ" >/dev/null 2>&1; then
      ok "this account can access $PROJ"
    else
      bad "$ACCT cannot access project $PROJ"
      fix "Open Cloud Shell as the account that owns the project, or add $ACCT as Owner in IAM & Admin → IAM"
    fi
    VMS=$(gcloud compute instances list --format="value(name,zone,status)" 2>/dev/null || true)
    if [ -n "$VMS" ]; then
      ok "VMs visible:"; printf '%s\n' "$VMS" | sed 's/^/       /'
    else
      warn "no VMs found in $PROJ (only needed for the git remote step)"
    fi
  fi
else
  bad "gcloud not installed — on an iPad this cannot be fixed locally"
  fix "Use Cloud Shell: https://shell.cloud.google.com"
fi

head_ "Node and the build"
command -v node >/dev/null 2>&1 && ok "node $(node -v)" || { bad "node missing"; fix "Use Cloud Shell"; }
command -v npm  >/dev/null 2>&1 && ok "npm $(npm -v)"  || bad "npm missing"
if [ -f package.json ]; then
  ok "in the repo (package.json found)"
  if [ -d node_modules ]; then
    ok "node_modules present"
    if [ -x node_modules/.bin/vite ]; then ok "vite available"; else bad "vite missing from node_modules"; fix "npm install"; fi
  else
    bad "node_modules missing — 'vite: command not found' comes from this"
    fix "npm install"
  fi
else
  bad "not in the repo directory"
  fix "cd ~/ttj"
fi

head_ "Firebase CLI"
if command -v firebase >/dev/null 2>&1; then
  ok "firebase $(firebase --version 2>/dev/null | head -1)"
  if [ -n "${FIREBASE_TOKEN:-}" ]; then
    ok "FIREBASE_TOKEN is set (token auth will be used)"
  else
    LOGIN=$(firebase login:list 2>&1 | head -3)
    if printf '%s' "$LOGIN" | grep -qi 'no authorized\|not logged'; then
      bad "not logged in to Firebase"
      fix "firebase logout ; firebase login --no-localhost --reauth   (paste the code at the 'Enter authorization code:' prompt)"
    else
      ok "logged in: $(printf '%s' "$LOGIN" | tr '\n' ' ' | cut -c1-90)"
    fi
  fi
  echo "  projects the Firebase CLI can see:"
  timeout 45 firebase projects:list 2>&1 | sed 's/^/    /' | head -12
else
  bad "firebase CLI not installed"
  fix "npm config set prefix ~/.npm-global && echo 'export PATH=~/.npm-global/bin:\$PATH' >> ~/.bashrc && source ~/.bashrc && npm install -g firebase-tools"
fi

head_ "Repo state"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  && { ok "git repo, HEAD $(git rev-parse --short HEAD)"; echo "  remotes:"; git remote -v | sed 's/^/    /'; } \
  || bad "not a git repo"

head_ "Verdict"
if [ ${#FAILED[@]} -eq 0 ]; then
  printf '  \033[32mEverything needed is in place. Run: npm run deploy\033[0m\n\n'
else
  printf '  %d problem(s). Do this first:\n\n    \033[1m%s\033[0m\n\n' "${#FAILED[@]}" "$FIRST_FIX"
  echo "  Then re-run ./scripts/doctor.sh"
fi
