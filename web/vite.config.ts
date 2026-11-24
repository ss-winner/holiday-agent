import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // 前端请求 /api/... 时，由 Vite 转发到后端的 3000 端口，避免跨域问题
    proxy: { "/api": "http://localhost:3000" },
  },
});
