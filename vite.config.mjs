import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy per evitare problemi di CORS in sviluppo.
// Gli endpoint esterni (GeoServer ISPRA, MeteoAlarm, Open-Meteo, Photon)
// vengono raggiunti dal browser tramite lo stesso origine.
const proxy = {
  '/geoserver': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    secure: true,
  },
  '/idrogeo-api': {
    target: 'https://idrogeo.isprambiente.it',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/idrogeo-api/, '/api'),
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
};

export default defineConfig({
  plugins: [react()],
  server: { proxy, port: 5173 },
  preview: { proxy, port: 4173 },
});
