import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, Vite proxies both:
// - Direct paths (/geoserver, /idrogeo, /meteoalarm, /open-meteo, /photon)
// - Prefixed paths (/api/geoserver, /api/idrogeo, /api/meteoalarm, /api/open-meteo, /api/photon)
// The prefixed paths mirror the production Netlify Function proxy structure.
const proxy = {
  '/geoserver': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    secure: true,
  },
  '/idrogeo': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/idrogeo/, '/api'),
  },
  '/meteoalarm': {
    target: 'https://feeds.meteoalarm.org',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/meteoalarm/, ''),
  },
  '/open-meteo': {
    target: 'https://api.open-meteo.com',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/open-meteo/, ''),
  },
  '/photon': {
    target: 'https://photon.komoot.io',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/photon/, ''),
  },
  // Mirror of API paths for Netlify Function compatibility
  '/api/geoserver': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/geoserver/, '/geoserver'),
  },
  '/api/idrogeo': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/idrogeo/, '/api'),
  },
  '/api/meteoalarm': {
    target: 'https://feeds.meteoalarm.org',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/meteoalarm/, ''),
  },
  '/api/open-meteo': {
    target: 'https://api.open-meteo.com',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/open-meteo/, ''),
  },
  '/api/photon': {
    target: 'https://photon.komoot.io',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/photon/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy, port: 5173 },
  preview: { proxy, port: 4173 },
});