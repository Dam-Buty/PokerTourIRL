import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Plugins
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.ttf"],
  plugins: [react()],
  // resolve: {
  //   alias: {
  //     '@': resolve(__dirname, 'src'),
  //   },
  // },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});
