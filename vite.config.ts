import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "@" resolves to the src/ directory, matching the import style
// (e.g. "@/components/...", "@/game/...").
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Fixed port so `tauri dev` (devUrl http://localhost:5173) always connects.
  server: {
    port: 5173,
    strictPort: true,
  },
});
