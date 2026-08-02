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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
