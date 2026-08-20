/* ============================================================================
   Construction programme scheduling — the engine behind the Work Schedule.

   Site work is a chain: the slab has to cure before the block-work, the
   block-work before the plaster. So a single late item does not just fail on its
   own date, it pushes everything behind it. This module takes the work items and
   works out what that actually means:

     - forecast dates that account for reality (actual starts/finishes, progress
       so far, and predecessors that have already slipped)
     - which items are on the critical path — the chain that decides the
       completion date, and therefore the only delays that move it
     - how far each item, and the programme as a whole, has slipped against the
       baseline that was agreed

   Deliberately free of any UI: plain data in, plain data out, so it can be
   tested directly (scripts/test-schedule.mjs) rather than only through a browser.
   Dependencies are finish-to-start with an optional lag in days, which covers
   nearly all construction sequencing.
   ============================================================================ */

const MS_DAY = 86400000;

/* Dates are handled as integer day numbers so arithmetic can't be bitten by
   timezones or daylight saving. */
export function toDay(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (!m) return null;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_DAY);
}
export function fromDay(n) {
  if (n === null || n === undefined || !isFinite(n)) return "";
  return new Date(Math.round(n) * MS_DAY).toISOString().slice(0, 10);
}
export const addDays = (s, n) => fromDay(toDay(s) + n);
export const daysBetween = (a, b) => (toDay(a) === null || toDay(b) === null ? 0 : toDay(b) - toDay(a));

const numOr = (v, d) => { const n = parseFloat(String(v ?? "").replace(/[,\s%]/g, "")); return isFinite(n) ? n : d; };
const pctOf = (w) => Math.min(100, Math.max(0, numOr(w.pct, 0)));

/* Normalise a dependency list: accepts bare ids or {id, lag}, drops self-links
   and anything pointing at an item that no longer exists. */
function normDeps(w, exists) {
  return (w.deps || [])
    .map((d) => (typeof d === "string" ? { id: d, lag: 0 } : d))
    .filter((d) => d && d.id && d.id !== w.id && exists(d.id))
    .map((d) => ({ id: d.id, lag: Math.round(numOr(d.lag, 0)) }));
}

/* Planned span in days, inclusive of both end dates. Milestones are moments,
   not spans, so they have no duration. */
export function plannedDuration(w) {
  if (w.milestone) return 0;
  const a = toDay(w.start), b = toDay(w.target);
  if (a !== null && b !== null && b >= a) return b - a + 1;
  return Math.max(1, Math.round(numOr(w.durationDays, 1)));
}

/**
 * Schedule the programme.
 *
 * @param works  the work items
 * @param opts   { today: "YYYY-MM-DD" } — passed in rather than read from the
 *               clock so results are reproducible in tests
 * @returns {{ byId, order, projectFinish, baselineFinish, slipDays,
 *             criticalPath, cycles, percentComplete, counts }}
 */
