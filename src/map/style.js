// Stili MapLibre: basemap libere + layer dati ISPRA (WMS raster e MVT).
// Basemap "scuro"/"chiaro" derivate da OpenFreeMap (vector tiles gratuiti, no API key).
import { mvtUrl, wmsUrl } from '../api/ispra.js';

const OFM = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
};

/** Palette scura dell'app. */
const DARK = {
  bg: '#0d1524',
  water: '#132B40',
  land: '#101a2d',
  green: '#0f1d18',
  roadMinor: '#1d2a3f',
  roadMajor: '#24354e',
  building: '#151f31',
  text: '#9db4d0',
  textHalo: '#0a0f1a',
};

const LUM = (c) => {
  const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255;
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return null;
};

/** Rende scuro uno stile chiaro (positron): mappa i colori alla palette dell'app. */
function darken(styleJson) {
  for (const layer of styleJson.layers) {
    const p = layer.paint ?? (layer.paint = {});
    const l = (key) => p[key] && typeof p[key] === 'string' ? LUM(p[key]) : null;

    if (layer.type === 'background') {
      p['background-color'] = DARK.bg;
      continue;
    }
    const sl = layer['source-layer'] ?? '';
    const id = layer.id;

    if (id.includes('water') || sl === 'water' || sl === 'waterway' || sl === 'sea') {
      if (layer.type === 'fill') p['fill-color'] = DARK.water;
      if (layer.type === 'line') p['line-color'] = '#1c3a52';
      continue;
    }
    if (sl === 'landcover' || id.includes('park') || id.includes('forest') || id.includes('grass')) {
      if (layer.type === 'fill') p['fill-color'] = DARK.green;
      continue;
    }
    if (sl === 'building') {
      if (layer.type === 'fill') p['fill-color'] = DARK.building;
      continue;
    }
    if (sl === 'transportation' || id.includes('road') || id.includes('highway') || id.includes('bridge') || id.includes('tunnel')) {
      if (layer.type === 'line') {
        const major = id.includes('major') || id.includes('motorway') || id.includes('trunk') || id.includes('primary');
        p['line-color'] = major ? DARK.roadMajor : DARK.roadMinor;
      }
      continue;
    }
    // Testi
    const tProps = ['text-color', 'text-halo-color'];
    if (p['text-color']) p['text-color'] = DARK.text;
    if (p['text-halo-color']) p['text-halo-color'] = DARK.textHalo;
    if (layer.type === 'line' || layer.type === 'fill') {
      const get = layer.type === 'line' ? ['line-color', 'line-outline-color'] : ['fill-color', 'fill-outline-color'];
      const lum = get[0] in p ? LUM(p[get[0]]) : null;
      if (lum !== null && lum > 0.5) p[get[0]] = DARK.land;
    }
  }
  return styleJson;
}

// ─── Basemap raster semplici (satellite / topografica) ───
const RASTER_BASEMAPS = {
  satellite: {
    label: 'Satellite',
    sources: {
      basemap: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri World Imagery',
      },
    },
  },
  topografica: {
    label: 'Topografica',
    sources: {
      basemap: {
        type: 'raster',
        tiles: [
          'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
          'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
          'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '© OpenTopoMap (CC-BY-SA) — dati © OpenStreetMap',
      },
    },
  },
};

export const BASEMAP_KEYS = ['scuro', 'chiaro', 'satellite', 'topografica'];
export const BASEMAP_LABELS = { scuro: 'Scuro', chiaro: 'Chiaro', ...Object.fromEntries(Object.entries(RASTER_BASEMAPS).map(([k, v]) => [k, v.label])) };

// ─── Definizioni layer dati ISPRA ───
export const DATA_LAYERS = {
  mosaic_frane: {
    label: 'Pericolosità frane (mosaico)',
    kind: 'raster-wms',
    layer: 'pericolosita_frane',
    opacity: 0.45,
  },
  mosaic_alluvi: {
    label: 'Pericolosità alluvioni (mosaico)',
    kind: 'raster-wms',
    layer: 'pericolosita_alluvioni',
    opacity: 0.4,
  },
  comuni_rischio: {
    label: 'Popolazione comunale a rischio',
    kind: 'mvt',
    layer: 'comuni_pir',
    minzoom: 7,
    sourceProps: { minzoom: 7, maxzoom: 14, tileSize: 512 },
  },
  frane_aree: {
    label: 'Aree di frana IFFI',
    kind: 'mvt',
    layer: 'frane_poly_opendata',
    minzoom: 8,
    sourceProps: { minzoom: 6, maxzoom: 14, tileSize: 512 },
  },
  valanghe: {
    label: 'Aree valanghive',
    kind: 'mvt',
    layer: 'aree_valanghive',
    minzoom: 9,
    sourceProps: { minzoom: 7, maxzoom: 14, tileSize: 512 },
  },
};

