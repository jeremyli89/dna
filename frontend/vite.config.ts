import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/profile": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ingest": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/personality": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/insights": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});
