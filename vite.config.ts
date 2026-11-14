import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Relative base so the demo works from GitHub Pages (/edu-sql/) and from any subfolder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // Two demo pages: the detective (index.html) and the sandbox (sandbox.html). The sandbox worker is a module.
  worker: { format: "es" },
  build: { rollupOptions: { input: { main: "index.html", sandbox: "sandbox.html" } } },
  test: {
    include: ["src/**/*.test.ts"]
  }
})
