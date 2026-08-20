/* Tests for the programme importer's non-AI half — the part that decides what
   an imported row does to the works register. Run: node scripts/test-programme.mjs
   Plain node, no framework: this has to stay runnable from a phone in Cloud Shell. */

import {
  normName, similarity, matchExisting, cleanDate, tradeFor, phaseFor,
  normaliseProposals, planMerge, applyMerge, stripCycles,
} from "../src/programme.js";

let pass = 0, fail = 0;
const G = "\x1b[32m", R = "\x1b[31m", Z = "\x1b[0m";
const ok = (label, cond, got) => {
  if (cond) { pass++; console.log(`  ${G}✓${Z} ${label}`); }
  else { fail++; console.log(`  ${R}✗ ${label}${Z}${got === undefined ? "" : `\n      got: ${JSON.stringify(got)}`}`); }
};
const group = (t) => console.log(`\n${t}`);

const TRADES = ["Civil & Structure", "Facade", "Waterproofing", "Flooring & Finishes", "MEP — Electrical", "MEP — HVAC", "MEP — Plumbing & Fire", "Lifts & Escalators", "External Development", "Signage & Graphics", "Interiors & Common Areas", "Other"];
const PHASES = ["Shell & Core", "External Works", "Services", "Finishes", "Fit-out Enablement", "Handover"];
const OPT = { trades: TRADES, phases: PHASES };
let seq = 0;
const ids = () => `n${++seq}`;
const norm = (raw) => normaliseProposals(raw, OPT).items;

/* ---------------------------------------------------------------- */
group("Name matching across programme revisions");

ok("numbering is ignored", normName("3.2 Raft slab pour") === normName("Raft Slab Pour"));
ok("punctuation and case are ignored", normName("RAFT SLAB - POUR") === "raft slab pour");
ok("bracketed numbering is stripped", normName("(4) Facade glazing") === "facade glazing");
ok("identical names score 1", similarity("Raft slab pour", "raft slab pour") === 1);
ok("a reworded name still matches", similarity("Raft slab pour", "Pour raft slab") === 1);
ok("different work does not match", similarity("Raft slab pour", "Facade glazing") === 0);

const EXISTING = [
  { id: "w1", name: "Raft slab pour", start: "2026-06-21", target: "2026-07-25", baseStart: "2026-06-21", baseTarget: "2026-07-25", status: "In Progress", pct: 45, actualStart: "2026-06-22", trade: "Civil & Structure", phase: "Shell & Core", deps: [] },
  { id: "w2", name: "Column & beam framing", start: "2026-07-26", target: "2026-09-10", baseStart: "2026-07-26", baseTarget: "2026-09-10", status: "Planned", pct: 0, trade: "Civil & Structure", phase: "Shell & Core", deps: [{ id: "w1", lag: 7 }] },
];

ok("a revision matches the item it revises", (matchExisting("3.1 RAFT SLAB - POUR", EXISTING) || {}).id === "w1");
ok("unrelated new work matches nothing", matchExisting("Escalator installation", EXISTING) === null);
ok("a partial overlap below threshold is not a match", matchExisting("Slab", EXISTING) === null);

/* ---------------------------------------------------------------- */
group("Dates read off a photograph");

ok("a clean date passes", cleanDate("2026-07-25") === "2026-07-25");
ok("single-digit parts are padded", cleanDate("2026-7-5") === "2026-07-05");
ok("a misread year is refused", cleanDate("0202-07-25") === "");
ok("month 13 is refused", cleanDate("2026-13-01") === "");
ok("31 February is refused", cleanDate("2026-02-31") === "");
ok("a DD/MM string is refused rather than guessed", cleanDate("25/07/2026") === "");
ok("empty stays empty", cleanDate("") === "" && cleanDate(null) === "");

const swapped = norm([{ name: "Backwards bar", start: "2026-09-01", target: "2026-08-01" }])[0];
ok("a backwards bar is corrected, not dropped", swapped.start === "2026-08-01" && swapped.target === "2026-09-01");

const halfDated = norm([{ name: "Half read", start: "2026-08-01", target: "0000-99-99" }])[0];
ok("an unreadable end date leaves the field blank", halfDated.target === "");
ok("and the row is flagged for a human", halfDated.dateSuspect === true && halfDated.needsDates === true);

/* ---------------------------------------------------------------- */
group("Trade and phase from Indian site vocabulary");