export function scheduleWorks(works, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const T = toDay(today);
  const items = (works || []).filter((w) => w && w.id);
  const byIdRaw = new Map(items.map((w) => [w.id, w]));
  const exists = (id) => byIdRaw.has(id);
  const deps = new Map(items.map((w) => [w.id, normDeps(w, exists)]));

  /* successors, for the backward pass and for "what does this block?" */
  const succ = new Map(items.map((w) => [w.id, []]));
  for (const w of items) for (const d of deps.get(w.id)) succ.get(d.id).push({ id: w.id, lag: d.lag });

  /* ---- topological order (Kahn). Anything left over sits in a dependency
     cycle — someone has said A waits for B and B waits for A. We report it
     instead of looping forever, and schedule those items from their own dates. */
  const indeg = new Map(items.map((w) => [w.id, deps.get(w.id).length]));
  const queue = items.filter((w) => indeg.get(w.id) === 0).map((w) => w.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const s of succ.get(id)) {
      indeg.set(s.id, indeg.get(s.id) - 1);
      if (indeg.get(s.id) === 0) queue.push(s.id);
    }
  }
  const inOrder = new Set(order);
  const cycles = items.filter((w) => !inOrder.has(w.id)).map((w) => w.id);

  const out = {};
  const place = (id) => {
    const w = byIdRaw.get(id);
    const done = w.status === "Done";
    const started = done || w.status === "In Progress" || !!w.actualStart;
    const dur = plannedDuration(w);

    /* earliest the predecessors allow, and which one is actually holding it up */
    let depStart = null, driver = null;
    const blockedBy = [];
    for (const d of deps.get(id)) {
      const p = out[d.id];
      if (!p) continue;
      const cand = p.finish + 1 + d.lag;
      if (depStart === null || cand > depStart) { depStart = cand; driver = d.id; }
      if (byIdRaw.get(d.id).status !== "Done") blockedBy.push(d.id);
    }

    /* start: an actual start is the truth; otherwise the latest of the plan and
       the predecessors — and something not yet begun cannot begin in the past. */
    let start;
    if (w.actualStart) start = toDay(w.actualStart);
    else {
      const cands = [];
      if (toDay(w.start) !== null) cands.push(toDay(w.start));
      if (depStart !== null) cands.push(depStart);
      if (!cands.length) cands.push(T);
      start = Math.max(...cands);
      if (!started) start = Math.max(start, T);
    }

    /* finish: actual if recorded; otherwise the span from the start. For work
       under way we also take progress seriously — 40% of a ten-day job means
       six days still to run, whatever the original date said. */
    let finish, forecastReason = "";
    if (w.actualFinish) { finish = toDay(w.actualFinish); }
    else {
      finish = start + Math.max(0, dur - (w.milestone ? 0 : 1));
      if (started && !done) {
        const remaining = Math.ceil(dur * (1 - pctOf(w) / 100));
        const fromProgress = T + Math.max(0, remaining - 1);
        if (fromProgress > finish) { finish = fromProgress; forecastReason = "from % complete"; }
      }
      if (!started && depStart !== null && depStart > (toDay(w.start) ?? -Infinity)) forecastReason = "waiting on a predecessor";
      else if (!started && start > (toDay(w.start) ?? start)) forecastReason = "start date has passed";
    }

    const baseTarget = toDay(w.baseTarget) ?? toDay(w.target);
    out[id] = {
      id, start, finish, dur,
      startDate: fromDay(start), finishDate: fromDay(finish),
      driver, blockedBy, forecastReason,
      done, started, milestone: !!w.milestone,
      pct: pctOf(w),
      slipDays: baseTarget === null ? 0 : finish - baseTarget,
      late: !done && toDay(w.target) !== null && finish > toDay(w.target),
      overdue: !done && toDay(w.target) !== null && toDay(w.target) < T,
      cycle: false,
    };
  };

  for (const id of order) place(id);
  for (const id of cycles) { place(id); out[id].cycle = true; }

  /* ---- backward pass: how late each item could finish without moving the end
     date. Zero float means it is on the critical path. */
  const projectFinish = Object.values(out).reduce((m, r) => Math.max(m, r.finish), T);
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i], r = out[id];
    let lateFinish = projectFinish;
    for (const s of succ.get(id)) {
      const sr = out[s.id];
      if (!sr) continue;
      lateFinish = Math.min(lateFinish, (sr.lateStart ?? sr.start) - 1 - s.lag);
    }
    r.lateFinish = lateFinish;
    r.lateStart = lateFinish - Math.max(0, r.dur - (r.milestone ? 0 : 1));
    r.float = lateFinish - r.finish;
    r.critical = r.float <= 0;
  }
  for (const id of cycles) { const r = out[id]; r.float = 0; r.critical = true; }

  const criticalPath = order.filter((id) => out[id].critical);

  /* progress across the programme, weighted by how long each item takes, so a
     three-month structure counts for more than a two-day signage job */
  let totWeight = 0, doneWeight = 0;
  for (const w of items) {
    const weight = Math.max(1, plannedDuration(w) || 1);
    totWeight += weight;
    doneWeight += weight * (w.status === "Done" ? 1 : pctOf(w) / 100);
  }

  const baselineFinish = items.reduce((m, w) => {
    const b = toDay(w.baseTarget) ?? toDay(w.target);
    return b === null ? m : Math.max(m ?? b, b);
  }, null);

  return {
    byId: out,
    order: [...order, ...cycles],
    today: T,
    projectFinish,
    projectFinishDate: fromDay(projectFinish),
    baselineFinish,
    baselineFinishDate: baselineFinish === null ? "" : fromDay(baselineFinish),
    slipDays: baselineFinish === null ? 0 : projectFinish - baselineFinish,
    criticalPath,
    cycles,
    percentComplete: totWeight ? Math.round((doneWeight / totWeight) * 100) : 0,
    counts: {
      total: items.length,
      done: items.filter((w) => w.status === "Done").length,
      running: items.filter((w) => w.status === "In Progress").length,
      overdue: Object.values(out).filter((r) => r.overdue).length,
      late: Object.values(out).filter((r) => r.late).length,
      blocked: Object.values(out).filter((r) => !r.done && r.blockedBy.length).length,
    },
  };
}
