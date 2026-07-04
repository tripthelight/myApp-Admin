import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      "/member": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/board": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
