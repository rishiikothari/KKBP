/* ============================================================================
   WhatsApp export importer — client-side pipeline.

   Everything here runs in the browser. Heavy libraries (zip.js, pdf.js,
   firebase/storage) are dynamically imported so they never weigh down the
   initial app load — they only download when the Owner actually opens the
   Import Studio and runs it.

   The pipeline is: scan a .zip (or .txt) → parse the conversation and contact
   cards → triage & analyse attachments with Claude vision → optionally save
   the media to Firebase Storage → hand back a set of proposed records that the
   Owner reviews before a non-destructive merge into the dashboard.
   ============================================================================ */

/* ---------- WhatsApp chat text parsing ---------- */

// Matches both iOS  "[05/07/2026, 14:30:15] Sender: msg"
// and    Android    "05/07/2026, 14:30 - Sender: msg"
const LINE_IOS = /^‎?\[(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[APap][Mm])?)\]\s*([^:]+?):\s?([\s\S]*)$/;
const LINE_AND = /^(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[APap][Mm])?)\s+-\s+([^:]+?):\s?([\s\S]*)$/;

// Attachment markers, both platforms.
const ATT_IOS = /<attached:\s*([^>]+?)>/i;                 // iOS: ‎<attached: 0001-PHOTO-....jpg>
const ATT_AND = /([^\s][\w\-. ]+\.\w{2,5})\s*\((?:file|document|image|video|audio)\s+(?:attached|omitted)\)/i; // Android
const OMITTED = /(image|video|audio|document|GIF|sticker)\s+omitted/i;

export function parseChatText(txt) {
  const clean = txt.replace(/\r/g, "");
  const raw = clean.split("\n");
  const msgs = [];
  const push = (m) => { if (m) msgs.push(m); };
  let cur = null;
  for (const line0 of raw) {
    const line = line0.replace(/‎/g, "");
    const m = line.match(LINE_IOS) || line.match(LINE_AND);
    if (m) {
      push(cur);
      const [, date, time, sender, body] = m;
      cur = { date, time, sender: sender.trim(), text: body || "", attachment: null };
      const a = (line0.match(ATT_IOS) || body.match(ATT_AND));
      if (a) { cur.attachment = a[1].trim(); cur.text = cur.text.replace(ATT_IOS, "").replace(ATT_AND, "").trim(); }
    } else if (cur) {
      cur.text += (cur.text ? "\n" : "") + line;
    }
  }
  push(cur);
  // System lines (encryption notice, "changed the subject", etc.) have no real sender colon — best effort keep.
  const participants = Array.from(new Set(msgs.map((m) => m.sender))).filter(Boolean);
  const dates = msgs.map((m) => m.date).filter(Boolean);
  return { messages: msgs, participants, first: dates[0] || "", last: dates[dates.length - 1] || "" };
}

/* ---------- media classification ---------- */

const EXT = (name) => (name.split(".").pop() || "").toLowerCase();
export function classifyKind(name) {
  const e = EXT(name);
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "bmp"].includes(e)) return "image";
  if (["mp4", "mov", "3gp", "mkv", "avi", "webm"].includes(e)) return "video";
  if (["opus", "ogg", "m4a", "mp3", "wav", "aac"].includes(e)) return "audio";
  if (e === "pdf") return "pdf";
  if (e === "vcf") return "vcf";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(e)) return "doc";
  return "other";
}
export const humanSize = (b) => b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
export function mimeFor(name) {
  const m = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", bmp: "image/bmp", heic: "image/heic",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska",
    opus: "audio/ogg", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac",
    pdf: "application/pdf", vcf: "text/vcard" };
  return m[EXT(name)] || "application/octet-stream";
}

/* ---------- zip inventory (streaming; never loads the whole archive) ---------- */

export async function openZip(file) {
  const zip = await import("@zip.js/zip.js");
  zip.configure({ useWebWorkers: true });
  const reader = new zip.ZipReader(new zip.BlobReader(file));
  const entries = await reader.getEntries();
  const chatEntry = entries.find((e) => /(_chat\.txt|whatsapp.*\.txt)$/i.test(e.filename)) || entries.find((e) => /\.txt$/i.test(e.filename));
  const media = entries.filter((e) => !e.directory && e !== chatEntry).map((e) => ({
    name: e.filename.split("/").pop(), path: e.filename, size: e.uncompressedSize || 0,
    kind: classifyKind(e.filename), _entry: e,
  }));
  return { zip, reader, entries, chatEntry, media };
}
export async function readEntryText(entry, zipMod) {
  return await entry.getData(new zipMod.TextWriter());
}
export async function readEntryBlob(entry, zipMod, mime) {
  return await entry.getData(new zipMod.BlobWriter(mime || "application/octet-stream"));
}

/* ---------- image helpers ---------- */

export function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
// Downscale to <=maxDim on the long edge and return {media_type, data} for the vision API.
export async function downscaleImage(blob, maxDim = 1120) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", 0.82);
    return { media_type: "image/jpeg", data: dataUrl.split(",")[1] };
  } finally { URL.revokeObjectURL(url); }
}

