/* ============================================================================
   Programme import — turning a contractor's Gantt into work items.

   The photograph or PDF is read by Claude (see analyseProgramme in importer.js);
   everything in this file is the part that must not be left to a language
   model: matching a proposal against what we already track, refusing dates
   that cannot be real, resolving predecessors named in prose to actual item
   ids, and — above all — never letting an import overwrite history.

   The rule the whole file is built around: a revised programme changes the
   plan, never the record. Agreed baselines and anything logged as having
   actually happened survive every import.

   No React, no DOM — so scripts/test-programme.mjs can exercise it directly.
   ============================================================================ */

/* ---------- name normalising and fuzzy matching ----------
   Contractor programmes are re-typed every revision, so the same work arrives
   as "3.2 Raft slab pour", "Raft Slab - Pour" and "RAFT SLAB POUR". These get
   compared on their meaningful words, ignoring numbering and punctuation. */

const STOP = new Set(["the", "a", "an", "of", "and", "to", "for", "at", "in", "on", "work", "works", "phase", "activity"]);

export const normName = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/^[\s([]*\d+(\.\d+)*[\s.)\]:\-–]+/, "") /* leading "3.2 " / "12) " / "(4) " */
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const nameTokens = (s) => normName(s).split(" ").filter((t) => t && !STOP.has(t));

/* Jaccard overlap of meaningful words. Crude, but it does not need to be
   clever — it only has to be predictable, because a wrong match silently
   overwrites the wrong item's dates. Hence the deliberately high threshold. */
export function similarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const A = new Set(nameTokens(a)), B = new Set(nameTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter);
}

export function matchExisting(name, works, min = 0.6) {
  let best = null;
  for (const w of works || []) {
    if (!w || !w.id) continue;
    const score = similarity(name, w.name);
    if (score >= min && (!best || score > best.score)) best = { id: w.id, name: w.name, score: Math.round(score * 100) / 100 };
  }
  return best;
}

