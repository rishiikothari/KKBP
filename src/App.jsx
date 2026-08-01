import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Store, HardHat, Layers, Megaphone, ClipboardCheck,
  DraftingCompass, ScrollText, Users, LogOut, Plus, Pencil, Trash2, X,
  Download, ShieldCheck, AlertTriangle, CheckCircle2, Circle, Building2,
  Landmark, KeyRound, ChevronRight, FileText, CalendarDays, Wrench, Search,
  ListChecks, Stamp, Bell, FolderOpen, NotebookPen, Send, ThumbsUp, ThumbsDown,
  Pin, Link as LinkIcon, Activity, Mic, Square, Sparkles, Loader2, FileAudio, MessageSquareText, Pause, Play,
  Menu, Eye, Upload, Film, Image as ImageIcon, FileCheck2,
} from "lucide-react";
import * as WA from "./importer.js";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

/* ================= THEME ================= */
/* The Town Junction brand (per the TTJ investment deck): deep midnight navy
   ground, warm cream type, amber-orange accent, high-contrast serif headlines. */
const C = {
  bg: "#13132E", panel: "#1B1B3F", panel2: "#232350", panel3: "#171736",
  line: "#2F2F5E", lineSoft: "#26264C",
  gold: "#EC9744", goldDim: "#A86F2E",
  text: "#F5EFE2", mute: "#A9A6C6", faint: "#6E6C94",
  green: "#6BBF95", amber: "#E2A54B", red: "#E07862", blue: "#8AA9DB",
  purple: "#A995DD", teal: "#6FC0BC", rose: "#D08A9B",
};
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NUM = { fontVariantNumeric: "tabular-nums" };

/* ================= DEPARTMENTS, TIERS & ACCESS ================= */
const DEPTS = {
  exec:      { label: "Executive",   accent: C.gold,   short: "EXE" },
  leasing:   { label: "Leasing",     accent: C.blue,   short: "LSG" },
  marketing: { label: "Marketing",   accent: C.rose,   short: "MKT" },
  admin:     { label: "Admin & Ops", accent: C.teal,   short: "ADM" },
  project:   { label: "Projects",    accent: C.amber,  short: "PRJ" },
  design:    { label: "Design",      accent: C.green,  short: "DSG" },
};
/* tier: head = department head · member = internal staff/intern · external = agency/consultant/broker */
const TIERS = {
  head:     { label: "Head", color: C.gold },
  member:   { label: "Team", color: C.blue },
  external: { label: "External / Agency", color: C.purple },
};
const isExec = (u) => u.dept === "exec";
const isOwner = (u) => u.exec === "owner";           /* Nitin (final say), Rishi, Arjun */
const isCEO = (u) => u.exec === "ceo";               /* Manoj — external consultant */
const isFinApprover = (u) => !!u && !!u.finApprover; /* every financial approval, any amount: an Owner (Rishi, Nitin or Arjun) */
const isAppAdmin = (u) => !!u && !!u.appAdmin;       /* app administration (settings, security, imports): Rishi */
const isHead = (u) => u.tier === "head";
const isExternal = (u) => u.tier === "external";
/* Write-access model: the Owner edits everything; internal members edit within
   their own department (registers per WRITE_DEPT below, plus their dept's
   tasks/MOMs and their own records); externals only update their own assigned
   deliverables. Settings pages (Team & Access, Import Studio) stay owner-only. */

const PAGES = [
  { key: "overview",     label: "Overview",           icon: LayoutDashboard, group: "Daily" },
  { key: "tasks",        label: "Tasks",              icon: ListChecks,      group: "Daily" },
  { key: "approvals",    label: "Approvals",          icon: Stamp,           group: "Daily" },
  { key: "announcements",label: "Announcements",      icon: Bell,            group: "Daily" },
  { key: "tenants",      label: "Tenants & Leasing",  icon: Store,           group: "Workspaces", depts: ["exec","leasing"] },
  { key: "capex",        label: "Capex & Works",      icon: HardHat,         group: "Workspaces", depts: ["exec","project","design"] },
  { key: "marketing",    label: "Marketing Studio",   icon: Megaphone,       group: "Workspaces", depts: ["exec","marketing"] },
  { key: "adminops",     label: "Admin & Compliance", icon: ClipboardCheck,  group: "Workspaces", depts: ["exec","admin"] },
  { key: "drawings",     label: "Drawings & RFIs",    icon: DraftingCompass, group: "Workspaces", depts: ["exec","project","design"] },
  { key: "layout",       label: "Mall Layout",        icon: Layers,          group: "Property" },
  { key: "documents",    label: "Documents",          icon: FolderOpen,      group: "Records" },
  { key: "meetings",     label: "Meetings & AI Notes", icon: NotebookPen,     group: "Records" },
  { key: "constitution", label: "Constitution",       icon: ScrollText,      group: "Records" },
  { key: "import",       label: "Import Studio",      icon: Upload,          group: "Records", owner: true },
  { key: "security",     label: "Security",           icon: ShieldCheck,     group: "Records", owner: true },
  { key: "team",         label: "Team & Access",      icon: Users,           group: "Records", owner: true },
];
/* `owner: true` pages (settings — team, API key, live workspace, security,
   import) are visible only to the app administrator (Rishi). Other pages
   follow the department gate. */
const pageAllowed = (p, u) => (!p.owner || isAppAdmin(u)) && (!p.depts || p.depts.includes(u.dept));

/* Registers each dept can WRITE. Externals never write registers (they act on tasks/content assigned to them). */
const WRITE_DEPT = {
  tenants: ["leasing"], capex: ["project"], marketing: ["marketing"],
  adminops: ["admin"], drawings: ["project", "design"], layout: ["leasing", "project"],
};
const canWritePage = (key, u) => {
  if (isOwner(u)) return true;
  if (isExternal(u)) return false;
  return (WRITE_DEPT[key] || []).includes(u.dept);
};

/* ================= SEED DATA (KKBP CMA / Cockpit) ================= */
const CMA_TARGET_L = 541;

const SEED_USERS = [
  { id:"u1", name:"Rishi Kothari", dept:"exec", subRole:"Owner / Promoter · Oversees everything day-to-day · IT & Digital (rishi@kkjpl.com)", tier:"head", exec:"owner", finApprover:true, appAdmin:true, username:"rishi", password:"7001" },
  { id:"u2", name:"Nitin Kothari", dept:"exec", subRole:"Owner & Managing Director · Final authority on every decision (nitin@kkjpl.com)", tier:"head", exec:"owner", finApprover:true, username:"nitin", password:"7002" },
  { id:"u3", name:"Arjun Kothari", dept:"exec", subRole:"Owner / Promoter · Brand & PR direction", tier:"head", exec:"owner", finApprover:true, username:"arjun", password:"7003" },
  { id:"u4", name:"Manoj Agarwal", dept:"exec", subRole:"CEO — External consultant (MKA) · Runs weekly cadence, CAM & sign-offs", tier:"head", exec:"ceo", username:"manoj", password:"7004" },
  { id:"u5", name:"Sushil Ahuja", dept:"leasing", subRole:"Head of Leasing · Consultant, Delhi (dedicated to TTJ since 1 Jun)", tier:"head", username:"sushil", password:"7005" },
  { id:"u6", name:"Rateesh", dept:"leasing", subRole:"Leasing Consultant — Chennai · South-India brand pipeline", tier:"external", username:"rateesh", password:"7006" },
  { id:"u7", name:"Basha", dept:"leasing", subRole:"Leasing Coordinator — Nagpur · On-ground client visits", tier:"member", username:"basha", password:"7007" },
  { id:"u8", name:"Mayur", dept:"leasing", subRole:"Sales — Leasing enquiries", tier:"member", username:"mayur", password:"7008" },
  { id:"u9", name:"Priyanka Thakur", dept:"marketing", subRole:"Head of Marketing", tier:"head", username:"priyanka", password:"7009" },
  { id:"u10", name:"Kirti Chaturvedi", dept:"marketing", subRole:"INIT Design Studio · Creative & account lead (brochure, decks, VAMOS, shoot)", tier:"external", username:"kirti", password:"7010" },
  { id:"u11", name:"Rajvi Merchant", dept:"marketing", subRole:"INIT Design Studio · Brand strategy & nomenclature lead", tier:"external", username:"rajvi", password:"7011" },
  { id:"u12", name:"Jeetu Surana", dept:"admin", subRole:"Head of Admin & Ops · FEC Game Zone (Hyderabad)", tier:"head", username:"jeetu", password:"7012" },
  { id:"u13", name:"Narayan", dept:"project", subRole:"Site Team — Nagpur · Civil execution", tier:"member", username:"narayan", password:"7013" },
  { id:"u14", name:"Prashant (Site)", dept:"project", subRole:"Site Engineer · External development (trench, RWP, painting)", tier:"member", username:"prashant", password:"7014" },
  { id:"u15", name:"Mahesh Gupta", dept:"project", subRole:"Liaison · DP road / NIT / NMC & advertisement permissions", tier:"external", username:"mahesh", password:"7015" },
  { id:"u16", name:"Pratham Pincha", dept:"project", subRole:"Sanctioning & approvals consultant", tier:"external", username:"pratham", password:"7016" },
  { id:"u17", name:"Aniket Satone", dept:"design", subRole:"Principal Architect — In-house · Drawings, RFIs, coordination (development@kkbp.in)", tier:"head", username:"aniket", password:"7017" },
  { id:"u18", name:"Aviral (Lokre)", dept:"design", subRole:"Architect — Lokre, Ahmedabad · External development, masterplan & signage", tier:"external", username:"aviral", password:"7018" },
  { id:"u19", name:"Shah Chintan", dept:"design", subRole:"MEP Consultant — Jhaveri Associates (HVAC / electrical / CCTV)", tier:"external", username:"chintan", password:"7019" },
  { id:"u20", name:"Samir Diwanji", dept:"design", subRole:"Plumbing & Drainage — Jhaveri Associates", tier:"external", username:"samir", password:"7020" },
  { id:"u21", name:"Paresh Padole", dept:"design", subRole:"Electrical Consultant · Transformers & liaisoning", tier:"external", username:"paresh", password:"7021" },
  { id:"u22", name:"Karna Shah", dept:"marketing", subRole:"INIT Design Studio · PR & partnerships lead", tier:"external", username:"karna", password:"7022" },
  { id:"u23", name:"Sumit Bhaiya", dept:"admin", subRole:"KKBP Staff — Logistics & deliveries (Nagpur)", tier:"member", username:"sumit", password:"7023" },
  { id:"u24", name:"Robin (INIT)", dept:"marketing", subRole:"INIT Design Studio · Brand strategy (Singapore)", tier:"external", username:"robin", password:"7024" },
];

const TENANT_CATS = ["Anchor Retail","Anchor Brand","Vanilla Retail","F&B","Entertainment","Department Store","Services","Pool / Unallocated"];
const DEALS = ["Pure Rent","Rev Share (area)","MRG + Rev Share","Rev Share (turnover)","Self-Operated"];
const TSTATUS = ["Lead","LOI Signed","Agreement","Fit-out","Operational","On Hold"];
const TSTATUS_COLOR = { "Lead": C.faint, "LOI Signed": C.blue, "Agreement": C.purple, "Fit-out": C.amber, "Operational": C.green, "On Hold": C.red };

const SEED_TENANTS = [];

const CAPEX_CATS = ["Civil & Structure","Facade & Exteriors","MEP (HVAC/Electrical/Plumbing)","Lifts & Escalators","Interiors & Common Areas","Game Zone Equipment","Multiplex Fit-out","Food Court Fit-out","IT, CCTV & Systems","FF&E & Signage","Parking & External Dev","Launch & Marketing Capex"];
const CSTATUS = ["Planned","Approved","Tendered","In Progress","Complete"];
const CSTATUS_COLOR = { Planned: C.faint, Approved: C.blue, Tendered: C.purple, "In Progress": C.amber, Complete: C.green };

const SEED_CAPEX = [];

const SEED_CAMPAIGNS = [];

const CONTENT_TYPES = ["Copy","Design / Creative","Digital Ad","Social Post","Video / Reel","PR / Article","OOH Artwork"];
const CONTENT_STATUS = ["Brief","In Production","Internal Review","Head Approval","Approved","Published"];
const CONTENT_COLOR = { Brief: C.faint, "In Production": C.amber, "Internal Review": C.blue, "Head Approval": C.purple, Approved: C.green, Published: C.teal };
const SEED_CONTENT = [];

const SEED_COMPLIANCE = [];
const SEED_VENDORS = [];
const SEED_DRAWINGS = [];
const SEED_RFIS = [];

const FLOORS = ["Lower Ground","Ground","First","Second","Third","Terrace"];
const SEED_ZONES = [];

const SEED_TASKS = [];

const APPROVAL_TYPES = ["Capex / Purchase","Lease deviation","Campaign / Marketing spend","Admin / Ops expense","Design change order","Other"];
const SEED_APPROVALS = [];

const SEED_ANNOUNCEMENTS = [];

const SEED_MEETINGS = [];

const DOC_CATS = ["Legal & Agreements","Bank & CMA","Design & Drawings","Marketing & Brand","Licences & Compliance","Vendor Contracts","MOMs & Reports","Other"];
const SEED_DOCS = [];

const CONSTITUTION = [
  { id: "S1", title: "1. Purpose", body: "Karan Kothari Business Park (KKBP) exists to build North Nagpur's defining commercial destination while protecting the Karan Kothari Group's capital, credit standing and four-decade reputation. Every decision is tested against three questions: does it serve the customer, does it protect DSCR, and would we be comfortable explaining it to our bankers." },
  { id: "S2", title: "2. Values", body: "Integrity before opportunity — no commitment we cannot honour. Speed with documentation — move fast, but every deal, change order and approval leaves a paper trail in this system. Tenant success is our revenue — a majority of our income is revenue-share; we win when tenants trade well. One team — leasing, marketing, projects, admin and design share one dashboard and one truth." },
  { id: "S3", title: "3. Role charters", body: "OWNERS — Nitin Kothari (Managing Director; final authority on every decision), Rishi Kothari (oversees everything day-to-day; administers this system) and Arjun Kothari (brand & PR direction; also holds payment authority): capital allocation, banking relationships, final word on anchor deals and all spend. CEO — Manoj Agarwal (external consultant, MKA): runs the operating cadence, weekly reviews, CAM and site sign-offs; prepares and escalates every financial decision to the Owners. LEASING HEAD: owns the rent roll — pipeline, LOIs, agreements, escalations; the team (executives, channel partners) feeds the pipeline but only the Head commits terms. MARKETING HEAD: owns footfall and the launch calendar; directs the in-house content team, interns, and agency partners (INIT Design Studio for brand/creative, OCDS Design Studio for digital media) through the Content Studio; agencies deliver, the Head approves. ADMIN HEAD: owns statutory compliance, licences, insurance, vendors/AMCs and operations readiness. PROJECT HEAD: owns capex budget vs actual, works schedule and handover dates; no scope change without a change-order approval. PRINCIPAL ARCHITECT: owns drawing integrity — GFC discipline, design intent through fit-out; MEP and structural consultants answer RFIs inside 5 working days." },
  { id: "S4", title: "4. Delegation of Authority", body: "Financial approvals — every request for money, of any size or type (capex, purchases, campaign and admin spend, vendor contracts, design change orders, lease deviations), is decided only by an Owner — Rishi, Nitin or Arjun Kothari — on the Approvals page. Department heads and the CEO prepare and raise requests with full context; nothing is committed before the approval is recorded. Lease terms — vanilla retail at rack rate is negotiated by the Leasing Head, but every deal and any deviation (rate card, rent-free, anchor terms) is ratified by an Owner (Rishi / Nitin / Arjun) before signature. A verbal yes is not an approval." },
  { id: "S5", title: "5. Operating cadence", body: "Monday 10:00 — leadership stand-up (30 min, this dashboard on screen). Thursday — leasing pipeline review. Month-end — capex vs budget and compliance review with CEO. Every review works off this system; if it is not in the dashboard, it did not happen." },
  { id: "S6", title: "6. The official channel", body: "This system is the single source of truth. Work is assigned as Tasks, money is requested as Approvals, creative moves through the Content Studio, decisions are minuted in Meetings & MOMs, and files are indexed in Documents. External partners — agencies, consultants, channel partners — work inside their department workspace with access limited to their deliverables. Chat apps may carry alerts; they carry no authority." },
  { id: "S7", title: "7. Data, confidentiality & conduct", body: "Rent rolls, deal terms, CMA financials and capex data are strictly confidential. External partners see only what their scope requires. No screenshots or exports shared outside without Owner/CEO consent. Vendor gifts above token value are declared to Admin Head. Conflicts of interest are disclosed in writing." },
  { id: "S8", title: "8. Amendments", body: "This constitution is amended only by Owner or CEO. Each member acknowledges the current version; re-acknowledgement is required after any amendment." },
];

/* ================= STORAGE ================= */
const SKEY = "kkbp-teamos-v2";
const SKEY_V1 = "kkbp-teamos-v1";
/* Runs in two environments:
   - claude.ai artifact: window.storage (shared cloud store for the whole team)
   - standalone deployment (Vercel/Netlify/NAS): browser localStorage on this device,
     synced across devices via Export/Import JSON until the real backend lands. */
const IS_CLOUD = typeof window !== "undefined" && !!(window.storage && window.storage.get);
async function loadState() {
  if (IS_CLOUD) {
    try {
      const r = await window.storage.get(SKEY, true);
      if (r && r.value) return JSON.parse(r.value);
    } catch (e) {}
    try {
      const r1 = await window.storage.get(SKEY_V1, true);
      if (r1 && r1.value) {
        const v1 = JSON.parse(r1.value);
        const f = freshState();
        ["tenants","capex","campaigns","compliance","vendors","drawings","rfis","zones"].forEach((k) => { if (v1[k]) f[k] = v1[k]; });
        return f;
      }
    } catch (e) {}
    return null;
  }
  try { const v = localStorage.getItem(SKEY); if (v) return JSON.parse(v); } catch (e) {}
  return null;
}
async function saveState(s) {
  if (IS_CLOUD) {
    try { await window.storage.set(SKEY, JSON.stringify(s), true); return true; }
    catch (e) { console.error("save failed", e); return false; }
  }
  try { localStorage.setItem(SKEY, JSON.stringify(s)); return true; } catch (e) { return false; }
}
/* Signed-in seat + current page survive a refresh on this device (cleared on sign-out). */
const SESS_KEY = "kkbp-session";
const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(SESS_KEY) || "null"); } catch (e) { return null; } };
const saveSession = (s) => { try { if (s) sessionStorage.setItem(SESS_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESS_KEY); } catch (e) {} };
/* Old saved states used a 4-digit PIN and no username — upgrade them in place. */
const slugUser = (name) => (name || "user").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.)|(\.$)/g, "");
const migrateState = (st) => {
  const out = {
    ...st,
    users: (st.users || []).map((u) => ({ ...u, username: u.username || slugUser(u.name), password: u.pwHash ? "" : (u.password || u.pin || "0000") })),
  };
  /* v3 org structure: Nitin & Arjun join Rishi as Owners (Nitin final say),
     Manoj is CEO as an external consultant, all financial approvals of any
     size go to Rishi or Nitin, app administration stays with Rishi. Patches
     already-saved workspaces in place — no data reset needed. */
  if ((out.roleVersion || 0) < 4) {
    const patch = {
      rishi: { exec: "owner", finApprover: true, appAdmin: true, subRole: "Owner / Promoter · Oversees everything day-to-day · IT & Digital (rishi@kkjpl.com)" },
      nitin: { exec: "owner", finApprover: true, appAdmin: false, subRole: "Owner & Managing Director · Final authority on every decision (nitin@kkjpl.com)" },
      arjun: { exec: "owner", finApprover: true, appAdmin: false, subRole: "Owner / Promoter · Brand & PR direction" },
      manoj: { exec: "ceo", finApprover: false, appAdmin: false, subRole: "CEO — External consultant (MKA) · Runs weekly cadence, CAM & sign-offs" },
    };
    out.users = out.users.map((u) => patch[u.username] ? { ...u, ...patch[u.username] } : u);
    out.roleVersion = 4;
    out.constitutionVersion = Math.max(out.constitutionVersion || 2, 3); /* §3–4 changed → re-acknowledge */
  }
  return out;
};

/* ================= LIVE SYNC (shared workspace via Firebase Firestore) =================
   When the Owner pastes a Firebase config in Team & Access, every device reads and
   writes one shared Firestore document and receives everyone else's changes live.
   Without a config the app runs standalone on this device (localStorage). */
const FB_KEY = "kkbp-firebase-config";
const loadFbConfig = () => { try { return JSON.parse(localStorage.getItem(FB_KEY) || "null"); } catch (e) { return null; } };
const saveFbConfig = (cfg) => { try { if (cfg) localStorage.setItem(FB_KEY, JSON.stringify(cfg)); else localStorage.removeItem(FB_KEY); } catch (e) {} };
/* A Firebase *web config* is not a secret (unlike an API key): it is designed
   to ship inside client code, and access is governed by the database's
   security rules, not by hiding the config. Baking it in below makes every
   device join the shared workspace automatically — zero setup per person.
   Set by the app administrator; a config pasted in Team & Access overrides it. */
const DEFAULT_FB_CONFIG = {
  apiKey: "AIzaSyDs2PVrz_a3V3QkQal0NPP2Kh00MDdQXMo",
  authDomain: "kkbpdashv2.firebaseapp.com",
  databaseURL: "https://kkbpdashv2-default-rtdb.firebaseio.com",
  projectId: "kkbpdashv2",
  storageBucket: "kkbpdashv2.firebasestorage.app",
  messagingSenderId: "187384327940",
  appId: "1:187384327940:web:173aa0bd852df8a9db2a51",
};
const effectiveFbConfig = () => {
  const saved = loadFbConfig();
  if (saved && saved.disabled) return null; /* device explicitly went standalone */
  return saved || DEFAULT_FB_CONFIG;
};
const CLIENT_ID = Math.random().toString(36).slice(2, 10);

/* ---------- security: device identity, password hashing, login throttling ---------- */
/* A stable per-browser device id, so the Owner can see which device each
   session lives on and sign out a specific one. */
