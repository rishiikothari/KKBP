/* Tests for the programme scheduling engine. Plain node, no framework:
   node scripts/test-schedule.mjs                                            */
import { scheduleWorks, toDay, fromDay, daysBetween } from "../src/schedule.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};
const head = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);
const W = (o) => ({ status: "Planned", pct: 0, ...o });
const TODAY = "2026-08-01";

head("A chain runs back to back");
{
  const r = scheduleWorks([
    W({ id: "a", name: "Slab", start: "2026-08-03", target: "2026-08-12" }),
    W({ id: "b", name: "Block-work", start: "2026-08-13", target: "2026-08-22", deps: [{ id: "a" }] }),
    W({ id: "c", name: "Plaster", start: "2026-08-23", target: "2026-08-30", deps: [{ id: "b" }] }),
  ], { today: TODAY });
  eq("slab finishes on plan", r.byId.a.finishDate, "2026-08-12");
  eq("block-work starts the day after the slab", r.byId.b.startDate, "2026-08-13");
  eq("plaster still ends on plan", r.byId.c.finishDate, "2026-08-30");
  eq("no slippage", r.slipDays, 0);
  eq("everything is critical in a single chain", r.criticalPath, ["a", "b", "c"]);
}

head("A late predecessor pushes everything behind it");
{
  /* The slab was due 12 Aug and is only 50% done on 20 Aug. */
  const r = scheduleWorks([
    W({ id: "a", name: "Slab", start: "2026-08-03", target: "2026-08-12", baseTarget: "2026-08-12",
        status: "In Progress", actualStart: "2026-08-03", pct: 50 }),
    W({ id: "b", name: "Block-work", start: "2026-08-13", target: "2026-08-22", baseTarget: "2026-08-22", deps: [{ id: "a" }] }),
    W({ id: "c", name: "Handover", start: "2026-08-23", target: "2026-08-23", baseTarget: "2026-08-23",
        milestone: true, deps: [{ id: "b" }] }),
  ], { today: "2026-08-20" });
  eq("slab forecast runs past its date", r.byId.a.finishDate, "2026-08-24");
  eq("and the reason is recorded", r.byId.a.forecastReason, "from % complete");
  eq("block-work is pushed out", r.byId.b.startDate, "2026-08-25");
  eq("the milestone moves too", r.byId.c.finishDate, "2026-09-04");
  eq("programme slip is reported in days", r.slipDays, 12);
  eq("the slab is named as what's holding block-work up", r.byId.b.blockedBy, ["a"]);
}

head("Lag between items is respected");
{
  const r = scheduleWorks([
    W({ id: "a", name: "Pour", start: "2026-08-03", target: "2026-08-05" }),
    W({ id: "b", name: "Strike formwork", start: "2026-08-06", target: "2026-08-07", deps: [{ id: "a", lag: 7 }] }),
  ], { today: TODAY });
  eq("curing lag delays the successor", r.byId.b.startDate, "2026-08-13");
}

head("Float keeps side branches off the critical path");
{
  const r = scheduleWorks([
    W({ id: "long", name: "Facade", start: "2026-08-03", target: "2026-09-30" }),
    W({ id: "short", name: "Signage", start: "2026-08-03", target: "2026-08-07" }),
    W({ id: "end", name: "Open", start: "2026-10-01", target: "2026-10-01", milestone: true,
        deps: [{ id: "long" }, { id: "short" }] }),
  ], { today: TODAY });
  eq("the long branch is critical", r.byId.long.critical, true);
  eq("the short branch is not", r.byId.short.critical, false);
  eq("and it has float to spare", r.byId.short.float > 30, true);
}

head("Recorded actuals are believed over the plan");
{
  const r = scheduleWorks([
    W({ id: "a", name: "Excavation", start: "2026-07-01", target: "2026-07-20",
        status: "Done", actualStart: "2026-07-01", actualFinish: "2026-07-15" }),
    W({ id: "b", name: "Footings", start: "2026-07-21", target: "2026-07-30", deps: [{ id: "a" }] }),
  ], { today: TODAY });
  eq("finished early, as recorded", r.byId.a.finishDate, "2026-07-15");
  eq("the successor keeps its own later plan", r.byId.b.startDate, "2026-08-01");
}

head("Work that never started can't start in the past");
{
  const r = scheduleWorks([
    W({ id: "a", name: "Painting", start: "2026-07-01", target: "2026-07-10", baseTarget: "2026-07-10" }),
  ], { today: "2026-08-01" });
  eq("forecast start is today, not July", r.byId.a.startDate, "2026-08-01");
  eq("so it reads as slipped", r.byId.a.slipDays, 31);
  eq("and flagged overdue", r.byId.a.overdue, true);
  eq("with the reason given", r.byId.a.forecastReason, "start date has passed");
}

head("A circular dependency is reported, not hung on");
{
  const r = scheduleWorks([
    W({ id: "a", name: "A", start: "2026-08-03", target: "2026-08-05", deps: [{ id: "b" }] }),
    W({ id: "b", name: "B", start: "2026-08-06", target: "2026-08-08", deps: [{ id: "a" }] }),
    W({ id: "c", name: "C", start: "2026-08-03", target: "2026-08-04" }),
  ], { today: TODAY });
  eq("both sides of the loop are named", r.cycles.sort(), ["a", "b"]);
  eq("the healthy item still schedules", r.byId.c.finishDate, "2026-08-04");
}

head("Progress is weighted by duration");
{
  const r = scheduleWorks([
    W({ id: "big", name: "Structure", start: "2026-08-01", target: "2026-12-31", status: "Planned", pct: 0 }),
    W({ id: "small", name: "Nameplate", start: "2026-08-01", target: "2026-08-02", status: "Done", pct: 100 }),
  ], { today: TODAY });
  eq("finishing a two-day job barely moves a long programme", r.percentComplete < 10, true);
}

head("Edge cases don't throw");
{
  eq("empty programme", scheduleWorks([], { today: TODAY }).counts.total, 0);
  eq("null input", scheduleWorks(null, { today: TODAY }).counts.total, 0);
  const r = scheduleWorks([
    W({ id: "a", name: "No dates" }),
    W({ id: "b", name: "Dangling dep", deps: [{ id: "nope" }] }),
    W({ id: "c", name: "Self dep", deps: [{ id: "c" }] }),
  ], { today: TODAY });
  eq("items without dates still place", r.byId.a.startDate, TODAY);
  eq("dependencies on deleted items are dropped", r.byId.b.blockedBy, []);
  eq("self-dependency is ignored rather than looping", r.cycles, []);
}

head("Date helpers");
{
  eq("round trip", fromDay(toDay("2026-08-18")), "2026-08-18");
  eq("span is inclusive-exclusive", daysBetween("2026-08-01", "2026-08-11"), 10);
}

console.log(`\n${fail ? "\x1b[31m" : "\x1b[32m"}${pass} passed, ${fail} failed\x1b[0m\n`);
process.exit(fail ? 1 : 0);
