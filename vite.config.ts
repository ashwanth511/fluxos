import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { nodePolyfills } from "@bangjelkoski/vite-plugin-node-polyfills";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),nodePolyfills({ protocolImports: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
