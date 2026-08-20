import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

/* Stamp every build with when it was made and which commit it came from. Two
   addresses serve this app against one database, so "which build is this
   device running?" has to be answerable — see src/sync.js. The sha decides
   whether two builds are the same code; the timestamp only breaks ties. */
const sha = (() => {
  try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch (e) { return ""; }   /* a tarball checkout with no .git — timestamp only */
})();
const BUILD_ID = `${new Date().toISOString().slice(0, 19)}|${sha}`;

// base: "./" makes the built app path-independent, so the same build works on
// GitHub Pages (username.github.io/KKBP/), Netlify, Vercel, a NAS folder, or file://
export default defineConfig({
  plugins: [react()],
  base: "./",
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
