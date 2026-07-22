import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1200,
    // NOTE: Custom manualChunks previously split React/Radix/etc into separate
    // chunks. That caused a circular-import TDZ crash in production
    // ("Cannot access 'P' before initialization") because Radix/Tanstack chunks
    // load before the React chunk finishes initializing. Let Rollup handle
    // chunking automatically — safer and still tree-shakes well.
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