function dataSourcesAndLayers(visible) {
  const sources = {};
  const layers = [];
  for (const [key, def] of Object.entries(DATA_LAYERS)) {
    const vis = visible[key] ? 'visible' : 'none';
    if (def.kind === 'raster-wms') {
      sources[`src_${key}`] = { type: 'raster', tiles: [wmsUrl(def.layer)], tileSize: 512 };
      layers.push({
        id: `lyr_${key}`,
        type: 'raster',
        source: `src_${key}`,
        paint: { 'raster-opacity': def.opacity },
        visible: vis,
      });
    } else {
      sources[`src_${key}`] = { type: 'vector', tiles: [mvtUrl(def.layer)], ...def.sourceProps };
      let paint;
      if (key === 'comuni_rischio') {
        paint = {
          'fill-color': [
            'interpolate', ['linear'],
            ['coalesce', ['to-number', ['get', 'popfrp3p4p']], 0],
            0, '#2a755e', 2, '#f5c630', 6, '#f28c28', 15, '#e05038', 30, '#b3001b',
          ],
          'fill-opacity': 0.42,
        };
      } else if (key === 'frane_aree') {
        paint = { 'fill-color': '#f9d45c', 'fill-opacity': 0.65 };
      } else {
        paint = { 'fill-color': '#8ad4ff', 'fill-opacity': 0.6 };
      }
      layers.push({
        id: `lyr_out_${key}`,
        type: 'line',
        source: `src_${key}`,
        'source-layer': def.layer,
        minzoom: def.minzoom,
        paint: key === 'valanghe' ? { 'line-color': '#3baadd', 'line-width': 0.6 } : { 'line-color': 'rgba(255,255,255,0.3)', 'line-width': 0.5 },
        visible: vis,
      });
      layers.push({
        id: `lyr_${key}`,
        type: 'fill',
        source: `src_${key}`,
        'source-layer': def.layer,
        minzoom: def.minzoom,
        paint,
        visible: vis,
      });
    }
  }
  return { sources, layers };
}

/**
 * Costruisce lo stile completo mappabile. Async perché per gli stili
 * vettoriali scarica prima il JSON di base.
 */
export async function buildStyle(basemapKey, visible = {}) {
  const { sources: dataSources, layers: dataLayers } = dataSourcesAndLayers(visible);

  if (basemapKey === 'satellite' || basemapKey === 'topografica') {
    const b = RASTER_BASEMAPS[basemapKey];
    const style = {
      version: 8,
      sources: { ...b.sources, ...dataSources },
      layers: [
        { id: 'basemap', type: 'raster', source: 'basemap' },
        ...(b.sources.basemap_labels ? [{ id: 'basemap_labels', type: 'raster', source: 'basemap_labels' }] : []),
        ...dataLayers,
      ],
    };
    return style;
  }

  // Stili vettoriali OpenFreeMap
  const res = await fetch(OFM.positron);
  const base = await res.json();
  // Sanitizza i filtri: aggiunge typeof-check prima di confronti numerici
  // per evitare "Expected value to be of type number, but found null instead"
  for (const layer of base.layers) {
    if (layer.filter) layer.filter = sanitizeFilter(layer.filter);
  }
  if (basemapKey === 'scuro') darken(base);
  addAttribution(base, basemapKey);

  base.sources = { ...base.sources, ...dataSources };
  dataLayers.forEach((l, i) => {
    // i layer dati sopra il basemap, prima delle etichette per non coprirle? Le etichette OFM
    // sono in coda allo stile: li mettiamo prima di esse.
    const labelsIdx = base.layers.findLastIndex((x) => x['source-layer'] === undefined && (x.id.includes('label') || x.type === 'symbol'));
    base.layers.splice(labelsIdx === -1 ? base.layers.length : labelsIdx + i, 0, l);
  });
  return base;
}

/**
 * Aggiunge un typeof-check ("number") prima di ogni confronto numerico (`<`, `>`,
 * `<=`, `>=`) che legga una proprietà con `get`.  Alcuni layer di OpenFreeMap
 * (es. `highway-shield-*`, `label_country_3`) usano filtri numerici senza
 * verificare che la proprietà esista, causando "Expected value to be of type
 * number, but found null instead" nel worker di MapLibre.  Non è un errore
 * fatale, ma elimina il warning e impedisce a mappa di lavorare inutilmente.
 */
function sanitizeFilter(filter) {
  if (!Array.isArray(filter)) return filter;
  const op = filter[0];
  const args = filter.slice(1);
  if ((op === '<' || op === '>' || op === '<=' || op === '>=') && args.length === 2) {
    const isGet = (e) => Array.isArray(e) && e[0] === 'get';
    if (isGet(args[0]) || isGet(args[1])) {
      const propExpr = isGet(args[0]) ? args[0] : args[1];
      return ['all', ['==', ['typeof', propExpr], 'number'], filter];
    }
  }
  return [op, ...args.map(sanitizeFilter)];
}

function addAttribution(style, key) {
  const first = Object.values(style.sources)[0];
  if (first && !first.attribution) {
    first.attribution = '© OpenFreeMap — dati OpenStreetMap';
  }
}
