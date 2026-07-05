import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Store, HardHat, Layers, Megaphone, ClipboardCheck,
  DraftingCompass, ScrollText, Users, LogOut, Plus, Pencil, Trash2, X,
  Download, ShieldCheck, AlertTriangle, CheckCircle2, Circle, Building2,
  Landmark, KeyRound, ChevronRight, FileText, CalendarDays, Wrench, Search,
  ListChecks, Stamp, Bell, FolderOpen, NotebookPen, Send, ThumbsUp, ThumbsDown,
  Pin, Link as LinkIcon, Activity, Mic, Square, Sparkles, Loader2, FileAudio, MessageSquareText, Pause, Play,
  Menu,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

/* ================= THEME ================= */
const C = {
  bg: "#0C1016", panel: "#151C25", panel2: "#1B242F", panel3: "#10161E",
  line: "#26303C", lineSoft: "#1E2833",
  gold: "#D8A94B", goldDim: "#94743A",
  text: "#EDEAE2", mute: "#8C96A3", faint: "#5E6874",
  green: "#63B78C", amber: "#E0A23C", red: "#DA6E5C", blue: "#7FA9C9",
  purple: "#A98FD0", teal: "#6BB8B0", rose: "#C9808F",
};
const SERIF = "Georgia, 'Times New Roman', serif";
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
const isOwner = (u) => u.exec === "owner";
const isCEO = (u) => u.exec === "ceo";
const isHead = (u) => u.tier === "head";
const isExternal = (u) => u.tier === "external";

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
  { key: "team",         label: "Team & Access",      icon: Users,           group: "Records", depts: ["exec"] },
];
const pageAllowed = (p, u) => !p.depts || p.depts.includes(u.dept);

/* Registers each dept can WRITE. Externals never write registers (they act on tasks/content assigned to them). */
const WRITE_DEPT = {
  tenants: ["leasing"], capex: ["project"], marketing: ["marketing"],
  adminops: ["admin"], drawings: ["project", "design"], layout: ["leasing", "project"],
};
const canWritePage = (key, u) => {
  if (isExec(u)) return true;
  if (isExternal(u)) return false;
  return (WRITE_DEPT[key] || []).includes(u.dept);
};

/* ================= SEED DATA (KKBP CMA / Cockpit) ================= */
const CMA_TARGET_L = 541;

const SEED_USERS = [
  { id: "u1",  name: "Rishi Kothari",        dept: "exec",      subRole: "Owner / Promoter",                 tier: "head",     exec: "owner", username: "rishi",                  password: "7001" },
  { id: "u2",  name: "CEO",                  dept: "exec",      subRole: "Chief Executive Officer",          tier: "head",     exec: "ceo",   username: "ceo",                    password: "7002" },
  { id: "u3",  name: "Leasing Head",         dept: "leasing",   subRole: "Head of Leasing",                  tier: "head",     username: "leasing.head",           password: "7003" },
  { id: "u4",  name: "Leasing Executive",    dept: "leasing",   subRole: "Leasing Executive",                tier: "member",   username: "leasing.exec",           password: "7103" },
  { id: "u5",  name: "Channel Partner",      dept: "leasing",   subRole: "Broker / Channel Partner",         tier: "external", username: "channel.partner",        password: "7203" },
  { id: "u6",  name: "Marketing Head",       dept: "marketing", subRole: "Head of Marketing",                tier: "head",     username: "marketing.head",         password: "7004" },
  { id: "u7",  name: "Content Executive",    dept: "marketing", subRole: "In-house Content Team",            tier: "member",   username: "content.exec",           password: "7104" },
  { id: "u8",  name: "Marketing Intern",     dept: "marketing", subRole: "Intern — KKBP",                    tier: "member",   username: "marketing.intern",       password: "7114" },
  { id: "u9",  name: "INIT — Copywriter",    dept: "marketing", subRole: "INIT Design Studio · Copywriting", tier: "external", username: "init.copy",              password: "7124" },
  { id: "u10", name: "INIT — Designer",      dept: "marketing", subRole: "INIT Design Studio · Design",      tier: "external", username: "init.design",            password: "7134" },
  { id: "u11", name: "OCDS — Digital",       dept: "marketing", subRole: "OCDS Design Studio · Digital Media", tier: "external", username: "ocds.digital",           password: "7144" },
  { id: "u12", name: "Admin Head",           dept: "admin",     subRole: "Head of Admin & Operations",       tier: "head",     username: "admin.head",             password: "7005" },
  { id: "u13", name: "Facility Executive",   dept: "admin",     subRole: "Facility & Vendor Management",     tier: "member",   username: "facility.exec",          password: "7105" },
  { id: "u14", name: "Project Head",         dept: "project",   subRole: "Head of Projects",                 tier: "head",     username: "project.head",           password: "7006" },
  { id: "u15", name: "Site Engineer",        dept: "project",   subRole: "Site Engineering",                 tier: "member",   username: "site.engineer",          password: "7106" },
  { id: "u16", name: "Principal Architect",  dept: "design",    subRole: "Principal Architect",              tier: "head",     username: "architect",              password: "7007" },
  { id: "u17", name: "MEP Consultant",       dept: "design",    subRole: "MEP Consultant (HVAC/Elec/PHE)",   tier: "external", username: "mep.consultant",         password: "7107" },
  { id: "u18", name: "Structural Consultant",dept: "design",    subRole: "Structural Consultant",            tier: "external", username: "structural.consultant",  password: "7117" },
];

const TENANT_CATS = ["Anchor Retail","Anchor Brand","Vanilla Retail","F&B","Entertainment","Department Store","Services","Pool / Unallocated"];
const DEALS = ["Pure Rent","Rev Share (area)","MRG + Rev Share","Rev Share (turnover)","Self-Operated"];
const TSTATUS = ["Lead","LOI Signed","Agreement","Fit-out","Operational","On Hold"];
const TSTATUS_COLOR = { "Lead": C.faint, "LOI Signed": C.blue, "Agreement": C.purple, "Fit-out": C.amber, "Operational": C.green, "On Hold": C.red };

