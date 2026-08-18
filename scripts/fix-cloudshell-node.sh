#!/usr/bin/env bash
# Repair Cloud Shell when node/npm have vanished.
#
#   bash scripts/fix-cloudshell-node.sh   &&   exec bash -l
#
# Cause: an npm "prefix" setting in ~/.npmrc is incompatible with nvm, which is
# how Cloud Shell provides node. nvm then refuses to load, so node and npm drop
# off PATH — and `npm config delete prefix` can't fix it, because that needs the
# npm you no longer have. This edits the files directly. Pure bash: no node, no
# npm, nothing to bootstrap.
set -uo pipefail
say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }

say "Clearing the npm prefix from ~/.npmrc"
if [ -f "$HOME/.npmrc" ] && grep -qE '^\s*prefix\s*=' "$HOME/.npmrc"; then
  cp "$HOME/.npmrc" "$HOME/.npmrc.bak.$(date +%s 2>/dev/null || echo old)"
  sed -i -E '/^\s*prefix\s*=/d' "$HOME/.npmrc"
  echo "  removed (backup kept alongside)"
else
  echo "  nothing to remove"
fi

say "Removing the ~/.npm-global PATH line from ~/.bashrc"
if [ -f "$HOME/.bashrc" ] && grep -q '\.npm-global/bin' "$HOME/.bashrc"; then
  sed -i '\|\.npm-global/bin|d' "$HOME/.bashrc"
  echo "  removed"
else
  echo "  nothing to remove"
fi

say "Loading nvm and selecting a node version"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use --lts >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || nvm use default >/dev/null 2>&1
  if command -v node >/dev/null 2>&1; then
    echo "  node $(node -v) at $(command -v node)"
  else
    echo "  nvm is present but no node version is active; installed versions:"
    ls "$NVM_DIR/versions/node" 2>/dev/null | sed 's/^/    /' || echo "    (none)"
    echo "  try: nvm install --lts"
  fi
else
  echo "  no nvm at $NVM_DIR — node may come from the system image instead"
  command -v node >/dev/null 2>&1 && echo "  node $(node -v)" || echo "  node still missing: restart Cloud Shell (⋮ → Restart)"
fi

cat <<'DONE'

Now run:

  exec bash -l          # fresh login shell, node stays put
  cd ~/ttj && npm install
  npm run deploy

If node is still missing after that, restart the terminal (⋮ → Restart). Your
home directory — the repo, and your Firebase token — survives a restart.
DONE
