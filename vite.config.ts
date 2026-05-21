import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      cleanupOutdatedCaches: true,
      includeAssets: ["favicon.svg", "pwa/icon-192.png", "pwa/icon-512.png", "pwa/maskable-512.png"],
      manifest: {
        name: "初入仙途",
        short_name: "仙途",
        description: "移动端优先的暗色修仙 RPG",
        lang: "zh-CN",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#090d14",
        background_color: "#090d14",
        categories: ["games"],
        icons: [
          {
            src: "pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,json}"],
        globIgnores: ["**/manifest.webmanifest", "**/favicon.svg", "**/pwa/*.png"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: "index.html",
      },
    }),
  ],
});
