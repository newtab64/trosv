import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optional: put the dependency cache outside node_modules (some sandboxes leave
  // root-owned files in node_modules/.vite, which makes Vite 404 every route).
  cacheDir: process.env["VITE_CACHE_DIR"],
  server: {
    proxy: {
      "/attachments": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
        headers: {
          Host: "127.0.0.1",
        },
      },
      "/storage": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
        headers: {
          Host: "127.0.0.1",
        },
      },
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Map + clustering in their own lazily-loaded chunk.
            if (
              id.includes("leaflet") ||
              id.includes("@map") ||
              id.includes("d3-") ||
              id.includes("rbush")
            ) {
              return "leaflet";
            }
            if (
              /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ) {
              return "react";
            }
            if (id.includes("@radix-ui") || id.includes("@floating-ui")) return "radix";
            if (id.includes("pusher-js") || id.includes("laravel-echo")) return "realtime";
            return "vendor";
          }
        },
      },
    },
  },
  esbuild: {
    legalComments: "inline",
  },
});
