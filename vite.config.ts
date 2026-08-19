import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      "/api": "http://localhost:4000"
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["agrofresh-icon.svg", "robots.txt"],
      manifest: {
        name: "AgroFresh GH",
        short_name: "AgroFresh",
        description: "A trusted marketplace connecting Ghanaian farmers and buyers.",
        theme_color: "#208b4b",
        background_color: "#f7fbf8",
        display: "standalone",
        scope: "/",
        start_url: "/",
        lang: "en-GH",
        icons: [
          {
            src: "/agrofresh-icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "/agrofresh-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "agrofresh-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