const DEVICE_ID = (() => {
  try {
    let d = localStorage.getItem("kkbp-device-id");
    if (!d) { d = "d-" + Math.random().toString(36).slice(2, 10); localStorage.setItem("kkbp-device-id", d); }
    return d;
  } catch (e) { return "d-" + CLIENT_ID; }
})();
const uaInfo = () => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${br} · ${os}`;
};
/* Passwords are stored as salted SHA-256 hashes. Legacy plaintext passwords
   still verify and are upgraded to a hash on first successful login. */
const genSalt = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(pw, salt) { return await sha256Hex(salt + "::" + pw); }
async function verifyPassword(u, pw) {
  if (u.pwHash && u.pwSalt) return (await hashPassword(pw, u.pwSalt)) === u.pwHash;
  return (u.password || "") === pw; /* legacy plaintext */
}
/* Device-local brute-force throttle: 5 failed tries per username → 15 min lock. */
const FAILS_KEY = "kkbp-login-fails";
const loadFails = () => { try { return JSON.parse(localStorage.getItem(FAILS_KEY) || "{}"); } catch (e) { return {}; } };
const recordFail = (un) => { try { const f = loadFails(); f[un] = [...(f[un] || []).filter((t) => Date.now() - t < 15 * 60000), Date.now()]; localStorage.setItem(FAILS_KEY, JSON.stringify(f)); return f[un].length; } catch (e) { return 0; } };
const failsLeft = (un) => { const f = (loadFails()[un] || []).filter((t) => Date.now() - t < 15 * 60000); return { count: f.length, oldest: f[0] || 0 }; };
const clearFails = (un) => { try { const f = loadFails(); delete f[un]; localStorage.setItem(FAILS_KEY, JSON.stringify(f)); } catch (e) {} };
let fbDocRef = null, fbSetDoc = null, _fbApp = null, _fbDb = null;
async function fbApp(cfg) {
  const m = await import("firebase/app");
  if (!_fbApp) _fbApp = m.getApps().length ? m.getApps()[0] : m.initializeApp(cfg);
  return { app: _fbApp, mod: m };
}
async function getDb(cfg) {
  const { app } = await fbApp(cfg);
  const F = await import("firebase/firestore");
  /* auto-detect networks/proxies that break streaming and fall back to long-polling */
  if (!_fbDb) { try { _fbDb = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch (e) { _fbDb = F.getFirestore(app); } }
  return { db: _fbDb, F };
}
/* ---------- workspace auth (Google sign-in; enforced by Firestore rules) ---------- */
async function getAuthUser(cfg) {
  const { app } = await fbApp(cfg);
  const A = await import("firebase/auth");
  const auth = A.getAuth(app);
  try { await A.getRedirectResult(auth); } catch (e) {}
  return await new Promise((res) => { const off = A.onAuthStateChanged(auth, (u) => { off(); res(u); }, () => res(null)); });
}
/* Pre-warm the auth module + app so the Google popup can be opened
   synchronously inside the user's tap (Safari blocks popups that open after an
   await, which then forces the fragile cross-domain redirect flow). */
let _authMod = null, _authInst = null;
async function warmAuth() {
  const cfg = effectiveFbConfig(); if (!cfg) return null;
  if (!_authMod) { const { app } = await fbApp(cfg); _authMod = await import("firebase/auth"); _authInst = _authMod.getAuth(app); }
  return _authInst;
}
function googleSignIn() {
  const A = _authMod, auth = _authInst;
  if (!A || !auth) { warmAuth().then(() => setTimeout(googleSignIn, 0)); return; } /* first tap warms, retries instantly */
  const prov = new A.GoogleAuthProvider();
  prov.setCustomParameters({ prompt: "select_account" });
  A.signInWithPopup(auth, prov)
    .then(() => location.reload())
    .catch((e) => {
      const code = (e && e.code) || "";
      if (/popup-closed|cancelled-popup|popup-blocked/.test(code)) return; /* user closed it — no scary alert */
      alert("Google sign-in didn't complete on this browser (common on iPhone/iPad Safari). The most reliable way in is the email option below — it works on every device.");
    });
}
async function googleSignOut() {
  try { const cfg = effectiveFbConfig(); const { app } = await fbApp(cfg); const A = await import("firebase/auth"); await A.signOut(A.getAuth(app)); } catch (e) {}
  location.reload();
}
/* Email/password workspace sign-in for members without Google accounts.
   Unknown emails self-register; a verification mail must be clicked before the
   rules let the account in (prevents impersonating an allowlisted address). */
async function emailWorkspaceSignIn(email, password) {
  const cfg = effectiveFbConfig(); if (!cfg) return { ok: false, msg: "No shared workspace configured." };
  const { app } = await fbApp(cfg);
  const A = await import("firebase/auth");
  const auth = A.getAuth(app);
  try {
    const cred = await A.signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      try { await A.sendEmailVerification(cred.user); } catch (e) {}
      return { ok: false, msg: "One step left — we've emailed you a verification link. Open it, then reload this page." };
    }
    location.reload(); return { ok: true };
  } catch (e) {
    const code = (e && e.code) || "";
    if (code.includes("user-not-found")) {
      try {
        const cred = await A.createUserWithEmailAndPassword(auth, email, password);
        try { await A.sendEmailVerification(cred.user); } catch (e2) {}
        return { ok: false, msg: "Account created — check your inbox for the verification link, click it, then reload this page." };
      } catch (e3) { return { ok: false, msg: (e3 && e3.message) || String(e3) }; }
    }
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return { ok: false, msg: "Wrong password for this email. Use Reset if you've forgotten it." };
    return { ok: false, msg: (e && e.message) || String(e) };
  }
}
async function emailWorkspaceReset(email) {
  try { const cfg = effectiveFbConfig(); const { app } = await fbApp(cfg); const A = await import("firebase/auth"); await A.sendPasswordResetEmail(A.getAuth(app), email); return "Password-reset link sent — check your inbox."; }
  catch (e) { return "Couldn't send reset: " + ((e && e.message) || e); }
}
/* Compact email sign-in block used on the login gate and in Team & Access. */
function EmailAuthMini() {
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); setMsg(""); const r = await emailWorkspaceSignIn(em.trim(), pw); if (!r.ok) setMsg(r.msg); setBusy(false); };
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Inp value={em} onChange={(e) => setEm(e.target.value)} placeholder="you@company.com" autoCapitalize="none" inputMode="email" />
        <Inp type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="password (min 6)" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn small onClick={go} disabled={busy || !em.includes("@") || pw.length < 6}>{busy ? <Loader2 size={13} className="spin" /> : <KeyRound size={13} />} Sign in / create with email</Btn>
        <Btn small ghost onClick={async () => { if (!em.includes("@")) return setMsg("Type your email first."); setMsg(await emailWorkspaceReset(em.trim())); }}>Reset</Btn>
      </div>
      {msg && <div style={{ fontSize: 11.5, color: C.amber, marginTop: 8, lineHeight: 1.5 }}>{msg}</div>}
    </div>
  );
}
/* The access list lives in its own document (kkbp/allowlist); the rules allow
   only the admin's Google account to change it. */
async function readAllowlist() {
  const cfg = effectiveFbConfig(); if (!cfg) return null;
  try { const { db, F } = await getDb(cfg); const s = await F.getDoc(F.doc(db, "kkbp", "allowlist")); return s.exists() ? (s.data().emails || []) : []; }
  catch (e) { return null; }
}
async function writeAllowlist(emails) {
  const cfg = effectiveFbConfig(); if (!cfg) throw new Error("no workspace");
  const { db, F } = await getDb(cfg);
  await F.setDoc(F.doc(db, "kkbp", "allowlist"), { emails });
}
async function connectLive(cfg, onSnap) {
  const { db, F } = await getDb(cfg);
  fbDocRef = F.doc(db, "kkbp", "state");
  fbSetDoc = F.setDoc;
  return F.onSnapshot(fbDocRef,
    (snap) => {
      const d = snap.data();
      onSnap({ exists: !!(d && d.data), by: d ? d.by : null, data: d ? d.data : null });
    },
    (err) => { console.error("live sync error", err); onSnap({ error: true, denied: (err && err.code) === "permission-denied" }); });
}
async function pushLive(state) {
  if (!fbDocRef || !fbSetDoc) return false;
  try { await fbSetDoc(fbDocRef, { data: JSON.stringify(state), by: CLIENT_ID, ts: Date.now() }); return true; }
  catch (e) { console.error("live save failed", e); return false; }
}

/* One universal AI key for the whole app: set once by the app administrator
   (Rishi) in Team & Access, stored in app state (never in this public code),
   synced to every device via the live workspace, and used automatically by
   Meetings and Import Studio. There is no per-user key. */
/* Bump this whenever the app should force every device to discard whatever it
   has saved locally / in the shared workspace and boot the clean slate below.
   On load, any state stamped with an older epoch is thrown away and replaced. */
const DATA_EPOCH = "2026-07-30-clean";
const freshState = () => ({
  users: SEED_USERS, tenants: SEED_TENANTS, capex: SEED_CAPEX,
  campaigns: SEED_CAMPAIGNS, content: SEED_CONTENT,
  compliance: SEED_COMPLIANCE, vendors: SEED_VENDORS,
  drawings: SEED_DRAWINGS, rfis: SEED_RFIS, zones: SEED_ZONES,
  tasks: SEED_TASKS, approvals: SEED_APPROVALS, announcements: SEED_ANNOUNCEMENTS,
  meetings: SEED_MEETINGS, docs: SEED_DOCS,
  aiKey: "",
  roiCfg: { ...ROI_DEFAULTS },
  log: [{ ts: Date.now(), by: "System", text: "TTJ Team OS initialised — clean workspace, official channel live." }],
  /* roleVersion is intentionally absent here: migrateState stamps it, and a
     saved workspace merged over freshState must not inherit it (that would
     silently skip the role migration). */
  acks: {}, constitutionVersion: 3, dataEpoch: DATA_EPOCH,
  /* security registers */
  audit: [],       /* every add/edit/delete: {ts, by, byId, d(evice), col, action, name, fields} */
  loginEvents: [], /* {ts, un, ok, uid, d, ua} — successes and failures */
  sessions: {},    /* "userId|deviceId" → {u, d, ua, in, seen} */
  kills: {},       /* "userId|deviceId" or "userId|*" → ts; sessions started before ts are signed out */
});
/* How much real content a state holds — used to stop an empty cloud workspace
   from shadowing a device that already carries real data. */
const RECORD_COLS = ["tenants","capex","campaigns","content","compliance","vendors","drawings","rfis","zones","tasks","approvals","announcements","meetings","docs"];
const recordCount = (st) => RECORD_COLS.reduce((n, k) => n + ((st && st[k]) || []).length, 0);
/* Fresh workspace, but carry forward the shared AI key (a credential, not sample
   data) so a reset doesn't knock the AI Notetaker offline for everyone. */
const resetToCleanSlate = (prev) => {
  const f = freshState();
  if (prev && prev.aiKey) f.aiKey = prev.aiKey;
  return f;
};

/* ---------- central audit: diff old vs new state, record who changed what ---------- */
const AUDIT_COLS = {
  users: (r) => r.name, tenants: (r) => r.name, capex: (r) => r.name, campaigns: (r) => r.name,
  content: (r) => r.title, compliance: (r) => r.name, vendors: (r) => r.name, drawings: (r) => r.title,
  rfis: (r) => r.title, zones: (r) => r.name, tasks: (r) => r.title, approvals: (r) => r.title,
  announcements: (r) => r.title, meetings: (r) => r.title, docs: (r) => r.name,
};
function auditDiff(prev, next, actor) {
  const out = [];
  const ts = Date.now();
  for (const col of Object.keys(AUDIT_COLS)) {
    const a = prev[col] || [], b = next[col] || [];
    if (a === b) continue;
    const nameOf = AUDIT_COLS[col];
    const aById = new Map(a.map((r) => [r.id, r]));
    const bById = new Map(b.map((r) => [r.id, r]));
    for (const [id, r] of bById) {
      const old = aById.get(id);
      if (!old) out.push({ ts, by: actor.name, byId: actor.id, d: DEVICE_ID, col, action: "added", name: nameOf(r) || id, fields: "" });
      else if (old !== r && JSON.stringify(old) !== JSON.stringify(r)) {
        const fields = Object.keys(r).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(old[k])).slice(0, 6).join(", ");
        out.push({ ts, by: actor.name, byId: actor.id, d: DEVICE_ID, col, action: "updated", name: nameOf(r) || id, fields });
      }
    }
    for (const [id, r] of aById) if (!bById.has(id)) out.push({ ts, by: actor.name, byId: actor.id, d: DEVICE_ID, col, action: "deleted", name: nameOf(r) || id, fields: "" });
  }
  if ((prev.aiKey || "") !== (next.aiKey || "")) out.push({ ts, by: actor.name, byId: actor.id, d: DEVICE_ID, col: "settings", action: "updated", name: "AI key", fields: "" });
  if (JSON.stringify(prev.roiCfg || null) !== JSON.stringify(next.roiCfg || null)) out.push({ ts, by: actor.name, byId: actor.id, d: DEVICE_ID, col: "settings", action: "updated", name: "Deal ROI assumptions", fields: "" });
  return out;
}

/* ================= CALCS & HELPERS ================= */
function tenantMonthlyL(t) {
  const area = num(t.area);
  if (t.deal === "Pure Rent") return (area * num(t.rent)) / 1e5;
  /* Rev-share deals: rent payable = HIGHER of the revenue-share leg and the
     base/minimum rental leg (the workbook's Base Rental column, stored in mrg). */
  if (t.deal === "Rev Share (area)" || t.deal === "MRG + Rev Share")
    return Math.max(area * num(t.mrg), area * num(t.density) * (num(t.share) / 100)) / 1e5;
  if (t.deal === "Rev Share (turnover)") return num(t.salesL) * (num(t.share) / 100);
  if (t.deal === "Self-Operated") return num(t.salesL);
  return 0;
}
/* ---------- Leasing deal ROI (mirrors the KKBP Leasing ROI Calculator xlsx) ----------
   Rent each year = HIGHER of the revenue-share leg and the base/minimum leg; the base
   leg escalates annually, the sales leg grows annually. Capex is screened against the
   first 36 months of rent, net of the rent-free period and a collection haircut.
   ROI is quoted on rent-above-base (the sheet's primary screen) and on total rent. */
const ROI_DEFAULTS = { escPct: 5, growPct: 8, rentFreeM: 3, collPct: 100, targetPaybackM: 36, targetRoiPct: 30 };
/* Numbers typed with commas / spaces / ₹ ("18,000") must not silently become 0. */
const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[,\s₹%]/g, "")); return isFinite(n) ? n : 0; };
function tenantRoi(t, cfg) {
  const c = { ...ROI_DEFAULTS, ...(cfg || {}) };
  const area = num(t.area);
  const esc = 1 + num(c.escPct) / 100, grow = 1 + num(c.growPct) / 100;
  const coll = num(c.collPct) / 100;
  const rentFree = Math.max(0, Math.min(11, num(c.rentFreeM)));
  const share = num(t.share) / 100;
  const density = num(t.density);
  /* Base rental (₹/sft/mth) — the sheet's Base Rental column. Every rev-share
     deal carries one (rent payable = MAX of the two legs); 0 = no minimum. */
  const basePsf = t.deal === "Pure Rent" ? num(t.rent)
    : (t.deal === "Rev Share (area)" || t.deal === "MRG + Rev Share") ? num(t.mrg) : 0;
  const legs = (yr) => { /* monthly ₹ legs in year yr (1-based) */
    const e = Math.pow(esc, yr - 1), g = Math.pow(grow, yr - 1);
    const base = area * basePsf * e;
    let vari = 0, sales = 0;
    if (t.deal === "Rev Share (area)" || t.deal === "MRG + Rev Share") { sales = area * density * g; vari = sales * share; }
    else if (t.deal === "Rev Share (turnover)") { sales = num(t.salesL) * 1e5 * g; vari = sales * share; }
    else if (t.deal === "Self-Operated") { sales = num(t.salesL) * 1e5 * g; vari = sales; }
    return { base, vari, sales, rent: Math.max(base, vari) };
  };
  const y = [1, 2, 3].map(legs);
  const rent36 = (y[0].rent * (12 - rentFree) + y[1].rent * 12 + y[2].rent * 12) * coll;
  const base36 = (y[0].base * (12 - rentFree) + y[1].base * 12 + y[2].base * 12) * coll;
  const above36 = rent36 - base36;
  const capexPsf = num(t.capexPsf);
  const capex = area * capexPsf;
  const perMoAbove = above36 / 36, perMoTotal = rent36 / 36;
  const paybackAbove = capex > 0 ? (perMoAbove > 0 ? capex / perMoAbove : Infinity) : 0;
  const paybackTotal = capex > 0 ? (perMoTotal > 0 ? capex / perMoTotal : Infinity) : 0;
  const roiAbove = capex > 0 ? (perMoAbove * 12) / capex : 0;
  const roiTotal = capex > 0 ? (perMoTotal * 12) / capex : 0;
  const verdict = capex <= 0 ? "n/a"
    : (isFinite(paybackAbove) && paybackAbove <= (num(c.targetPaybackM) || 36) && roiAbove >= num(c.targetRoiPct) / 100) ? "PASS" : "REVIEW";
  return {
    area, salesMo: y[0].sales, salesYr: y[0].sales * 12, sharePct: share * 100,
    rsRentMo: y[0].vari, basePsf, baseMo: y[0].base, rentMo1: y[0].rent,
    avgPsf: area ? y[0].rent / area : 0, annualRent: y[0].rent * 12,
    aboveMo1: y[0].rent - y[0].base, aboveYr1: (y[0].rent - y[0].base) * 12,
    capexPsf, capex, rent36, avg36Psf: area ? rent36 / (area * 36) : 0,
    above36, avgAboveMo: above36 / 36,
    paybackAbove, paybackTotal, roiAbove, roiTotal, verdict,
  };
}

const fmtL = (v) => `₹${num(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
const fmtCr = (vL) => `₹${(num(vL) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const fmtSft = (v) => `${num(v).toLocaleString("en-IN")} sft`;
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const uName = (state, id) => (state.users.find((u) => u.id === id) || {}).name || "—";
const withLog = (s, by, text) => ({ ...s, log: [{ ts: Date.now(), by, text }, ...(s.log || [])].slice(0, 120) });
const ago = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
};
const isOverdue = (due, closed) => !!due && !closed && due < today();
/* ================= UI PRIMITIVES ================= */
const Card = ({ title, right, children, pad = 16, style }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, ...style }}>
    {(title || right) && (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.lineSoft}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 15, color: C.text, letterSpacing: 0.2 }}>{title}</div>
        <div>{right}</div>
      </div>
    )}
    <div style={{ padding: pad }}>{children}</div>
  </div>
);

const KPI = ({ label, value, sub, tone }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${tone || C.gold}`, borderRadius: 10, padding: "14px 16px", minWidth: 0 }}>
    <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    <div style={{ fontFamily: SERIF, fontSize: 24, color: C.text, marginTop: 4, ...NUM }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Badge = ({ text, color }) => (
  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: `1px solid ${color}55`, color, background: `${color}18`, whiteSpace: "nowrap" }}>{text}</span>
);

const Bar_ = ({ pct, tone }) => (
  <div style={{ height: 6, background: C.panel3, borderRadius: 4, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: tone || C.gold, borderRadius: 4, transition: "width .3s" }} />
  </div>
);

const Btn = ({ children, onClick, tone, ghost, small, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
    background: ghost ? "transparent" : (tone || C.gold), color: ghost ? (tone || C.gold) : "#16163A",
    border: ghost ? `1px solid ${(tone || C.gold)}66` : "none", borderRadius: 8,
    padding: small ? "5px 10px" : "8px 14px", fontSize: small ? 12 : 13, fontWeight: 600, fontFamily: SANS,
    opacity: disabled ? 0.45 : 1,
  }}>{children}</button>
);

const Field = ({ label, children }) => (
  <label style={{ display: "block", minWidth: 0 }}>
    <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>{label}</div>
    {children}
  </label>
);
const inputSt = { width: "100%", boxSizing: "border-box", background: C.panel3, border: `1px solid ${C.line}`, borderRadius: 7, color: C.text, padding: "9px 10px", fontSize: 13, fontFamily: SANS, outline: "none" };
const Inp = (p) => <input {...p} style={{ ...inputSt, ...p.style }} />;
const Sel = ({ options, ...p }) => (
  <select {...p} style={{ ...inputSt, ...p.style }}>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Ta = (p) => <textarea rows={3} {...p} style={{ ...inputSt, resize: "vertical", ...p.style }} />;

/* The Town Junction mark — a mosaic starburst in the brand oranges (an SVG
   approximation of the deck's pixel-sun logo). */
const TTJMark = ({ size = 40 }) => {
  const sq = [];
  const cols = ["#F2A94F", "#EC9744", "#E67E48", "#DE5F45", "#F2B968"];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    for (let r = 0; r < 3; r++) {
      if ((i + r) % 3 === 2 && r === 2) continue;
      const dist = 11 + r * 9;
      const s = 6.5 - r * 1.6;
      sq.push({ x: 50 + Math.cos(a) * dist - s / 2, y: 50 + Math.sin(a) * dist - s / 2, s, c: cols[(i + r * 2) % cols.length], rot: (i * 24 + r * 15) % 90 });
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="The Town Junction">
      {sq.map((q, i) => <rect key={i} x={q.x} y={q.y} width={q.s} height={q.s} fill={q.c} transform={`rotate(${q.rot} ${q.x + q.s / 2} ${q.y + q.s / 2})`} />)}
      <circle cx="50" cy="50" r="6.5" fill="none" stroke="#EC9744" strokeWidth="3.4" />
    </svg>
  );
};

const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 12, width: "100%", maxWidth: wide ? 760 : 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 16, color: C.text }}>{title}</div>
        <X size={18} color={C.mute} style={{ cursor: "pointer" }} onClick={onClose} />
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);

const Th = ({ children, right }) => <th style={{ textAlign: right ? "right" : "left", padding: "8px 10px", fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{children}</th>;
const Td = ({ children, right, style }) => <td style={{ textAlign: right ? "right" : "left", padding: "9px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.lineSoft}`, ...NUM, ...style }}>{children}</td>;

const Empty = ({ text }) => <div style={{ padding: 28, textAlign: "center", color: C.faint, fontSize: 13 }}>{text}</div>;

const SectionTitle = ({ eyebrow, title, sub, accent }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: accent || C.gold }}>{eyebrow}</div>
    <div style={{ fontFamily: SERIF, fontSize: 26, color: C.text, marginTop: 2 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color: C.mute, marginTop: 4, maxWidth: 720 }}>{sub}</div>}
  </div>
);


/* ================= LOGIN ================= */
function Login({ users, onLogin, onAttempt, liveOn, liveStatus, authInfo }) {
  useEffect(() => { if (liveStatus === "needauth" || liveStatus === "on") warmAuth(); }, [liveStatus]);
  const [un, setUn] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const tryLogin = async () => {
    if (busy) return;
    const uname = un.trim().toLowerCase();
    const fl = failsLeft(uname);
    if (fl.count >= 5) {
      const mins = Math.max(1, Math.ceil((fl.oldest + 15 * 60000 - Date.now()) / 60000));
      setErr(`Too many failed attempts. This device is locked for ${mins} more minute${mins > 1 ? "s" : ""}.`);
      return;
    }
    setBusy(true);
    try {
      const u = users.find((x) => (x.username || "").toLowerCase() === uname);
      const ok = u && !u.locked && (await verifyPassword(u, pw));
      if (!ok) {
        const n = recordFail(uname);
        onAttempt && onAttempt({ un: uname, ok: false });
        setErr(u && u.locked
          ? "This account is locked. Contact the Owner to restore access."
          : n >= 5
          ? "Too many failed attempts. This device is locked for 15 minutes."
          : `Incorrect username or password.${n >= 3 ? ` ${5 - n} attempt${5 - n === 1 ? "" : "s"} left before a 15-minute lock.` : ""}`);
        setPw("");
        return;
      }
      clearFails(uname);
      onLogin(u, pw);
    } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 70% -10%, #24244E 0%, ${C.bg} 55%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: SANS }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 62, height: 62, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TTJMark size={62} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: C.gold }}>Nagpur · Kamptee Road</div>
          <div style={{ fontFamily: SERIF, fontSize: 34, color: C.text, marginTop: 6 }}>The Town Junction</div>
          <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: "uppercase", color: C.mute, marginTop: 4 }}>Team OS · by Karan Kothari Group</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 10 }}>The official channel. Sign in to take your seat.</div>
        </div>

        {liveStatus === "needauth" && (
          <div style={{ background: C.panel, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}><b>Join the live workspace</b> — a one-time sign-in on this device keeps everything in sync and keeps outsiders out.</div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 12 }}>Sign in with your email (first time creates your account — you verify it once by mail):</div>
            <EmailAuthMini />
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 14, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>Have a Google account and not on Safari? <span onClick={googleSignIn} style={{ color: C.gold, cursor: "pointer", textDecoration: "underline" }}>Continue with Google</span> (may not work on iPhone/iPad).</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 10 }}>Or skip and sign in below to work offline on this device only.</div>
          </div>
        )}
        {liveStatus === "denied" && (
          <div style={{ background: C.panel, border: `1px solid ${C.red}66`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>This device's account{authInfo?.email ? <> (<b>{authInfo.email}</b>)</> : null} can't enter the workspace yet. Either it isn't on the access list (ask Rishi to add it), or — if you signed up by email — you haven't clicked the verification link yet.</div>
            <div style={{ marginTop: 10 }}><Btn ghost onClick={googleSignOut}>Switch account</Btn></div>
          </div>
        )}
        {authInfo && liveStatus === "on" && (
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.green, marginBottom: 12 }}>Workspace unlocked · {authInfo.email}</div>
        )}
        {!authInfo && liveStatus === "on" && effectiveFbConfig() && (
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.faint, marginBottom: 12 }}>
            Tip: <span onClick={googleSignIn} style={{ color: C.gold, cursor: "pointer", textDecoration: "underline" }}>add Google sign-in on this device</span> so it keeps workspace access when security tightens.
          </div>
        )}

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22 }}>
          <Field label="Username">
            <Inp value={un} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => { setUn(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="e.g. rishi" />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <Inp type={showPw ? "text" : "password"} value={pw}
                  onChange={(e) => { setPw(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="••••••••" style={{ paddingRight: 38 }} />
                <Eye size={15} color={showPw ? C.gold : C.faint} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={() => setShowPw(!showPw)} />
              </div>
            </Field>
          </div>
          {err && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>{err}</div>}
          <div style={{ marginTop: 18 }}>
            <Btn onClick={tryLogin} disabled={!un.trim() || !pw || busy}>{busy ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} Sign in</Btn>
          </div>
          <div style={{ color: C.faint, fontSize: 11, marginTop: 14, lineHeight: 1.6 }}>
            Usernames and passwords are managed by the Owner under Team &amp; Access. Change the defaults on first run.
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: liveOn ? C.green : C.faint, marginTop: 14 }}>
          {liveOn ? "● Live shared workspace connected" : "Standalone mode — data stays on this device until the Owner connects the shared workspace."}
        </div>
      </div>
    </div>
  );
}

/* ================= OVERVIEW ================= */
function Overview({ state, setState, user, goTo, liveStatus }) {
  const D = DEPTS[user.dept];
  const t = state.tenants;
  const signed = t.filter((x) => ["Agreement","Fit-out","Operational"].includes(x.status));
  const revSigned = signed.reduce((s, x) => s + tenantMonthlyL(x), 0);
  const totalArea = state.zones.reduce((s, z) => s + (+z.areaSft || 0), 0);
  const leasedArea = state.zones.filter((z) => {
    const tn = t.find((x) => x.id === z.tenantId);
    return tn && ["Agreement","Fit-out","Operational"].includes(tn.status);
  }).reduce((s, z) => s + (+z.areaSft || 0), 0);
  const capBudget = state.capex.reduce((s, c) => s + (+c.budgetL || 0), 0);
  const capSpent = state.capex.reduce((s, c) => s + (+c.spentL || 0), 0);
  const openComp = state.compliance.filter((c) => c.status !== "Done").length;

  const myTasks = state.tasks.filter((k) => k.assigneeId === user.id && k.status !== "Done");
  const myContent = state.content.filter((c) => c.assigneeId === user.id && c.status !== "Published");
  const pendingApprovals = state.approvals.filter((p) => p.status === "Pending");
  const anns = [...state.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.date || "").localeCompare(a.date || "")).slice(0, 3);
  const ext = isExternal(user);
  const myHighlights = (state.meetings || []).filter((m) => m.kind === "ai").slice(0, 4)
    .flatMap((m) => (m.highlights || []).filter((h) => h.userId === user.id).map((h) => ({ m, note: h.note })));

  return (
    <div>
      <SectionTitle eyebrow={`${D.label} · ${user.subRole}`} title={`Good day, ${user.name.split(" ")[0]}.`}
        sub={ext ? "Your assigned work, briefs and announcements — everything KKBP needs from you lives here." : "Live position of Karan Kothari Business Park — and everything waiting on you."} accent={D.accent} />

      {isOwner(user) && (() => {
        /* Owner briefing — the one-glance stop: what needs a decision, and
           what the team has done lately, in plain lines. */
        const waiting = isFinApprover(user) ? pendingApprovals : [];
        const waitingL = waiting.reduce((s, p) => s + (+p.amountL || 0), 0);
        const recent = (state.audit || []).filter((a) => a.byId !== user.id).slice(0, 7);
        return (
          <Card title="At a glance — what's new" style={{ marginBottom: 16, borderColor: `${C.gold}44` }}>
            {liveStatus !== "on" && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 12px", background: `${C.amber}12`, border: `1px solid ${C.amber}44`, borderRadius: 8, marginBottom: 10, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
                <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><b>Live sync is off on this device</b> — you're seeing this device's data only, not the team's.{" "}
                  {liveStatus === "needauth" ? "One-time workspace sign-in needed on this device — open the app\u2019s sign-in screen (sign out and back in) and use the email option."
                    : liveStatus === "denied" ? "This device's Google account isn't on the workspace access list — ask Rishi to add it (Team & Access → Workspace access)."
                    : isAppAdmin(user) ? "Connect the shared workspace in Team & Access to make every device live." : "Ask Rishi to connect the shared workspace."}</span>
              </div>
            )}
            {waiting.length > 0 && (
              <div onClick={() => goTo("approvals")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 9, cursor: "pointer", marginBottom: 10 }}>
                <Stamp size={17} color={C.gold} />
                <div style={{ flex: 1, fontSize: 13.5, color: C.text }}>
                  <b>{waiting.length} approval{waiting.length > 1 ? "s" : ""} waiting on you</b>{waitingL ? ` — ${fmtL(waitingL)} total` : ""}. Tap to decide.
                </div>
                <ChevronRight size={16} color={C.gold} />
              </div>
            )}
            {isFinApprover(user) && waiting.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.green, marginBottom: 10 }}><CheckCircle2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Nothing is waiting on your approval.</div>
            )}
            {recent.length > 0 ? (
              <div style={{ display: "grid", gap: 6 }}>
                {recent.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, color: C.mute, lineHeight: 1.5 }}>
                    <span style={{ color: C.faint, fontSize: 11, flexShrink: 0, ...NUM }}>{ago(a.ts)}</span>
                    <span><b style={{ color: C.text }}>{a.by}</b> {a.action} {a.col === "settings" ? "" : a.col.replace(/s$/, "") + " "}<span style={{ color: C.text }}>“{a.name}”</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: C.faint }}>No team activity yet — updates will appear here as the team works.</div>
            )}
          </Card>
        );
      })()}

      {!ext && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <KPI label="Signed revenue / mo" value={fmtL(revSigned)} sub={`of ₹${CMA_TARGET_L}L CMA target`} tone={C.green} />
          <KPI label="Leased area" value={`${Math.round((leasedArea / Math.max(1, totalArea)) * 100)}%`} sub={`${fmtSft(leasedArea)} of ${fmtSft(totalArea)}`} tone={C.blue} />
          <KPI label="Capex spent" value={fmtCr(capSpent)} sub={`of ${fmtCr(capBudget)}`} tone={C.amber} />
          <KPI label="Approvals pending" value={pendingApprovals.length} sub="awaiting decision" tone={pendingApprovals.length ? C.purple : C.green} />
          <KPI label="Compliance open" value={openComp} sub="statutory & commercial" tone={openComp ? C.red : C.green} />
        </div>
      )}
      {ext && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <KPI label="My open tasks" value={myTasks.length} sub="assigned to you" tone={D.accent} />
          {user.dept === "marketing" && <KPI label="My content items" value={myContent.length} sub="in the studio pipeline" tone={C.rose} />}
          <KPI label="Announcements" value={state.announcements.length} sub="from leadership" tone={C.gold} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14 }}>
        <Card title="My open work" right={<Btn small ghost onClick={() => goTo("tasks")}>All tasks</Btn>}>
          {myTasks.slice(0, 5).map((k) => (
            <div key={k.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
              <Circle size={13} color={k.priority === "High" ? C.red : C.amber} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text }}>{k.title}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{DEPTS[k.dept]?.label} · <span style={isOverdue(k.due, false) ? { color: C.red, fontWeight: 700 } : undefined}>due {k.due || "—"}{isOverdue(k.due, false) ? " · OVERDUE" : ""}</span> · {k.status}</div>
              </div>
            </div>
          ))}
          {myContent.slice(0, 3).map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
              <Megaphone size={13} color={C.rose} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text }}>{c.title}</div>
                <div style={{ fontSize: 11, color: C.faint }}>Content Studio · <span style={isOverdue(c.due, false) ? { color: C.red, fontWeight: 700 } : undefined}>due {c.due || "—"}{isOverdue(c.due, false) ? " · OVERDUE" : ""}</span> · {c.status}</div>
              </div>
            </div>
          ))}
          {myTasks.length === 0 && myContent.length === 0 && <Empty text="Nothing assigned to you right now." />}
        </Card>

        {myHighlights.length > 0 && (
          <Card title="From your meetings" right={<Btn small ghost onClick={() => goTo("meetings")}>Open</Btn>}>
            {myHighlights.map((h, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>{h.note}</div>
                <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3 }}>{h.m.title} · {h.m.date}</div>
              </div>
            ))}
          </Card>
        )}
        <Card title="Announcements" right={<Btn small ghost onClick={() => goTo("announcements")}>All</Btn>}>
          {anns.map((a) => (
            <div key={a.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {a.pinned && <Pin size={12} color={C.gold} />}
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{a.title}</div>
              </div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 3, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body}</div>
              <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3 }}>{uName(state, a.byId)} · {a.date}</div>
            </div>
          ))}
        </Card>

        {!ext && (
          <Card title="Activity" right={<Activity size={14} color={C.faint} />}>
            {(state.log || []).slice(0, 8).map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 10.5, color: C.faint, width: 30, flexShrink: 0, ...NUM }}>{ago(l.ts)}</div>
                <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.5 }}><span style={{ color: C.text }}>{l.by}</span> {l.text}</div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ================= TASKS ================= */
