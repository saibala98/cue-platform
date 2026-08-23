import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH lets a GitHub Pages *project* deploy (served from
// https://<user>.github.io/<repo>/) set the correct asset base at build time,
// e.g. VITE_BASE_PATH=/cue-platform/ npm run build:demo. Leave unset for a
// root deploy (custom domain, user/org pages, Netlify, Vercel).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: { port: 5173 },
  };
});
