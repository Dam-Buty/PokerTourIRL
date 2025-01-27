import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path';

// Plugins
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';



// https://vitejs.dev/config/
export default defineConfig({

  
  assetsInclude: ['**/*.ttf'],
  plugins: [react()],
  // resolve: {
  //   alias: {
  //     '@': resolve(__dirname, 'src'),
  //   },
  // },
  css: {
    postcss: {
       plugins: [
        
        tailwindcss,
        autoprefixer,
      ],
    },
  },
 
});