ok("RCC is civil work", tradeFor("", "RCC slab casting 2nd floor", TRADES) === "Civil & Structure");
ok("AHU is HVAC", tradeFor("", "AHU room installation", TRADES) === "MEP — HVAC");
ok("STP is plumbing & fire", tradeFor("", "STP commissioning", TRADES) === "MEP — Plumbing & Fire");
ok("ACP is facade", tradeFor("", "ACP cladding north elevation", TRADES) === "Facade");
ok("a partial trade name is coerced", tradeFor("Electrical", "Panel wiring", TRADES) === "MEP — Electrical");
ok("genuinely unknown work lands in Other", tradeFor("", "Vastu consultation", TRADES) === "Other");
ok("phase follows the trade when absent", phaseFor("", "RCC slab", "Civil & Structure", PHASES) === "Shell & Core");
ok("handover language wins over the trade", phaseFor("", "Handover to fit-out", "Civil & Structure", PHASES) === "Handover");
ok("fit-out language is recognised", phaseFor("", "Tenant barricading", "Other", PHASES) === "Fit-out Enablement");

/* ---------------------------------------------------------------- */
group("Cleaning what the model returned");

const cleaned = normaliseProposals([
  { name: "Raft slab pour", start: "2026-06-21", target: "2026-07-25", pct: 45 },
  { name: "TOTAL", start: "2026-06-01", target: "2027-01-01" },
  { name: "  RAFT   SLAB  POUR ", start: "2026-06-21", target: "2026-07-25" },
  { name: "", start: "2026-06-21" },
  null,
  { name: "Handover", milestone: true, target: "2026-11-01" },
  { name: "Overdone", pct: 140, status: "Planned" },
  { name: "Finished", status: "Done", pct: 10 },
], OPT);

ok("roll-up rows are refused", !cleaned.items.some((i) => i.name === "TOTAL"));
ok("and the refusal is explained", cleaned.dropped.some((d) => d.name === "TOTAL" && /roll-up/.test(d.why)));
ok("the same row twice is imported once", cleaned.items.filter((i) => normName(i.name) === "raft slab pour").length === 1);
ok("unnamed and non-object rows are dropped", cleaned.items.length === 4, cleaned.items.map((i) => i.name));
ok("a milestone with one date gets both", (() => { const m = cleaned.items.find((i) => i.name === "Handover"); return m.start === "2026-11-01" && m.target === "2026-11-01"; })());
ok("pct is clamped and status follows it", (() => { const o = cleaned.items.find((i) => i.name === "Overdone"); return o.pct === 100 && o.status === "Done"; })());
ok("Done forces 100%", cleaned.items.find((i) => i.name === "Finished").pct === 100);

const selfDep = norm([{ name: "Loop", deps: [{ name: "Loop" }, { name: "Other thing" }, { name: "other  thing" }] }])[0];
ok("a self-dependency is dropped", !selfDep.deps.some((d) => normName(d.name) === "loop"));
ok("duplicate predecessors collapse", selfDep.deps.length === 1);

const lag = norm([{ name: "Lagged", deps: [{ name: "Prior", lag: -5 }, { name: "Prior2", lag: 9999 }] }])[0];
ok("negative lag is floored at zero", lag.deps[0].lag === 0);
ok("absurd lag is capped", lag.deps[1].lag === 365);

/* ---------------------------------------------------------------- */
group("Merging a revision — history must survive");

const revision = norm([
  { name: "3.1 Raft slab pour", start: "2026-06-25", target: "2026-08-20", pct: 60, status: "In Progress", trade: "Civil & Structure" },
  { name: "Column & beam framing", start: "2026-08-21", target: "2026-10-05", trade: "Civil & Structure", deps: [{ name: "3.1 Raft slab pour", lag: 7 }] },
  { name: "Escalator installation", start: "2026-10-06", target: "2026-11-20", trade: "Lifts & Escalators", deps: [{ name: "Column & beam framing" }] },
]);
const planned = planMerge(revision, EXISTING);
ok("the revised slab is offered as an update", planned[0].action === "update" && planned[0].match.id === "w1");
ok("framing is recognised too", planned[1].action === "update" && planned[1].match.id === "w2");
ok("the escalator is new work", planned[2].action === "new");

seq = 0;
const merged = applyMerge(planned, EXISTING, { newId: ids, source: "programme-r4.pdf", today: "2026-08-20" });
const slab = merged.works.find((w) => w.id === "w1");
ok("the revised plan dates are taken", slab.start === "2026-06-25" && slab.target === "2026-08-20");
ok("the agreed baseline is NOT rewritten", slab.baseStart === "2026-06-21" && slab.baseTarget === "2026-07-25");
ok("the recorded actual start survives", slab.actualStart === "2026-06-22");
ok("progress moves forward", slab.pct === 60);
ok("nothing was duplicated", merged.works.length === 3, merged.works.length);
ok("one item was created", merged.created.length === 1 && merged.created[0] === "Escalator installation");
ok("two were updated", merged.updated.length === 2);

