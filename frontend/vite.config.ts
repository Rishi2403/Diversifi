import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";




// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // expose on 0.0.0.0 so Windows browser can reach it via WSL2 IP
    proxy: {
      "/ask": "http://localhost:8000",
      "/get": "http://localhost:8000",
      "/clarify": "http://localhost:8000",
      "/portfolio": "http://localhost:8000",
      "/global": "http://localhost:8000",
    },
  },
});

