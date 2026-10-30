# IdrogeoRadar

Open-source web application for monitoring Italian hydrogeological risk. Visualizes landslide and flood risk areas using open data from ISPRA, real-time alerts from MeteoAlarm, weather from Open-Meteo, and place search from Photon (OpenStreetMap/Komoot).

## 🚀 Live Demo

Deployed on Netlify: https://idrogeoradar.netlify.app

## 📖 Overview

This project provides an interactive map interface to explore hydrogeological risk data across Italy. Key features:

- **Interactive map** with base layer switching (clear/scuro)
- **Point selection** to retrieve municipal risk data (PIR from ISPRA)
- **Weather forecasts** via Open-Meteo (7-day forecast, precipitation analysis)
- **Live alerts** from MeteoAlarm for Italian territories
- **Geosearch** via Photon (city/town/village search)
- **Risk scoring** algorithm (grades A-F) based on territorial exposure
- **Comparative analysis** of multiple municipalities
- **Report modal** for documenting findings

## 🛠️ Tech Stack

- **React 18** with Vite build tool
- **MapLibre GL** for interactive maps
- **Open data APIs** (no proprietary keys required)
- **Netlify** for deployment
- **GitHub** for version control

## 📁 Project Structure

```
idrogeoradar/
├── public/           # Static assets, Netlify redirect config
│   └── _redirects    # Netlify proxy rules for CORS bypass
├── src/
│   ├── api/          # External API proxies (all CORS-safe)
│   │   ├── weather.js      # Open-Meteo weather forecasts
│   │   ├── alerts.js       # MeteoAlarm real-time alerts
│   │   ├── geocode.js      # Photon place search
│   │   ├── ispra.js        # ISPRA GeoServer/WFS/WMS
│   │   └── score.js        # Hydrogeological risk calculation
│   ├── components/       # React UI components
│   ├── main.jsx          # App entry point
│   └── App.jsx           # Main application component
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── vite.config.mjs       # Vite dev server + dev proxy config
└── README.md             # This file
```

## 🔌 API Proxies (All CORS-safe)

All external API calls are routed through Vite's dev proxy (`vite.config.mjs`) and Netlify `_redirects`. This avoids CORS issues in both development and production without exposing API keys.

| Service | Vite Path | Description |
|---------|-----------|-------------|
| **Open-Meteo** | `/open-meteo` | Weather forecasts, no API key needed |
| **MeteoAlarm** | `/meteoalarm` | Italian weather alerts, no API key needed |
| **Photon** | `/photon` | Place/geocoding search, no API key needed |
| **ISPRA GeoServer** | `/geoserver` | WMS/WFS vector tiles and feature queries |
| **ISPRA API** | `/idrogeo-api` | Tabellare PIR municipal data |

### Production Proxy Netlify

The `_redirects` file in `public/` routes API calls through Netlify's proxy:

```
/*
  https://idrogeoradar.netlify.app
  200
  same-origin
  follow
```
```

## 🏃‍♂️ Local Development

```bash
# Install dependencies
npm install

# Start dev server (with Vite proxy)
npm run dev

# Open http://localhost:5173
```

The dev server proxies `/geoserver`, `/idrogeo-api`, `/meteoalarm`, `/open-meteo`, and `/photon` to their respective origins, enabling CORS-free local development.

## 🌐 Deployment on Netlify

1. **Connect repository** to Netlify from GitHub
2. **Build command**: `npm run build`
3. **Publish directory**: `dist`
4. **Environment variables**: None required (all APIs are key-free)

The `_redirects` file ensures API proxies work in production. Netlify's routing redirects all requests to `index.html`, which then uses the configured proxy rules.

## 📦 Adding New Services

### Safe (no API key, browser-friendly)

Add new API calls following the existing pattern in `src/api/`:

```javascript
// example: new-service.js
export async function fetchSomething(lat, lon, signal) {
  const url = `/new-service/path` + `...`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Service ${r.status}`);
  return await r.json();
}
```

### Requiring API key

**Never** put secret keys in client code. Instead:

1. Create a Netlify Function: `netlify/functions/proxy-nuovo-servizio.js`
2. The function makes the API call with the secret key on the server
3. The frontend calls `/api/nuovo-servizio` which proxies to the function

## 🎨 Customization

- **Theme**: Toggle between light/dark via the header button (persisted in `localStorage`)
- **Basemap**: Switch between dark/light map styles, persisted in `localStorage`
- **Risk layers**: Toggle frane, alluvi, and comuni rischio visibility via LayersPanel
- **Compare**: Add up to 4 municipalities for benchmark analysis (national/regional)

## 📜 License

Open project — data belongs to their respective open licenses:
- **ISPRA/IdroGEO**: CC-BY for IFFI/PIR datasets
- **OpenStreetMap**: ODbL for Photon geocoding
- **MeteoAlarm**: Free feeds for Italian alerts
- **Open-Meteo**: Free weather API

---

Built with ❤️ using open data for Italian hydrogeological risk awareness.