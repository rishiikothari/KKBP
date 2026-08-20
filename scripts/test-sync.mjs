/* Tests for the snapshot-reconciliation decision — the code that used to be
   able to wipe the shared workspace. Run: node scripts/test-sync.mjs
   Plain node, no framework, so it stays runnable from a phone in Cloud Shell. */

import { epochOrder, reconcileCloud, parseBuildId, isNewerBuild, isSpareHost, CANONICAL_HOSTS } from "../src/sync.js";

let pass = 0, fail = 0;
const G = "\x1b[32m", R = "\x1b[31m", Z = "\x1b[0m";
const ok = (label, cond, got) => {
  if (cond) { pass++; console.log(`  ${G}✓${Z} ${label}`); }
  else { fail++; console.log(`  ${R}✗ ${label}${Z}${got === undefined ? "" : `\n      got: ${JSON.stringify(got)}`}`); }
};
const group = (t) => console.log(`\n${t}`);

const NOW = "2026-07-30-clean";
const OLD = "2026-05-01-clean";
const NEW = "2026-09-15-clean";
const countOf = (s) => ((s && s.works) || []).length + ((s && s.tasks) || []).length;
const withRecords = { dataEpoch: NOW, works: [{ id: "w1" }], tasks: [] };
const empty = (e) => ({ dataEpoch: e, works: [], tasks: [] });
const verdict = (cloud, local, mine = NOW) => reconcileCloud({ cloud, local, myEpoch: mine, countOf });

/* ---------------------------------------------------------------- */
group("Epoch ordering");

ok("equal epochs", epochOrder(NOW, NOW) === 0);
ok("older sorts before newer", epochOrder(OLD, NOW) === -1);
ok("newer sorts after older", epochOrder(NEW, NOW) === 1);
ok("a missing epoch is the oldest thing there is", epochOrder(undefined, NOW) === -1 && epochOrder(null, NOW) === -1 && epochOrder("", NOW) === -1);
ok("two missing epochs are equal", epochOrder(undefined, "") === 0);
ok("dates order chronologically as strings", epochOrder("2026-09-01-x", "2026-10-01-x") === -1);
ok("a same-day relabel is not equal", epochOrder("2026-07-30-clean", "2026-07-30-reset") !== 0);

/* ---------------------------------------------------------------- */
group("A build behind the workspace must not get a vote");

const stale = verdict({ ...withRecords, dataEpoch: NEW }, empty(NOW));
ok("a newer workspace makes THIS build the stale one", stale.action === "stale", stale);
ok("and it is explicitly not writable", stale.writable === false);
ok("and it says why", /newer build/.test(stale.reason));
ok("both epochs are reported for the banner", stale.cloudEpoch === NEW && stale.myEpoch === NOW);

/* the exact regression: this used to return a wipe */
ok("a newer workspace never resets", verdict({ ...withRecords, dataEpoch: NEW }, withRecords).action !== "reset");
ok("even when this device holds records too", verdict({ ...withRecords, dataEpoch: NEW }, withRecords).writable === false);
ok("and never seeds over newer data", verdict(empty(NEW), withRecords).action === "stale");
ok("staleness beats an empty newer workspace", verdict(empty(NEW), withRecords).writable === false);

/* ---------------------------------------------------------------- */
group("The intended migration path still works");

const reset = verdict({ ...withRecords, dataEpoch: OLD }, empty(NOW));
ok("an older workspace is reset", reset.action === "reset", reset);
ok("and the reset is allowed to push", reset.writable === true);
ok("data with no epoch at all is pre-stamp, so reset", verdict({ works: [{ id: "x" }] }, empty(NOW)).action === "reset");

/* ---------------------------------------------------------------- */
group("Seeding and the normal case");

ok("an empty workspace is seeded from a device holding records", verdict(empty(NOW), withRecords).action === "seed");
ok("an empty workspace and an empty device just adopts", verdict(empty(NOW), empty(NOW)).action === "adopt");
ok("a populated workspace is adopted", verdict(withRecords, empty(NOW)).action === "adopt");
ok("adopting is writable", verdict(withRecords, empty(NOW)).writable === true);
ok("a populated workspace is not seeded over", verdict(withRecords, withRecords).action === "adopt");

/* ---------------------------------------------------------------- */
group("Malformed and missing input");

ok("a null snapshot is treated as pre-stamp", verdict(null, empty(NOW)).action === "reset");
ok("a non-object snapshot does not throw", verdict("nonsense", empty(NOW)).action === "reset");
ok("a numeric epoch is stringified, not compared as a number", typeof verdict({ dataEpoch: 20260730 }, empty(NOW)).cloudEpoch === "string");
ok("no local state is fine", verdict(withRecords, null).action === "adopt");
ok("no countOf is fine", reconcileCloud({ cloud: withRecords, local: withRecords, myEpoch: NOW }).action === "adopt");
ok("no epoch on either side is equal, so adopt", reconcileCloud({ cloud: {}, local: {}, myEpoch: "", countOf }).action === "adopt");

/* ---------------------------------------------------------------- */
group("Build identity — a banner, never a block");

ok("an id splits into timestamp and sha", (() => { const b = parseBuildId("2026-08-20T09:00:00|a1b2c3d"); return b.ts === "2026-08-20T09:00:00" && b.sha === "a1b2c3d"; })());
ok("an id with no sha yields an empty sha", parseBuildId("2026-08-20T09:00:00").sha === "");
ok("an empty id does not throw", parseBuildId("").sha === "" && parseBuildId(null).ts === "");

const A = "2026-08-20T09:00:00|aaaaaaa";
const B_SAME_CODE = "2026-08-21T10:00:00|aaaaaaa";
const B_NEWER = "2026-08-21T10:00:00|bbbbbbb";
const B_OLDER = "2026-08-19T10:00:00|bbbbbbb";

ok("the same commit built later is NOT a new version", isNewerBuild(B_SAME_CODE, A) === false);
ok("a different commit built later IS a new version", isNewerBuild(B_NEWER, A) === true);
ok("a different commit built earlier is not", isNewerBuild(B_OLDER, A) === false);
ok("comparing a build to itself is not news", isNewerBuild(A, A) === false);
ok("a missing id on either side says nothing", isNewerBuild("", A) === false && isNewerBuild(A, "") === false);
ok("an id with no sha says nothing rather than guessing", isNewerBuild("2026-09-01T00:00:00", A) === false);

/* ---------------------------------------------------------------- */
group("Telling the two addresses apart");

ok("the live address is not a spare", isSpareHost("kkbpdashv2.web.app") === false);
ok("the custom domain is not a spare", isSpareHost("team.kkbusinesspark.com") === false);
ok("localhost is not a spare", isSpareHost("localhost") === false && isSpareHost("localhost:4173") === false);
ok("the GitHub address IS a spare", isSpareHost("rishiikothari.github.io") === true);
ok("a loopback IP is a spare", isSpareHost("127.0.0.1:4173") === true);
ok("case does not matter", isSpareHost("KKBPDASHV2.WEB.APP") === false);
ok("an unknown host is a spare", isSpareHost("evil.example.com") === true);
ok("no host at all says nothing", isSpareHost("") === false && isSpareHost(null) === false);
ok("the live address is in the canonical list", CANONICAL_HOSTS.includes("kkbpdashv2.web.app"));

console.log(`\n${fail ? R : G}${pass} passed, ${fail} failed${Z}`);
process.exit(fail ? 1 : 0);
