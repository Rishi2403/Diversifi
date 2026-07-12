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
    host: true,
    proxy: {
      "/ask": "http://localhost:8000",
      "/get": "http://localhost:8000",
      "/clarify": "http://localhost:8000",
      "/portfolio/prices": "http://localhost:8000",
      "/portfolio/price": "http://localhost:8000",
      "/portfolio/groww": "http://localhost:8000",
      "/global": "http://localhost:8000",
      "/api": "http://localhost:8000",
    },
  },
});

