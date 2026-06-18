import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
  react(),
  VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["logo-rutas.png"],
    manifest: {
      name: "Sistema de Rutas para Tortillerías",
      short_name: "Rutas",
      description: "Control de rutas, entregas, cobros e inventario para tortillerías.",
      theme_color: "#006b2e",
      background_color: "#006b2e",
      display: "standalone",
      orientation: "portrait",
      icons: [
        {
          src: "/logo-rutas.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/logo-rutas.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
  }),
],
})
