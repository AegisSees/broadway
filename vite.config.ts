import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:standalone` produces one self-contained dist-standalone/index.html that opens by double-click
// (hash routing, everything inlined). The normal build is unchanged.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    base: standalone ? './' : '/',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    build: { outDir: standalone ? 'dist-standalone' : 'dist' },
    define: { __STANDALONE__: JSON.stringify(standalone) },
    test: { environment: 'node' },
  };
});