const SEED_TENANTS = [
  { id:"T1", name:"KKJPL + Parekh", category:"Anchor Retail", area:50000, deal:"Pure Rent", rent:100, density:0, share:0, mrg:0, salesL:0, status:"Operational", floor:"Ground", poc:"", notes:"Group anchor — jewellery flagship." },
  { id:"T2", name:"Rochaldas", category:"Anchor Retail", area:50000, deal:"Pure Rent", rent:22, density:0, share:0, mrg:0, salesL:0, status:"Agreement", floor:"First", poc:"", notes:"" },
  { id:"T3", name:"Food Court", category:"F&B", area:10000, deal:"Pure Rent", rent:70, density:0, share:0, mrg:0, salesL:0, status:"Fit-out", floor:"Third", poc:"", notes:"Multi-counter FEC-adjacent food court." },
  { id:"T4", name:"Ashish NX", category:"Department Store", area:0, deal:"Rev Share (turnover)", rent:0, density:0, share:8, mrg:0, salesL:500, status:"LOI Signed", floor:"Second", poc:"", notes:"8% of turnover, est. ₹500L/mo sales." },
  { id:"T5", name:"Chunmun", category:"Anchor Brand", area:30000, deal:"Rev Share (area)", rent:0, density:1200, share:12, mrg:0, salesL:0, status:"Agreement", floor:"First", poc:"", notes:"12% share on ₹1,200/sft trade density." },
  { id:"T6", name:"Other Brands — POOL", category:"Pool / Unallocated", area:350000, deal:"Rev Share (area)", rent:0, density:900, share:10, mrg:0, salesL:0, status:"Lead", floor:"Multiple", poc:"", notes:"Placeholder pool. Replace with signed leases as closed." },
  { id:"T7", name:"Game Zone (Self-Op)", category:"Entertainment", area:25000, deal:"Self-Operated", rent:0, density:0, share:0, mrg:0, salesL:82, status:"Fit-out", floor:"Third", poc:"", notes:"FEC. ~273 footfall/day × ₹1,000 spend." },
  { id:"T8", name:"Connplex Miniplex", category:"Entertainment", area:8000, deal:"Rev Share (turnover)", rent:0, density:0, share:15, mrg:0, salesL:107, status:"Agreement", floor:"Third", poc:"", notes:"4-screen miniplex. KKBP share of gross box collection." },
];

const CAPEX_CATS = ["Civil & Structure","Facade & Exteriors","MEP (HVAC/Electrical/Plumbing)","Lifts & Escalators","Interiors & Common Areas","Game Zone Equipment","Multiplex Fit-out","Food Court Fit-out","IT, CCTV & Systems","FF&E & Signage","Parking & External Dev","Launch & Marketing Capex"];
const CSTATUS = ["Planned","Approved","Tendered","In Progress","Complete"];
const CSTATUS_COLOR = { Planned: C.faint, Approved: C.blue, Tendered: C.purple, "In Progress": C.amber, Complete: C.green };

const SEED_CAPEX = [
  { id:"C1", name:"Core civil works — towers & podium", category:"Civil & Structure", budgetL:5200, spentL:4680, status:"In Progress", owner:"Project Head", vendor:"", due:"2026-10-31", notes:"" },
  { id:"C2", name:"Facade glazing & ACP", category:"Facade & Exteriors", budgetL:1400, spentL:520, status:"In Progress", owner:"Project Head", vendor:"", due:"2026-11-30", notes:"" },
  { id:"C3", name:"HVAC central plant + distribution", category:"MEP (HVAC/Electrical/Plumbing)", budgetL:1800, spentL:610, status:"In Progress", owner:"Project Head", vendor:"", due:"2026-12-15", notes:"" },
  { id:"C4", name:"Lifts & escalators package", category:"Lifts & Escalators", budgetL:950, spentL:190, status:"Tendered", owner:"Project Head", vendor:"", due:"2027-01-15", notes:"" },
  { id:"C5", name:"Game zone arcade / VR equipment (import)", category:"Game Zone Equipment", budgetL:1500, spentL:0, status:"Approved", owner:"Owner", vendor:"Shenzhen suppliers", due:"2027-02-28", notes:"EPCG route under evaluation — clear licence before LC." },
  { id:"C6", name:"Miniplex fit-out (Connplex spec)", category:"Multiplex Fit-out", budgetL:256, spentL:0, status:"Approved", owner:"Project Head", vendor:"Connplex", due:"2027-02-28", notes:"₹3,200/sft × 8,000 sft." },
  { id:"C7", name:"Food court kitchens & seating", category:"Food Court Fit-out", budgetL:350, spentL:0, status:"Planned", owner:"Project Head", vendor:"", due:"2027-03-15", notes:"" },
  { id:"C8", name:"CCTV, BMS, Wi-Fi & footfall counters", category:"IT, CCTV & Systems", budgetL:220, spentL:0, status:"Planned", owner:"Admin Head", vendor:"", due:"2027-03-31", notes:"" },
  { id:"C9", name:"Signage, wayfinding & atrium FF&E", category:"FF&E & Signage", budgetL:180, spentL:0, status:"Planned", owner:"Marketing Head", vendor:"", due:"2027-03-31", notes:"" },
  { id:"C10", name:"Launch campaign capex", category:"Launch & Marketing Capex", budgetL:150, spentL:0, status:"Planned", owner:"Marketing Head", vendor:"INIT Design Studio", due:"2027-04-15", notes:"North Nagpur. Next Nagpur." },
];