// Downscale to a JPEG *Blob* for a storage upload (downscaleImage above
// returns base64 for the vision API). On any failure, the original blob is
// returned unchanged so an odd format still uploads.
export async function downscaleImageBlob(blob, maxDim = 1600, quality = 0.85) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    const out = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    return out || blob;
  } catch (e) {
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- video → sampled keyframes (the browser decodes; we grab frames) ---------- */

export async function sampleVideoFrames(blob, frames = 4, maxDim = 1120) {
  const url = URL.createObjectURL(blob);
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
  try {
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("video decode failed")); });
    const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    const times = dur ? Array.from({ length: frames }, (_, i) => (dur * (i + 0.5)) / frames) : [0];
    const out = [];
    for (const t of times) {
      await new Promise((res, rej) => { v.onseeked = res; v.onerror = () => rej(new Error("seek failed")); v.currentTime = Math.min(t, Math.max(0, dur - 0.1)); });
      const scale = Math.min(1, maxDim / Math.max(v.videoWidth || 1, v.videoHeight || 1));
      const w = Math.max(1, Math.round((v.videoWidth || 320) * scale)), h = Math.max(1, Math.round((v.videoHeight || 240) * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(v, 0, 0, w, h);
      out.push({ media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.8).split(",")[1] });
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- PDF → text + first-page images (pdf.js) ---------- */

let _pdfjs = null;
async function pdfjs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  lib.GlobalWorkerOptions.workerSrc = worker;
  _pdfjs = lib; return lib;
}
export async function pdfExtract(blob, maxPages = 3, maxDim = 1400) {
  const lib = await pdfjs();
  const buf = await blob.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  let text = ""; const images = [];
  const n = Math.min(doc.numPages, maxPages);
  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p);
    try { const tc = await page.getTextContent(); text += tc.items.map((i) => i.str).join(" ") + "\n"; } catch (e) {}
    const vp = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxDim / Math.max(vp.width, vp.height));
    const v2 = page.getViewport({ scale });
    const c = document.createElement("canvas"); c.width = v2.width; c.height = v2.height;
    await page.render({ canvasContext: c.getContext("2d"), viewport: v2 }).promise;
    images.push({ media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.82).split(",")[1] });
  }
  return { text: text.trim(), images, pages: doc.numPages };
}

/* ---------- vCard contacts ---------- */

export function parseVcf(text) {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.map((c) => {
    const fn = (c.match(/\nFN[^:]*:(.+)/i) || [])[1] || (c.match(/\nN[^:]*:(.+)/i) || [])[1] || "";
    const tel = (c.match(/\nTEL[^:]*:(.+)/i) || [])[1] || "";
    const org = (c.match(/\nORG[^:]*:(.+)/i) || [])[1] || "";
    const email = (c.match(/\nEMAIL[^:]*:(.+)/i) || [])[1] || "";
    return { name: (fn || "").trim(), tel: (tel || "").trim(), org: (org || "").trim(), email: (email || "").trim() };
  }).filter((x) => x.name || x.tel);
}

/* ---------- Anthropic (vision + text), browser-direct ---------- */

export async function anthropicJSON({ key, content, max_tokens = 1200, model = "claude-sonnet-4-6" }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens, messages: [{ role: "user", content }] }),
  });
  if (res.status === 401 || res.status === 403) throw new Error("NEED_KEY");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error("API_" + res.status);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text.replace(/```json|```/g, "").trim());
}

// Given one attachment's frames/pages, ask Claude what it is and whether it matters.
export async function analyseMedia({ key, kind, images, filename, context }) {
  const guide = `You are triaging a media file shared in a WhatsApp work chat for "The Town Junction", a mall development in Nagpur (leasing, marketing/branding, construction/design, admin).
File: ${filename} (${kind}). ${context ? "Nearby message: " + context : ""}
Return ONLY JSON: {"relevant": true|false, "category": "invoice|floor-plan|rate-card|agreement|brand-creative|site-photo|product|screenshot|certificate|other", "title": "short title", "summary": "1-2 sentences of the useful content", "facts": ["key data points, amounts, names, dates"], "suggestedTask": "" }.
Mark relevant=false for memes, selfies, greetings, stickers and anything with no business value. suggestedTask is a short action only if the file clearly implies one, else "".`;
  const content = [...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })), { type: "text", text: guide }];
  return await anthropicJSON({ key, content, max_tokens: 700 });
}

// Turn a slice of conversation into structured proposals.
export async function analyseChat({ key, transcript, roster, today }) {
  const guide = `Extract actionable items from this WhatsApp work chat for "The Town Junction" mall (Nagpur). Today is ${today}.
Team roster (id — name — dept): ${roster}.
Return ONLY JSON with arrays (empty if none):
{"people":[{"name":"","hint":"role/company if mentioned"}],
 "tasks":[{"title":"","dept":"leasing|marketing|project|design|admin|exec","assigneeName":"","due":"YYYY-MM-DD or ''","notes":""}],
 "approvals":[{"title":"","amountL":0,"notes":""}],
 "docs":[{"name":"","category":"Legal & Agreements|Bank & CMA|Design & Drawings|Marketing & Brand|Licences & Compliance|Vendor Contracts|MOMs & Reports|Other","note":""}],
 "decisions":["short minute lines"]}
Only include real, concrete items discussed. Prefer fewer, higher-quality items.

CHAT:
${transcript}`;
  return await anthropicJSON({ key, content: [{ type: "text", text: guide }], max_tokens: 2000 });
}

/* ---------- Firebase Storage upload (uses the project already configured) ---------- */

export async function uploadToStorage(fbConfig, path, blob, onProgress) {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
  const app = getApps().length ? getApps()[0] : initializeApp(fbConfig);
  const storage = getStorage(app);
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, blob);
  return await new Promise((resolve, reject) => {
    task.on("state_changed",
      (snap) => { if (onProgress) onProgress(snap.bytesTransferred / Math.max(1, snap.totalBytes)); },
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}
