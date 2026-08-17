import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* Installable app: register the service worker (instant loads + offline
   shell). Registration is deferred to load so it never competes with boot. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

/* Everyone shares one dataset, so a single malformed record could otherwise
   blank the app on every device at once with no way back. This catches the
   crash, explains it, and — crucially — still hands the person their data and
   a way out: reload, or start clean on this device without touching the team's
   workspace. */
const SKEY = "kkbp-teamos-v2";
const PANEL = { background: "#181329", border: "1px solid #2E2748", borderRadius: 12, padding: 22, maxWidth: 520, width: "100%" };
const BTN = { background: "#F79A2E", color: "#181329", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const GHOST = { ...BTN, background: "transparent", color: "#A8A2C0", border: "1px solid #2E2748" };

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("TTJ Team OS crashed:", err, info); }
  download = () => {
    try {
      const raw = localStorage.getItem(SKEY) || "{}";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      a.download = `ttj-teamos-recovery-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (e) { /* nothing more we can do from here */ }
  };
  startClean = () => {
    if (!window.confirm("Clear only this device's saved copy and reload? The team's shared workspace is not touched.")) return;
    try { localStorage.removeItem(SKEY); sessionStorage.clear(); } catch (e) {}
    location.reload();
  };
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#110D1F", color: "#F5F0E4", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <div style={PANEL}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22 }}>Something broke on this screen</div>
          <p style={{ color: "#A8A2C0", fontSize: 14, lineHeight: 1.65 }}>
            Your data is safe — this is a display fault, not a lost record. Reloading fixes it in almost every case.
            If it keeps happening, download a copy of this device's data and send it to Rishi.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button style={BTN} onClick={() => location.reload()}>Reload</button>
            <button style={GHOST} onClick={this.download}>Download my data</button>
            <button style={GHOST} onClick={this.startClean}>Reset this device</button>
          </div>
          <pre style={{ marginTop: 18, background: "#141021", border: "1px solid #2E2748", borderRadius: 8, padding: 11, fontSize: 11, color: "#817AAA", overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {String((this.state.err && this.state.err.message) || this.state.err).slice(0, 400)}
          </pre>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