const SEED_CAMPAIGNS = [
  { id:"M1", name:"North Nagpur. Next Nagpur. — teaser", phase:"Pre-launch", channel:"OOH + Digital", start:"2026-09-01", end:"2026-11-30", budgetL:35, spentL:8, status:"In Progress", owner:"Marketing Head", kpi:"Reach 15L impressions" },
  { id:"M2", name:"Anchor announcement series", phase:"Pre-launch", channel:"PR + Social", start:"2026-11-01", end:"2027-01-31", budgetL:20, spentL:0, status:"Planned", owner:"Marketing Head", kpi:"3 anchor reveals" },
  { id:"M3", name:"Grand launch weekend", phase:"Launch", channel:"Event + Media", start:"2027-04-01", end:"2027-04-30", budgetL:60, spentL:0, status:"Planned", owner:"Marketing Head", kpi:"1L footfall in month 1" },
  { id:"M4", name:"Game zone school-season drive", phase:"Post-launch", channel:"Schools + Digital", start:"2027-06-01", end:"2027-07-31", budgetL:12, spentL:0, status:"Planned", owner:"Marketing Head", kpi:"273 avg daily footfall" },
];

const CONTENT_TYPES = ["Copy","Design / Creative","Digital Ad","Social Post","Video / Reel","PR / Article","OOH Artwork"];
const CONTENT_STATUS = ["Brief","In Production","Internal Review","Head Approval","Approved","Published"];
const CONTENT_COLOR = { Brief: C.faint, "In Production": C.amber, "Internal Review": C.blue, "Head Approval": C.purple, Approved: C.green, Published: C.teal };
const SEED_CONTENT = [
  { id:"CT1", title:"Teaser hoarding — Ring Road x2", type:"OOH Artwork", campaign:"North Nagpur. Next Nagpur. — teaser", assigneeId:"u10", due:"2026-07-20", status:"In Production", brief:"Hero line + skyline render, night-lit mock.", link:"" },
  { id:"CT2", title:"Launch manifesto copy (EN + Marathi + Hindi)", type:"Copy", campaign:"North Nagpur. Next Nagpur. — teaser", assigneeId:"u9", due:"2026-07-15", status:"Internal Review", brief:"120 words. Aspirational, rooted in Nagpur pride.", link:"" },
  { id:"CT3", title:"Instagram countdown grid — 9 posts", type:"Social Post", campaign:"Anchor announcement series", assigneeId:"u11", due:"2026-08-01", status:"Brief", brief:"OCDS to storyboard; reveal cadence with Leasing.", link:"" },
  { id:"CT4", title:"Game zone walkthrough reel", type:"Video / Reel", campaign:"Grand launch weekend", assigneeId:"u7", due:"2026-09-10", status:"Brief", brief:"30s vertical; shoot after arcade install.", link:"" },
];

