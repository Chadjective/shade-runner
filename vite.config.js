import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative so the static build works when served
// from a subpath (e.g. https://user.github.io/shade-runner/) on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
  },
});
