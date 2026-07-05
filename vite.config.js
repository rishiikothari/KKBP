import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the built app path-independent, so the same build works on
// GitHub Pages (username.github.io/KKBP/), Netlify, Vercel, a NAS folder, or file://
export default defineConfig({
  plugins: [react()],
  base: "./",
});