/* ---------- dates ----------
   A bar read off a photographed axis can come back as 0202-13-45. Anything
   that isn't a real calendar date inside a plausible window is discarded
   rather than guessed at — a blank date is honest, a wrong one is not. */

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function cleanDate(v) {
  const m = ISO.exec(String(v || "").trim().slice(0, 10));
  if (!m) return "";
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2015 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return ""; /* 31 February */
  const p = (n) => String(n).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}`;
}

/* ---------- trade and phase ----------
   The model is asked for our exact vocabulary and mostly obliges. When it
   doesn't, the item's own name usually gives it away: Indian site programmes
   are full of RCC, PCC, AHU, STP and shuttering, which no amount of string
   similarity against "Civil & Structure" will ever match. */

const TRADE_HINTS = [
  [/\b(rcc|pcc|slab|column|beam|footing|raft|pile|piling|excavat|shutter|reinforc|concret|structur|civil|masonry|brick|block ?work|plaster|lintel|staircase)\b/, "Civil & Structure"],
  [/\b(facade|glaz|curtain ?wall|acp|cladding|elevation|spider)\b/, "Facade"],
  [/\b(waterproof|damp ?proof|membrane)\b/, "Waterproofing"],
  [/\b(floor|tile|tiling|granite|marble|vitrified|paint|painting|finish|false ?ceiling|gypsum|pop)\b/, "Flooring & Finishes"],
  [/\b(electric|ht |lt |panel|dg |transformer|cabl|lighting|earthing|busbar|substation)\b/, "MEP — Electrical"],
  [/\b(hvac|ahu|chiller|duct|ventilat|air ?condition|cooling tower)\b/, "MEP — HVAC"],
  [/\b(plumb|sanitary|drain|sewer|fire ?fight|firefight|sprinkler|hydrant|stp|wtp|water ?tank|pump ?room)\b/, "MEP — Plumbing & Fire"],
  [/\b(lift|elevator|escalator|travelator)\b/, "Lifts & Escalators"],
  [/\b(road|landscap|boundary|compound|parking|external|storm ?water|pavement|gate)\b/, "External Development"],
  [/\b(signage|graphic|wayfinding|branding|hoarding)\b/, "Signage & Graphics"],
  [/\b(interior|atrium|common ?area|lobby|washroom|toilet|food ?court)\b/, "Interiors & Common Areas"],
];

const PHASE_FOR_TRADE = {
  "Civil & Structure": "Shell & Core",
  "Facade": "Shell & Core",
  "Waterproofing": "Shell & Core",
  "MEP — Electrical": "Services",
  "MEP — HVAC": "Services",
  "MEP — Plumbing & Fire": "Services",
  "Lifts & Escalators": "Services",
  "Flooring & Finishes": "Finishes",
  "Signage & Graphics": "Finishes",
  "Interiors & Common Areas": "Finishes",
  "External Development": "External Works",
};

const HANDOVER_RE = /\b(handover|hand ?over|hand ?ing over|possession|occupanc|completion|opening|inaugurat|snag)\b/i;
const FITOUT_RE = /\b(fit ?out|fit-out|tenant|shop ?front|barricad)\b/i;

export function coerceTo(value, allowed, fallback) {
  const v = String(value || "").trim();
  if (allowed.includes(v)) return v;
  let best = null;
  for (const a of allowed) {
    const s = similarity(v, a);
    if (s > 0.34 && (!best || s > best.s)) best = { a, s };
  }
  return best ? best.a : fallback;
}

export function tradeFor(given, name, trades) {
  const direct = coerceTo(given, trades, "");
  if (direct) return direct;
  const hay = `${name || ""} ${given || ""}`.toLowerCase();
  for (const [re, trade] of TRADE_HINTS) if (re.test(hay) && trades.includes(trade)) return trade;
  return trades.includes("Other") ? "Other" : trades[0];
}

export function phaseFor(given, name, trade, phases) {
  const direct = coerceTo(given, phases, "");
  if (direct) return direct;
  if (HANDOVER_RE.test(name || "") && phases.includes("Handover")) return "Handover";
  if (FITOUT_RE.test(name || "") && phases.includes("Fit-out Enablement")) return "Fit-out Enablement";
  const byTrade = PHASE_FOR_TRADE[trade];
  if (byTrade && phases.includes(byTrade)) return byTrade;
  return phases[0];
}

/* ---------- proposal cleanup ----------
   Everything the model returned, made safe to show in a review table. Rows
   that cannot be salvaged are dropped with a stated reason rather than
   quietly disappearing, because a silently short import is worse than a
   visibly incomplete one. */

const ROLLUP_RE = /^(total|sub ?total|grand total|summary|phase \d+ (summary|total)|milestones?)$/i;

export function normaliseProposals(raw, opt = {}) {
  const trades = opt.trades && opt.trades.length ? opt.trades : ["Other"];
  const phases = opt.phases && opt.phases.length ? opt.phases : ["Shell & Core"];
  const statuses = opt.statuses && opt.statuses.length ? opt.statuses : ["Planned", "In Progress", "On Hold", "Done"];
  const items = [], dropped = [];
  const seen = new Map();

  for (const r0 of Array.isArray(raw) ? raw : []) {
    const r = r0 && typeof r0 === "object" ? r0 : {};
    const name = String(r.name || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (!name) { dropped.push({ name: "(unnamed row)", why: "no name could be read" }); continue; }
    if (ROLLUP_RE.test(name)) { dropped.push({ name, why: "looks like a roll-up total, not a work item" }); continue; }
    const key = normName(name);
    if (seen.has(key)) { dropped.push({ name, why: `same item as “${seen.get(key)}” earlier in the sheet` }); continue; }
    seen.set(key, name);

    let start = cleanDate(r.start), target = cleanDate(r.target);
    const badDate = (r.start && !start) || (r.target && !target);
    if (start && target && target < start) { const t = start; start = target; target = t; }

    const milestone = !!r.milestone;
    if (milestone) { if (!start && target) start = target; if (!target && start) target = start; }

    const trade = tradeFor(r.trade, name, trades);
    const phase = phaseFor(r.phase, name, trade, phases);

    let pct = Math.min(100, Math.max(0, Math.round(Number(r.pct) || 0)));
    let status = statuses.includes(String(r.status || "").trim()) ? String(r.status).trim() : (pct >= 100 ? "Done" : pct > 0 ? "In Progress" : "Planned");
    if (status === "Done") pct = 100;
    if (pct >= 100 && status !== "Done") status = "Done";

    const deps = [];
    for (const d of Array.isArray(r.deps) ? r.deps : []) {
      const nm = String((d && typeof d === "object" ? d.name : d) || "").trim();
      if (!nm || normName(nm) === key) continue;
      if (deps.some((x) => normName(x.name) === normName(nm))) continue;
      deps.push({ name: nm.slice(0, 120), lag: Math.max(0, Math.min(365, Math.round(Number(d && d.lag) || 0))) });
    }

    items.push({
      name, trade, phase,
      contractor: String(r.contractor || "").trim().slice(0, 80),
      start, target, pct, status, milestone, deps,
      depsBasis: String(r.depsBasis || (deps.length ? "inferred-from-sequence" : "none")),
      dateBasis: String(r.dateBasis || "") === "printed" ? "printed" : "read-from-bar",
      confidence: ["high", "medium", "low"].includes(String(r.confidence)) ? String(r.confidence) : (start && target ? "medium" : "low"),
      note: String(r.note || "").trim().slice(0, 200),
      needsDates: !start || !target,
      dateSuspect: badDate,
    });
  }
  return { items, dropped };
}

/* ---------- merge planning ----------
   Decides, per row, whether it is new work or a revision of something we
   already track. The UI shows and lets you override every one of these. */

export function planMerge(items, works, opt = {}) {
  const min = opt.minMatch == null ? 0.6 : opt.minMatch;
  return (items || []).map((it) => {
    const match = matchExisting(it.name, works, min);
    return { ...it, match, action: match ? "update" : "new" };
  });
}

/* Cut any dependency that would make the programme circular, reporting each
   one. A cycle is not a rendering problem — it means "A waits for B waits for
   A", which has no start date at all, so the link has to go. */
export function stripCycles(works) {
  const byId = new Map((works || []).map((w) => [w.id, w]));
  const state = new Map();
  const removed = [];
  const visit = (id) => {
    const st = state.get(id);
    if (st === "done" || st === "open") return;
    state.set(id, "open");
    const w = byId.get(id);
    if (w) {
      w.deps = (w.deps || []).filter((d) => {
        if (!d || !byId.has(d.id)) return false;
        if (state.get(d.id) === "open") {
          removed.push({ item: w.name, dep: (byId.get(d.id) || {}).name || d.id });
          return false;
        }
        visit(d.id);
        return true;
      });
    }
    state.set(id, "done");
  };
  for (const w of works || []) if (w && w.id) visit(w.id);
  return removed;
}

/* Apply the reviewed rows and hand back the complete new works array.
   Dependencies are additive on an update: a revision that drops a link leaves
   the old one in place, because deleting a predecessor by hand is one tap and
   losing one silently is a wrong critical path. */
export function applyMerge(rows, works, opt = {}) {
  let n = 0;
  const newId = opt.newId || (() => `imp${Date.now().toString(36)}${(n++).toString(36)}`);
  const provenance = opt.source ? `Imported from ${opt.source}${opt.today ? ` on ${opt.today}` : ""}` : "";

  const out = (works || []).map((w) => ({ ...w, deps: [...(w.deps || [])] }));
  const byId = new Map(out.map((w) => [w.id, w]));
  const nameIndex = new Map();
  for (const w of out) if (w.name) nameIndex.set(normName(w.name), w.id);

  const created = [], updated = [], skipped = [];
  const pending = [];

  /* pass 1 — records first, so every accepted row has an id before any
     predecessor name has to be resolved to one */
  for (const r of rows || []) {
    if (!r || r.action === "skip") { if (r && r.name) skipped.push(r.name); continue; }
    if (r.action === "update" && r.match && byId.has(r.match.id)) {
      const w = byId.get(r.match.id);
      if (r.start) w.start = r.start;
      if (r.target) w.target = r.target;
      /* baseline only ever gets *filled in*, never rewritten — that is what
         the slippage on every screen is measured against */
      if (!w.baseStart && r.start) w.baseStart = r.start;
      if (!w.baseTarget && r.target) w.baseTarget = r.target;
      if (w.status !== "Done") {
        if (r.pct) w.pct = Math.max(Number(w.pct) || 0, r.pct);
        if (r.status && r.status !== "Planned") w.status = r.status;
      }
      if (r.contractor && !w.contractor) w.contractor = r.contractor;
      if (r.milestone) w.milestone = true;
      if (r.trade && (!w.trade || w.trade === "Other")) w.trade = r.trade;
      updated.push(w.name);
      nameIndex.set(normName(r.name), w.id);
      pending.push({ w, deps: r.deps || [] });
    } else {
      const id = newId();
      const notes = [provenance, r.note].filter(Boolean).join(" · ").slice(0, 400);
      const w = {
        id, name: r.name, trade: r.trade, phase: r.phase, contractor: r.contractor || "", floor: "",
        start: r.start || "", target: r.target || "", status: r.status || "Planned", pct: r.pct || 0,
        capexId: "", notes, deps: [], milestone: !!r.milestone,
        baseStart: r.start || "", baseTarget: r.target || "", actualStart: "", actualFinish: "",
      };
      out.push(w); byId.set(id, w);
      nameIndex.set(normName(r.name), id);
      created.push(w.name);
      pending.push({ w, deps: r.deps || [] });
    }
  }

  /* pass 2 — predecessors, which the model gave us as names */
  const unresolved = [];
  for (const { w, deps } of pending) {
    for (const d of deps) {
      const nm = String((d && typeof d === "object" ? d.name : d) || "").trim();
      if (!nm) continue;
      const id = nameIndex.get(normName(nm)) || (matchExisting(nm, out, 0.75) || {}).id;
      if (!id || id === w.id) { unresolved.push({ item: w.name, dep: nm }); continue; }
      const lag = Math.max(0, Math.min(365, Math.round(Number(d && typeof d === "object" ? d.lag : 0) || 0)));
      if (!w.deps.some((x) => x.id === id)) w.deps.push({ id, lag });
    }
  }

  const cyclesBroken = stripCycles(out);
  return { works: out, created, updated, skipped, unresolved, cyclesBroken };
}
