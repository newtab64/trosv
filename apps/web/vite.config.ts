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
    // Deps cache nam ngoai node_modules: thu muc .vite trong sandbox co
    // file do root so huu khong the ghi/xoa -> Vite tra 404 cho moi route.
    cacheDir: "/tmp/trosv-vite-cache",
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
                        return "vendor";
                    }
                },
            },
        },
    },
    esbuild: {
        legalComments: "inline",
    },
    minify: "terser",
    terserOptions: {
        compress: {
            passes: 2,
            drop_console: ["log", "debug", "info"],
            drop_debugger: true,
        },
        format: {
            comments: "some",
        },
    },
});
