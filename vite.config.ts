import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:standalone` produces one self-contained dist-standalone/index.html that opens by double-click
// (hash routing, everything inlined). The normal build is unchanged.
// The `-anon` modes (`npm run build:anon`, `npm run build:standalone:anon`) build the same site without the author's
// name, for sharing with friends online; they write to their own folders so both versions can sit side by side.
export default defineConfig(({ mode }) => {
  const standalone = mode.startsWith('standalone');
  const anon = mode.endsWith('anon');
  return {
    base: standalone ? './' : '/',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    build: { outDir: (standalone ? 'dist-standalone' : 'dist') + (anon ? '-anon' : '') },
    define: { __STANDALONE__: JSON.stringify(standalone), __ANON__: JSON.stringify(anon) },
    test: { environment: 'node' },
  };
});
