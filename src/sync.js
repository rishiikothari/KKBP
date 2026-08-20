/* ============================================================================
   What to do when a shared snapshot lands.

   This is the most dangerous decision the app makes. It used to live inline in
   a boot effect with no test, and it was wrong: it compared the local
   DATA_EPOCH constant to the one in the shared document with `!==`, so a client
   whose build was *behind* the workspace treated the team's data as stale,
   reset it to a clean slate, and — because the reset counts as a local change —
   pushed the wipe back up for everyone.

   Two copies of the app are now served from two addresses against one database,
   so a build being behind is a normal condition, not an anomaly. The rule is
   therefore: a client that finds data newer than itself does not get a vote.

   Pure — no React, no Firebase, no DOM — so scripts/test-sync.mjs can exercise
   every branch directly.
   ============================================================================ */

/* Order two data epochs. They are `YYYY-MM-DD-label` strings, so plain string
   comparison is chronological; keep that shape or this silently stops working.
   A missing epoch sorts oldest, which is correct — it predates the stamp. */
export function epochOrder(a, b) {
  const x = String(a == null ? "" : a), y = String(b == null ? "" : b);
  if (x === y) return 0;
  return x < y ? -1 : 1;
}

/* Decide what a snapshot means. Returns the action only — building the state is
   the caller's job, because that needs migrateState/freshState and those carry
   the whole app with them.

     adopt  take the shared workspace as it is (the normal case)
     reset  the workspace predates our epoch: wipe to a clean slate, push it up
     seed   the workspace holds nothing and this device holds real records
     stale  THIS BUILD is behind the workspace: display only, write nothing
*/
export function reconcileCloud({ cloud, local, myEpoch, countOf }) {
  const c = cloud && typeof cloud === "object" ? cloud : {};
  const cloudEpoch = String(c.dataEpoch == null ? "" : c.dataEpoch);
  const mine = String(myEpoch == null ? "" : myEpoch);
  const order = epochOrder(cloudEpoch, mine);
  const base = { cloudEpoch, myEpoch: mine };

  if (order > 0) {
    return { ...base, action: "stale", writable: false,
      reason: "the shared workspace was written by a newer build than this one" };
  }
  if (order < 0) {
    return { ...base, action: "reset", writable: true,
      reason: "the shared workspace predates this build's data epoch" };
  }
  const count = typeof countOf === "function" ? countOf : () => 0;
  if (count(c) === 0 && count(local) > 0) {
    return { ...base, action: "seed", writable: true,
      reason: "the shared workspace is empty and this device holds records" };
  }
  return { ...base, action: "adopt", writable: true, reason: "same data epoch" };
}

/* ---------- build identity ----------
   Separate question from the epoch, deliberately. The epoch says whether this
   build can safely *write*; the build id only says whether it is the newest
   code, which is a banner, never a block.

   Format: "<ISO timestamp>|<short git sha>". The two addresses build the same
   commit at different times, so the sha decides sameness and the timestamp only
   breaks ties — comparing timestamps alone would claim a new version forever. */
export function parseBuildId(id) {
  const s = String(id || "");
  const i = s.indexOf("|");
  return i < 0 ? { ts: s, sha: "" } : { ts: s.slice(0, i), sha: s.slice(i + 1) };
}

/* Is `other` a newer build than `mine`? */
export function isNewerBuild(other, mine) {
  if (!other || !mine) return false;
  const a = parseBuildId(other), b = parseBuildId(mine);
  if (!a.sha || !b.sha) return false;
  if (a.sha === b.sha) return false;      /* same code, built twice — not news */
  return a.ts > b.ts;
}

/* ---------- which address am I on? ----------
   The live address plus the places it is legitimately served from in
   development. Anything else is a spare copy and says so, so that opening an
   old home-screen icon announces itself instead of quietly disagreeing with
   the other one. Add the custom domain here when it goes live. */
export const CANONICAL_HOSTS = ["kkbpdashv2.web.app", "team.kkbusinesspark.com", "localhost"];
export const PRIMARY_HOST = "kkbpdashv2.web.app";

export function isSpareHost(host, canonical = CANONICAL_HOSTS) {
  const h = String(host || "").toLowerCase().replace(/:\d+$/, "");
  if (!h) return false;               /* file:// or a test harness — say nothing */
  return !canonical.includes(h);
}
