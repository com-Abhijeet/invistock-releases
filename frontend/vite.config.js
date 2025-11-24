import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig({
    base: "./", // Keeps paths relative for Electron (file://)
    plugins: [react()],
    build: {
        outDir: "dist",
        assetsDir: "assets",
        sourcemap: false,
    },
});