const blankTask = (u) => ({ id: "", title: "", dept: isExec(u) ? "leasing" : u.dept, assigneeId: u.id, createdById: u.id, due: "", priority: "Medium", status: "Open", notes: "" });
const KSTATUS = ["Open","In Progress","Review","Done"];
const KCOLOR = { Open: C.faint, "In Progress": C.amber, Review: C.blue, Done: C.green };

function Tasks({ state, setState, user }) {
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(isExternal(user) ? "mine" : "dept");
  const canCreate = true; /* everyone raises work; externals for themselves */
  const visible = state.tasks.filter((k) => {
    if (view === "mine") return k.assigneeId === user.id;
    if (view === "dept") return isExec(user) ? true : k.dept === user.dept;
    return isExec(user) || isHead(user);
  }).filter((k) => (isExternal(user) ? k.assigneeId === user.id || k.createdById === user.id : true));
  const canEditTask = (k) => isOwner(user) || (isHead(user) && k.dept === user.dept) || k.createdById === user.id;
  const canMove = (k) => canEditTask(k) || k.assigneeId === user.id;
  const save = () => {
    const isNew = !edit.id;
    const rec = { ...edit, id: edit.id || uid() };
    setState((s) => withLog(
      { ...s, tasks: isNew ? [...s.tasks, rec] : s.tasks.map((k) => (k.id === rec.id ? rec : k)) },
      user.name, `${isNew ? "assigned task" : "updated task"} “${rec.title}” → ${uName(state, rec.assigneeId)}`));
    setEdit(null);
  };
  const move = (k, status) => setState((s) => withLog(
    { ...s, tasks: s.tasks.map((x) => (x.id === k.id ? { ...x, status } : x)) },
    user.name, `moved “${k.title}” to ${status}`));
  const del = (id) => { if (confirm("Delete this task?")) setState((s) => ({ ...s, tasks: s.tasks.filter((k) => k.id !== id) })); };
  const assignable = isExec(user) ? state.users : state.users.filter((u2) => u2.dept === (edit?.dept || user.dept) || isExec(u2));

  return (
    <div>
      <SectionTitle eyebrow="Daily" title="Tasks" sub="Work is assigned here, moves here, and closes here. Assignees update status; heads and creators edit details." />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["mine","My tasks"],["dept", isExec(user) ? "All departments" : `${DEPTS[user.dept].label} dept`]].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{ background: view === k ? C.panel2 : "transparent", color: view === k ? C.text : C.mute, border: `1px solid ${view === k ? C.gold : C.line}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        {canCreate && <Btn onClick={() => setEdit(blankTask(user))}><Plus size={14} /> New task</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {KSTATUS.map((st) => (
          <div key={st}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Badge text={st} color={KCOLOR[st]} />
              <span style={{ fontSize: 11, color: C.faint }}>{visible.filter((k) => k.status === st).length}</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {visible.filter((k) => k.status === st).map((k) => (
                <div key={k.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{k.title}</div>
                    {canEditTask(k) && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <Pencil size={12} color={C.mute} style={{ cursor: "pointer" }} onClick={() => setEdit({ ...k })} />
                      <Trash2 size={12} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(k.id)} />
                    </div>}
                  </div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>
                    <Badge text={DEPTS[k.dept]?.short || k.dept} color={DEPTS[k.dept]?.accent || C.faint} />{" "}
                    <span style={{ marginLeft: 6 }}>{uName(state, k.assigneeId)}</span>
                    {k.due && <span style={isOverdue(k.due, k.status === "Done") ? { color: C.red, fontWeight: 700 } : undefined}> · due {k.due}{isOverdue(k.due, k.status === "Done") ? " · OVERDUE" : ""}</span>}
                    {k.priority === "High" && <span style={{ color: C.red }}> · HIGH</span>}
                    {k.source === "meeting" && <span style={{ color: C.teal }}> · from meeting</span>}
                  </div>
                  {k.notes && <div style={{ fontSize: 11.5, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>{k.notes}</div>}
                  {canMove(k) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                      {KSTATUS.filter((x) => x !== st).map((x) => (
                        <button key={x} onClick={() => move(k, x)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 6, padding: "3px 8px", fontSize: 10.5, cursor: "pointer", fontFamily: SANS }}>→ {x}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {visible.filter((k) => k.status === st).length === 0 && <div style={{ border: `1px dashed ${C.line}`, borderRadius: 9, padding: 14, fontSize: 11, color: C.faint, textAlign: "center" }}>Empty</div>}
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={edit.id ? "Edit task" : "New task"} onClose={() => setEdit(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Title"><Inp value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Department">
              <select value={edit.dept} onChange={(e) => setEdit({ ...edit, dept: e.target.value })} style={inputSt} disabled={!isExec(user) && !isHead(user)}>
                {Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Assignee">
              <select value={edit.assigneeId} onChange={(e) => setEdit({ ...edit, assigneeId: e.target.value })} style={inputSt}>
                {state.users.filter((u2) => isExec(user) || isHead(user) ? true : u2.id === user.id || u2.dept === user.dept).map((u2) => <option key={u2.id} value={u2.id}>{u2.name} — {u2.subRole}</option>)}
              </select>
            </Field>
            <Field label="Due"><Inp type="date" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} /></Field>
            <Field label="Priority"><Sel value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} options={["High","Medium","Low"]} /></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={KSTATUS} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Notes"><Ta value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.title}>Save task</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= APPROVALS ================= */
const requiredApprover = () => ({ text: "Owner — Rishi / Nitin / Arjun", color: C.gold });
function Approvals({ state, setState, user }) {
  const [edit, setEdit] = useState(null);
  /* Every financial approval — any amount, any type — is decided only by an
     Owner: Rishi, Nitin or Arjun (§4). Heads raise and prepare; they do not clear money. */
  const canDecide = (p) => p.status === "Pending" && isFinApprover(user);
  const decide = (p, status) => setState((s) => withLog(
    { ...s, approvals: s.approvals.map((x) => (x.id === p.id ? { ...x, status, decidedById: user.id, dateDecided: today() } : x)) },
    user.name, `${status.toLowerCase()} “${p.title}”${p.amountL ? ` (${fmtL(p.amountL)})` : ""}`));
  const save = () => {
    const rec = { ...edit, id: uid(), raisedById: user.id, status: "Pending", decidedById: null, dateRaised: today(), dateDecided: "" };
    setState((s) => withLog({ ...s, approvals: [rec, ...s.approvals] }, user.name, `raised approval “${rec.title}”${rec.amountL ? ` (${fmtL(rec.amountL)})` : ""}`));
    setEdit(null);
  };
  const groups = [["Pending", state.approvals.filter((p) => p.status === "Pending")], ["Decided", state.approvals.filter((p) => p.status !== "Pending")]];
  return (
    <div>
      <SectionTitle eyebrow="Daily" title="Approvals" sub="Money and deviations move only through this page. Every request — any amount, any type — is decided by an Owner: Rishi, Nitin or Arjun (§4). A verbal yes is not an approval." />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setEdit({ title: "", type: APPROVAL_TYPES[0], amountL: 0, dept: isExec(user) ? "project" : user.dept, notes: "" })}><Send size={14} /> Raise request</Btn>
      </div>
      {groups.map(([label, list]) => (
        <div key={label} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.mute, marginBottom: 8 }}>{label} · {list.length}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {list.map((p) => {
              const req = requiredApprover(p);
              return (
                <Card key={p.id} pad={14}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: SERIF, fontSize: 15, color: C.text }}>{p.title}</span>
                        <Badge text={p.type} color={C.blue} />
                        <Badge text={DEPTS[p.dept]?.label || p.dept} color={DEPTS[p.dept]?.accent || C.faint} />
                      </div>
                      <div style={{ fontSize: 12, color: C.mute, marginTop: 5 }}>
                        Raised by {uName(state, p.raisedById)} on {p.dateRaised}
                        {p.status !== "Pending" && <> · <span style={{ color: p.status === "Approved" ? C.green : C.red }}>{p.status}</span> by {uName(state, p.decidedById)} on {p.dateDecided}</>}
                      </div>
                      {p.notes && <div style={{ fontSize: 12, color: C.mute, marginTop: 5, lineHeight: 1.5 }}>{p.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {p.amountL > 0 && <div style={{ fontFamily: SERIF, fontSize: 20, color: C.gold, ...NUM }}>{fmtL(p.amountL)}</div>}
                      <div style={{ marginTop: 4 }}><Badge text={`Needs: ${req.text}`} color={req.color} /></div>
                      {canDecide(p) && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                          <Btn small tone={C.green} onClick={() => decide(p, "Approved")}><ThumbsUp size={12} /> Approve</Btn>
                          <Btn small ghost tone={C.red} onClick={() => decide(p, "Rejected")}><ThumbsDown size={12} /> Reject</Btn>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {list.length === 0 && <Card><Empty text={label === "Pending" ? "Nothing awaiting decision." : "No decided requests yet."} /></Card>}
          </div>
        </div>
      ))}
      {edit && (
        <Modal title="Raise approval request" onClose={() => setEdit(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Title"><Inp value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Type"><Sel value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} options={APPROVAL_TYPES} /></Field>
            <Field label="Amount (₹L, 0 if N/A)"><Inp type="number" value={edit.amountL} onChange={(e) => setEdit({ ...edit, amountL: e.target.value })} /></Field>
            <Field label="Department">
              <select value={edit.dept} onChange={(e) => setEdit({ ...edit, dept: e.target.value })} style={inputSt}>
                {Object.entries(DEPTS).filter(([k]) => k !== "exec").map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Justification / notes"><Ta value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field></div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 10 }}>Routing: <Badge text={requiredApprover(edit).text} color={requiredApprover(edit).color} /></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.title}>Submit request</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= ANNOUNCEMENTS ================= */
function Announcements({ state, setState, user }) {
  const [edit, setEdit] = useState(null);
  const canPost = isOwner(user) || isHead(user);
  const save = () => {
    const rec = { ...edit, id: edit.id || uid(), byId: edit.byId || user.id, date: edit.date || today() };
    setState((s) => withLog(
      { ...s, announcements: edit.id ? s.announcements.map((a) => (a.id === edit.id ? rec : a)) : [rec, ...s.announcements] },
      user.name, `posted announcement “${rec.title}”`));
    setEdit(null);
  };
  const del = (id) => { if (confirm("Delete announcement?")) setState((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) })); };
  const list = [...state.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.date || "").localeCompare(a.date || ""));
  return (
    <div>
      <SectionTitle eyebrow="Daily" title="Announcements" sub="Leadership speaks here. Pinned notices stay on top until withdrawn." />
      {canPost && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setEdit({ title: "", body: "", pinned: false })}><Plus size={14} /> Post announcement</Btn>
      </div>}
      <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
        {list.map((a) => (
          <Card key={a.id} pad={16}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {a.pinned && <Pin size={15} color={C.gold} style={{ marginTop: 3, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: C.text }}>{a.title}</div>
                <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginTop: 6 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>{uName(state, a.byId)} · {a.date}</div>
              </div>
              {(isOwner(user) || a.byId === user.id) && <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <Pencil size={14} color={C.mute} style={{ cursor: "pointer" }} onClick={() => setEdit({ ...a })} />
                <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(a.id)} />
              </div>}
            </div>
          </Card>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? "Edit announcement" : "Post announcement"} onClose={() => setEdit(null)}>
          <Field label="Title"><Inp value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div style={{ marginTop: 12 }}><Field label="Message"><Ta rows={5} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={!!edit.pinned} onChange={(e) => setEdit({ ...edit, pinned: e.target.checked })} /> Pin to top
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.title}>Publish</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
/* ================= TENANTS ================= */
const blankTenant = () => ({ id: "", name: "", category: "Vanilla Retail", area: 0, deal: "Pure Rent", rent: 0, density: 0, share: 0, mrg: 0, salesL: 0, capexPsf: 0, status: "Lead", floor: "Ground", poc: "", notes: "" });

function Tenants({ state, setState, canWrite }) {
  const [edit, setEdit] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [filterSt, setFilterSt] = useState("All");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("roll"); // roll | roi
  const roiCfg = { ...ROI_DEFAULTS, ...(state.roiCfg || {}) };
  const setCfg = (k, v) => setState((s) => ({ ...s, roiCfg: { ...ROI_DEFAULTS, ...(s.roiCfg || {}), [k]: +v || 0 } }));
  const list = state.tenants.filter((t) =>
    (filterCat === "All" || t.category === filterCat) &&
    (filterSt === "All" || t.status === filterSt) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()))
  );
  const save = () => {
    const rec = { ...edit, id: edit.id || uid() };
    setState((s) => ({ ...s, tenants: edit.id ? s.tenants.map((t) => (t.id === edit.id ? rec : t)) : [...s.tenants, rec] }));
    setEdit(null);
  };
  const del = (id) => { if (confirm("Delete this tenant record?")) setState((s) => ({ ...s, tenants: s.tenants.filter((t) => t.id !== id) })); };
  const totRev = list.reduce((s, t) => s + tenantMonthlyL(t), 0);

  return (
    <div>
      <SectionTitle eyebrow="Leasing" title="Tenants & Leasing" sub="The rent roll — every tenant from lead to operational. Categories, deal structures and pipeline stage in one register." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search size={13} color={C.faint} style={{ position: "absolute", left: 9, top: 11 }} />
          <Inp placeholder="Search tenant…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180, paddingLeft: 28 }} />
        </div>
        <Sel value={filterCat} onChange={(e) => setFilterCat(e.target.value)} options={["All", ...TENANT_CATS]} style={{ width: 180 }} />
        <Sel value={filterSt} onChange={(e) => setFilterSt(e.target.value)} options={["All", ...TSTATUS]} style={{ width: 140 }} />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: C.mute }}>Shown: <span style={{ color: C.gold, ...NUM }}>{fmtL(totRev)}/mo</span></div>
        {canWrite && <Btn onClick={() => setEdit(blankTenant())}><Plus size={14} /> Add tenant</Btn>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {[["roll", "Rent Roll"], ["roi", "Deal ROI — capex screen"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? C.panel2 : "transparent", color: tab === k ? C.text : C.mute, border: `1px solid ${tab === k ? C.gold : C.line}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        {TSTATUS.map((st) => {
          const n = state.tenants.filter((t) => t.status === st).length;
          return <Badge key={st} text={`${st}: ${n}`} color={TSTATUS_COLOR[st]} />;
        })}
      </div>

      {tab === "roi" && (() => {
        const rows = list.map((t, i) => ({ t, i, r: tenantRoi(t, roiCfg) }));
        const withCapex = rows.filter((x) => x.r.capex > 0);
        /* Portfolio totals exactly per the workbook's TOTAL / WEIGHTED AVG row */
        const S = (f) => rows.reduce((s, x) => s + (f(x.r) || 0), 0);
        const tArea = S((r) => r.area), tSalesMo = S((r) => r.salesMo), tRsMo = S((r) => r.rsRentMo);
        const tBaseMo = S((r) => r.baseMo), tPayMo = S((r) => r.rentMo1), tAboveMo = S((r) => r.aboveMo1);
        const tCapex = S((r) => r.capex), tRent36 = S((r) => r.rent36), tAbove36 = S((r) => r.above36), tAvgAbove = S((r) => r.avgAboveMo);
        const pfPayback = tAvgAbove > 0 ? tCapex / tAvgAbove : Infinity;
        const pfPaybackTot = tRent36 > 0 ? tCapex / (tRent36 / 36) : Infinity;
        const pfRoi = tCapex > 0 ? (tAbove36 / 36 * 12) / tCapex : 0;
        const pfRoiTot = tCapex > 0 ? (tRent36 / 36 * 12) / tCapex : 0;
        const passN = withCapex.filter((x) => x.r.verdict === "PASS").length;
        const mo = (v) => v === 0 ? "—" : !isFinite(v) ? "No payback" : v.toFixed(1);
        const pc = (v) => v ? `${(v * 100).toFixed(1)}%` : "—";
        const rs = (v) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
        const VC = { PASS: C.green, REVIEW: C.amber, "n/a": C.faint };
        const GTh = ({ span, children }) => <th colSpan={span} style={{ padding: "8px 10px 2px", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: C.gold, textAlign: "left", borderBottom: `1px solid ${C.lineSoft}`, whiteSpace: "nowrap" }}>{children}</th>;
        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 12 }}>
              <KPI label="Landlord capex committed" value={fmtCr(tCapex / 1e5)} sub={`${withCapex.length} deal${withCapex.length === 1 ? "" : "s"} with capex`} tone={C.amber} />
              <KPI label="Blended capex / sft" value={tArea && tCapex ? rs(tCapex / tArea) : "—"} sub="across shown units" tone={C.blue} />
              <KPI label="Portfolio payback" value={isFinite(pfPayback) && tCapex ? `${pfPayback.toFixed(1)} mo` : "—"} sub="on rent above base" tone={tCapex && pfPayback <= roiCfg.targetPaybackM ? C.green : C.red} />
              <KPI label="Portfolio ROI p.a." value={tCapex ? pc(pfRoi) : "—"} sub="rent above base / capex" tone={pfRoi >= roiCfg.targetRoiPct / 100 ? C.green : C.red} />
              <KPI label="Deals clearing screen" value={`${passN}/${withCapex.length}`} sub={`payback ≤ ${roiCfg.targetPaybackM}m & ROI ≥ ${roiCfg.targetRoiPct}%`} tone={passN === withCapex.length && withCapex.length ? C.green : C.purple} />
            </div>
            <Card title="Assumptions (portfolio-wide)" style={{ marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {[["escPct", "Base escalation (% p.a.)"], ["growPct", "Trade density growth (% p.a.)"], ["rentFreeM", "Rent-free period (months)"], ["collPct", "Collection efficiency (%)"], ["targetPaybackM", "Target payback (months)"], ["targetRoiPct", "Target ROI (% p.a.)"]].map(([k, l]) => (
                  <Field key={k} label={l}>
                    {canWrite ? <Inp type="number" value={roiCfg[k]} onChange={(e) => setCfg(k, e.target.value)} />
                      : <div style={{ fontSize: 14, color: C.text, padding: "9px 0", ...NUM }}>{roiCfg[k]}</div>}
                  </Field>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
                Mirrors the leasing ROI workbook: rent payable each year = HIGHER of (trade density × area × revenue share %) and (base rental × area); the base escalates, trade density grows; rent-free months are deducted from year 1; collections over the first 36 months are screened against capex. PASS = capex back from rent above base within the target payback AND annual ROI at or above target.
              </div>
            </Card>
            <Card pad={0}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2280 }}>
                  <thead>
                    <tr>
                      <GTh span={2}></GTh><GTh span={3}>Sales</GTh><GTh span={7}>Rent</GTh><GTh span={2}>Above base</GTh><GTh span={2}>Capex</GTh><GTh span={4}>First 36 months</GTh><GTh span={5}>Returns</GTh>
                    </tr>
                    <tr>
                      <Th>Sr</Th><Th>Unit / Tenant</Th>
                      <Th right>Area (sft)</Th><Th right>Trade density (₹/sft/mo)</Th><Th right>Revenue – monthly</Th>
                      <Th right>Rev share %</Th><Th right>Rev-share rent /mo</Th><Th right>Base rental (₹/sft/mo)</Th><Th right>Base rent /mo</Th><Th right>Rent payable /mo</Th><Th right>Avg rental (₹/sft/mo)</Th><Th right>Annual rental</Th>
                      <Th right>/mo</Th><Th right>/yr</Th>
                      <Th right>₹/sft</Th><Th right>Total</Th>
                      <Th right>Total rent 36M</Th><Th right>Avg rent 36M (₹/sft/mo)</Th><Th right>Above base 36M</Th><Th right>Avg above base /mo</Th>
                      <Th right>Payback – above base (mo)</Th><Th right>Payback – total rent (mo)</Th><Th right>ROI % p.a. (above)</Th><Th right>ROI % p.a. (total)</Th><Th>Deal test</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ t, i, r }) => (
                      <tr key={t.id}>
                        <Td style={{ color: C.faint }}>{i + 1}</Td>
                        <Td><div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t.name}</div><div style={{ fontSize: 10.5, color: C.faint, whiteSpace: "nowrap" }}>{t.category} · {t.deal}</div></Td>
                        <Td right>{r.area ? r.area.toLocaleString("en-IN") : "—"}</Td>
                        <Td right>{r.salesMo && r.area ? rs(r.salesMo / r.area) : "—"}</Td>
                        <Td right>{r.salesMo ? fmtL(r.salesMo / 1e5) : "—"}</Td>
                        <Td right>{r.sharePct ? `${r.sharePct.toFixed(1)}%` : "—"}</Td>
                        <Td right>{r.rsRentMo ? fmtL(r.rsRentMo / 1e5) : "—"}</Td>
                        <Td right style={{ color: r.basePsf ? C.text : C.faint }}>{r.basePsf ? rs(r.basePsf) : "0"}</Td>
                        <Td right>{r.baseMo ? fmtL(r.baseMo / 1e5) : "—"}</Td>
                        <Td right style={{ fontWeight: 600, color: C.gold }}>{fmtL(r.rentMo1 / 1e5)}</Td>
                        <Td right>{r.avgPsf ? rs(r.avgPsf) : "—"}</Td>
                        <Td right>{fmtL(r.annualRent / 1e5)}</Td>
                        <Td right style={{ color: C.teal }}>{fmtL(r.aboveMo1 / 1e5)}</Td>
                        <Td right style={{ color: C.teal }}>{fmtL(r.aboveYr1 / 1e5)}</Td>
                        <Td right>{r.capexPsf ? rs(r.capexPsf) : "—"}</Td>
                        <Td right style={{ color: C.amber, fontWeight: 600 }}>{r.capex ? fmtL(r.capex / 1e5) : "—"}</Td>
                        <Td right>{fmtL(r.rent36 / 1e5)}</Td>
                        <Td right>{r.avg36Psf ? rs(r.avg36Psf) : "—"}</Td>
                        <Td right style={{ color: C.teal }}>{fmtL(r.above36 / 1e5)}</Td>
                        <Td right>{fmtL(r.avgAboveMo / 1e5)}</Td>
                        <Td right style={{ fontWeight: 700, color: r.capex ? (isFinite(r.paybackAbove) && r.paybackAbove <= roiCfg.targetPaybackM ? C.green : C.red) : C.faint }}>{mo(r.paybackAbove)}</Td>
                        <Td right>{mo(r.paybackTotal)}</Td>
                        <Td right style={{ fontWeight: 700, color: r.capex ? (r.roiAbove >= roiCfg.targetRoiPct / 100 ? C.green : C.red) : C.faint }}>{r.capex ? pc(r.roiAbove) : "—"}</Td>
                        <Td right>{r.capex ? pc(r.roiTotal) : "—"}</Td>
                        <Td><Badge text={r.verdict} color={VC[r.verdict]} /></Td>
                      </tr>
                    ))}
                    {rows.length > 0 && (
                      <tr style={{ background: C.panel3 }}>
                        <Td></Td>
                        <Td style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11.5, letterSpacing: 0.6 }}>Total / wtd avg</Td>
                        <Td right style={{ fontWeight: 700 }}>{tArea.toLocaleString("en-IN")}</Td>
                        <Td right>{tArea && tSalesMo ? rs(tSalesMo / tArea) : "—"}</Td>
                        <Td right style={{ fontWeight: 700 }}>{fmtL(tSalesMo / 1e5)}</Td>
                        <Td right>{tSalesMo ? `${(tRsMo / tSalesMo * 100).toFixed(1)}%` : "—"}</Td>
                        <Td right>{fmtL(tRsMo / 1e5)}</Td>
                        <Td right>{tArea && tBaseMo ? rs(tBaseMo / tArea) : "—"}</Td>
                        <Td right>{fmtL(tBaseMo / 1e5)}</Td>
                        <Td right style={{ fontWeight: 700, color: C.gold }}>{fmtL(tPayMo / 1e5)}</Td>
                        <Td right>{tArea ? rs(tPayMo / tArea) : "—"}</Td>
                        <Td right style={{ fontWeight: 700 }}>{fmtL(tPayMo * 12 / 1e5)}</Td>
                        <Td right style={{ color: C.teal }}>{fmtL(tAboveMo / 1e5)}</Td>
                        <Td right style={{ color: C.teal }}>{fmtL(tAboveMo * 12 / 1e5)}</Td>
                        <Td right>{tArea && tCapex ? rs(tCapex / tArea) : "—"}</Td>
                        <Td right style={{ fontWeight: 700, color: C.amber }}>{tCapex ? fmtL(tCapex / 1e5) : "—"}</Td>
                        <Td right style={{ fontWeight: 700 }}>{fmtL(tRent36 / 1e5)}</Td>
                        <Td right>{tArea ? rs(tRent36 / (tArea * 36)) : "—"}</Td>
                        <Td right style={{ fontWeight: 700, color: C.teal }}>{fmtL(tAbove36 / 1e5)}</Td>
                        <Td right>{fmtL(tAvgAbove / 1e5)}</Td>
                        <Td right style={{ fontWeight: 700, color: tCapex ? (isFinite(pfPayback) && pfPayback <= roiCfg.targetPaybackM ? C.green : C.red) : C.faint }}>{tCapex ? mo(pfPayback) : "—"}</Td>
                        <Td right>{tCapex ? mo(pfPaybackTot) : "—"}</Td>
                        <Td right style={{ fontWeight: 700, color: tCapex ? (pfRoi >= roiCfg.targetRoiPct / 100 ? C.green : C.red) : C.faint }}>{tCapex ? pc(pfRoi) : "—"}</Td>
                        <Td right>{tCapex ? pc(pfRoiTot) : "—"}</Td>
                        <Td></Td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {rows.length === 0 && <Empty text="No tenants match these filters — add deals on the Rent Roll tab, with base rental and landlord capex per the deal." />}
              </div>
            </Card>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8, lineHeight: 1.6 }}>
              Rent payable = HIGHER of (rev-share rent) and (base rent), exactly as in the ROI workbook. ROI is primarily measured on the rent earned above the base rental; units without landlord capex are screened n/a.
            </div>
          </div>
        );
      })()}

      {tab === "roll" && <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead><tr>
              <Th>Tenant</Th><Th>Category</Th><Th>Floor</Th><Th right>Area</Th><Th>Deal</Th><Th right>₹/mo</Th><Th>Status</Th>{canWrite && <Th right>Actions</Th>}
            </tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <Td><div style={{ fontWeight: 600 }}>{t.name}</div>{t.notes && <div style={{ fontSize: 11, color: C.faint, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.notes}</div>}</Td>
                  <Td style={{ color: C.mute }}>{t.category}</Td>
                  <Td style={{ color: C.mute }}>{t.floor}</Td>
                  <Td right>{t.area ? fmtSft(t.area) : "—"}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{t.deal}{t.deal.includes("Share") && t.share ? ` · ${t.share}%` : ""}{t.deal === "Pure Rent" && t.rent ? ` · ₹${t.rent}/sft` : ""}</Td>
                  <Td right style={{ color: C.gold }}>{fmtL(tenantMonthlyL(t))}</Td>
                  <Td><Badge text={t.status} color={TSTATUS_COLOR[t.status]} /></Td>
                  {canWrite && <Td right>
                    <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEdit({ ...t })} />
                    <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(t.id)} />
                  </Td>}
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <Empty text="No tenants match these filters. Add your first tenant to build the rent roll." />}
        </div>
      </Card>}

      {edit && (
        <Modal title={edit.id ? `Edit — ${edit.name}` : "Add tenant"} onClose={() => setEdit(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Tenant name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Category"><Sel value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={TENANT_CATS} /></Field>
            <Field label="Floor"><Sel value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })} options={[...FLOORS, "Multiple"]} /></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={TSTATUS} /></Field>
            <Field label="Area (sft)"><Inp inputMode="decimal" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} /></Field>
            <Field label="Deal structure"><Sel value={edit.deal} onChange={(e) => setEdit({ ...edit, deal: e.target.value })} options={DEALS} /></Field>
            {edit.deal === "Pure Rent" && <Field label="Rent (₹/sft/mo)"><Inp inputMode="decimal" value={edit.rent} onChange={(e) => setEdit({ ...edit, rent: e.target.value })} /></Field>}
            {(edit.deal === "Rev Share (area)" || edit.deal === "MRG + Rev Share") && <>
              <Field label="Trade density (₹/sft/mo)"><Inp inputMode="decimal" value={edit.density} onChange={(e) => setEdit({ ...edit, density: e.target.value })} /></Field>
              <Field label="Revenue share %"><Inp inputMode="decimal" value={edit.share} onChange={(e) => setEdit({ ...edit, share: e.target.value })} /></Field>
              <Field label="Base rental (₹/sft/mo) — minimum guarantee, 0 if none"><Inp inputMode="decimal" value={edit.mrg || ""} onChange={(e) => setEdit({ ...edit, mrg: e.target.value })} placeholder="Rent = higher of the two legs" /></Field>
            </>}
            {edit.deal === "Rev Share (turnover)" && <>
              <Field label="Est. monthly sales (₹L)"><Inp inputMode="decimal" value={edit.salesL} onChange={(e) => setEdit({ ...edit, salesL: e.target.value })} /></Field>
              <Field label="Revenue share %"><Inp inputMode="decimal" value={edit.share} onChange={(e) => setEdit({ ...edit, share: e.target.value })} /></Field>
            </>}
            {edit.deal === "Self-Operated" && <Field label="Net contribution (₹L/mo)"><Inp inputMode="decimal" value={edit.salesL} onChange={(e) => setEdit({ ...edit, salesL: e.target.value })} /></Field>}
            <Field label="Landlord capex (₹/sft) — if the brand requires fit-out contribution"><Inp inputMode="decimal" value={edit.capexPsf || ""} onChange={(e) => setEdit({ ...edit, capexPsf: e.target.value })} placeholder="0 = no capex" /></Field>
            <Field label="Point of contact"><Inp value={edit.poc} onChange={(e) => setEdit({ ...edit, poc: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Notes"><Ta value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: C.mute }}>
              Income: <span style={{ color: C.gold, ...NUM }}>{fmtL(tenantMonthlyL(edit))}/mo</span>
              {num(edit.capexPsf) > 0 && num(edit.area) > 0 && (() => {
                const r = tenantRoi(edit, roiCfg);
                return <> · Capex: <span style={{ color: C.amber, ...NUM }}>{fmtL(r.capex / 1e5)}</span> · Payback: <span style={{ color: isFinite(r.paybackAbove) && r.paybackAbove <= roiCfg.targetPaybackM ? C.green : C.red, ...NUM }}>{isFinite(r.paybackAbove) ? r.paybackAbove.toFixed(1) + " mo" : "no payback"}</span> · <Badge text={r.verdict} color={r.verdict === "PASS" ? C.green : C.amber} /></>;
              })()}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={!edit.name}>Save tenant</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= CAPEX ================= */
const blankCapex = () => ({ id: "", name: "", category: CAPEX_CATS[0], budgetL: 0, spentL: 0, status: "Planned", owner: "Project Head", vendor: "", due: "", notes: "" });

function Capex({ state, setState, canWrite }) {
  const [edit, setEdit] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const list = state.capex.filter((c) => filterCat === "All" || c.category === filterCat);
  const budget = state.capex.reduce((s, c) => s + (+c.budgetL || 0), 0);
  const spent = state.capex.reduce((s, c) => s + (+c.spentL || 0), 0);
  const save = () => {
    const rec = { ...edit, id: edit.id || uid() };
    setState((s) => ({ ...s, capex: edit.id ? s.capex.map((c) => (c.id === edit.id ? rec : c)) : [...s.capex, rec] }));
    setEdit(null);
  };
  const del = (id) => { if (confirm("Delete this capex line?")) setState((s) => ({ ...s, capex: s.capex.filter((c) => c.id !== id) })); };

  const byCat = CAPEX_CATS.map((cat) => {
    const items = state.capex.filter((c) => c.category === cat);
    return { cat, b: items.reduce((s, c) => s + (+c.budgetL || 0), 0), sp: items.reduce((s, c) => s + (+c.spentL || 0), 0) };
  }).filter((x) => x.b > 0);

  const approvalNote = (c) => {
    const b = +c.budgetL || 0;
    if (b > 25) return { text: "Owner approval", color: C.gold };
    if (b > 5) return { text: "CEO approval", color: C.purple };
    return { text: "Dept head", color: C.faint };
  };

  return (
    <div>
      <SectionTitle eyebrow="Projects" title="Capex & Works" sub="Budget vs actual across every works package. Approval routing follows the Delegation of Authority in the constitution." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KPI label="Total capex budget" value={fmtCr(budget)} sub={`${state.capex.length} packages`} tone={C.blue} />
        <KPI label="Spent to date" value={fmtCr(spent)} sub={`${Math.round((spent / Math.max(1, budget)) * 100)}% of budget`} tone={C.amber} />
        <KPI label="Balance to spend" value={fmtCr(budget - spent)} sub="committed + uncommitted" tone={C.green} />
        <KPI label="In progress" value={state.capex.filter((c) => c.status === "In Progress").length} sub="active packages" tone={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 14 }}>
        <Card title="Spend by category">
          {byCat.map((x) => (
            <div key={x.cat} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.text }}>{x.cat}</span>
                <span style={{ color: C.mute, ...NUM }}>{fmtL(x.sp)} / {fmtL(x.b)}</span>
              </div>
              <Bar_ pct={(x.sp / Math.max(1, x.b)) * 100} tone={x.sp / Math.max(1, x.b) > 0.95 ? C.red : C.gold} />
            </div>
          ))}
        </Card>
        <Card title="Delegation of Authority (constitution §4)">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Spend band</Th><Th>Approver</Th></tr></thead>
            <tbody>
              <tr><Td>Up to ₹5L</Td><Td>Department Head</Td></tr>
              <tr><Td>₹5L – ₹25L</Td><Td>CEO</Td></tr>
              <tr><Td>Above ₹25L / anchor deviation</Td><Td>Owner</Td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 10 }}>Every package below is auto-tagged with its required approver. Record approval in notes before commitment.</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Sel value={filterCat} onChange={(e) => setFilterCat(e.target.value)} options={["All", ...CAPEX_CATS]} style={{ width: 280 }} />
        <div style={{ flex: 1 }} />
        {canWrite && <Btn onClick={() => setEdit(blankCapex())}><Plus size={14} /> Add package</Btn>}
      </div>

      <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead><tr><Th>Package</Th><Th>Category</Th><Th right>Budget</Th><Th right>Spent</Th><Th>Progress</Th><Th>Approver</Th><Th>Due</Th><Th>Status</Th>{canWrite && <Th right>Actions</Th>}</tr></thead>
            <tbody>
              {list.map((c) => {
                const ap = approvalNote(c);
                return (
                  <tr key={c.id}>
                    <Td><div style={{ fontWeight: 600 }}>{c.name}</div>{c.vendor && <div style={{ fontSize: 11, color: C.faint }}>{c.vendor}</div>}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{c.category}</Td>
                    <Td right>{fmtL(c.budgetL)}</Td>
                    <Td right>{fmtL(c.spentL)}</Td>
                    <Td style={{ minWidth: 110 }}><Bar_ pct={((+c.spentL || 0) / Math.max(1, +c.budgetL || 0)) * 100} /></Td>
                    <Td><Badge text={ap.text} color={ap.color} /></Td>
                    <Td style={isOverdue(c.due, c.status === "Complete") ? { color: C.red, fontSize: 12, fontWeight: 700 } : { color: C.mute, fontSize: 12 }}>{c.due || "—"}{isOverdue(c.due, c.status === "Complete") ? " ⚠" : ""}</Td>
                    <Td><Badge text={c.status} color={CSTATUS_COLOR[c.status]} /></Td>
                    {canWrite && <Td right>
                      <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEdit({ ...c })} />
                      <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(c.id)} />
                    </Td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <Empty text="No capex packages in this category yet." />}
        </div>
      </Card>

      {edit && (
        <Modal title={edit.id ? `Edit — ${edit.name}` : "Add capex package"} onClose={() => setEdit(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Package name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Category"><Sel value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={CAPEX_CATS} /></Field>
            <Field label="Budget (₹L)"><Inp type="number" value={edit.budgetL} onChange={(e) => setEdit({ ...edit, budgetL: e.target.value })} /></Field>
            <Field label="Spent (₹L)"><Inp type="number" value={edit.spentL} onChange={(e) => setEdit({ ...edit, spentL: e.target.value })} /></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={CSTATUS} /></Field>
            <Field label="Responsible"><Inp value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></Field>
            <Field label="Vendor"><Inp value={edit.vendor} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })} /></Field>
            <Field label="Due date"><Inp type="date" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Notes / approval record"><Ta value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.name}>Save package</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= LAYOUT (The Stack) ================= */
const blankZone = () => ({ id: "", floor: "Ground", name: "", areaSft: 0, tenantId: null, use: "Vanilla Retail" });

const PLAN_ASSET = (f) => `${import.meta.env.BASE_URL}plans/${f}`;
const PLAN_SHEETS = [
  { plot: "Plot 1 — Wings A · B · C", floor: "Ground Floor",        img: "plot1-ground" },
  { plot: "Plot 1 — Wings A · B · C", floor: "First Floor",         img: "plot1-first" },
  { plot: "Plot 1 — Wings A · B · C", floor: "Second Floor",        img: "plot1-second" },
  { plot: "Plot 1 — Wings A · B · C", floor: "Third Floor",         img: "plot1-third" },
  { plot: "Plot 2 — Wings D · E · F", floor: "Ground Floor",        img: "plot2-ground" },
  { plot: "Plot 2 — Wings D · E · F", floor: "First Floor",         img: "plot2-first" },
  { plot: "Plot 2 — Wings D · E · F", floor: "Second Floor",        img: "plot2-second" },
  { plot: "Plot 2 — Wings D · E · F", floor: "Third Floor + Terrace", img: "plot2-third-terrace" },
];

function MallLayout({ state, setState, canWrite }) {
  const [edit, setEdit] = useState(null);
  const [selZone, setSelZone] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const t = state.tenants;
  const zoneColor = (z) => {
    const tn = t.find((x) => x.id === z.tenantId);
    if (!tn) return C.faint;
    return TSTATUS_COLOR[tn.status] || C.faint;
  };
  const save = () => {
    const rec = { ...edit, id: edit.id || uid() };
    setState((s) => ({ ...s, zones: edit.id ? s.zones.map((z) => (z.id === edit.id ? rec : z)) : [...s.zones, rec] }));
    setEdit(null); setSelZone(null);
  };
  const del = (id) => { if (confirm("Delete this zone?")) { setState((s) => ({ ...s, zones: s.zones.filter((z) => z.id !== id) })); setSelZone(null); } };

  const maxFloorArea = Math.max(...FLOORS.map((f) => state.zones.filter((z) => z.floor === f).reduce((s, z) => s + (+z.areaSft || 0), 0)), 1);

  return (
    <div>
      <SectionTitle eyebrow="Property" title="Mall Layout — The Stack" sub="Floor-by-floor stacking plan. Each block is a zone, sized by area and coloured by the assigned tenant's leasing status. Tap a block for details." />

      <Card title="Architectural floor plans — Disha Vision (working drawings)" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.65, marginBottom: 12 }}>
          Two plots × three wings each — <b style={{ color: C.text }}>Plot 1 (Wings A·B·C)</b> and <b style={{ color: C.text }}>Plot 2 (Wings D·E·F)</b> — over Ground, First, Second, Third + Terrace. Plate area: Ground & First ≈ 21,918 sq ft/wing; Second & Third ≈ 26,310 sq ft/wing. Structural: PCPL Nagpur · MEP / Fire / Plumbing: Jhaveri Associates. Tap any sheet to view full size.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <a href={PLAN_ASSET("KKBP-floor-plans.pdf")} target="_blank" rel="noreferrer" download style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${C.gold}18`, color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}><FileText size={14} /> Full plan set (PDF)</a>
          <a href={PLAN_ASSET("KKBP-all-floors.dwg")} target="_blank" rel="noreferrer" download style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: C.blue, border: `1px solid ${C.blue}55`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}><Download size={14} /> CAD source (DWG)</a>
        </div>
        {["Plot 1 — Wings A · B · C", "Plot 2 — Wings D · E · F"].map((plot) => (
          <div key={plot} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.mute, marginBottom: 8 }}>{plot}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {PLAN_SHEETS.filter((s) => s.plot === plot).map((s) => (
                <div key={s.img} onClick={() => setLightbox(s)} style={{ cursor: "pointer", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  <img src={PLAN_ASSET(s.img + ".thumb.png")} alt={`${s.plot} — ${s.floor}`} loading="lazy" style={{ width: "100%", display: "block", aspectRatio: "1.414", objectFit: "cover", objectPosition: "top" }} />
                  <div style={{ padding: "7px 10px", fontSize: 12, color: C.text, background: C.panel2, borderTop: `1px solid ${C.line}` }}>{s.floor}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TSTATUS.map((st) => <Badge key={st} text={st} color={TSTATUS_COLOR[st]} />)}
        <Badge text="Unassigned" color={C.faint} />
        <div style={{ flex: 1 }} />
        {canWrite && <Btn small onClick={() => setEdit(blankZone())}><Plus size={13} /> Add zone</Btn>}
      </div>

      <Card pad={20}>
        {[...FLOORS].reverse().map((f) => {
          const zones = state.zones.filter((z) => z.floor === f);
          const floorArea = zones.reduce((s, z) => s + (+z.areaSft || 0), 0);
          return (
            <div key={f} style={{ display: "flex", alignItems: "stretch", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 96, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: SERIF, fontSize: 14, color: C.text }}>{f}</div>
                <div style={{ fontSize: 10, color: C.faint, ...NUM }}>{floorArea ? fmtSft(floorArea) : "—"}</div>
              </div>
              <div style={{ flex: 1, display: "flex", gap: 4, minHeight: 52, width: `${(floorArea / maxFloorArea) * 100}%` }}>
                {zones.length === 0 && <div style={{ flex: 1, border: `1px dashed ${C.line}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.faint }}>No zones defined</div>}
                {zones.map((z) => {
                  const col = zoneColor(z);
                  const tn = t.find((x) => x.id === z.tenantId);
                  const w = ((+z.areaSft || 1) / Math.max(1, floorArea)) * 100;
                  return (
                    <div key={z.id} onClick={() => setSelZone(z)} title={z.name} style={{
                      width: `${w}%`, minWidth: 26, cursor: "pointer", borderRadius: 6, padding: "6px 8px",
                      background: `${col}1E`, border: `1px solid ${col}66`, overflow: "hidden",
                      display: "flex", flexDirection: "column", justifyContent: "center",
                      outline: selZone?.id === z.id ? `2px solid ${C.gold}` : "none",
                    }}>
                      <div style={{ fontSize: 11, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.name}</div>
                      <div style={{ fontSize: 9, color: col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...NUM }}>{tn ? tn.name : "Unassigned"} · {(+z.areaSft / 1000).toFixed(0)}k</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      {selZone && (() => {
        const z = state.zones.find((x) => x.id === selZone.id) || selZone;
        const tn = t.find((x) => x.id === z.tenantId);
        return (
          <Card title={`Zone — ${z.name}`} style={{ marginTop: 14 }} right={canWrite && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small ghost onClick={() => setEdit({ ...z })}><Pencil size={12} /> Edit</Btn>
              <Btn small ghost tone={C.red} onClick={() => del(z.id)}><Trash2 size={12} /> Delete</Btn>
            </div>
          )}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 13 }}>
              <div><div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase" }}>Floor</div><div style={{ color: C.text, marginTop: 3 }}>{z.floor}</div></div>
              <div><div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase" }}>Area</div><div style={{ color: C.text, marginTop: 3, ...NUM }}>{fmtSft(z.areaSft)}</div></div>
              <div><div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase" }}>Use</div><div style={{ color: C.text, marginTop: 3 }}>{z.use}</div></div>
              <div><div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase" }}>Tenant</div><div style={{ color: C.text, marginTop: 3 }}>{tn ? `${tn.name} (${tn.status})` : "Unassigned"}</div></div>
              {tn && <div><div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase" }}>Income</div><div style={{ color: C.gold, marginTop: 3, ...NUM }}>{fmtL(tenantMonthlyL(tn))}/mo</div></div>}
            </div>
          </Card>
        );
      })()}

      {edit && (
        <Modal title={edit.id ? `Edit zone — ${edit.name}` : "Add zone"} onClose={() => setEdit(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Zone name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Floor"><Sel value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })} options={FLOORS} /></Field>
            <Field label="Area (sft)"><Inp type="number" value={edit.areaSft} onChange={(e) => setEdit({ ...edit, areaSft: e.target.value })} /></Field>
            <Field label="Use"><Sel value={edit.use} onChange={(e) => setEdit({ ...edit, use: e.target.value })} options={[...TENANT_CATS, "Services"]} /></Field>
            <Field label="Assigned tenant">
              <select value={edit.tenantId || ""} onChange={(e) => setEdit({ ...edit, tenantId: e.target.value || null })} style={inputSt}>
                <option value="">— Unassigned —</option>
                {t.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.name}>Save zone</Btn>
          </div>
        </Modal>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "#000D", zIndex: 60, display: "flex", flexDirection: "column", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff", marginBottom: 10, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontSize: 16 }}>{lightbox.floor}</div>
              <div style={{ fontSize: 12, color: "#bbb" }}>{lightbox.plot}</div>
            </div>
            <a href={PLAN_ASSET(lightbox.img + ".png")} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", border: "1px solid #fff5", borderRadius: 8, padding: "6px 12px", fontSize: 13, textDecoration: "none" }}><Search size={14} /> Open full resolution</a>
            <X size={26} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setLightbox(null)} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#fff", borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
            <img src={PLAN_ASSET(lightbox.img + ".png")} alt={lightbox.floor} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= ADMIN & COMPLIANCE ================= */
const blankComp = () => ({ id: "", name: "", authority: "", due: "", status: "Open", owner: "Admin Head", type: "Statutory" });
const blankVendor = () => ({ id: "", name: "", scope: "", contractL: 0, cycle: "Monthly", status: "To Appoint", owner: "Admin Head" });
const COMP_STATUS = ["Open", "Applied", "In Process", "Done"];
const COMP_COLOR = { Open: C.red, Applied: C.amber, "In Process": C.blue, Done: C.green };
const VEND_STATUS = ["To Appoint", "Shortlisted", "Contracted", "Active"];
const VEND_COLOR = { "To Appoint": C.red, Shortlisted: C.amber, Contracted: C.blue, Active: C.green };

function AdminOps({ state, setState, canWrite }) {
  const [tab, setTab] = useState("compliance");
  const [editC, setEditC] = useState(null);
  const [editV, setEditV] = useState(null);
  const saveC = () => {
    const rec = { ...editC, id: editC.id || uid() };
    setState((s) => ({ ...s, compliance: editC.id ? s.compliance.map((c) => (c.id === editC.id ? rec : c)) : [...s.compliance, rec] }));
    setEditC(null);
  };
  const saveV = () => {
    const rec = { ...editV, id: editV.id || uid() };
    setState((s) => ({ ...s, vendors: editV.id ? s.vendors.map((v) => (v.id === editV.id ? rec : v)) : [...s.vendors, rec] }));
    setEditV(null);
  };
  const tabs = [["compliance", "Licences & Compliance"], ["vendors", "Vendors & AMCs"]];
  return (
    <div>
      <SectionTitle eyebrow="Administration" title="Admin & Compliance" sub="Statutory licences that gate the launch, plus the vendor and AMC backbone of mall operations." />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? C.panel2 : "transparent", color: tab === k ? C.text : C.mute, border: `1px solid ${tab === k ? C.gold : C.line}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        {canWrite && (tab === "compliance"
          ? <Btn onClick={() => setEditC(blankComp())}><Plus size={14} /> Add item</Btn>
          : <Btn onClick={() => setEditV(blankVendor())}><Plus size={14} /> Add vendor</Btn>)}
      </div>

      {tab === "compliance" && (
        <Card pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead><tr><Th>Item</Th><Th>Authority</Th><Th>Type</Th><Th>Due</Th><Th>Owner</Th><Th>Status</Th>{canWrite && <Th right>Actions</Th>}</tr></thead>
              <tbody>
                {state.compliance.map((c) => (
                  <tr key={c.id}>
                    <Td style={{ fontWeight: 600 }}>{c.name}</Td>
                    <Td style={{ color: C.mute }}>{c.authority}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{c.type}</Td>
                    <Td style={isOverdue(c.due, c.status === "Done") ? { color: C.red, fontSize: 12, fontWeight: 700 } : { color: C.mute, fontSize: 12 }}>{c.due || "—"}{isOverdue(c.due, c.status === "Done") ? " ⚠" : ""}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{c.owner}</Td>
                    <Td><Badge text={c.status} color={COMP_COLOR[c.status]} /></Td>
                    {canWrite && <Td right>
                      <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEditC({ ...c })} />
                      <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => { if (confirm("Delete item?")) setState((s) => ({ ...s, compliance: s.compliance.filter((x) => x.id !== c.id) })); }} />
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "vendors" && (
        <Card pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead><tr><Th>Vendor / contract</Th><Th>Scope</Th><Th right>Value</Th><Th>Cycle</Th><Th>Status</Th>{canWrite && <Th right>Actions</Th>}</tr></thead>
              <tbody>
                {state.vendors.map((v) => (
                  <tr key={v.id}>
                    <Td style={{ fontWeight: 600 }}>{v.name}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{v.scope}</Td>
                    <Td right>{fmtL(v.contractL)}<span style={{ color: C.faint, fontSize: 11 }}>/{v.cycle === "Monthly" ? "mo" : "yr"}</span></Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{v.cycle}</Td>
                    <Td><Badge text={v.status} color={VEND_COLOR[v.status]} /></Td>
                    {canWrite && <Td right>
                      <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEditV({ ...v })} />
                      <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => { if (confirm("Delete vendor?")) setState((s) => ({ ...s, vendors: s.vendors.filter((x) => x.id !== v.id) })); }} />
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editC && (
        <Modal title={editC.id ? `Edit — ${editC.name}` : "Add compliance item"} onClose={() => setEditC(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Item"><Inp value={editC.name} onChange={(e) => setEditC({ ...editC, name: e.target.value })} /></Field>
            <Field label="Authority"><Inp value={editC.authority} onChange={(e) => setEditC({ ...editC, authority: e.target.value })} /></Field>
            <Field label="Type"><Sel value={editC.type} onChange={(e) => setEditC({ ...editC, type: e.target.value })} options={["Statutory", "Commercial", "Internal"]} /></Field>
            <Field label="Due date"><Inp type="date" value={editC.due} onChange={(e) => setEditC({ ...editC, due: e.target.value })} /></Field>
            <Field label="Owner"><Inp value={editC.owner} onChange={(e) => setEditC({ ...editC, owner: e.target.value })} /></Field>
            <Field label="Status"><Sel value={editC.status} onChange={(e) => setEditC({ ...editC, status: e.target.value })} options={COMP_STATUS} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditC(null)}>Cancel</Btn>
            <Btn onClick={saveC} disabled={!editC.name}>Save item</Btn>
          </div>
        </Modal>
      )}
      {editV && (
        <Modal title={editV.id ? `Edit — ${editV.name}` : "Add vendor"} onClose={() => setEditV(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Vendor / contract"><Inp value={editV.name} onChange={(e) => setEditV({ ...editV, name: e.target.value })} /></Field>
            <Field label="Scope"><Inp value={editV.scope} onChange={(e) => setEditV({ ...editV, scope: e.target.value })} /></Field>
            <Field label="Value (₹L)"><Inp type="number" value={editV.contractL} onChange={(e) => setEditV({ ...editV, contractL: e.target.value })} /></Field>
            <Field label="Cycle"><Sel value={editV.cycle} onChange={(e) => setEditV({ ...editV, cycle: e.target.value })} options={["Monthly", "Yearly", "One-time"]} /></Field>
            <Field label="Status"><Sel value={editV.status} onChange={(e) => setEditV({ ...editV, status: e.target.value })} options={VEND_STATUS} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditV(null)}>Cancel</Btn>
            <Btn onClick={saveV} disabled={!editV.name}>Save vendor</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= DRAWINGS & RFIs ================= */
const blankDrawing = () => ({ id: "", code: "", title: "", discipline: "Architecture", rev: "R0", status: "Concept", date: "" });
const blankRfi = () => ({ id: "", title: "", raisedBy: "", assignedTo: "", priority: "Medium", status: "Open", date: "" });
const DWG_STATUS = ["Concept", "For Review", "Approved", "GFC Issued", "Superseded"];
const DWG_COLOR = { Concept: C.faint, "For Review": C.amber, Approved: C.blue, "GFC Issued": C.green, Superseded: C.red };
const RFI_COLOR = { Open: C.red, Answered: C.blue, Closed: C.green };

function Drawings({ state, setState, canWrite }) {
  const [editD, setEditD] = useState(null);
  const [editR, setEditR] = useState(null);
  const saveD = () => {
    const rec = { ...editD, id: editD.id || uid() };
    setState((s) => ({ ...s, drawings: editD.id ? s.drawings.map((d) => (d.id === editD.id ? rec : d)) : [...s.drawings, rec] }));
    setEditD(null);
  };
  const saveR = () => {
    const rec = { ...editR, id: editR.id || uid() };
    setState((s) => ({ ...s, rfis: editR.id ? s.rfis.map((r) => (r.id === editR.id ? rec : r)) : [...s.rfis, rec] }));
    setEditR(null);
  };
  return (
    <div>
      <SectionTitle eyebrow="Design" title="Drawings & RFIs" sub="Drawing register with revision control, plus requests-for-information between site and design. RFI turnaround target: 5 working days." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <Card title="Drawing register" right={canWrite && <Btn small onClick={() => setEditD(blankDrawing())}><Plus size={12} /> Add</Btn>} pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <thead><tr><Th>Drawing</Th><Th>Disc.</Th><Th>Rev</Th><Th>Status</Th>{canWrite && <Th right></Th>}</tr></thead>
              <tbody>
                {state.drawings.map((d) => (
                  <tr key={d.id}>
                    <Td><div style={{ fontSize: 11, color: C.gold, ...NUM }}>{d.code}</div><div style={{ fontSize: 12 }}>{d.title}</div></Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{d.discipline}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{d.rev}</Td>
                    <Td><Badge text={d.status} color={DWG_COLOR[d.status]} /></Td>
                    {canWrite && <Td right>
                      <Pencil size={13} color={C.mute} style={{ cursor: "pointer", marginRight: 10 }} onClick={() => setEditD({ ...d })} />
                      <Trash2 size={13} color={C.red} style={{ cursor: "pointer" }} onClick={() => { if (confirm("Delete drawing?")) setState((s) => ({ ...s, drawings: s.drawings.filter((x) => x.id !== d.id) })); }} />
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="RFIs" right={canWrite && <Btn small onClick={() => setEditR(blankRfi())}><Plus size={12} /> Raise RFI</Btn>} pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <thead><tr><Th>RFI</Th><Th>To</Th><Th>Priority</Th><Th>Status</Th>{canWrite && <Th right></Th>}</tr></thead>
              <tbody>
                {state.rfis.map((r) => (
                  <tr key={r.id}>
                    <Td><div style={{ fontSize: 12 }}>{r.title}</div><div style={{ fontSize: 11, color: C.faint }}>by {r.raisedBy} · {r.date}</div></Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{r.assignedTo}</Td>
                    <Td><Badge text={r.priority} color={r.priority === "High" ? C.red : r.priority === "Medium" ? C.amber : C.faint} /></Td>
                    <Td><Badge text={r.status} color={RFI_COLOR[r.status]} /></Td>
                    {canWrite && <Td right>
                      <Pencil size={13} color={C.mute} style={{ cursor: "pointer", marginRight: 10 }} onClick={() => setEditR({ ...r })} />
                      <Trash2 size={13} color={C.red} style={{ cursor: "pointer" }} onClick={() => { if (confirm("Delete RFI?")) setState((s) => ({ ...s, rfis: s.rfis.filter((x) => x.id !== r.id) })); }} />
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {editD && (
        <Modal title={editD.id ? "Edit drawing" : "Add drawing"} onClose={() => setEditD(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Drawing code"><Inp value={editD.code} onChange={(e) => setEditD({ ...editD, code: e.target.value })} placeholder="KKBP-AR-GF-101" /></Field>
            <Field label="Title"><Inp value={editD.title} onChange={(e) => setEditD({ ...editD, title: e.target.value })} /></Field>
            <Field label="Discipline"><Sel value={editD.discipline} onChange={(e) => setEditD({ ...editD, discipline: e.target.value })} options={["Architecture", "Structure", "MEP", "Interiors", "Landscape"]} /></Field>
            <Field label="Revision"><Inp value={editD.rev} onChange={(e) => setEditD({ ...editD, rev: e.target.value })} /></Field>
            <Field label="Status"><Sel value={editD.status} onChange={(e) => setEditD({ ...editD, status: e.target.value })} options={DWG_STATUS} /></Field>
            <Field label="Date"><Inp type="date" value={editD.date} onChange={(e) => setEditD({ ...editD, date: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditD(null)}>Cancel</Btn>
            <Btn onClick={saveD} disabled={!editD.title}>Save drawing</Btn>
          </div>
        </Modal>
      )}
      {editR && (
        <Modal title={editR.id ? "Edit RFI" : "Raise RFI"} onClose={() => setEditR(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Title"><Inp value={editR.title} onChange={(e) => setEditR({ ...editR, title: e.target.value })} /></Field>
            <Field label="Raised by"><Inp value={editR.raisedBy} onChange={(e) => setEditR({ ...editR, raisedBy: e.target.value })} /></Field>
            <Field label="Assigned to"><Inp value={editR.assignedTo} onChange={(e) => setEditR({ ...editR, assignedTo: e.target.value })} /></Field>
            <Field label="Priority"><Sel value={editR.priority} onChange={(e) => setEditR({ ...editR, priority: e.target.value })} options={["High", "Medium", "Low"]} /></Field>
            <Field label="Status"><Sel value={editR.status} onChange={(e) => setEditR({ ...editR, status: e.target.value })} options={["Open", "Answered", "Closed"]} /></Field>
            <Field label="Date"><Inp type="date" value={editR.date} onChange={(e) => setEditR({ ...editR, date: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditR(null)}>Cancel</Btn>
            <Btn onClick={saveR} disabled={!editR.title}>Save RFI</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ================= MARKETING STUDIO ================= */
const blankCampaign = () => ({ id: "", name: "", phase: "Pre-launch", channel: "", start: "", end: "", budgetL: 0, spentL: 0, status: "Planned", owner: "Marketing Head", kpi: "" });
const MPHASES = ["Pre-launch","Launch","Post-launch","Always-on"];
const MSTATUS = ["Planned","In Progress","Complete","On Hold"];
const MSTATUS_COLOR = { Planned: C.faint, "In Progress": C.amber, Complete: C.green, "On Hold": C.red };
const blankContent = (u, users) => ({ id: "", title: "", type: CONTENT_TYPES[0], campaign: "", assigneeId: (users.find((x) => x.dept === "marketing" && x.id !== u.id) || u).id, due: "", status: "Brief", brief: "", link: "" });

function MarketingStudio({ state, setState, user }) {
  const ext = isExternal(user);
  const head = isOwner(user) || (user.dept === "marketing" && isHead(user));
  const internalMkt = user.dept === "marketing" && !ext;
  const canManageCampaigns = head;
  const canBrief = isOwner(user) || internalMkt;
  const [tab, setTab] = useState(ext ? "content" : "campaigns");
  const [editC, setEditC] = useState(null);
  const [editK, setEditK] = useState(null);

  const budget = state.campaigns.reduce((s, c) => s + (+c.budgetL || 0), 0);
  const spent = state.campaigns.reduce((s, c) => s + (+c.spentL || 0), 0);
  const saveC = () => {
    const rec = { ...editC, id: editC.id || uid() };
    setState((s) => ({ ...s, campaigns: editC.id ? s.campaigns.map((c) => (c.id === editC.id ? rec : c)) : [...s.campaigns, rec] }));
    setEditC(null);
  };
  const saveK = () => {
    const isNew = !editK.id;
    const rec = { ...editK, id: editK.id || uid() };
    setState((s) => withLog(
      { ...s, content: isNew ? [...s.content, rec] : s.content.map((c) => (c.id === rec.id ? rec : c)) },
      user.name, `${isNew ? "briefed" : "updated"} content “${rec.title}” → ${uName(state, rec.assigneeId)}`));
    setEditK(null);
  };
  const moveK = (c, status) => setState((s) => withLog(
    { ...s, content: s.content.map((x) => (x.id === c.id ? { ...x, status } : x)) },
    user.name, `moved content “${c.title}” to ${status}`));
  const visibleContent = ext ? state.content.filter((c) => c.assigneeId === user.id) : state.content;
  const mktUsers = state.users.filter((u2) => u2.dept === "marketing");
  const nextStates = (c) => {
    if (head) return CONTENT_STATUS.filter((x) => x !== c.status);
    if (ext && c.assigneeId === user.id) return ["In Production","Internal Review"].filter((x) => x !== c.status);
    if (internalMkt) return CONTENT_STATUS.filter((x) => !["Approved","Published"].includes(x) && x !== c.status);
    return [];
  };
  const sorted = [...state.campaigns].sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  const tabs = [...(!ext ? [["campaigns","Campaigns"]] : []), ["content","Content Studio"], ["partners","Team & Partners"]];
  return (
    <div>
      <SectionTitle eyebrow="Marketing" title="Marketing Studio" sub={ext ? "Your briefs and deliverables. Move work to Internal Review when ready — the Marketing Head approves and publishes." : `Campaigns carry the budget; the Content Studio carries every deliverable from brief to published — in-house team, INIT and OCDS all work here.`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? C.panel2 : "transparent", color: tab === k ? C.text : C.mute, border: `1px solid ${tab === k ? C.gold : C.line}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>{l}</button>
        ))}
      </div>

      {tab === "campaigns" && !ext && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
            <KPI label="Campaign budget" value={fmtL(budget)} sub={`${state.campaigns.length} campaigns`} tone={C.rose} />
            <KPI label="Spent" value={fmtL(spent)} sub={`${Math.round((spent / Math.max(1, budget)) * 100)}% of budget`} tone={C.amber} />
            <KPI label="Live now" value={state.campaigns.filter((c) => c.status === "In Progress").length} sub="in market" tone={C.green} />
            <KPI label="Studio WIP" value={state.content.filter((c) => !["Approved","Published"].includes(c.status)).length} sub="content items in flight" tone={C.blue} />
          </div>
          {canManageCampaigns && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn onClick={() => setEditC(blankCampaign())}><Plus size={14} /> Add campaign</Btn>
          </div>}
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((c) => (
              <Card key={c.id} pad={14}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 15, color: C.text }}>{c.name}</span>
                      <Badge text={c.phase} color={C.rose} />
                      <Badge text={c.status} color={MSTATUS_COLOR[c.status]} />
                    </div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span><CalendarDays size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{c.start || "TBD"} → {c.end || "TBD"}</span>
                      <span>{c.channel}</span>
                      {c.kpi && <span style={{ color: C.gold }}>KPI: {c.kpi}</span>}
                    </div>
                  </div>
                  <div style={{ width: 180 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mute, marginBottom: 4 }}>
                      <span>Burn</span><span style={NUM}>{fmtL(c.spentL)} / {fmtL(c.budgetL)}</span>
                    </div>
                    <Bar_ pct={((+c.spentL || 0) / Math.max(1, +c.budgetL || 0)) * 100} tone={C.rose} />
                  </div>
                  {canManageCampaigns && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Pencil size={14} color={C.mute} style={{ cursor: "pointer" }} onClick={() => setEditC({ ...c })} />
                    <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => { if (confirm("Delete campaign?")) setState((s) => ({ ...s, campaigns: s.campaigns.filter((x) => x.id !== c.id) })); }} />
                  </div>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "content" && (
        <div>
          {canBrief && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn onClick={() => setEditK(blankContent(user, state.users))}><Plus size={14} /> New brief</Btn>
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {CONTENT_STATUS.map((st) => (
              <div key={st}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge text={st} color={CONTENT_COLOR[st]} />
                  <span style={{ fontSize: 11, color: C.faint }}>{visibleContent.filter((c) => c.status === st).length}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {visibleContent.filter((c) => c.status === st).map((c) => (
                    <div key={c.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{c.title}</div>
                        {(head || (internalMkt && !["Approved","Published"].includes(c.status))) && <Pencil size={12} color={C.mute} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setEditK({ ...c })} />}
                      </div>
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{c.type} · {uName(state, c.assigneeId)}{c.due && <span style={isOverdue(c.due, ["Approved","Published"].includes(c.status)) ? { color: C.red, fontWeight: 700 } : undefined}> · due {c.due}{isOverdue(c.due, ["Approved","Published"].includes(c.status)) ? " · OVERDUE" : ""}</span>}</div>
                      {c.campaign && <div style={{ fontSize: 10.5, color: C.rose, marginTop: 3 }}>{c.campaign}</div>}
                      {c.brief && <div style={{ fontSize: 11.5, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>{c.brief}</div>}
                      {c.link && <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4 }}><LinkIcon size={11} /> Deliverable</a>}
                      {nextStates(c).length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                          {nextStates(c).map((x) => (
                            <button key={x} onClick={() => moveK(c, x)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 6, padding: "3px 8px", fontSize: 10.5, cursor: "pointer", fontFamily: SANS }}>→ {x}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {visibleContent.filter((c) => c.status === st).length === 0 && <div style={{ border: `1px dashed ${C.line}`, borderRadius: 9, padding: 12, fontSize: 11, color: C.faint, textAlign: "center" }}>Empty</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "partners" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {[
            ["In-house", mktUsers.filter((u2) => !isExternal(u2))],
            ["INIT Design Studio — brand & creative", mktUsers.filter((u2) => u2.subRole.startsWith("INIT"))],
            ["OCDS Design Studio — digital media", mktUsers.filter((u2) => u2.subRole.startsWith("OCDS"))],
          ].map(([label, group]) => (
            <Card key={label} title={label}>
              {group.map((u2) => (
                <div key={u2.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.rose}22`, border: `1px solid ${C.rose}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.rose }}>{u2.name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text }}>{u2.name}</div>
                    <div style={{ fontSize: 11, color: C.faint }}>{u2.subRole}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: C.mute, ...NUM }}>
                    {state.content.filter((c) => c.assigneeId === u2.id && !["Approved","Published"].includes(c.status)).length} WIP
                  </div>
                </div>
              ))}
              {group.length === 0 && <Empty text="No members." />}
            </Card>
          ))}
        </div>
      )}

      {editC && (
        <Modal title={editC.id ? `Edit — ${editC.name}` : "Add campaign"} onClose={() => setEditC(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Campaign name"><Inp value={editC.name} onChange={(e) => setEditC({ ...editC, name: e.target.value })} /></Field>
            <Field label="Phase"><Sel value={editC.phase} onChange={(e) => setEditC({ ...editC, phase: e.target.value })} options={MPHASES} /></Field>
            <Field label="Channel"><Inp value={editC.channel} onChange={(e) => setEditC({ ...editC, channel: e.target.value })} placeholder="OOH, Digital, PR…" /></Field>
            <Field label="Status"><Sel value={editC.status} onChange={(e) => setEditC({ ...editC, status: e.target.value })} options={MSTATUS} /></Field>
            <Field label="Start"><Inp type="date" value={editC.start} onChange={(e) => setEditC({ ...editC, start: e.target.value })} /></Field>
            <Field label="End"><Inp type="date" value={editC.end} onChange={(e) => setEditC({ ...editC, end: e.target.value })} /></Field>
            <Field label="Budget (₹L)"><Inp type="number" value={editC.budgetL} onChange={(e) => setEditC({ ...editC, budgetL: e.target.value })} /></Field>
            <Field label="Spent (₹L)"><Inp type="number" value={editC.spentL} onChange={(e) => setEditC({ ...editC, spentL: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="KPI"><Inp value={editC.kpi} onChange={(e) => setEditC({ ...editC, kpi: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditC(null)}>Cancel</Btn>
            <Btn onClick={saveC} disabled={!editC.name}>Save campaign</Btn>
          </div>
        </Modal>
      )}
      {editK && (
        <Modal title={editK.id ? "Edit content item" : "New brief"} onClose={() => setEditK(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Title"><Inp value={editK.title} onChange={(e) => setEditK({ ...editK, title: e.target.value })} /></Field>
            <Field label="Type"><Sel value={editK.type} onChange={(e) => setEditK({ ...editK, type: e.target.value })} options={CONTENT_TYPES} /></Field>
            <Field label="Campaign">
              <select value={editK.campaign} onChange={(e) => setEditK({ ...editK, campaign: e.target.value })} style={inputSt}>
                <option value="">— None —</option>
                {state.campaigns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Assignee (team / agency)">
              <select value={editK.assigneeId} onChange={(e) => setEditK({ ...editK, assigneeId: e.target.value })} style={inputSt}>
                {mktUsers.map((u2) => <option key={u2.id} value={u2.id}>{u2.name} — {u2.subRole}</option>)}
              </select>
            </Field>
            <Field label="Due"><Inp type="date" value={editK.due} onChange={(e) => setEditK({ ...editK, due: e.target.value })} /></Field>
            <Field label="Status"><Sel value={editK.status} onChange={(e) => setEditK({ ...editK, status: e.target.value })} options={CONTENT_STATUS} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Brief"><Ta value={editK.brief} onChange={(e) => setEditK({ ...editK, brief: e.target.value })} /></Field></div>
          <div style={{ marginTop: 12 }}><Field label="Deliverable link (Drive / Figma / etc.)"><Inp value={editK.link} onChange={(e) => setEditK({ ...editK, link: e.target.value })} placeholder="https://…" /></Field></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditK(null)}>Cancel</Btn>
            <Btn onClick={saveK} disabled={!editK.title}>Save item</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= DOCUMENTS ================= */
function Documents({ state, setState, user }) {
  const [edit, setEdit] = useState(null);
  const [cat, setCat] = useState("All");
  const ext = isExternal(user);
  const visible = state.docs.filter((d) =>
    (cat === "All" || d.category === cat) &&
    (ext ? d.dept === user.dept : true)
  );
  const save = () => {
    const rec = { ...edit, id: edit.id || uid(), addedById: edit.addedById || user.id, date: edit.date || today() };
    setState((s) => withLog(
      { ...s, docs: edit.id ? s.docs.map((d) => (d.id === edit.id ? rec : d)) : [rec, ...s.docs] },
      user.name, `filed document “${rec.name}”`));
    setEdit(null);
  };
  const del = (id) => { if (confirm("Remove this document entry?")) setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) })); };
  const canAdd = true; /* everyone files into their own dept; externals their deliverables */
  return (
    <div>
      <SectionTitle eyebrow="Records" title="Documents" sub="The index of record — agreements, bank files, drawings, brand assets, licences. Paste the Drive/storage link; the index lives here." />
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Sel value={cat} onChange={(e) => setCat(e.target.value)} options={["All", ...DOC_CATS]} style={{ width: 240 }} />
        <div style={{ flex: 1 }} />
        {canAdd && <Btn onClick={() => setEdit({ name: "", dept: ext ? user.dept : (isExec(user) ? "exec" : user.dept), category: DOC_CATS[0], url: "" })}><Plus size={14} /> File document</Btn>}
      </div>
      <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead><tr><Th>Document</Th><Th>Category</Th><Th>Dept</Th><Th>Filed by</Th><Th>Date</Th><Th>Link</Th><Th right>Actions</Th></tr></thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id}>
                  <Td style={{ fontWeight: 600 }}>{d.name}{d.summary ? <div style={{ fontWeight: 400, fontSize: 11.5, color: C.faint, marginTop: 2, maxWidth: 360, lineHeight: 1.4 }}>{d.summary}</div> : null}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{d.category}</Td>
                  <Td><Badge text={DEPTS[d.dept]?.short || d.dept} color={DEPTS[d.dept]?.accent || C.faint} /></Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{uName(state, d.addedById)}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{d.date}</Td>
                  <Td>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><LinkIcon size={11} /> Open</a> : <span style={{ color: C.faint, fontSize: 12 }}>No link</span>}</Td>
                  <Td right>
                    {(isOwner(user) || d.addedById === user.id) && <>
                      <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEdit({ ...d })} />
                      <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(d.id)} />
                    </>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <Empty text="No documents in this view yet. File the first one." />}
        </div>
      </Card>
      {edit && (
        <Modal title={edit.id ? "Edit document entry" : "File document"} onClose={() => setEdit(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Document name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Category"><Sel value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={DOC_CATS} /></Field>
            <Field label="Department">
              <select value={edit.dept} onChange={(e) => setEdit({ ...edit, dept: e.target.value })} style={inputSt} disabled={isExternal(user)}>
                {Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Link (Drive / URL)"><Inp value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://…" /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.name}>Save entry</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= MEETINGS — AI NOTETAKER (Plaud-style) ================= */
const fmtClock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

async function analyzeMeeting(transcriptText, roster, meta, apiKey) {
  const rosterTxt = roster.map((u) => `- id:${u.id} | ${u.name} | ${u.subRole} | dept:${u.dept}`).join("\n");
  const prompt = `You are the AI meeting notetaker for Karan Kothari Business Park (KKBP), a mall under development in North Nagpur, India. Today is ${new Date().toISOString().slice(0, 10)}.

MEETING: "${meta.title}" on ${meta.date}. Participants (internal roster below; transcript may also mention guests).

TEAM ROSTER (assign action items ONLY to these ids; pick the best match by name/role; if unclear use the department head):
${rosterTxt}

TRANSCRIPT (lines may start with [mm:ss] timestamps):
${transcriptText.slice(0, 24000)}

Return ONLY valid JSON, no markdown fences, no preamble, exactly this shape:
{
 "summary": "6-10 sentence executive summary in plain prose",
 "decisions": [{"time":"mm:ss or empty","text":"decision taken"}],
 "actions": [{"title":"imperative action item","assigneeId":"roster id","due":"YYYY-MM-DD or empty","priority":"High|Medium|Low","time":"mm:ss or empty"}],
 "risks": ["open question or risk"],
 "highlights": [{"userId":"roster id","note":"1-2 sentence personal digest: what this specific person must know or do from this meeting"}]
}
Rules: every action needs an assigneeId from the roster. Infer due dates from phrases like "by Friday" relative to today. Create a highlight for each participant who has anything relevant. Keep arrays empty if nothing applies.`;

  const headers = { "Content-Type": "application/json" };
  if (!IS_CLOUD) {
    if (!apiKey) throw new Error("NEED_KEY");
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  if (res.status === 401 || res.status === 403) throw new Error("NEED_KEY");
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function MeetingStudio({ state, setState, user }) {
  const [view, setView] = useState("list"); // list | record | review | detail
  const [detailId, setDetailId] = useState(null);
  const [editMom, setEditMom] = useState(null);

  /* --- recorder state --- */
  const [meta, setMeta] = useState({ title: "", dept: isExec(user) ? "exec" : user.dept, participantIds: [user.id], guests: "" });
  const [recState, setRecState] = useState("idle"); // idle | live | paused | stopped
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState([]); // {t, text}
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [micErr, setMicErr] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const recRef = React.useRef({});

  /* --- AI review state --- */
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const effKey = (state.aiKey || "").trim(); /* the one team key — no per-user keys */
  const [proposal, setProposal] = useState(null); // {summary,decisions,actions:[{...include:true}],risks,highlights}

  const resetRecorder = () => {
    setMeta({ title: "", dept: isExec(user) ? "exec" : user.dept, participantIds: [user.id], guests: "" });
    setRecState("idle"); setElapsed(0); setSegments([]); setManualMode(false); setManualText("");
    setMicErr(""); setAudioUrl(null); setProposal(null); setAiErr("");
  };

  const startRecording = async () => {
    setMicErr("");
    const r = recRef.current;
    r.startTs = Date.now() - elapsed * 1000;
    /* timer */
    r.timer = setInterval(() => setElapsed(Math.floor((Date.now() - r.startTs) / 1000)), 500);
    /* audio (best effort) */
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      r.stream = stream;
      r.chunks = r.chunks || [];
      r.mr = new MediaRecorder(stream);
      r.mr.ondataavailable = (e) => { if (e.data.size) r.chunks.push(e.data); };
      r.mr.start();
    } catch (e) {
      setMicErr(IS_CLOUD
        ? "The claude.ai sandbox blocks microphone access — this is a platform restriction, not a bug. Three ways that work: (1) On mobile, tap into the manual box below and use your keyboard's mic/dictation button — the OS transcribes live, right into the app. (2) Record on Plaud or your phone's recorder and paste the transcript. (3) Best: deploy the standalone build of this app (ask Rishi/Owner for the link) — mic and live transcription work fully there."
        : "Microphone permission denied or unavailable. Allow mic access in the browser (padlock icon → Site settings → Microphone), make sure you're on HTTPS, then hit Start again. You can also use the manual box below.");
      setManualMode(true);
    }
    /* speech recognition (best effort) */
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true; rec.interimResults = false; rec.lang = "en-IN";
        rec.onresult = (ev) => {
          const t = fmtClock(Math.floor((Date.now() - r.startTs) / 1000));
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const txt = ev.results[i][0].transcript.trim();
            if (txt) setSegments((s) => [...s, { t, text: txt }]);
          }
        };
        rec.onerror = () => {};
        rec.onend = () => { if (recRef.current.keepAlive) { try { rec.start(); } catch (e) {} } };
        r.sr = rec; r.keepAlive = true;
        rec.start();
      }
    } catch (e) {}
    setRecState("live");
  };
  const pauseRecording = () => {
    const r = recRef.current;
    clearInterval(r.timer); r.keepAlive = false;
    try { r.sr && r.sr.stop(); } catch (e) {}
    try { r.mr && r.mr.state === "recording" && r.mr.pause(); } catch (e) {}
    setRecState("paused");
  };
  const resumeRecording = () => {
    try { recRef.current.mr && recRef.current.mr.state === "paused" && recRef.current.mr.resume(); } catch (e) {}
    startRecording();
  };
  const stopRecording = () => {
    const r = recRef.current;
    clearInterval(r.timer); r.keepAlive = false;
    try { r.sr && r.sr.stop(); } catch (e) {}
    try {
      if (r.mr && r.mr.state !== "inactive") {
        r.mr.onstop = () => {
          const blob = new Blob(r.chunks || [], { type: "audio/webm" });
          if (blob.size) setAudioUrl(URL.createObjectURL(blob));
        };
        r.mr.stop();
      }
      r.stream && r.stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    setRecState("stopped");
  };
  const goReview = () => {
    const live = segments.map((s) => `[${s.t}] ${s.text}`).join("\n");
    setTranscriptDraft([live, manualText].filter(Boolean).join("\n"));
    setView("review");
  };

  const runAI = async () => {
    setAiBusy(true); setAiErr("");
    try {
      const roster = state.users;
      const out = await analyzeMeeting(transcriptDraft, roster, { title: meta.title || "KKBP meeting", date: today() }, effKey);
      const validIds = new Set(roster.map((u) => u.id));
      setProposal({
        summary: out.summary || "",
        decisions: (out.decisions || []).filter((d) => d && d.text),
        actions: (out.actions || []).filter((a) => a && a.title).map((a) => ({
          ...a, assigneeId: validIds.has(a.assigneeId) ? a.assigneeId : user.id,
          priority: ["High","Medium","Low"].includes(a.priority) ? a.priority : "Medium",
          include: true,
        })),
        risks: (out.risks || []).filter(Boolean),
        highlights: (out.highlights || []).filter((h) => h && validIds.has(h.userId) && h.note),
      });
    } catch (e) {
      console.error(e);
      if (e.message === "NEED_KEY") {
        setAiErr("AI isn't available right now — the team key is missing or invalid. Rishi enables it centrally; no key is needed from you.");
      } else {
        setAiErr("AI analysis failed (network or parsing). You can retry, or add action items manually below and publish.");
      }
      if (!proposal) setProposal({ summary: "", decisions: [], actions: [], risks: [], highlights: [] });
    }
    setAiBusy(false);
  };

  const publish = () => {
    const mid = uid();
    const chosen = (proposal?.actions || []).filter((a) => a.include && a.title);
    const newTasks = chosen.map((a) => ({
      id: uid(), title: a.title, dept: (state.users.find((u) => u.id === a.assigneeId) || {}).dept || meta.dept,
      assigneeId: a.assigneeId, createdById: user.id, due: a.due || "", priority: a.priority, status: "Open",
      notes: `From meeting “${meta.title}”${a.time ? ` @ ${a.time}` : ""}.`, source: "meeting", meetingId: mid,
    }));
    const rec = {
      id: mid, kind: "ai", title: meta.title || "Untitled meeting", date: today(), dept: meta.dept,
      participantIds: meta.participantIds, guests: meta.guests, recordedById: user.id,
      duration: fmtClock(elapsed), transcript: transcriptDraft,
      summary: proposal?.summary || "", decisions: proposal?.decisions || [],
      risks: proposal?.risks || [], highlights: proposal?.highlights || [], actionTaskIds: newTasks.map((t) => t.id),
    };
    setState((s) => withLog(withLog(
      { ...s, meetings: [rec, ...s.meetings], tasks: [...newTasks, ...s.tasks] },
      "AI Notetaker", `pushed ${newTasks.length} action item${newTasks.length === 1 ? "" : "s"} from “${rec.title}” to individual dashboards`),
      user.name, `published meeting “${rec.title}” (${rec.duration}) with transcript & AI notes`));
    resetRecorder();
    setDetailId(mid); setView("detail");
  };

  /* --- MOM (quick minutes, kept from before) --- */
  const saveMom = () => {
    const rec = { ...editMom, id: editMom.id || uid() };
    setState((s) => withLog(
      { ...s, meetings: editMom.id ? s.meetings.map((m) => (m.id === editMom.id ? rec : m)) : [rec, ...s.meetings] },
      user.name, `minuted “${rec.title}”`));
    setEditMom(null);
  };
  const delMeeting = (id) => { if (confirm("Delete this meeting record?")) setState((s) => ({ ...s, meetings: s.meetings.filter((m) => m.id !== id) })); };

  const list = [...state.meetings].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const toggleP = (id) => setMeta((m) => ({ ...m, participantIds: m.participantIds.includes(id) ? m.participantIds.filter((x) => x !== id) : [...m.participantIds, id] }));

  /* ============ LIST VIEW ============ */
  if (view === "list") return (
    <div>
      <SectionTitle eyebrow="Records" title="Meetings & AI Notes" sub="Record a meeting, get a live transcript, and let the AI notetaker push timestamped decisions and action items straight to each person's dashboard. Quick MOMs still work for informal huddles." />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {!isExternal(user) && <Btn ghost onClick={() => setEditMom({ title: "", date: today(), dept: isExec(user) ? "exec" : user.dept, attendees: "", mom: "", actions: "" })}><NotebookPen size={14} /> Quick MOM</Btn>}
        <Btn onClick={() => { resetRecorder(); setView("record"); }}><Mic size={14} /> Record meeting</Btn>
      </div>
      <div style={{ display: "grid", gap: 10, maxWidth: 880 }}>
        {list.map((m) => m.kind === "ai" ? (
          <Card key={m.id} pad={16}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: `${C.teal}22`, border: `1px solid ${C.teal}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={17} color={C.teal} />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: C.text }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>
                  {m.date} · {m.duration || "—"} · <Badge text={DEPTS[m.dept]?.label || m.dept} color={DEPTS[m.dept]?.accent || C.faint} /> · {(m.participantIds || []).length} participants · {(m.actionTaskIds || []).length} actions pushed
                </div>
                {m.summary && <div style={{ fontSize: 12.5, color: C.mute, marginTop: 7, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.summary}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Btn small ghost onClick={() => { setDetailId(m.id); setView("detail"); }}>Open</Btn>
                {(isOwner(user) || m.recordedById === user.id) && <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => delMeeting(m.id)} />}
              </div>
            </div>
          </Card>
        ) : (
          <Card key={m.id} pad={16}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: C.text }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{m.date} · <Badge text={DEPTS[m.dept]?.label || m.dept} color={DEPTS[m.dept]?.accent || C.faint} /> · {m.attendees}</div>
              </div>
              {(isOwner(user) || (!isExternal(user) && m.dept === user.dept)) && <div style={{ display: "flex", gap: 10 }}>
                <Pencil size={14} color={C.mute} style={{ cursor: "pointer" }} onClick={() => setEditMom({ ...m })} />
                <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => delMeeting(m.id)} />
              </div>}
            </div>
            <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginTop: 10 }}>{m.mom}</div>
            {m.actions && <div style={{ marginTop: 10, background: C.panel3, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Action items</div>
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.actions}</div>
            </div>}
          </Card>
        ))}
        {list.length === 0 && <Card><Empty text="No meetings yet. Hit Record and let the notetaker work." /></Card>}
      </div>
      {editMom && (
        <Modal title={editMom.id ? "Edit MOM" : "Quick MOM"} onClose={() => setEditMom(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Meeting title"><Inp value={editMom.title} onChange={(e) => setEditMom({ ...editMom, title: e.target.value })} /></Field>
            <Field label="Date"><Inp type="date" value={editMom.date} onChange={(e) => setEditMom({ ...editMom, date: e.target.value })} /></Field>
            <Field label="Department">
              <select value={editMom.dept} onChange={(e) => setEditMom({ ...editMom, dept: e.target.value })} style={inputSt}>
                {Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Attendees"><Inp value={editMom.attendees} onChange={(e) => setEditMom({ ...editMom, attendees: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Minutes"><Ta rows={5} value={editMom.mom} onChange={(e) => setEditMom({ ...editMom, mom: e.target.value })} /></Field></div>
          <div style={{ marginTop: 12 }}><Field label="Action items (one per line)"><Ta rows={3} value={editMom.actions} onChange={(e) => setEditMom({ ...editMom, actions: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEditMom(null)}>Cancel</Btn>
            <Btn onClick={saveMom} disabled={!editMom.title}>Save MOM</Btn>
          </div>
        </Modal>
      )}
    </div>
  );

  /* ============ RECORD VIEW ============ */
  if (view === "record") return (
    <div>
      <SectionTitle eyebrow="AI Notetaker · Step 1 of 3" title="Record meeting" sub="Set the room, hit record. Live transcript runs with timestamps; you can pause, resume, and edit everything before the AI touches it. Tell participants they're being recorded." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <Card title="Meeting setup">
          <Field label="Title"><Inp value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="e.g., Leasing pipeline review — Week 28" /></Field>
          <div style={{ marginTop: 12 }}>
            <Field label="Department">
              <select value={meta.dept} onChange={(e) => setMeta({ ...meta, dept: e.target.value })} style={inputSt}>
                {Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Participants (their dashboards receive the output)</div>
            <div style={{ display: "grid", gap: 4, maxHeight: 220, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 8, padding: 8 }}>
              {state.users.map((u2) => (
                <label key={u2.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.text, cursor: "pointer", padding: "3px 4px" }}>
                  <input type="checkbox" checked={meta.participantIds.includes(u2.id)} onChange={() => toggleP(u2.id)} />
                  <span>{u2.name}</span><span style={{ color: C.faint, fontSize: 11 }}>· {u2.subRole}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Field label="External guests (names, comma separated)"><Inp value={meta.guests} onChange={(e) => setMeta({ ...meta, guests: e.target.value })} placeholder="e.g., Connplex team, bank RM" /></Field></div>
        </Card>

        <Card title="Recorder">
          <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
            <div style={{ fontFamily: SERIF, fontSize: 42, color: recState === "live" ? C.red : C.text, ...NUM }}>{fmtClock(elapsed)}</div>
            <div style={{ fontSize: 11, color: C.faint, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>
              {recState === "idle" && "Ready"}{recState === "live" && "● Recording"}{recState === "paused" && "Paused"}{recState === "stopped" && "Stopped"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {recState === "idle" && <Btn onClick={startRecording}><Mic size={15} /> Start recording</Btn>}
              {recState === "live" && <><Btn ghost onClick={pauseRecording}><Pause size={14} /> Pause</Btn><Btn tone={C.red} onClick={stopRecording}><Square size={13} /> Stop</Btn></>}
              {recState === "paused" && <><Btn onClick={resumeRecording}><Play size={14} /> Resume</Btn><Btn tone={C.red} onClick={stopRecording}><Square size={13} /> Stop</Btn></>}
              {recState === "stopped" && <>
                {audioUrl && <a href={audioUrl} download={`kkbp-meeting-${today()}.webm`} style={{ textDecoration: "none" }}><Btn ghost><FileAudio size={14} /> Download audio</Btn></a>}
                <Btn onClick={goReview}><Sparkles size={14} /> Continue to AI review</Btn>
              </>}
            </div>
            {micErr && <div style={{ fontSize: 12, color: C.amber, marginTop: 12, lineHeight: 1.55, textAlign: "left" }}>{micErr}</div>}
          </div>

          <div style={{ borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8 }}>Live transcript</div>
              <button onClick={() => setManualMode(!manualMode)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>
                <MessageSquareText size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{manualMode ? "Hide manual input" : "Type / paste transcript"}
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", background: C.panel3, border: `1px solid ${C.lineSoft}`, borderRadius: 8, padding: 10 }}>
              {segments.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
                  <span style={{ fontSize: 10.5, color: C.teal, flexShrink: 0, ...NUM }}>[{s.t}]</span>
                  <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
              {segments.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>Speech appears here as it's recognised…</div>}
            </div>
            {manualMode && <div style={{ marginTop: 10 }}>
              <Ta rows={5} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder={"Paste or type transcript here — e.g. from Plaud, a phone recording, or notes.\nOptional format: [05:30] Rishi: Let's award the lift package…"} />
            </div>}
          </div>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn ghost onClick={() => { resetRecorder(); setView("list"); }}>Cancel</Btn>
        {recState !== "idle" && recState !== "stopped" && <div style={{ fontSize: 12, color: C.faint, alignSelf: "center" }}>Stop the recording to continue to AI review.</div>}
        {(recState === "idle" && (manualText || segments.length > 0)) && <Btn onClick={goReview}><Sparkles size={14} /> Skip recording — go to AI review</Btn>}
      </div>
    </div>
  );

  /* ============ REVIEW VIEW ============ */
  if (view === "review") return (
    <div>
      <SectionTitle eyebrow="AI Notetaker · Step 2 of 3" title="Review & analyze" sub="Clean the transcript if needed, then let the AI extract the summary, decisions and timestamped action items mapped to your team. Nothing is pushed until you publish." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <Card title={`Transcript — ${meta.title || "Untitled"} (${fmtClock(elapsed)})`}>
          <Ta rows={16} value={transcriptDraft} onChange={(e) => setTranscriptDraft(e.target.value)} />
          {!effKey && (
            <div style={{ fontSize: 12, color: C.amber, marginTop: 12, lineHeight: 1.5 }}>
              AI analysis isn't enabled yet — Rishi switches it on centrally for the whole team. You can still edit the transcript and publish the MOM with manual action items.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Btn onClick={runAI} disabled={aiBusy || !transcriptDraft.trim() || !effKey}>
              {aiBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {aiBusy ? "Analyzing…" : proposal ? "Re-analyze" : "Analyze with AI"}
            </Btn>
            <Btn ghost onClick={() => setView("record")}>Back to recorder</Btn>
          </div>
          {aiErr && <div style={{ fontSize: 12, color: C.amber, marginTop: 10, lineHeight: 1.5 }}>{aiErr}</div>}
        </Card>

        <Card title="AI output — edit before publishing">
          {!proposal && !aiBusy && <Empty text="Run the analysis to see summary, decisions and action items here." />}
          {aiBusy && <div style={{ padding: 24, textAlign: "center", color: C.mute, fontSize: 13 }}><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> The notetaker is reading the room…</div>}
          {proposal && !aiBusy && (
            <div>
              <Field label="Executive summary"><Ta rows={4} value={proposal.summary} onChange={(e) => setProposal({ ...proposal, summary: e.target.value })} /></Field>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Decisions ({proposal.decisions.length})</div>
                {proposal.decisions.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10.5, color: C.teal, width: 44, flexShrink: 0, ...NUM }}>{d.time || "—"}</span>
                    <Inp value={d.text} onChange={(e) => setProposal({ ...proposal, decisions: proposal.decisions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                    <X size={14} color={C.red} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setProposal({ ...proposal, decisions: proposal.decisions.filter((_, j) => j !== i) })} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8 }}>Action items → dashboards ({proposal.actions.filter((a) => a.include).length} will be pushed)</div>
                  <button onClick={() => setProposal({ ...proposal, actions: [...proposal.actions, { title: "", assigneeId: user.id, due: "", priority: "Medium", time: "", include: true }] })}
                    style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>+ Add manually</button>
                </div>
                {proposal.actions.map((a, i) => (
                  <div key={i} style={{ background: C.panel3, border: `1px solid ${a.include ? C.lineSoft : C.line}`, borderRadius: 8, padding: 10, marginBottom: 8, opacity: a.include ? 1 : 0.45 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={a.include} onChange={(e) => setProposal({ ...proposal, actions: proposal.actions.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)) })} />
                      <Inp value={a.title} onChange={(e) => setProposal({ ...proposal, actions: proposal.actions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Action item…" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 50px", gap: 8, marginTop: 8 }}>
                      <select value={a.assigneeId} onChange={(e) => setProposal({ ...proposal, actions: proposal.actions.map((x, j) => (j === i ? { ...x, assigneeId: e.target.value } : x)) })} style={{ ...inputSt, padding: "6px 8px", fontSize: 12 }}>
                        {state.users.map((u2) => <option key={u2.id} value={u2.id}>{u2.name}</option>)}
                      </select>
                      <input type="date" value={a.due} onChange={(e) => setProposal({ ...proposal, actions: proposal.actions.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)) })} style={{ ...inputSt, padding: "6px 8px", fontSize: 12 }} />
                      <select value={a.priority} onChange={(e) => setProposal({ ...proposal, actions: proposal.actions.map((x, j) => (j === i ? { ...x, priority: e.target.value } : x)) })} style={{ ...inputSt, padding: "6px 8px", fontSize: 12 }}>
                        {["High","Medium","Low"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <div style={{ fontSize: 10.5, color: C.teal, alignSelf: "center", ...NUM }}>{a.time || ""}</div>
                    </div>
                  </div>
                ))}
              </div>

              {proposal.risks.length > 0 && <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Open questions & risks</div>
                {proposal.risks.map((r, i) => <div key={i} style={{ fontSize: 12.5, color: C.mute, padding: "4px 0", display: "flex", gap: 8 }}><AlertTriangle size={13} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />{r}</div>)}
              </div>}

              {proposal.highlights.length > 0 && <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Personal digests (shown on each person's Overview)</div>
                {proposal.highlights.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: C.mute, padding: "4px 0" }}><span style={{ color: C.text }}>{uName(state, h.userId)}:</span> {h.note}</div>)}
              </div>}
            </div>
          )}
        </Card>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <Btn ghost onClick={() => { resetRecorder(); setView("list"); }}>Discard</Btn>
        <Btn onClick={publish} disabled={!transcriptDraft.trim() && !proposal}>Publish meeting → push to dashboards</Btn>
      </div>
    </div>
  );

  /* ============ DETAIL VIEW ============ */
  const m = state.meetings.find((x) => x.id === detailId);
  if (!m) { setView("list"); return null; }
  const mTasks = state.tasks.filter((t) => t.meetingId === m.id);
  return (
    <div>
      <SectionTitle eyebrow="AI Notetaker · Published" title={m.title} sub={`${m.date} · ${m.duration || ""} · recorded by ${uName(state, m.recordedById)} · participants: ${(m.participantIds || []).map((id) => uName(state, id).split(" ")[0]).join(", ")}${m.guests ? ` + ${m.guests}` : ""}`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn ghost onClick={() => setView("list")}>← All meetings</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <Card title="Executive summary">
            <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7 }}>{m.summary || "—"}</div>
          </Card>
          {(m.decisions || []).length > 0 && <Card title="Decisions">
            {m.decisions.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <span style={{ fontSize: 10.5, color: C.teal, width: 44, flexShrink: 0, ...NUM }}>{d.time || "—"}</span>
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{d.text}</span>
              </div>
            ))}
          </Card>}
          <Card title={`Action items (${mTasks.length}) — live status from Tasks`}>
            {mTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <Badge text={t.status} color={KCOLOR[t.status]} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.text }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{uName(state, t.assigneeId)}{t.due && ` · due ${t.due}`}</div>
                </div>
              </div>
            ))}
            {mTasks.length === 0 && <Empty text="No action items were pushed from this meeting." />}
          </Card>
          {(m.risks || []).length > 0 && <Card title="Open questions & risks">
            {m.risks.map((r, i) => <div key={i} style={{ fontSize: 13, color: C.mute, padding: "5px 0", display: "flex", gap: 8 }}><AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />{r}</div>)}
          </Card>}
        </div>
        <Card title="Transcript">
          <div style={{ maxHeight: 560, overflowY: "auto", fontSize: 12.5, color: C.mute, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {m.transcript || "No transcript stored."}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= CONSTITUTION ================= */
function Constitution({ state, setState, user }) {
  const acked = state.acks[user.id] === state.constitutionVersion;
  const ack = () => setState((s) => withLog(
    { ...s, acks: { ...s.acks, [user.id]: s.constitutionVersion } },
    user.name, `acknowledged constitution v${state.constitutionVersion}`));
  return (
    <div>
      <SectionTitle eyebrow="Governance" title="KKBP Constitution" sub="The operating charter — purpose, values, role charters including sub-teams and agency partners, delegation of authority, and the official-channel rule. Version controlled; acknowledgement required." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, maxWidth: 860 }}>
        {CONSTITUTION.map((s) => (
          <Card key={s.id} pad={18}>
            <div style={{ fontFamily: SERIF, fontSize: 16, color: C.gold, marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.75 }}>{s.body}</div>
          </Card>
        ))}
        <Card pad={18}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {acked
              ? <><CheckCircle2 size={20} color={C.green} /><div style={{ fontSize: 13, color: C.text }}>You have acknowledged version {state.constitutionVersion} of this constitution.</div></>
              : <><Circle size={20} color={C.amber} /><div style={{ fontSize: 13, color: C.text }}>You have not yet acknowledged the current version.</div>
                <Btn onClick={ack}><ShieldCheck size={14} /> I acknowledge & will abide</Btn></>}
          </div>
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: C.mute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Team acknowledgements — v{state.constitutionVersion}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state.users.map((u) => {
                const ok = state.acks[u.id] === state.constitutionVersion;
                return <Badge key={u.id} text={`${u.name.split(" ")[0]} · ${DEPTS[u.dept]?.short}`} color={ok ? C.green : C.faint} />;
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= SECURITY (owner-only) ================= */
const fmtTs = (ts) => ts ? new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
function SecurityPage({ state, setState, user, liveStatus }) {
  const [auditWho, setAuditWho] = useState("All");
  const [auditCol, setAuditCol] = useState("All");
  const now = Date.now();
  const users = state.users;
  const uName2 = (id) => (users.find((x) => x.id === id) || {}).name || id || "unknown";
  const sessions = Object.values(state.sessions || {}).sort((a, b) => b.seen - a.seen);
  const events = state.loginEvents || [];
  const audit = state.audit || [];
  const online = sessions.filter((s) => now - s.seen < 5 * 60000);
  const fails24 = events.filter((e) => !e.ok && now - e.ts < 86400000);

  /* ---- suspicious activity heuristics ---- */
  const flags = [];
  { /* burst of failed logins per username (15-min window) */
    const byUn = {};
    events.filter((e) => !e.ok && now - e.ts < 86400000).forEach((e) => { (byUn[e.un] = byUn[e.un] || []).push(e); });
    Object.entries(byUn).forEach(([un, evs]) => {
      const sorted = evs.map((e) => e.ts).sort();
      for (let i = 0; i + 4 < sorted.length; i++) if (sorted[i + 4] - sorted[i] < 15 * 60000) { flags.push({ sev: "high", text: `${evs.length} failed sign-in attempts on "${un}" in the last 24h (5+ within 15 minutes — possible password guessing).` }); break; }
    });
  }
  { /* one account on many devices in 24h */
    const byUser = {};
    events.filter((e) => e.ok && now - e.ts < 86400000).forEach((e) => { (byUser[e.uid] = byUser[e.uid] || new Set()).add(e.d); });
    Object.entries(byUser).forEach(([uid, devs]) => { if (devs.size >= 3) flags.push({ sev: "med", text: `${uName2(uid)} signed in from ${devs.size} different devices in the last 24h.` }); });
  }
  { /* first sign-in from a never-before-seen device */
    const seenBefore = {};
    [...events].reverse().forEach((e) => {
      if (!e.ok || !e.uid) return;
      const k = e.uid + "|" + e.d;
      if (!seenBefore[k]) { seenBefore[k] = true; if (now - e.ts < 86400000 && Object.keys(seenBefore).filter((x) => x.startsWith(e.uid + "|")).length > 1) flags.push({ sev: "low", text: `${uName2(e.uid)} signed in from a new device (${e.ua}) — ${fmtTs(e.ts)}.` }); }
    });
  }
  { /* mass deletions in a short window */
    const dels = audit.filter((a) => a.action === "deleted" && now - a.ts < 86400000);
    const byActor = {};
    dels.forEach((a) => { (byActor[a.byId] = byActor[a.byId] || []).push(a.ts); });
    Object.entries(byActor).forEach(([uid, tss]) => {
      const sorted = tss.sort();
      for (let i = 0; i + 9 < sorted.length; i++) if (sorted[i + 9] - sorted[i] < 10 * 60000) { flags.push({ sev: "high", text: `${uName2(uid)} deleted ${tss.length} records in the last 24h (10+ within 10 minutes).` }); break; }
    });
  }

  const killSession = (s) => { if (confirm(`Sign ${uName2(s.u)} out of this device?`)) setState((st) => withLog({ ...st, kills: { ...(st.kills || {}), [`${s.u}|${s.d}`]: Date.now() } }, user.name, `force-signed-out ${uName2(s.u)} (device ${s.d})`)); };
  const killAll = (uid) => { if (confirm(`Sign ${uName2(uid)} out everywhere?`)) setState((st) => withLog({ ...st, kills: { ...(st.kills || {}), [`${uid}|*`]: Date.now() } }, user.name, `force-signed-out ${uName2(uid)} on all devices`)); };
  const toggleLock = (u) => {
    if (u.id === user.id) return alert("You cannot lock your own account.");
    if (confirm(u.locked ? `Unlock ${u.name}'s account?` : `Lock ${u.name}'s account? They will be signed out and cannot sign in until unlocked.`))
      setState((st) => withLog({ ...st, users: st.users.map((x) => x.id === u.id ? { ...x, locked: !u.locked } : x), kills: u.locked ? st.kills : { ...(st.kills || {}), [`${u.id}|*`]: Date.now() } }, user.name, `${u.locked ? "unlocked" : "locked"} ${u.name}'s account`));
  };

  const auditView = audit.filter((a) => (auditWho === "All" || a.byId === auditWho) && (auditCol === "All" || a.col === auditCol)).slice(0, 120);
  const SEV = { high: C.red, med: C.amber, low: C.blue };

  return (
    <div>
      <SectionTitle eyebrow="Records · Owner" title="Security" sub="Who is signed in where, every change anyone makes, and anything that looks off. Passwords are stored as salted hashes; sign-outs and locks reach every connected device through the live workspace." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 }}>
        <KPI label="Online now" value={online.length} sub="active in last 5 min" tone={C.green} />
        <KPI label="Sessions on record" value={sessions.length} sub="devices that signed in" tone={C.blue} />
        <KPI label="Failed sign-ins (24h)" value={fails24.length} sub={`${events.filter((e) => e.ok && now - e.ts < 86400000).length} successful`} tone={fails24.length ? C.amber : C.faint} />
        <KPI label="Alerts" value={flags.length} sub="suspicious patterns" tone={flags.length ? C.red : C.faint} />
      </div>

      <Card title="Suspicious activity" style={{ marginBottom: 12 }}>
        {flags.length === 0 && <div style={{ fontSize: 13, color: C.faint }}>Nothing unusual — no failed-login bursts, unexpected devices or mass deletions in the last 24 hours.</div>}
        <div style={{ display: "grid", gap: 8 }}>
          {flags.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", background: `${SEV[f.sev]}11`, border: `1px solid ${SEV[f.sev]}44`, borderRadius: 8 }}>
              <AlertTriangle size={15} color={SEV[f.sev]} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Active sessions & devices" style={{ marginBottom: 12 }} pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>Member</Th><Th>Device</Th><Th>Signed in</Th><Th>Last seen</Th><Th>Status</Th><Th right>Actions</Th></tr></thead>
            <tbody>
              {sessions.map((s) => {
                const isOnline = now - s.seen < 5 * 60000;
                const me = s.u === user.id && s.d === DEVICE_ID;
                return (
                  <tr key={s.u + s.d}>
                    <Td style={{ fontWeight: 600 }}>{uName2(s.u)}{me && <span style={{ color: C.gold, fontSize: 10.5, marginLeft: 6 }}>(this device)</span>}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{s.ua}{s.em ? <> · <span style={{ color: C.text }}>{s.em}</span></> : ""} · {s.d}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{fmtTs(s.in)}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{ago(s.seen)} ago</Td>
                    <Td><Badge text={isOnline ? "Online" : "Offline"} color={isOnline ? C.green : C.faint} /></Td>
                    <Td right>
                      {!me && <>
                        <Btn small ghost onClick={() => killSession(s)}>Sign out</Btn>{" "}
                        <Btn small ghost tone={C.red} onClick={() => killAll(s.u)}>Everywhere</Btn>
                      </>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sessions.length === 0 && <Empty text="No sessions recorded yet — they appear as people sign in." />}
        </div>
      </Card>

      <Card title="Account locks" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Locking signs the person out everywhere and blocks sign-in until unlocked. {liveStatus !== "on" && "Reaches other devices once the live workspace is connected."}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {users.filter((u) => u.id !== user.id).map((u) => (
            <button key={u.id} onClick={() => toggleLock(u)} title={u.locked ? "Unlock" : "Lock"} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: u.locked ? `${C.red}18` : "transparent", color: u.locked ? C.red : C.mute, border: `1px solid ${u.locked ? C.red + "66" : C.line}`, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: SANS }}>
              <KeyRound size={12} /> {u.name}{u.locked ? " — locked" : ""}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Sign-in history" style={{ marginBottom: 12 }} pad={0}>
        <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><Th>When</Th><Th>Account</Th><Th>Device</Th><Th>Result</Th></tr></thead>
            <tbody>
              {events.slice(0, 60).map((e, i) => (
                <tr key={i}>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{fmtTs(e.ts)}</Td>
                  <Td style={{ fontWeight: 600 }}>{e.ok ? uName2(e.uid) : e.un}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{e.ua} · {e.d}</Td>
                  <Td><Badge text={e.ok ? "Signed in" : "Failed"} color={e.ok ? C.green : C.red} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && <Empty text="No sign-ins recorded yet." />}
        </div>
      </Card>

      <Card title="Audit trail — every change" pad={0}>
        <div style={{ display: "flex", gap: 8, padding: "12px 14px 0", flexWrap: "wrap" }}>
          <select value={auditWho} onChange={(e) => setAuditWho(e.target.value)} style={{ ...inputSt, width: 200 }}>
            <option value="All">Everyone</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={auditCol} onChange={(e) => setAuditCol(e.target.value)} style={{ ...inputSt, width: 180 }}>
            <option value="All">All registers</option>
            {[...new Set(audit.map((a) => a.col))].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Record</Th><Th>Fields</Th><Th>Device</Th></tr></thead>
            <tbody>
              {auditView.map((a, i) => (
                <tr key={i}>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{fmtTs(a.ts)}</Td>
                  <Td style={{ fontWeight: 600 }}>{a.by}</Td>
                  <Td><Badge text={`${a.action} · ${a.col}`} color={a.action === "deleted" ? C.red : a.action === "added" ? C.green : C.blue} /></Td>
                  <Td style={{ fontSize: 12.5 }}>{a.name}</Td>
                  <Td style={{ color: C.faint, fontSize: 11.5 }}>{a.fields}</Td>
                  <Td style={{ color: C.faint, fontSize: 11.5 }}>{a.d}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditView.length === 0 && <Empty text="No changes recorded yet — the trail starts with the next edit anyone makes." />}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: C.faint, marginTop: 12, maxWidth: 780, lineHeight: 1.6 }}>
        <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 5 }} color={C.amber} />
        Honest scope: this app runs in the browser against a shared workspace, so these controls govern the app itself — they can't stop someone who holds the Firebase config from reading or writing the data store directly. Keep the app link and config internal, rotate the AI key / Firebase project if they leak, and when you want hard, server-enforced access control the next step is Firebase Authentication with security rules — the schema here maps onto it 1:1.
      </div>
    </div>
  );
}

/* ================= IMPORT STUDIO (WhatsApp export → dashboard) ================= */
const CAT_MAP = {
  invoice: "Vendor Contracts", "rate-card": "Legal & Agreements", agreement: "Legal & Agreements",
  "floor-plan": "Design & Drawings", "site-photo": "Design & Drawings", certificate: "Licences & Compliance",
  "brand-creative": "Marketing & Brand", product: "Marketing & Brand", screenshot: "Other", other: "Other",
};
const DEPT_FOR_CAT = {
  invoice: "admin", "rate-card": "leasing", agreement: "leasing", "floor-plan": "design", "site-photo": "project",
  certificate: "admin", "brand-creative": "marketing", product: "marketing", screenshot: "exec", other: "exec",
};
const importInputSt = { background: C.panel3, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: SANS, fontSize: 13, width: "100%" };

function ImportStudio({ state, setState, user, liveStatus }) {
  const [phase, setPhase] = useState("idle"); // idle | scanned | running | review | done
  const [fileName, setFileName] = useState("");
  const [inv, setInv] = useState(null); // {chatText, media[], participants, first, last, messageCount}
  const [opts, setOpts] = useState({ analyzeImages: true, analyzePdfs: true, analyzeVideos: true, analyzeChat: true, saveMedia: true });
  const [logLines, setLogLines] = useState([]);
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const [proposals, setProposals] = useState(null);
  const [err, setErr] = useState("");
  const zipCtx = React.useRef(null);
  const key = (state.aiKey || "").trim();
  const fb = effectiveFbConfig();
  const log = (t) => setLogLines((L) => [...L, t]);

  const reset = () => { setPhase("idle"); setFileName(""); setInv(null); setLogLines([]); setProg({ done: 0, total: 0 }); setProposals(null); setErr(""); if (zipCtx.current?.reader) { try { zipCtx.current.reader.close(); } catch (e) {} } zipCtx.current = null; };

  async function onPick(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    setErr(""); setFileName(f.name); setLogLines([]); setPhase("running"); log("Scanning " + f.name + " …");
    try {
      if (/\.txt$/i.test(f.name)) {
        const chatText = await f.text();
        const parsed = WA.parseChatText(chatText);
        setInv({ chatText, media: [], ...parsed, messageCount: parsed.messages.length });
      } else {
        const ctx = await WA.openZip(f);
        zipCtx.current = ctx;
        if (!ctx.chatEntry) throw new Error("No _chat.txt found in this zip — is it a WhatsApp export?");
        const chatText = await WA.readEntryText(ctx.chatEntry, ctx.zip);
        const parsed = WA.parseChatText(chatText);
        setInv({ chatText, media: ctx.media, ...parsed, messageCount: parsed.messages.length });
        log(`Found ${parsed.messages.length} messages and ${ctx.media.length} attachments.`);
      }
      setPhase("scanned");
    } catch (e2) { console.error(e2); setErr(e2.message || String(e2)); setPhase("idle"); }
  }

  const counts = React.useMemo(() => {
    const c = { image: 0, video: 0, audio: 0, pdf: 0, vcf: 0, doc: 0, other: 0, bytes: 0 };
    (inv?.media || []).forEach((m) => { c[m.kind] = (c[m.kind] || 0) + 1; c.bytes += m.size; });
    return c;
  }, [inv]);
  const estCalls = (opts.analyzeChat ? Math.max(1, Math.ceil((inv?.messageCount || 0) / 400)) : 0)
    + (opts.analyzeImages ? counts.image : 0) + (opts.analyzePdfs ? counts.pdf : 0) + (opts.analyzeVideos ? counts.video : 0);

  // ---- the pipeline ----
  async function run() {
    if (!key) { setErr("Set the team AI key in Team & Access first — the importer needs it to read media and the chat."); return; }
    setPhase("running"); setErr(""); setLogLines([]);
    const P = { people: [], tasks: [], approvals: [], docs: [], decisions: [] };
    const media = inv.media || [];
    const toAnalyse = media.filter((m) => (m.kind === "image" && opts.analyzeImages) || (m.kind === "pdf" && opts.analyzePdfs) || (m.kind === "video" && opts.analyzeVideos));
    const toCatalog = media.filter((m) => !toAnalyse.includes(m));
    setProg({ done: 0, total: media.length + (opts.analyzeChat ? 1 : 0) });
    let done = 0; const tick = () => { done += 1; setProg((p) => ({ ...p, done })); };
    const zip = zipCtx.current?.zip;
    const stamp = today();
    const folder = "whatsapp/" + fileName.replace(/[^\w.-]+/g, "_") + "-" + Date.now();

    // 1) chat text
    if (opts.analyzeChat && inv.chatText) {
      log("Reading the conversation…");
      const roster = state.users.map((u) => `${u.id} — ${u.name} — ${u.dept}`).join("; ");
      // chunk very long chats to ~24k chars per call
      const text = inv.chatText; const CH = 24000;
      for (let i = 0; i < text.length; i += CH) {
        try {
          const r = await WA.analyseChat({ key, transcript: text.slice(i, i + CH), roster, today: stamp });
          (r.people || []).forEach((x) => P.people.push({ ...x, dept: "marketing", tier: "external", subRole: x.hint || "Imported from WhatsApp", include: true }));
          (r.tasks || []).forEach((x) => P.tasks.push({ ...x, include: true }));
          (r.approvals || []).forEach((x) => P.approvals.push({ ...x, include: true }));
          (r.docs || []).forEach((x) => P.docs.push({ name: x.name, category: x.category || "Other", dept: "exec", url: "", summary: x.note || "", source: "chat", include: true }));
          (r.decisions || []).forEach((t) => P.decisions.push({ text: t, include: true }));
        } catch (e) { log("· chat chunk skipped (" + (e.message || e) + ")"); if ((e.message || "") === "NEED_KEY") { setErr("The AI key was rejected (401). Check it in Team & Access."); setPhase("scanned"); return; } }
      }
      tick();
    }

    // 2) media
    for (const m of media) {
      try {
        const analyse = toAnalyse.includes(m);
        let url = "";
        let blob = null;
        if (analyse || opts.saveMedia) blob = await WA.readEntryBlob(m._entry, zip, WA.mimeFor(m.name));
        // save to Firebase Storage
        if (opts.saveMedia && blob && fb && liveStatus === "on") {
          try { url = await WA.uploadToStorage(fb, folder + "/" + m.name, new Blob([blob], { type: WA.mimeFor(m.name) })); }
          catch (e) { log("· upload failed for " + m.name + " (" + (e.code || e.message) + ")"); }
        }
        if (analyse) {
          let images = [], ctxText = "";
          if (m.kind === "image") images = [await WA.downscaleImage(new Blob([blob], { type: WA.mimeFor(m.name) }))];
          else if (m.kind === "video") { log("· sampling frames from " + m.name); images = await WA.sampleVideoFrames(new Blob([blob], { type: WA.mimeFor(m.name) }), 4); }
          else if (m.kind === "pdf") { const pd = await WA.pdfExtract(new Blob([blob], { type: "application/pdf" }), 3); images = pd.images; ctxText = pd.text.slice(0, 1200); }
          if (images.length) {
            const r = await WA.analyseMedia({ key, kind: m.kind, images, filename: m.name, context: ctxText });
            if (r && r.relevant) {
              const cat = CAT_MAP[r.category] || "Other";
              P.docs.push({ name: r.title || m.name, category: cat, dept: DEPT_FOR_CAT[r.category] || "exec", url, summary: [r.summary, (r.facts || []).join(" · ")].filter(Boolean).join(" — "), source: m.name, kind: m.kind, include: true });
              if (r.suggestedTask) P.tasks.push({ title: r.suggestedTask, dept: DEPT_FOR_CAT[r.category] || "exec", assigneeName: "", due: "", notes: "From " + m.name, include: true });
              log("✓ " + m.name + " — " + (r.title || cat));
            } else { log("· " + m.name + " — not business-relevant, skipped"); }
          }
        } else if (opts.saveMedia) {
          // catalog-only (audio, docs, other, or media with analysis off)
          const kindName = { audio: "Voice note", video: "Video", image: "Image", doc: "Document", other: "File" }[m.kind] || "File";
          P.docs.push({ name: m.name, category: "Other", dept: "exec", url, summary: kindName + " from WhatsApp export" + (url ? "" : " (not uploaded)"), source: m.name, kind: m.kind, include: !!url });
        }
        if (m.kind === "vcf") {
          const vt = await WA.readEntryText(m._entry, zip);
          WA.parseVcf(vt).forEach((c) => P.people.push({ name: c.name, dept: "marketing", tier: "external", subRole: [c.org, c.tel].filter(Boolean).join(" · ") || "Contact card", include: true }));
        }
      } catch (e) { log("· " + m.name + " skipped (" + (e.message || e) + ")"); }
      tick();
    }
    if (zipCtx.current?.reader) { try { await zipCtx.current.reader.close(); } catch (e) {} }
    // de-dup people by lowercased name
    const seen = new Set(); P.people = P.people.filter((p) => { const k = (p.name || "").toLowerCase(); if (!p.name || seen.has(k)) return false; seen.add(k); return true; });
    setProposals(P); setPhase("review");
    log(`Done — ${P.people.length} people, ${P.tasks.length} tasks, ${P.approvals.length} approvals, ${P.docs.length} documents proposed.`);
  }

  const toggle = (grp, i) => setProposals((P) => ({ ...P, [grp]: P[grp].map((x, j) => j === i ? { ...x, include: !x.include } : x) }));

  function applyMerge() {
    const P = proposals;
    setState((s) => {
      let st = { ...s };
      const exN = new Set(st.users.map((u) => u.name.toLowerCase()));
      const exU = new Set(st.users.map((u) => (u.username || "").toLowerCase()));
      const newUsers = P.people.filter((p) => p.include && p.name && !exN.has(p.name.toLowerCase())).map((p) => {
        let un = slugUser(p.name); while (exU.has(un)) un += Math.floor(Math.random() * 9); exU.add(un); exN.add(p.name.toLowerCase());
        return { id: uid(), name: p.name, dept: p.dept || "marketing", subRole: p.subRole || "Imported from WhatsApp", tier: p.tier || "external", username: un, password: String(1000 + Math.floor(Math.random() * 9000)) };
      });
      st.users = [...st.users, ...newUsers];
      const nameId = {}; st.users.forEach((u) => { nameId[u.name.toLowerCase()] = u.id; nameId[(u.name.split(" ")[0] || "").toLowerCase()] = u.id; });
      const newTasks = P.tasks.filter((t) => t.include && t.title).map((t) => ({ id: uid(), title: t.title, dept: t.dept || "exec", assigneeId: nameId[(t.assigneeName || "").toLowerCase()] || user.id, createdById: user.id, due: t.due || "", priority: "Medium", status: "Open", notes: t.notes || "(imported from WhatsApp)" }));
      st.tasks = [...st.tasks, ...newTasks];
      const newAppr = P.approvals.filter((a) => a.include && a.title).map((a) => ({ id: uid(), title: a.title, type: "Other", amountL: +a.amountL || 0, dept: "exec", raisedById: user.id, status: "Pending", decidedById: null, dateRaised: today(), dateDecided: "", notes: a.notes || "(imported from WhatsApp)" }));
      st.approvals = [...st.approvals, ...newAppr];
      const newDocs = P.docs.filter((d) => d.include && d.name).map((d) => ({ id: uid(), name: d.name, dept: d.dept || "exec", category: d.category || "Other", url: d.url || "", addedById: user.id, date: today(), summary: d.summary || "", source: d.source || "" }));
      st.docs = [...st.docs, ...newDocs];
      const dec = P.decisions.filter((x) => x.include).map((x) => x.text);
      const newMeet = dec.length ? [{ id: uid(), title: "Imported notes — " + fileName, date: today(), dept: "exec", attendees: (inv.participants || []).join(", "), mom: dec.join("\n"), actions: "" }] : [];
      st.meetings = [...st.meetings, ...newMeet];
      return withLog(st, user.name, `imported WhatsApp export "${fileName}" — +${newUsers.length} people, +${newTasks.length} tasks, +${newAppr.length} approvals, +${newDocs.length} documents`);
    });
    setPhase("done");
  }

  const Opt = ({ k, label, sub }) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", cursor: "pointer" }}>
      <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))} style={{ marginTop: 3 }} />
      <span><span style={{ color: C.text, fontSize: 13 }}>{label}</span><br /><span style={{ color: C.faint, fontSize: 11.5 }}>{sub}</span></span>
    </label>
  );
  const grpCount = (g) => (proposals?.[g] || []).filter((x) => x.include).length;

  return (
    <div>
      <SectionTitle eyebrow="Records · Owner" title="Import Studio — WhatsApp" sub="Turn a WhatsApp chat export into dashboard data. It reads the conversation and every attachment in your browser, uses AI to keep only what matters, and lets you review everything before it's merged. Nothing is overwritten." />

      {err && <Card style={{ marginBottom: 12, borderColor: `${C.red}66` }}><div style={{ color: C.red, fontSize: 13 }}><AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{err}</div></Card>}

      {phase === "idle" && (
        <Card style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.7, marginBottom: 14 }}>
            Export a chat from WhatsApp (<b>Attach Media</b> to bring in photos, PDFs and videos, or <b>Without Media</b> for just the text), then pick the <b>.zip</b> (or <b>.txt</b>) here. Large exports are read a piece at a time, so a 1&nbsp;GB+ file won't crash the tab.
          </div>
          <label style={{ display: "inline-flex" }}>
            <input type="file" accept=".zip,.txt,application/zip,text/plain" style={{ display: "none" }} onChange={onPick} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", background: C.gold, color: "#16163A", border: "none", borderRadius: 9, padding: "11px 20px", fontSize: 14, fontWeight: 700, fontFamily: SANS }}><Upload size={16} /> Choose WhatsApp export</span>
          </label>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 14, lineHeight: 1.6 }}>
            {key ? <><CheckCircle2 size={12} color={C.green} style={{ verticalAlign: -1, marginRight: 4 }} /> AI key detected.</> : <><AlertTriangle size={12} color={C.amber} style={{ verticalAlign: -1, marginRight: 4 }} /> No AI key set — media/chat analysis needs it (Team & Access → AI key).</>}
            {" · "}
            {liveStatus === "on" && fb ? <><CheckCircle2 size={12} color={C.green} style={{ verticalAlign: -1, marginRight: 4 }} /> Live workspace on — media can be saved to your Firebase Storage.</> : <><AlertTriangle size={12} color={C.amber} style={{ verticalAlign: -1, marginRight: 4 }} /> Live workspace off — media can be analysed but not saved (connect it in Team & Access to store files).</>}
          </div>
        </Card>
      )}

      {phase === "scanned" && inv && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, maxWidth: 900 }}>
          <Card title={`Found in ${fileName}`}>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.9 }}>
              <div><b>{inv.messageCount.toLocaleString()}</b> messages{inv.first ? <> · {inv.first} → {inv.last}</> : null}</div>
              <div><b>{(inv.participants || []).length}</b> participants: <span style={{ color: C.mute, fontSize: 12 }}>{(inv.participants || []).slice(0, 8).join(", ")}{inv.participants.length > 8 ? "…" : ""}</span></div>
              <div style={{ marginTop: 8, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 8 }}>
                {["image", "video", "pdf", "audio", "vcf", "doc", "other"].map((k) => counts[k] ? <Badge key={k} text={`${counts[k]} ${k}${counts[k] > 1 ? "s" : ""}`} color={C.blue} /> : null)}
                {inv.media.length ? <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>Total media ≈ {WA.humanSize(counts.bytes)}</div> : <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>No media (text-only export).</div>}
              </div>
            </div>
          </Card>
          <Card title="What to do">
            <Opt k="analyzeChat" label="Read the conversation" sub="Pull out people, tasks, approvals and decisions from the text." />
            <Opt k="analyzeImages" label={`Analyse images (${counts.image})`} sub="AI keeps invoices, plans, rate cards, docs; drops memes/selfies." />
            <Opt k="analyzePdfs" label={`Analyse PDFs (${counts.pdf})`} sub="Extract text and read the pages." />
            <Opt k="analyzeVideos" label={`Analyse videos (${counts.video})`} sub="Samples a few frames per video and describes them." />
            <Opt k="saveMedia" label="Save media to workspace" sub={liveStatus === "on" && fb ? "Uploads the files to your Firebase Storage and links them." : "Needs the live workspace connected (Team & Access)."} />
            <div style={{ marginTop: 12, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>
              <div style={{ fontSize: 12.5, color: C.text }}>Estimated AI calls: <b style={{ color: C.gold }}>{estCalls.toLocaleString()}</b></div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>Runs one at a time; you can leave this tab open. You review everything before anything is added.</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Btn onClick={run}><Sparkles size={14} /> Process</Btn>
                <Btn ghost onClick={reset}>Cancel</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {phase === "running" && (
        <Card style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Loader2 size={18} color={C.gold} className="spin" />
            <div style={{ fontSize: 14, color: C.text }}>Processing{prog.total ? ` — ${prog.done}/${prog.total}` : ""}…</div>
          </div>
          {prog.total > 0 && <div style={{ height: 6, background: C.panel3, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}><div style={{ height: "100%", width: `${(prog.done / prog.total) * 100}%`, background: C.gold }} /></div>}
          <div style={{ maxHeight: 300, overflow: "auto", fontSize: 12, color: C.mute, fontFamily: "monospace", lineHeight: 1.7, background: C.panel3, borderRadius: 8, padding: 12 }}>
            {logLines.slice(-200).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </Card>
      )}

      {phase === "review" && proposals && (
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: C.mute }}>Review and untick anything you don't want, then merge. Existing data is never touched.</div>
            <div style={{ flex: 1 }} />
            <Btn onClick={applyMerge}><FileCheck2 size={14} /> Merge {grpCount("people") + grpCount("tasks") + grpCount("approvals") + grpCount("docs")} items</Btn>
            <Btn ghost onClick={reset}>Discard</Btn>
          </div>
          {[["docs", "Documents & media", (d) => <><b style={{ color: C.text }}>{d.name}</b> <Badge text={d.category} color={C.blue} />{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 11, marginLeft: 6 }}>file</a> : null}<div style={{ fontSize: 11.5, color: C.faint }}>{d.summary}{d.source ? " · " + d.source : ""}</div></>],
            ["tasks", "Tasks", (t) => <><b style={{ color: C.text }}>{t.title}</b> <Badge text={t.dept} color={C.purple} />{t.assigneeName ? <span style={{ fontSize: 11.5, color: C.faint }}> → {t.assigneeName}</span> : null}{t.due ? <span style={{ fontSize: 11.5, color: C.faint }}> · due {t.due}</span> : null}</>],
            ["approvals", "Approvals", (a) => <><b style={{ color: C.text }}>{a.title}</b>{a.amountL ? <Badge text={fmtL(a.amountL)} color={C.gold} /> : null}<div style={{ fontSize: 11.5, color: C.faint }}>{a.notes}</div></>],
            ["people", "People", (p) => <><b style={{ color: C.text }}>{p.name}</b> <Badge text={p.tier} color={C.teal} /><div style={{ fontSize: 11.5, color: C.faint }}>{p.subRole}</div></>],
            ["decisions", "Decisions / notes", (d) => <span style={{ color: C.text, fontSize: 13 }}>{d.text}</span>],
          ].map(([grp, title, render]) => (proposals[grp] || []).length ? (
            <Card key={grp} title={`${title} · ${grpCount(grp)}/${proposals[grp].length}`} style={{ marginBottom: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                {proposals[grp].map((x, i) => (
                  <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${C.lineSoft}`, cursor: "pointer", opacity: x.include ? 1 : 0.45 }}>
                    <input type="checkbox" checked={x.include} onChange={() => toggle(grp, i)} style={{ marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{render(x)}</div>
                  </label>
                ))}
              </div>
            </Card>
          ) : null)}
        </div>
      )}

      {phase === "done" && (
        <Card style={{ maxWidth: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><CheckCircle2 size={22} color={C.green} /><div style={{ fontSize: 15, color: C.text }}>Merged into the dashboard.</div></div>
          <div style={{ fontSize: 12.5, color: C.mute, marginTop: 8, lineHeight: 1.6 }}>Find the new records under Documents, Tasks, Approvals, Team and Meetings. Run another export whenever you like — it's always additive.</div>
          <div style={{ marginTop: 14 }}><Btn onClick={reset}><Upload size={14} /> Import another</Btn></div>
        </Card>
      )}
    </div>
  );
}

/* ================= TEAM & ACCESS ================= */
function Team({ state, setState, user, liveStatus, authInfo }) {
  const [edit, setEdit] = useState(null);
  const [cfgText, setCfgText] = useState("");
  const [wl, setWl] = useState(null);        /* workspace allowlist: null = not loaded/unavailable */
  const [wlText, setWlText] = useState("");
  const [wlBusy, setWlBusy] = useState(false);
  const canWrite = isAppAdmin(user);
  useEffect(() => {
    warmAuth();
    if (!canWrite) return;
    readAllowlist().then((e) => { setWl(e); setWlText((e || []).join("\n")); });
  }, [canWrite]);
  const saveAllowlist = async () => {
    const emails = wlText.split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.includes("@"));
    if (authInfo?.email && !emails.includes(authInfo.email.toLowerCase())) emails.unshift(authInfo.email.toLowerCase());
    setWlBusy(true);
    try {
      await writeAllowlist(emails);
      setWl(emails); setWlText(emails.join("\n"));
      setState((s) => withLog(s, user.name, `updated workspace access list (${emails.length} account${emails.length === 1 ? "" : "s"})`));
      alert(`Saved — ${emails.length} Google account${emails.length === 1 ? "" : "s"} can reach the workspace once the strict rules are published.`);
    } catch (e) { alert("Couldn't save the access list: " + (e.message || e)); }
    setWlBusy(false);
  };
  const RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function allowed() {
      return request.auth != null &&
        request.auth.token.email_verified &&
        request.auth.token.email in get(/databases/$(database)/documents/kkbp/allowlist).data.emails;
    }
    match /kkbp/state {
      allow read, write: if allowed();
    }
    match /kkbp/allowlist {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.auth.token.email_verified &&
        request.auth.token.email in ['${(authInfo?.email || "YOUR-GOOGLE-EMAIL").toLowerCase()}'];
    }
  }
}`;
  const save = async () => {
    const un = (edit.username || "").trim().toLowerCase();
    if (state.users.some((u) => u.id !== edit.id && (u.username || "").toLowerCase() === un)) return alert("That username is already in use.");
    const rec = { ...edit, username: un, id: edit.id || uid() };
    /* a password typed here is stored only as a salted hash */
    if ((edit.newPw || "").length >= 4) {
      const salt = genSalt();
      rec.pwSalt = salt; rec.pwHash = await hashPassword(edit.newPw, salt); rec.password = "";
    }
    delete rec.newPw;
    setState((s) => withLog(
      { ...s, users: edit.id ? s.users.map((u) => (u.id === edit.id ? rec : u)) : [...s.users, rec] },
      user.name, `${edit.id ? "updated" : "added"} team member ${rec.name}${(edit.newPw || "").length >= 4 && edit.id ? " (password reset)" : ""}`));
    setEdit(null);
  };
  const del = (id) => {
    if (id === user.id) return alert("You cannot delete your own login.");
    if (confirm("Remove this member's access?")) setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kkbp-teamos-${today()}.json`;
    a.click();
  };
  const importJson = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!data.users || !data.tenants) throw new Error("bad shape");
        if (confirm("Replace ALL data in this app with the imported file?")) setState({ ...freshState(), ...data });
      } catch (err) { alert("Invalid backup file."); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };
  /* Additive merge: adds records the app doesn't already have (matched by id; users also by
     username) without overwriting or deleting anything, and never touches the AI key, live
     config, acks or logs. Safe to run repeatedly and on the live shared workspace — the
     intended way to fold in each new WhatsApp-history file. */
  const mergeJson = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (typeof data !== "object" || !data) throw new Error("bad shape");
        const COLS = ["users","tenants","capex","campaigns","content","compliance","vendors","drawings","rfis","zones","tasks","approvals","announcements","meetings","docs"];
        let added = 0;
        setState((st) => {
          const next = { ...st };
          COLS.forEach((k) => {
            const cur = Array.isArray(st[k]) ? st[k] : [];
            const seen = new Set(cur.map((r) => r && r.id));
            const names = k === "users" ? new Set(cur.map((u) => (u.username || "").toLowerCase())) : null;
            const incoming = Array.isArray(data[k]) ? data[k] : [];
            const fresh = incoming.filter((r) => {
              if (!r || !r.id || seen.has(r.id)) return false;
              if (names && names.has((r.username || "").toLowerCase())) return false;
              return true;
            });
            if (fresh.length) { next[k] = [...cur, ...fresh]; added += fresh.length; }
          });
          return withLog(next, user.name, `merged history file — added ${added} new record${added === 1 ? "" : "s"} (${f.name})`);
        });
        setTimeout(() => alert(`Merge complete — added ${added} new records. Existing data, the AI key and live sync were left untouched.`), 60);
      } catch (err) { alert("That file couldn't be merged — make sure it's a TTJ history/backup JSON."); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };
  const deptOrder = ["exec","leasing","marketing","project","design","admin"];
  return (
    <div>
      <SectionTitle eyebrow="Access control" title="Team & Access" sub="Departments, sub-roles and tiers. Heads run their department; team members work registers; externals (agencies, consultants, brokers) see only their deliverables." />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        {canWrite && <Btn ghost onClick={exportJson}><Download size={14} /> Export all data (JSON)</Btn>}
        {canWrite && <label style={{ display: "inline-flex" }} title="Add new records from a history file without overwriting existing data, the AI key, or live sync.">
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={mergeJson} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "transparent", color: C.green, border: `1px solid ${C.green}66`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: SANS }}><Plus size={14} /> Merge history file</span>
        </label>}
        {canWrite && <label style={{ display: "inline-flex" }} title="Replace ALL data with a full backup file.">
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={importJson} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "transparent", color: C.gold, border: `1px solid ${C.gold}66`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: SANS }}><Download size={14} style={{ transform: "rotate(180deg)" }} /> Import JSON (replace)</span>
        </label>}
        {canWrite && <Btn onClick={() => setEdit({ id: "", name: "", dept: "leasing", subRole: "", tier: "member", username: "", password: "", newPw: "" })}><Plus size={14} /> Add member</Btn>}
      </div>
      {deptOrder.map((d) => {
        const dUsers = state.users.filter((u) => u.dept === d);
        if (!dUsers.length) return null;
        const D = DEPTS[d];
        return (
          <Card key={d} title={<span style={{ color: D.accent }}>{D.label}</span>} style={{ marginBottom: 12 }} pad={0}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Member</Th><Th>Sub-role</Th><Th>Tier</Th><Th>Username</Th><Th>Password</Th>{canWrite && <Th right>Actions</Th>}</tr></thead>
              <tbody>
                {dUsers.map((u) => (
                  <tr key={u.id}>
                    <Td style={{ fontWeight: 600 }}>{u.name}{u.exec && <span style={{ color: C.gold, fontSize: 11, marginLeft: 6 }}>({u.exec})</span>}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{u.subRole}</Td>
                    <Td><Badge text={TIERS[u.tier]?.label || u.tier} color={TIERS[u.tier]?.color || C.faint} /></Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{u.username}</Td>
                    <Td style={{ color: C.mute, fontSize: 12 }}>{canWrite ? (u.password || <span style={{ color: C.green }}>hashed ✓</span>) : "••••••"}{u.locked && <Badge text="locked" color={C.red} />}</Td>
                    {canWrite && <Td right>
                      <Pencil size={14} color={C.mute} style={{ cursor: "pointer", marginRight: 12 }} onClick={() => setEdit({ ...u })} />
                      <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => del(u.id)} />
                    </Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
      {canWrite && (
        <Card title="AI Notetaker — Claude API key" style={{ marginBottom: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65 }}>
            Status:{" "}
            <Badge text={(state.aiKey || "").trim() ? "Universal key set — AI works for the whole team automatically" : "No key yet — AI features are off for everyone until you set it"} color={(state.aiKey || "").trim() ? C.green : C.amber} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Anthropic API key (console.anthropic.com → API keys)">
              <Inp type="password" value={state.aiKey || ""} placeholder="sk-ant-…"
                onChange={(e) => { const v = e.target.value.trim(); setState((st) => ({ ...st, aiKey: v })); }} />
            </Field>
          </div>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
            The one key for the entire app — you set it here once, it syncs to every device through the live workspace, and Meetings + Import Studio use it automatically for everyone. Nobody else can see this page or change the key. It lives in the app's data, never in the public code (a key committed to the code would be readable by the whole internet and disabled by Anthropic within hours). Rotate it at console.anthropic.com if it ever leaks.
          </div>
        </Card>
      )}
      {canWrite && (
        <Card title="Live shared workspace" style={{ marginBottom: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65 }}>
            Status:{" "}
            <Badge text={liveStatus === "on" ? "Connected — every device updates live" : liveStatus === "connecting" ? "Connecting…" : liveStatus === "error" ? "Configured, but unreachable" : "Not connected — data stays on each device"} color={liveStatus === "on" ? C.green : liveStatus === "error" ? C.red : C.amber} />
          </div>
          {!effectiveFbConfig() ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.7 }}>
                One-time setup (about 5 minutes, free): 1) Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: C.blue }}>console.firebase.google.com</a> and create a project. 2) Build → Firestore Database → Create database → Start in <b>test mode</b>. 3) Project settings → Your apps → Web app → register, then copy the <b>firebaseConfig</b> block. 4) Paste it below — and send the same block to the app developer to bake into the app, so <b>every other device connects automatically</b> with no setup.
              </div>
              <div style={{ marginTop: 10 }}>
                <Ta rows={5} value={cfgText} onChange={(e) => setCfgText(e.target.value)} placeholder={'Paste the firebaseConfig here, e.g.\n{ apiKey: "AIza…", authDomain: "kkbp.firebaseapp.com", projectId: "kkbp-…", … }'} />
              </div>
              <div style={{ marginTop: 10 }}>
                <Btn disabled={!cfgText.trim()} onClick={() => {
                  try {
                    const m = cfgText.match(/\{[\s\S]*\}/);
                    if (!m) throw new Error("no object");
                    const cfg = Function('"use strict"; return (' + m[0] + ")")();
                    if (!cfg || !cfg.apiKey || !cfg.projectId) throw new Error("missing keys");
                    saveFbConfig(cfg);
                    alert("Saved. The app will reload and connect to the shared workspace.");
                    location.reload();
                  } catch (err) {
                    alert("That doesn't look like a valid Firebase config. Paste the whole firebaseConfig block, including the { } braces.");
                  }
                }}><LinkIcon size={14} /> Connect shared workspace</Btn>
                {DEFAULT_FB_CONFIG && <>{" "}<Btn small ghost onClick={() => { saveFbConfig(null); location.reload(); }}>Reconnect built-in workspace</Btn></>}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 12.5, color: C.mute }}>
                Project: <span style={{ color: C.text }}>{(effectiveFbConfig() || {}).projectId}</span>
                {!loadFbConfig() && DEFAULT_FB_CONFIG && <Badge text="built into the app — all devices auto-connect" color={C.green} />}
              </div>
              <Btn small ghost tone={C.red} onClick={() => { if (confirm("Disconnect this device from the shared workspace? Data stays in the cloud; this device goes standalone.")) { saveFbConfig(loadFbConfig() ? null : { disabled: true }); location.reload(); } }}>Disconnect this device</Btn>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>
            All connected devices share one live dataset — edits appear everywhere within a second or two. Unlike the AI key, this config is safe to embed in the app: access is controlled by the database's own rules, not by hiding the config.
          </div>
        </Card>
      )}
      {canWrite && (
        <Card title="Workspace access — Google sign-in & allowlist" style={{ marginBottom: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65 }}>
            This device's Google account:{" "}
            {authInfo?.email
              ? <><Badge text={authInfo.email} color={C.green} /> <Btn small ghost onClick={googleSignOut}>Switch</Btn></>
              : <><Badge text="not signed in" color={C.amber} /> <Btn small onClick={googleSignIn}>Continue with Google</Btn></>}
          </div>
          {!authInfo?.email && <EmailAuthMini />}
          <div style={{ marginTop: 12 }}>
            <Field label="Google accounts allowed into the workspace (one per line)">
              <Ta rows={6} value={wlText} onChange={(e) => setWlText(e.target.value)} placeholder={"rishi@kkjpl.com\nnitin@kkjpl.com\nsomeone@gmail.com"} />
            </Field>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <Btn onClick={saveAllowlist} disabled={wlBusy || !authInfo}>{wlBusy ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />} Save access list</Btn>
              {wl === null && <span style={{ fontSize: 11.5, color: C.faint }}>List not loaded — sign in with Google first, then reopen this page.</span>}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: C.mute, marginTop: 14, lineHeight: 1.75 }}>
            <b style={{ color: C.text }}>One-time setup to enforce this:</b><br />
            1. Firebase console → <b>Authentication → Sign-in method</b>: enable <b>Google</b> and (for non-Google mails) <b>Email/Password</b>.<br />
            2. Authentication → <b>Settings → Authorized domains</b> → add <b>rishiikothari.github.io</b>.<br />
            3. Here: sign in with Google above, add the team's Google emails, <b>Save access list</b>.<br />
            4. Firestore console → <b>Rules</b> → replace with the rules below → <b>Publish</b>. From that moment only listed accounts can touch the data — with or without the app.
          </div>
          <div style={{ marginTop: 10, position: "relative" }}>
            <pre style={{ background: C.panel3, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, fontSize: 11, color: C.text, overflowX: "auto", lineHeight: 1.5 }}>{RULES_TEXT}</pre>
            <Btn small ghost onClick={() => { try { navigator.clipboard.writeText(RULES_TEXT); alert("Rules copied — paste into Firestore → Rules and Publish."); } catch (e) { alert("Copy failed — select the text manually."); } }}>Copy rules</Btn>
          </div>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
            The admin line in the rules is pinned to your signed-in Google account — only you can change the access list, even among owners. Devices without an allowed Google sign-in keep working offline but never see team data.
          </div>
        </Card>
      )}
      <div style={{ fontSize: 12, color: C.faint, marginTop: 4, maxWidth: 760, lineHeight: 1.6 }}>
        <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 5 }} color={C.amber} />
        Password access is a gate for day-to-day discipline, not bank-grade security — anyone with the app link shares the same underlying data store, and confidential registers should be treated accordingly. For hard isolation of agencies and brokers, the next step is a real backend with server-side auth; this schema maps to it 1:1.
      </div>

      {edit && (
        <Modal title={edit.id ? `Edit — ${edit.name}` : "Add team member"} onClose={() => setEdit(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Department">
              <select value={edit.dept} onChange={(e) => setEdit({ ...edit, dept: e.target.value })} style={inputSt}>
                {Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Sub-role"><Inp value={edit.subRole} onChange={(e) => setEdit({ ...edit, subRole: e.target.value })} placeholder="e.g., INIT Design Studio · Designer" /></Field>
            <Field label="Tier">
              <select value={edit.tier} onChange={(e) => setEdit({ ...edit, tier: e.target.value })} style={inputSt}>
                {Object.entries(TIERS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Username"><Inp value={edit.username} autoCapitalize="none" onChange={(e) => setEdit({ ...edit, username: e.target.value.toLowerCase().replace(/\s+/g, ".") })} placeholder="e.g. leasing.head" /></Field>
            <Field label={edit.id ? "Reset password (blank = keep current)" : "Password (min 4 characters — longer is safer)"}>
              <Inp value={edit.newPw || ""} onChange={(e) => setEdit({ ...edit, newPw: e.target.value })} placeholder={edit.id ? "••••••••" : ""} />
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.name || !(edit.username || "").trim() || (!edit.id && (edit.newPw || "").length < 4) || ((edit.newPw || "").length > 0 && edit.newPw.length < 4)}>Save member</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= APP SHELL ================= */
export default function App() {
  const [state, setState] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview");
  const [saveTick, setSaveTick] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [navOpen, setNavOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState(effectiveFbConfig() ? "connecting" : "off"); // off | connecting | on | error | needauth | denied
  const [authInfo, setAuthInfo] = useState(null); // { email, uid } once Google-signed-in
  const remoteApply = React.useRef(false);
  const latestState = React.useRef(null);
  useEffect(() => { latestState.current = state; }, [state]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let booted = false;
    const finishBoot = (st, fromRemote) => {
      if (fromRemote) remoteApply.current = true;
      setState(st);
      if (booted) return;
      booted = true;
      const sess = loadSession();
      if (sess) {
        const u = st.users.find((x) => x.id === sess.userId);
        if (u) {
          setUser(u);
          if (sess.page && PAGES.some((pg) => pg.key === sess.page && pageAllowed(pg, u))) setPage(sess.page);
        }
      }
    };
    (async () => {
      const loaded = await loadState();
      const stale = loaded && loaded.dataEpoch !== DATA_EPOCH; /* data saved before the current reset */
      const base = migrateState(
        loaded && !stale ? { ...freshState(), ...loaded }
        : stale ? resetToCleanSlate(loaded)
        : freshState()
      );
      const cfg = effectiveFbConfig();
      if (!cfg) {
        finishBoot(base, false);
        if (!loaded || stale) await saveState(base); /* overwrite any stale local copy */
        return;
      }
      /* Workspace gate: the shared data is only reachable with a Google
         sign-in that the Firestore rules accept. Without one, this device
         works offline until the user signs in (one time per device). */
      let authUser = null;
      try { authUser = await getAuthUser(cfg); } catch (e) { console.error("auth init failed", e); }
      if (authUser) setAuthInfo({ email: authUser.email || "", uid: authUser.uid });
      /* No Google session? Still try to connect: while the rules are open this
         works and nothing is disrupted. Once the strict rules are published,
         the deny below asks this device for its one-time Google sign-in. */
      /* Live mode: wait for the first shared snapshot so a joining device
         never overwrites the team's data with its own local copy. If Firestore
         answers slower than the fallback (first-ever connection on a slow
         network), the late snapshot still flips the app live and seeds or
         adopts the workspace — it is never ignored. */
      let first = true;
      const fallback = setTimeout(() => { if (first) { first = false; setLiveStatus("error"); finishBoot(base, false); } }, 8000);
      const localNow = () => latestState.current || base;
      const applyCloud = (cloud) => {
        if (cloud.dataEpoch !== DATA_EPOCH) { finishBoot(migrateState(resetToCleanSlate(cloud)), false); return; } /* pre-reset data → clean slate, pushed up */
        /* An empty cloud (freshly seeded by a blank device) must not shadow a
           device that already holds real records — push the local data up. */
        if (recordCount(cloud) === 0 && recordCount(localNow()) > 0) { pushLive(localNow()); return; }
        finishBoot(migrateState({ ...freshState(), ...cloud }), true);
      };
      try {
        await connectLive(cfg, (msg) => {
          if (msg.error) { clearTimeout(fallback); if (first) { first = false; finishBoot(base, false); } setLiveStatus(msg.denied ? (authUser ? "denied" : "needauth") : "error"); return; }
          clearTimeout(fallback);
          setLiveStatus("on"); /* any successful snapshot = connected, even one arriving after the fallback */
          if (first) {
            first = false;
            if (msg.exists) { try { applyCloud(JSON.parse(msg.data)); return; } catch (e) {} }
            finishBoot(base, false); /* first device ever seeds the shared workspace */
            return;
          }
          if (msg.by === CLIENT_ID) return;
          if (!msg.exists) { pushLive(localNow()); return; } /* late first contact with an empty workspace — seed it */
          try { applyCloud(JSON.parse(msg.data)); } catch (e) {}
        });
      } catch (e) {
        console.error("live connect failed", e);
        clearTimeout(fallback);
        if (first) { first = false; setLiveStatus("error"); finishBoot(base, false); }
      }
    })();
  }, []);

  useEffect(() => { if (user) saveSession({ userId: user.id, page }); }, [user, page]);

  useEffect(() => {
    if (!state) return;
    if (remoteApply.current) { remoteApply.current = false; saveState(state); return; } /* cache remote copy locally, don't echo it back */
    const t = setTimeout(async () => {
      const okLocal = await saveState(state);
      const okLive = liveStatus === "on" ? await pushLive(state) : true;
      setSaveTick(okLocal && okLive ? "✓ Saved" : "⚠ Save failed");
      setTimeout(() => setSaveTick(""), 2000);
    }, 600);
    return () => clearTimeout(t);
  }, [state]);

  /* Same-device tabs stay live even without the cloud workspace: when another
     tab saves, its storage event lands here and we adopt that state. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SKEY || !e.newValue) return;
      try { remoteApply.current = true; setState(migrateState({ ...freshState(), ...JSON.parse(e.newValue) })); } catch (err) {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Security enforcement: if the Owner force-signs-out this session (kills) or
     locks the account, this device signs out as soon as the state syncs in. */
  useEffect(() => {
    if (!state || !user) return;
    const sess = loadSession() || {};
    const killTs = Math.max((state.kills || {})[`${user.id}|${DEVICE_ID}`] || 0, (state.kills || {})[`${user.id}|*`] || 0);
    const fresh = state.users.find((x) => x.id === user.id);
    if (!fresh || fresh.locked || (killTs && killTs > (sess.loginTs || 0))) { saveSession(null); setUser(null); }
  }, [state, user]);
  /* Session heartbeat: refresh "last seen" every 3 minutes while signed in. */
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      setState((s) => {
        if (!s) return s;
        const k = `${user.id}|${DEVICE_ID}`;
        const cur = (s.sessions || {})[k];
        if (!cur) return s;
        return { ...s, sessions: { ...s.sessions, [k]: { ...cur, seen: Date.now() } } };
      });
    }, 3 * 60000);
    return () => clearInterval(t);
  }, [user]);

  if (!state) {
    return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.mute, fontFamily: SANS, fontSize: 14 }}>Loading TTJ Team OS…</div>;
  }
  if (!user) return <Login users={state.users} liveOn={liveStatus === "on"} liveStatus={liveStatus} authInfo={authInfo}
    onAttempt={({ un, ok }) => {
      setState((s) => ({ ...s, loginEvents: [{ ts: Date.now(), un, ok, uid: null, d: DEVICE_ID, ua: uaInfo() }, ...(s.loginEvents || [])].slice(0, 300) }));
    }}
    onLogin={async (u, pw) => {
      const now = Date.now();
      /* upgrade a legacy plaintext password to a salted hash on first login */
      let up = null;
      if (!u.pwHash && pw) { const salt = genSalt(); up = { pwSalt: salt, pwHash: await hashPassword(pw, salt) }; }
      setState((s) => ({
        ...s,
        users: up ? s.users.map((x) => x.id === u.id ? { ...x, ...up, password: "" } : x) : s.users,
        loginEvents: [{ ts: now, un: u.username, ok: true, uid: u.id, d: DEVICE_ID, ua: uaInfo() }, ...(s.loginEvents || [])].slice(0, 300),
        sessions: { ...(s.sessions || {}), [`${u.id}|${DEVICE_ID}`]: { u: u.id, d: DEVICE_ID, ua: uaInfo(), em: (authInfo && authInfo.email) || "", in: now, seen: now } },
      }));
      setUser(u); setPage("overview"); saveSession({ userId: u.id, page: "overview", loginTs: now });
    }} />;

  const D = DEPTS[user.dept];
  const myPages = PAGES.filter((p) => pageAllowed(p, user));
  const groups = ["Daily","Workspaces","Property","Records"];
  const cw = (k) => canWritePage(k, user);
  /* Everyone's edits persist; what each person may change is governed by the
     per-page gates (canWritePage + in-component rules). Every write is passed
     through the audit differ, so each add/edit/delete is recorded with the
     actor and device — no page can skip the trail. */
  const writeState = (updater) => {
    setState((s) => {
      const next = typeof updater === "function" ? updater(s) : updater;
      if (!next || next === s || !user) return next;
      let entries = auditDiff(s, next, user);
      if (!entries.length) return next;
      if (entries.length > 50) entries = [{ ts: Date.now(), by: user.name, byId: user.id, d: DEVICE_ID, col: "bulk", action: "bulk change", name: `${entries.length} records (import / merge / replace)`, fields: "" }];
      return { ...next, audit: [...entries, ...(next.audit || [])].slice(0, 500) };
    });
  };

  const Current = {
    overview: <Overview state={state} setState={writeState} user={user} goTo={setPage} liveStatus={liveStatus} />,
    tasks: <Tasks state={state} setState={writeState} user={user} />,
    approvals: <Approvals state={state} setState={writeState} user={user} />,
    announcements: <Announcements state={state} setState={writeState} user={user} />,
    tenants: <Tenants state={state} setState={writeState} canWrite={cw("tenants")} />,
    capex: <Capex state={state} setState={writeState} canWrite={cw("capex")} />,
    marketing: <MarketingStudio state={state} setState={writeState} user={user} />,
    adminops: <AdminOps state={state} setState={writeState} canWrite={cw("adminops")} />,
    drawings: <Drawings state={state} setState={writeState} canWrite={cw("drawings")} />,
    layout: <MallLayout state={state} setState={writeState} canWrite={cw("layout")} />,
    documents: <Documents state={state} setState={writeState} user={user} />,
    meetings: <MeetingStudio state={state} setState={writeState} user={user} />,
    constitution: <Constitution state={state} setState={writeState} user={user} />,
    import: <ImportStudio state={state} setState={writeState} user={user} liveStatus={liveStatus} />,
    security: <SecurityPage state={state} setState={writeState} user={user} liveStatus={liveStatus} />,
    team: <Team state={state} setState={writeState} user={user} liveStatus={liveStatus} authInfo={authInfo} />,
  }[page] || <Overview state={state} setState={writeState} user={user} goTo={setPage} liveStatus={liveStatus} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: SANS, display: "flex" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
      {isMobile && (
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={{
          position: "fixed", top: 12, left: 12, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 10, background: C.panel2, border: `1px solid ${C.line}`, cursor: "pointer",
        }}><Menu size={18} color={C.gold} /></button>
      )}
      {isMobile && navOpen && <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 39 }} />}
      <div style={{
        width: 226, flexShrink: 0, background: C.panel3, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column",
        ...(isMobile
          ? { position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40, transform: navOpen ? "translateX(0)" : "translateX(-105%)", transition: "transform .25s ease", boxShadow: navOpen ? "0 0 40px #000A" : "none" }
          : { position: "sticky", top: 0, height: "100vh" }),
      }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TTJMark size={36} />
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 15, color: C.text }}>The Town Junction</div>
              <div style={{ fontSize: 9, color: C.mute, letterSpacing: 1.6, textTransform: "uppercase" }}>Team OS · Karan Kothari Group</div>
              <div style={{ fontSize: 10, color: liveStatus === "on" ? C.green : C.faint, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{IS_CLOUD ? "Official channel" : liveStatus === "on" ? "● Live · shared" : liveStatus === "connecting" ? "Connecting…" : liveStatus === "needauth" ? "Sign in for live sync" : liveStatus === "denied" ? "Workspace access pending" : liveStatus === "error" ? "Live sync offline" : "Standalone · this device"}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 10, flex: 1, overflowY: "auto" }}>
          {groups.map((g) => {
            const pages = myPages.filter((p) => p.group === g);
            if (!pages.length) return null;
            return (
              <div key={g} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, padding: "4px 12px 4px" }}>{g}</div>
                {pages.map((p) => {
                  const Icon = p.icon;
                  const active = page === p.key;
                  return (
                    <div key={p.key} onClick={() => { setPage(p.key); if (isMobile) setNavOpen(false); }} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      background: active ? C.panel2 : "transparent", borderLeft: `3px solid ${active ? D.accent : "transparent"}`, marginBottom: 1,
                    }}>
                      <Icon size={15} color={active ? D.accent : C.mute} />
                      <span style={{ fontSize: 12.5, color: active ? C.text : C.mute }}>{p.label}</span>
                      {p.key === "approvals" && state.approvals.filter((x) => x.status === "Pending").length > 0 && (
                        <span style={{ marginLeft: "auto", fontSize: 10, color: C.bg, background: C.gold, borderRadius: 10, padding: "1px 6px", fontWeight: 700, ...NUM }}>{state.approvals.filter((x) => x.status === "Pending").length}</span>
                      )}
                      {p.key === "tasks" && state.tasks.filter((x) => x.assigneeId === user.id && x.status !== "Done").length > 0 && (
                        <span style={{ marginLeft: "auto", fontSize: 10, color: C.bg, background: D.accent, borderRadius: 10, padding: "1px 6px", fontWeight: 700, ...NUM }}>{state.tasks.filter((x) => x.assigneeId === user.id && x.status !== "Done").length}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 14, borderTop: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: `${D.accent}22`, border: `1px solid ${D.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: D.accent }}>{D.short}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: 9.5, color: C.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.subRole}</div>
            </div>
            <LogOut size={15} color={C.mute} style={{ cursor: "pointer" }} onClick={() => {
              setState((s) => { const k = `${user.id}|${DEVICE_ID}`; if (!s || !(s.sessions || {})[k]) return s; const { [k]: _gone, ...rest } = s.sessions; return { ...s, sessions: rest }; });
              saveSession(null); setUser(null);
            }} title="Sign out" />
          </div>
          <div style={{ fontSize: 10, color: saveTick.includes("⚠") ? C.red : C.green, marginTop: 8, height: 12 }}>{saveTick}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "64px 14px 60px" : "26px 26px 60px" }}>
        {isExternal(user) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, padding: "10px 14px", background: `${C.blue}14`, border: `1px solid ${C.blue}44`, borderRadius: 10, fontSize: 12.5, color: C.mute, lineHeight: 1.5 }}>
            <Eye size={15} color={C.blue} style={{ flexShrink: 0 }} />
            <span><b style={{ color: C.text }}>Partner access.</b> You can view your department's workspace and update your own deliverables and tasks; registers are maintained by the in-house team.</span>
          </div>
        )}
        {Current}
      </div>
    </div>
  );
}