const framing = merged.works.find((w) => w.id === "w2");
ok("an existing predecessor link is kept", framing.deps.some((d) => d.id === "w1"));
ok("and not duplicated by the import", framing.deps.filter((d) => d.id === "w1").length === 1);
const esc = merged.works.find((w) => w.name === "Escalator installation");
ok("a new item's predecessor resolves to an existing id", esc.deps.length === 1 && esc.deps[0].id === "w2");
ok("a new item gets a baseline from its first plan", esc.baseStart === "2026-10-06" && esc.baseTarget === "2026-11-20");
ok("and records where it came from", /programme-r4\.pdf/.test(esc.notes) && /2026-08-20/.test(esc.notes));

/* progress and status must never be walked backwards on a finished item */
const doneWork = [{ id: "d1", name: "Excavation", status: "Done", pct: 100, actualFinish: "2026-06-18", start: "2026-06-01", target: "2026-06-20", baseStart: "2026-06-01", baseTarget: "2026-06-20", deps: [] }];
const backwards = applyMerge(planMerge(norm([{ name: "Excavation", start: "2026-06-01", target: "2026-06-20", pct: 30, status: "In Progress" }]), doneWork), doneWork, { newId: ids });
ok("a stale sheet cannot un-finish completed work", backwards.works[0].status === "Done" && backwards.works[0].pct === 100);
ok("and the actual finish date is untouched", backwards.works[0].actualFinish === "2026-06-18");

/* ---------------------------------------------------------------- */
group("Skipping and unresolved predecessors");

seq = 0;
const withSkip = planMerge(norm([{ name: "Wanted", start: "2026-09-01", target: "2026-09-10" }, { name: "Unwanted", start: "2026-09-01", target: "2026-09-10" }]), []);
withSkip[1].action = "skip";
const skipRes = applyMerge(withSkip, [], { newId: ids });
ok("a skipped row is not written", skipRes.works.length === 1 && skipRes.works[0].name === "Wanted");
ok("and is reported as skipped", skipRes.skipped.length === 1 && skipRes.skipped[0] === "Unwanted");

seq = 0;
const ghost = applyMerge(planMerge(norm([{ name: "Depends on nothing real", start: "2026-09-01", target: "2026-09-10", deps: [{ name: "A row on the page we never captured" }] }]), []), [], { newId: ids });
ok("a predecessor we don't have is not invented", ghost.works[0].deps.length === 0);
ok("and it is reported so it can be fixed", ghost.unresolved.length === 1 && /never captured/.test(ghost.unresolved[0].dep));

seq = 0;
const nearMiss = applyMerge(planMerge(norm([{ name: "Follower", start: "2026-09-01", target: "2026-09-10", deps: [{ name: "raft slab POUR" }] }]), EXISTING), EXISTING, { newId: ids });
ok("a predecessor named loosely still resolves", nearMiss.works.find((w) => w.name === "Follower").deps[0].id === "w1");

/* ---------------------------------------------------------------- */
group("Circular dependencies are cut, not rendered");

seq = 0;
const circular = applyMerge(planMerge(norm([
  { name: "A step", start: "2026-09-01", target: "2026-09-10", deps: [{ name: "C step" }] },
  { name: "B step", start: "2026-09-11", target: "2026-09-20", deps: [{ name: "A step" }] },
  { name: "C step", start: "2026-09-21", target: "2026-09-30", deps: [{ name: "B step" }] },
]), []), [], { newId: ids });
ok("the loop is broken", circular.cyclesBroken.length === 1, circular.cyclesBroken);
ok("and reported by name", /step/.test(circular.cyclesBroken[0].item));
const totalDeps = circular.works.reduce((n, w) => n + w.deps.length, 0);
ok("two of the three links survive", totalDeps === 2, totalDeps);

const dangling = [{ id: "x1", name: "Orphan", deps: [{ id: "gone", lag: 0 }] }];
stripCycles(dangling);
ok("a link to a deleted item is cleaned up", dangling[0].deps.length === 0);

/* ---------------------------------------------------------------- */
group("Empty and hostile input");

ok("no items returns nothing", normaliseProposals(null, OPT).items.length === 0);
ok("a non-array returns nothing", normaliseProposals({ items: "nope" }, OPT).items.length === 0);
ok("an empty merge leaves the register alone", applyMerge([], EXISTING, { newId: ids }).works.length === 2);
ok("merging into an empty register works", applyMerge(planMerge(norm([{ name: "First ever", start: "2026-09-01", target: "2026-09-10" }]), []), null, { newId: ids }).works.length === 1);
const longName = norm([{ name: "x".repeat(400) }])[0];
ok("an absurdly long name is truncated", longName.name.length === 120);

console.log(`\n${fail ? R : G}${pass} passed, ${fail} failed${Z}`);
process.exit(fail ? 1 : 0);