const SEED_COMPLIANCE = [
  { id:"A1", name:"Occupancy Certificate (OC)", authority:"NMC", due:"2027-02-28", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A2", name:"Fire NOC — final", authority:"Fire Dept, Nagpur", due:"2027-01-31", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A3", name:"Lift licences (all units)", authority:"PWD Inspectorate", due:"2027-02-15", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A4", name:"FSSAI — food court master licence", authority:"FSSAI", due:"2027-03-01", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A5", name:"Cinema operating licence", authority:"Collectorate", due:"2027-03-10", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A6", name:"Amusement / game zone licence", authority:"Collectorate", due:"2027-03-10", status:"Open", owner:"Admin Head", type:"Statutory" },
  { id:"A7", name:"Property insurance — CAR to operational", authority:"Insurer", due:"2027-03-31", status:"Open", owner:"Admin Head", type:"Commercial" },
  { id:"A8", name:"DG set & pollution consent", authority:"MPCB", due:"2027-01-20", status:"Open", owner:"Admin Head", type:"Statutory" },
];
const SEED_VENDORS = [
  { id:"V1", name:"Housekeeping agency", scope:"Mall housekeeping", contractL:6, cycle:"Monthly", status:"To Appoint", owner:"Admin Head" },
  { id:"V2", name:"Security agency", scope:"24×7 security, 3 shifts", contractL:9, cycle:"Monthly", status:"To Appoint", owner:"Admin Head" },
  { id:"V3", name:"HVAC AMC", scope:"Central plant O&M", contractL:2.5, cycle:"Monthly", status:"To Appoint", owner:"Admin Head" },
  { id:"V4", name:"Lift AMC", scope:"Comprehensive AMC", contractL:1.5, cycle:"Monthly", status:"To Appoint", owner:"Admin Head" },
];
const SEED_DRAWINGS = [
  { id:"D1", code:"KKBP-AR-GF-101", title:"Ground floor GFC plan", discipline:"Architecture", rev:"R3", status:"GFC Issued", date:"2026-05-12" },
  { id:"D2", code:"KKBP-AR-FF-102", title:"First floor GFC plan", discipline:"Architecture", rev:"R2", status:"GFC Issued", date:"2026-05-12" },
  { id:"D3", code:"KKBP-ST-PD-210", title:"Podium PT slab details", discipline:"Structure", rev:"R4", status:"GFC Issued", date:"2026-04-02" },
  { id:"D4", code:"KKBP-MEP-HV-310", title:"HVAC ducting — 3rd floor FEC", discipline:"MEP", rev:"R1", status:"For Review", date:"2026-06-20" },
  { id:"D5", code:"KKBP-ID-AT-401", title:"Atrium interiors concept", discipline:"Interiors", rev:"R0", status:"Concept", date:"2026-06-25" },
];
const SEED_RFIS = [
  { id:"R1", title:"Escalator pit depth vs vendor spec mismatch", raisedBy:"Project Head", assignedTo:"Principal Architect", priority:"High", status:"Open", date:"2026-06-22" },
  { id:"R2", title:"Miniplex acoustic wall detail — confirm STC rating", raisedBy:"Principal Architect", assignedTo:"MEP Consultant", priority:"Medium", status:"Open", date:"2026-06-28" },
];

const FLOORS = ["Lower Ground","Ground","First","Second","Third","Terrace"];
const SEED_ZONES = [
  { id:"Z1", floor:"Ground", name:"KKJPL + Parekh flagship", areaSft:50000, tenantId:"T1", use:"Anchor Retail" },
  { id:"Z2", floor:"Ground", name:"High-street retail strip", areaSft:40000, tenantId:"T6", use:"Vanilla Retail" },
  { id:"Z3", floor:"First", name:"Chunmun", areaSft:30000, tenantId:"T5", use:"Anchor Brand" },
  { id:"Z4", floor:"First", name:"Rochaldas", areaSft:50000, tenantId:"T2", use:"Anchor Retail" },
  { id:"Z5", floor:"First", name:"Vanilla retail — north wing", areaSft:30000, tenantId:"T6", use:"Vanilla Retail" },
  { id:"Z6", floor:"Second", name:"Ashish NX", areaSft:45000, tenantId:"T4", use:"Department Store" },
  { id:"Z7", floor:"Second", name:"Vanilla retail — south wing", areaSft:60000, tenantId:"T6", use:"Vanilla Retail" },
  { id:"Z8", floor:"Third", name:"Game Zone (FEC)", areaSft:25000, tenantId:"T7", use:"Entertainment" },
  { id:"Z9", floor:"Third", name:"Connplex Miniplex", areaSft:8000, tenantId:"T8", use:"Entertainment" },
  { id:"Z10", floor:"Third", name:"Food Court", areaSft:10000, tenantId:"T3", use:"F&B" },
  { id:"Z11", floor:"Lower Ground", name:"Parking + services", areaSft:80000, tenantId:null, use:"Services" },
  { id:"Z12", floor:"Terrace", name:"Events terrace / F&B decks", areaSft:20000, tenantId:null, use:"F&B" },
  { id:"Z13", floor:"Second", name:"Vacant — west block", areaSft:35000, tenantId:null, use:"Vanilla Retail" },
];

const SEED_TASKS = [
  { id:"K1", title:"Convert Ashish NX LOI to agreement", dept:"leasing", assigneeId:"u3", createdById:"u2", due:"2026-07-15", priority:"High", status:"In Progress", notes:"Legal draft with tenant since 28 Jun." },
  { id:"K2", title:"Rate card for vanilla retail — 2nd floor west block", dept:"leasing", assigneeId:"u4", createdById:"u3", due:"2026-07-10", priority:"Medium", status:"Open", notes:"" },
  { id:"K3", title:"Teaser hoarding artwork — final files to printer", dept:"marketing", assigneeId:"u10", createdById:"u6", due:"2026-07-18", priority:"High", status:"Open", notes:"Pending Head Approval in Content Studio." },
  { id:"K4", title:"Fire NOC — submit revised sprinkler layout", dept:"admin", assigneeId:"u12", createdById:"u2", due:"2026-07-12", priority:"High", status:"In Progress", notes:"Needs MEP consultant's stamped drawing." },
  { id:"K5", title:"Escalator pit RFI — issue revised detail", dept:"design", assigneeId:"u16", createdById:"u14", due:"2026-07-08", priority:"High", status:"Open", notes:"Blocking lift package award." },
  { id:"K6", title:"Monthly capex reconciliation — June", dept:"project", assigneeId:"u15", createdById:"u14", due:"2026-07-07", priority:"Medium", status:"Open", notes:"" },
];

const APPROVAL_TYPES = ["Capex / Purchase","Lease deviation","Campaign / Marketing spend","Admin / Ops expense","Design change order","Other"];
const SEED_APPROVALS = [
  { id:"P1", title:"Award lift & escalator package — L1 bidder", type:"Capex / Purchase", amountL:950, dept:"project", raisedById:"u14", status:"Pending", decidedById:null, dateRaised:"2026-07-01", dateDecided:"", notes:"L1 within budget. Pit RFI to close before mobilisation advance." },
  { id:"P2", title:"Rent-free extension 90 days — 2nd floor F&B unit", type:"Lease deviation", amountL:0, dept:"leasing", raisedById:"u3", status:"Pending", decidedById:null, dateRaised:"2026-07-02", dateDecided:"", notes:"Beyond 60-day limit per constitution §4 — needs CEO + Owner." },
  { id:"P3", title:"OCDS retainer — digital media, 6 months", type:"Campaign / Marketing spend", amountL:9, dept:"marketing", raisedById:"u6", status:"Pending", decidedById:null, dateRaised:"2026-07-03", dateDecided:"", notes:"₹1.5L/mo × 6." },
];

const SEED_ANNOUNCEMENTS = [
  { id:"N1", title:"This dashboard is now the official channel", body:"From today, all tasks, approvals, briefs, MOMs and documents live here. If it is not in the system, it did not happen. WhatsApp is for alerts only — decisions and deliverables are recorded here.", byId:"u1", date:"2026-07-01", pinned:true },
  { id:"N2", title:"Monday stand-up moves to 10:00 sharp", body:"Leadership stand-up every Monday 10:00, this dashboard on screen. Department heads present from their workspace pages. 30 minutes, hard stop.", byId:"u2", date:"2026-07-02", pinned:false },
];

const SEED_MEETINGS = [
  { id:"G1", title:"Leadership stand-up — Week 27", date:"2026-06-29", dept:"exec", attendees:"Owner, CEO, all heads", mom:"Leasing: Ashish NX legal in progress. Projects: civil 90%, facade 37%. Marketing: teaser live on OOH. Admin: Fire NOC resubmission this week. Design: escalator pit RFI is the top blocker.", actions:"1) Architect to issue pit detail by 8 Jul. 2) Leasing to circulate 2F rate card by 10 Jul. 3) Admin to confirm NOC submission date." },
];

const DOC_CATS = ["Legal & Agreements","Bank & CMA","Design & Drawings","Marketing & Brand","Licences & Compliance","Vendor Contracts","MOMs & Reports","Other"];
const SEED_DOCS = [
  { id:"F1", name:"CMA — KKBP term loan (final)", dept:"exec", category:"Bank & CMA", url:"", addedById:"u1", date:"2026-05-01" },
  { id:"F2", name:"Chunmun LOI — signed scan", dept:"leasing", category:"Legal & Agreements", url:"", addedById:"u3", date:"2026-06-10" },
  { id:"F3", name:"Brand book — North Nagpur. Next Nagpur.", dept:"marketing", category:"Marketing & Brand", url:"", addedById:"u6", date:"2026-06-15" },
];

const CONSTITUTION = [
  { id: "S1", title: "1. Purpose", body: "Karan Kothari Business Park (KKBP) exists to build North Nagpur's defining commercial destination while protecting the Karan Kothari Group's capital, credit standing and four-decade reputation. Every decision is tested against three questions: does it serve the customer, does it protect DSCR, and would we be comfortable explaining it to our bankers." },
  { id: "S2", title: "2. Values", body: "Integrity before opportunity — no commitment we cannot honour. Speed with documentation — move fast, but every deal, change order and approval leaves a paper trail in this system. Tenant success is our revenue — a majority of our income is revenue-share; we win when tenants trade well. One team — leasing, marketing, projects, admin and design share one dashboard and one truth." },
  { id: "S3", title: "3. Role charters", body: "OWNER: capital allocation, banking relationships, final authority on anchor deals and capex above delegation limits. CEO: runs the operating cadence, owns the P&L vs CMA plan, arbitrates cross-functional conflicts. LEASING HEAD: owns the rent roll — pipeline, LOIs, agreements, escalations; the team (executives, channel partners) feeds the pipeline but only the Head commits terms. MARKETING HEAD: owns footfall and the launch calendar; directs the in-house content team, interns, and agency partners (INIT Design Studio for brand/creative, OCDS Design Studio for digital media) through the Content Studio; agencies deliver, the Head approves. ADMIN HEAD: owns statutory compliance, licences, insurance, vendors/AMCs and operations readiness. PROJECT HEAD: owns capex budget vs actual, works schedule and handover dates; no scope change without a change-order approval. PRINCIPAL ARCHITECT: owns drawing integrity — GFC discipline, design intent through fit-out; MEP and structural consultants answer RFIs inside 5 working days." },
  { id: "S4", title: "4. Delegation of Authority", body: "Spend approvals — up to ₹5L: department head. ₹5L–₹25L: CEO. Above ₹25L or any anchor lease/rate deviation: Owner. Lease approvals — vanilla retail at rack rate: Leasing Head. Any deviation from rate card, rent-free beyond 60 days, or anchor terms: CEO + Owner. All requests are raised on the Approvals page and decided there — a verbal yes is not an approval." },
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
const migrateState = (st) => ({
  ...st,
  users: (st.users || []).map((u) => ({ ...u, username: u.username || slugUser(u.name), password: u.password || u.pin || "0000" })),
});

/* ================= LIVE SYNC (shared workspace via Firebase Firestore) =================
   When the Owner pastes a Firebase config in Team & Access, every device reads and
   writes one shared Firestore document and receives everyone else's changes live.
   Without a config the app runs standalone on this device (localStorage). */
const FB_KEY = "kkbp-firebase-config";
const loadFbConfig = () => { try { return JSON.parse(localStorage.getItem(FB_KEY) || "null"); } catch (e) { return null; } };
const saveFbConfig = (cfg) => { try { if (cfg) localStorage.setItem(FB_KEY, JSON.stringify(cfg)); else localStorage.removeItem(FB_KEY); } catch (e) {} };
const CLIENT_ID = Math.random().toString(36).slice(2, 10);
let fbDocRef = null, fbSetDoc = null;
async function connectLive(cfg, onSnap) {
  const { initializeApp } = await import("firebase/app");
  const { getFirestore, doc, onSnapshot, setDoc } = await import("firebase/firestore");
  const app = initializeApp(cfg);
  const db = getFirestore(app);
  fbDocRef = doc(db, "kkbp", "state");
  fbSetDoc = setDoc;
  return onSnapshot(fbDocRef,
    (snap) => {
      const d = snap.data();
      onSnap({ exists: !!(d && d.data), by: d ? d.by : null, data: d ? d.data : null });
    },
    (err) => { console.error("live sync error", err); onSnap({ error: true }); });
}
async function pushLive(state) {
  if (!fbDocRef || !fbSetDoc) return false;
  try { await fbSetDoc(fbDocRef, { data: JSON.stringify(state), by: CLIENT_ID, ts: Date.now() }); return true; }
  catch (e) { console.error("live save failed", e); return false; }
}

const loadApiKey = () => { if (IS_CLOUD) return ""; try { return localStorage.getItem("kkbp-anthropic-key") || ""; } catch (e) { return ""; } };
const storeApiKey = (k) => { if (!IS_CLOUD) { try { localStorage.setItem("kkbp-anthropic-key", k); } catch (e) {} } };
const freshState = () => ({
  users: SEED_USERS, tenants: SEED_TENANTS, capex: SEED_CAPEX,
  campaigns: SEED_CAMPAIGNS, content: SEED_CONTENT,
  compliance: SEED_COMPLIANCE, vendors: SEED_VENDORS,
  drawings: SEED_DRAWINGS, rfis: SEED_RFIS, zones: SEED_ZONES,
  tasks: SEED_TASKS, approvals: SEED_APPROVALS, announcements: SEED_ANNOUNCEMENTS,
  meetings: SEED_MEETINGS, docs: SEED_DOCS,
  aiKey: "",
  log: [{ ts: Date.now(), by: "System", text: "KKBP Team OS v2 initialised — official channel live." }],
  acks: {}, constitutionVersion: 2,
});

/* ================= CALCS & HELPERS ================= */
function tenantMonthlyL(t) {
  const area = +t.area || 0;
  if (t.deal === "Pure Rent") return (area * (+t.rent || 0)) / 1e5;
  if (t.deal === "Rev Share (area)") return (area * (+t.density || 0) * ((+t.share || 0) / 100)) / 1e5;
  if (t.deal === "MRG + Rev Share") return Math.max(area * (+t.mrg || 0), area * (+t.density || 0) * ((+t.share || 0) / 100)) / 1e5;
  if (t.deal === "Rev Share (turnover)") return (+t.salesL || 0) * ((+t.share || 0) / 100);
  if (t.deal === "Self-Operated") return +t.salesL || 0;
  return 0;
}
const fmtL = (v) => `₹${(+v || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
const fmtCr = (vL) => `₹${((+vL || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const fmtSft = (v) => `${(+v || 0).toLocaleString("en-IN")} sft`;
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
    background: ghost ? "transparent" : (tone || C.gold), color: ghost ? (tone || C.gold) : "#0C1016",
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
function Login({ users, onLogin, liveOn }) {
  const [un, setUn] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const tryLogin = () => {
    const u = users.find((x) => (x.username || "").toLowerCase() === un.trim().toLowerCase());
    if (!u || (u.password || "") !== pw) {
      setErr("Incorrect username or password. Ask the Owner if you need a reset.");
      setPw("");
      return;
    }
    onLogin(u);
  };
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 70% -10%, #1A2330 0%, ${C.bg} 55%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: SANS }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 54, height: 54, margin: "0 auto 14px", borderRadius: 12, border: `1px solid ${C.gold}66`, display: "flex", alignItems: "center", justifyContent: "center", background: "#161D27" }}>
            <Landmark size={26} color={C.gold} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: C.gold }}>The Town Junction · Nagpur</div>
          <div style={{ fontFamily: SERIF, fontSize: 34, color: C.text, marginTop: 6 }}>TTJ Team OS</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 6 }}>The official channel. Sign in to take your seat.</div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22 }}>
          <Field label="Username">
            <Inp value={un} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => { setUn(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="e.g. rishi" />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Password">
              <Inp type="password" value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="••••••••" />
            </Field>
          </div>
          {err && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>{err}</div>}
          <div style={{ marginTop: 18 }}>
            <Btn onClick={tryLogin} disabled={!un.trim() || !pw}><KeyRound size={14} /> Sign in</Btn>
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
function Overview({ state, setState, user, goTo }) {
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
  const canCreate = !isExternal(user) || true; /* externals may raise tasks for themselves */
  const visible = state.tasks.filter((k) => {
    if (view === "mine") return k.assigneeId === user.id;
    if (view === "dept") return isExec(user) ? true : k.dept === user.dept;
    return isExec(user) || isHead(user);
  }).filter((k) => (isExternal(user) ? k.assigneeId === user.id || k.createdById === user.id : true));
  const canEditTask = (k) => isExec(user) || (isHead(user) && k.dept === user.dept) || k.createdById === user.id;
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
const requiredApprover = (p) => {
  if (p.type === "Lease deviation") return { text: "CEO + Owner", color: C.gold };
  const a = +p.amountL || 0;
  if (a > 25) return { text: "Owner", color: C.gold };
  if (a > 5) return { text: "CEO", color: C.purple };
  return { text: "Dept Head", color: C.blue };
};
function Approvals({ state, setState, user }) {
  const [edit, setEdit] = useState(null);
  const canDecide = (p) => {
    if (p.status !== "Pending") return false;
    if (isOwner(user)) return true;
    if (p.type === "Lease deviation") return false; /* owner only (records CEO concurrence in notes) */
    const a = +p.amountL || 0;
    if (isCEO(user)) return a <= 25;
    return isHead(user) && user.dept === p.dept && a <= 5;
  };
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
      <SectionTitle eyebrow="Daily" title="Approvals" sub="Money and deviations move only through this page, routed per the Delegation of Authority (§4). A verbal yes is not an approval." />
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
  const canPost = isExec(user) || isHead(user);
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
              {(isExec(user) || a.byId === user.id) && <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
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
const blankTenant = () => ({ id: "", name: "", category: "Vanilla Retail", area: 0, deal: "Pure Rent", rent: 0, density: 0, share: 0, mrg: 0, salesL: 0, status: "Lead", floor: "Ground", poc: "", notes: "" });

function Tenants({ state, setState, canWrite }) {
  const [edit, setEdit] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [filterSt, setFilterSt] = useState("All");
  const [q, setQ] = useState("");
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {TSTATUS.map((st) => {
          const n = state.tenants.filter((t) => t.status === st).length;
          return <Badge key={st} text={`${st}: ${n}`} color={TSTATUS_COLOR[st]} />;
        })}
      </div>

      <Card pad={0}>
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
      </Card>

      {edit && (
        <Modal title={edit.id ? `Edit — ${edit.name}` : "Add tenant"} onClose={() => setEdit(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="Tenant name"><Inp value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Category"><Sel value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={TENANT_CATS} /></Field>
            <Field label="Floor"><Sel value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })} options={[...FLOORS, "Multiple"]} /></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={TSTATUS} /></Field>
            <Field label="Area (sft)"><Inp type="number" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} /></Field>
            <Field label="Deal structure"><Sel value={edit.deal} onChange={(e) => setEdit({ ...edit, deal: e.target.value })} options={DEALS} /></Field>
            {edit.deal === "Pure Rent" && <Field label="Rent (₹/sft/mo)"><Inp type="number" value={edit.rent} onChange={(e) => setEdit({ ...edit, rent: e.target.value })} /></Field>}
            {(edit.deal === "Rev Share (area)" || edit.deal === "MRG + Rev Share") && <>
              <Field label="Trade density (₹/sft/mo)"><Inp type="number" value={edit.density} onChange={(e) => setEdit({ ...edit, density: e.target.value })} /></Field>
              <Field label="Revenue share %"><Inp type="number" value={edit.share} onChange={(e) => setEdit({ ...edit, share: e.target.value })} /></Field>
            </>}
            {edit.deal === "MRG + Rev Share" && <Field label="MRG (₹/sft/mo)"><Inp type="number" value={edit.mrg} onChange={(e) => setEdit({ ...edit, mrg: e.target.value })} /></Field>}
            {edit.deal === "Rev Share (turnover)" && <>
              <Field label="Est. monthly sales (₹L)"><Inp type="number" value={edit.salesL} onChange={(e) => setEdit({ ...edit, salesL: e.target.value })} /></Field>
              <Field label="Revenue share %"><Inp type="number" value={edit.share} onChange={(e) => setEdit({ ...edit, share: e.target.value })} /></Field>
            </>}
            {edit.deal === "Self-Operated" && <Field label="Net contribution (₹L/mo)"><Inp type="number" value={edit.salesL} onChange={(e) => setEdit({ ...edit, salesL: e.target.value })} /></Field>}
            <Field label="Point of contact"><Inp value={edit.poc} onChange={(e) => setEdit({ ...edit, poc: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Notes"><Ta value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.mute }}>Computed income: <span style={{ color: C.gold, ...NUM }}>{fmtL(tenantMonthlyL(edit))}/mo</span></div>
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

function MallLayout({ state, setState, canWrite }) {
  const [edit, setEdit] = useState(null);
  const [selZone, setSelZone] = useState(null);
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
  const head = isExec(user) || (user.dept === "marketing" && isHead(user));
  const internalMkt = user.dept === "marketing" && !ext;
  const canManageCampaigns = isExec(user) || (internalMkt && isHead(user));
  const canBrief = isExec(user) || internalMkt; /* head + content team + intern create briefs */
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
    if (ext && c.assigneeId === user.id) return ["In Production","Internal Review"].filter((x) => x !== c.status);
    if (head) return CONTENT_STATUS.filter((x) => x !== c.status);
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
  const canAdd = !ext || true; /* externals may file deliverables in their dept */
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
                  <Td style={{ fontWeight: 600 }}>{d.name}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{d.category}</Td>
                  <Td><Badge text={DEPTS[d.dept]?.short || d.dept} color={DEPTS[d.dept]?.accent || C.faint} /></Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{uName(state, d.addedById)}</Td>
                  <Td style={{ color: C.mute, fontSize: 12 }}>{d.date}</Td>
                  <Td>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><LinkIcon size={11} /> Open</a> : <span style={{ color: C.faint, fontSize: 12 }}>No link</span>}</Td>
                  <Td right>
                    {(isExec(user) || d.addedById === user.id) && <>
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
  const [apiKey, setApiKey] = useState(loadApiKey());
  const [needKey, setNeedKey] = useState(false);
  const effKey = ((state.aiKey || "").trim()) || apiKey;
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
    setAiBusy(true); setAiErr(""); setNeedKey(false);
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
        setNeedKey(true);
        setAiErr("Standalone mode needs an Anthropic API key for the AI analysis (console.anthropic.com → API keys). It's stored only in this browser.");
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
                {(isExec(user) || m.recordedById === user.id) && <Trash2 size={14} color={C.red} style={{ cursor: "pointer" }} onClick={() => delMeeting(m.id)} />}
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
              {(isExec(user) || (!isExternal(user) && m.dept === user.dept)) && <div style={{ display: "flex", gap: 10 }}>
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
          {(needKey || (!IS_CLOUD && !effKey)) && (
            <div style={{ marginTop: 12 }}>
              <Field label="Anthropic API key (or ask the Owner to set the team key in Team & Access)">
                <Inp type="password" value={apiKey} placeholder="sk-ant-…"
                  onChange={(e) => { setApiKey(e.target.value.trim()); storeApiKey(e.target.value.trim()); }} />
              </Field>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Btn onClick={runAI} disabled={aiBusy || !transcriptDraft.trim()}>
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

/* ================= TEAM & ACCESS ================= */
function Team({ state, setState, user, liveStatus }) {
  const [edit, setEdit] = useState(null);
  const [cfgText, setCfgText] = useState("");
  const canWrite = isOwner(user);
  const save = () => {
    const un = (edit.username || "").trim().toLowerCase();
    if (state.users.some((u) => u.id !== edit.id && (u.username || "").toLowerCase() === un)) return alert("That username is already in use.");
    const rec = { ...edit, username: un, id: edit.id || uid() };
    setState((s) => withLog(
      { ...s, users: edit.id ? s.users.map((u) => (u.id === edit.id ? rec : u)) : [...s.users, rec] },
      user.name, `${edit.id ? "updated" : "added"} team member ${rec.name}`));
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
  const deptOrder = ["exec","leasing","marketing","project","design","admin"];
  return (
    <div>
      <SectionTitle eyebrow="Access control" title="Team & Access" sub="Departments, sub-roles and tiers. Heads run their department; team members work registers; externals (agencies, consultants, brokers) see only their deliverables." />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <Btn ghost onClick={exportJson}><Download size={14} /> Export all data (JSON)</Btn>
        {canWrite && <label style={{ display: "inline-flex" }}>
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={importJson} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "transparent", color: C.gold, border: `1px solid ${C.gold}66`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: SANS }}><FileAudio size={14} style={{display:"none"}} /><Download size={14} style={{ transform: "rotate(180deg)" }} /> Import JSON</span>
        </label>}
        {canWrite && <Btn onClick={() => setEdit({ id: "", name: "", dept: "leasing", subRole: "", tier: "member", username: "", password: "" })}><Plus size={14} /> Add member</Btn>}
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
                    <Td style={{ color: C.mute }}>{canWrite ? u.password : "••••••"}</Td>
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
            <Badge text={(state.aiKey || "").trim() ? "Key set — AI meeting analysis works for the whole team" : "No key — each person must enter their own on the AI review screen"} color={(state.aiKey || "").trim() ? C.green : C.amber} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Anthropic API key (console.anthropic.com → API keys)">
              <Inp type="password" value={state.aiKey || ""} placeholder="sk-ant-…"
                onChange={(e) => { const v = e.target.value.trim(); setState((st) => ({ ...st, aiKey: v })); }} />
            </Field>
          </div>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
            Stored inside the app's data (and synced to every device through the live shared workspace) — never in the public code. Anyone with access to this app can use it for meeting analysis, so treat it like a shared office key: keep the app link internal, and rotate the key at console.anthropic.com if it leaks.
          </div>
        </Card>
      )}
      {canWrite && (
        <Card title="Live shared workspace" style={{ marginBottom: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65 }}>
            Status:{" "}
            <Badge text={liveStatus === "on" ? "Connected — every device updates live" : liveStatus === "connecting" ? "Connecting…" : liveStatus === "error" ? "Configured, but unreachable" : "Not connected — data stays on each device"} color={liveStatus === "on" ? C.green : liveStatus === "error" ? C.red : C.amber} />
          </div>
          {!loadFbConfig() ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.7 }}>
                One-time setup (about 5 minutes, free): 1) Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: C.blue }}>console.firebase.google.com</a> and create a project. 2) Build → Firestore Database → Create database → Start in <b>test mode</b>. 3) Project settings → Your apps → Web app → register, then copy the <b>firebaseConfig</b> block. 4) Paste it below on <b>every device</b> that should share data.
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
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 12.5, color: C.mute }}>Project: <span style={{ color: C.text }}>{(loadFbConfig() || {}).projectId}</span></div>
              <Btn small ghost tone={C.red} onClick={() => { if (confirm("Disconnect this device from the shared workspace? Data stays in the cloud; this device goes standalone.")) { saveFbConfig(null); location.reload(); } }}>Disconnect this device</Btn>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>
            All connected devices share one live dataset — edits appear everywhere within a second or two. Keep the config internal: anyone holding it can reach the data while the database is in test mode.
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
            <Field label="Password (min 4 characters)"><Inp value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn ghost onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={!edit.name || !(edit.username || "").trim() || (edit.password || "").length < 4}>Save member</Btn>
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
  const [liveStatus, setLiveStatus] = useState(loadFbConfig() ? "connecting" : "off"); // off | connecting | on | error
  const remoteApply = React.useRef(false);

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
      const base = migrateState(loaded ? { ...freshState(), ...loaded } : freshState());
      const cfg = loadFbConfig();
      if (!cfg) {
        finishBoot(base, false);
        if (!loaded) await saveState(base);
        return;
      }
      /* Live mode: wait for the first shared snapshot so a joining device
         never overwrites the team's data with its own local copy. */
      let first = true;
      const fallback = setTimeout(() => { if (first) { first = false; setLiveStatus("error"); finishBoot(base, false); } }, 8000);
      try {
        await connectLive(cfg, (msg) => {
          if (msg.error) { clearTimeout(fallback); if (first) { first = false; finishBoot(base, false); } setLiveStatus("error"); return; }
          if (first) {
            first = false;
            clearTimeout(fallback);
            setLiveStatus("on");
            if (msg.exists) {
              try { finishBoot(migrateState({ ...freshState(), ...JSON.parse(msg.data) }), true); return; } catch (e) {}
            }
            finishBoot(base, false); /* first device ever seeds the shared workspace */
            return;
          }
          if (msg.by === CLIENT_ID || !msg.exists) return;
          try { finishBoot(migrateState({ ...freshState(), ...JSON.parse(msg.data) }), true); } catch (e) {}
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

  if (!state) {
    return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.mute, fontFamily: SANS, fontSize: 14 }}>Loading TTJ Team OS…</div>;
  }
  if (!user) return <Login users={state.users} liveOn={liveStatus === "on"} onLogin={(u) => { setUser(u); setPage("overview"); saveSession({ userId: u.id, page: "overview" }); }} />;

  const D = DEPTS[user.dept];
  const myPages = PAGES.filter((p) => pageAllowed(p, user));
  const groups = ["Daily","Workspaces","Property","Records"];
  const cw = (k) => canWritePage(k, user);

  const Current = {
    overview: <Overview state={state} setState={setState} user={user} goTo={setPage} />,
    tasks: <Tasks state={state} setState={setState} user={user} />,
    approvals: <Approvals state={state} setState={setState} user={user} />,
    announcements: <Announcements state={state} setState={setState} user={user} />,
    tenants: <Tenants state={state} setState={setState} canWrite={cw("tenants")} />,
    capex: <Capex state={state} setState={setState} canWrite={cw("capex")} />,
    marketing: <MarketingStudio state={state} setState={setState} user={user} />,
    adminops: <AdminOps state={state} setState={setState} canWrite={cw("adminops")} />,
    drawings: <Drawings state={state} setState={setState} canWrite={cw("drawings")} />,
    layout: <MallLayout state={state} setState={setState} canWrite={cw("layout")} />,
    documents: <Documents state={state} setState={setState} user={user} />,
    meetings: <MeetingStudio state={state} setState={setState} user={user} />,
    constitution: <Constitution state={state} setState={setState} user={user} />,
    team: <Team state={state} setState={setState} user={user} liveStatus={liveStatus} />,
  }[page] || <Overview state={state} setState={setState} user={user} goTo={setPage} />;

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
            <div style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.gold}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={17} color={C.gold} />
            </div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 15, color: C.text }}>TTJ Team OS</div>
              <div style={{ fontSize: 10, color: liveStatus === "on" ? C.green : C.faint, letterSpacing: 1, textTransform: "uppercase" }}>{IS_CLOUD ? "Official channel" : liveStatus === "on" ? "● Live · shared" : liveStatus === "connecting" ? "Connecting…" : liveStatus === "error" ? "Live sync offline" : "Standalone · this device"}</div>
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
            <LogOut size={15} color={C.mute} style={{ cursor: "pointer" }} onClick={() => { saveSession(null); setUser(null); }} title="Sign out" />
          </div>
          <div style={{ fontSize: 10, color: saveTick.includes("⚠") ? C.red : C.green, marginTop: 8, height: 12 }}>{saveTick}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "64px 14px 60px" : "26px 26px 60px" }}>
        {Current}
      </div>
    </div>
  );
}
