import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the built site works on
// GitHub Pages / any static subpath as well as the local dev server.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        // Split the heavy vendors into their own chunks so they cache
        // independently and the main bundle stays small: React Flow (the graph
        // engine) and KaTeX (math) dominate the dependency weight.
        manualChunks: {
          reactflow: ["reactflow"],
          katex: ["katex"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
