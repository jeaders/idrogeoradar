// API GeoServer IdroGEO (ISPRA) — proxy server-side via Vite (dev) o Netlify Function (produzione).
import { absoluteBase } from './utils.js';

const OWS = `${absoluteBase}/geoserver/idrogeo/ows`;
const API = `${absoluteBase}/idrogeo`;

/** Template URL per Vector Tiles (MVT) di un layer GeoServer. */
export function mvtUrl(layer) {
  return `${OWS}?service=WMS&version=1.3.0&request=GetMap`
    + `&layers=idrogeo:${layer}&format=application/vnd.mapbox-vector-tile`
    + `&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=512&height=512`;
}

/** Template URL per raster WMS (mosaici di pericolosità). */
export function wmsUrl(layer) {
  return `${OWS}?service=WMS&version=1.3.0&request=GetMap`
    + `&layers=idrogeo:${layer}&format=image/png&transparent=true`
    + `&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=512&height=512`;
}

/**
 * Recupera il comune (con tutti gli indicatori PIR, 183 proprietà)
 * contenente un punto lon/lat, tramite WFS con bbox ristretto.
 */
export async function fetchComuneAt(lon, lat, signal) {
  const d = 0.004;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  const url = `${OWS}?service=WFS&version=2.0.0&request=GetFeature`
    + `&typeNames=idrogeo:comuni_pir&srsName=urn:ogc:def:crs:EPSG::4326`
    + `&bbox=${bbox},EPSG:4326`
    + `&outputFormat=application/json&count=1`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`WFS ${r.status}`);
  const fc = await r.json();
  return fc.features?.[0]?.properties ?? null;
}

/** Indice comuni (uid, nome, regione/provincia, extent). ~7900 voci, in memoria. */
let comuniIndexPromise = null;
export function getComuniIndex() {
  if (!comuniIndexPromise) {
    comuniIndexPromise = fetch(`${API}/pir/comuni`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
      .then((list) => list.map((c) => ({
        uid: c.uid,
        nome: c.nome,
        regione: c.breadcrumb?.find((b) => b.t === 'r')?.name ?? '',
        provincia: c.breadcrumb?.find((b) => b.t === 'p')?.name ?? '',
        pro_com: c.pro_com,
        extent: c.extent,
      })))
      .catch((e) => { comuniIndexPromise = null; throw e; });
  }
  return comuniIndexPromise;
}

/** Indicatori PIR completi di un comune, senza geometria (leggero). */
export async function fetchComunePir(uid, signal) {
  const r = await fetch(`${API}/pir/comuni/${uid}`, { signal });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const c = await r.json();
  return {
    ...c,
    nome_prov: c.breadcrumb?.find((b) => b.t === 'p')?.name ?? '',
    nome_reg: c.breadcrumb?.find((b) => b.t === 'r')?.name ?? '',
  };
}

/** Sintesi PIR dell'Italia (benchmark nazionale). */
export async function fetchPirItalia(signal) {
  const r = await fetch(`${API}/pir/italia`, { signal });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

/** Sintesi PIR di una regione (per il benchmark regionale). */
export async function fetchPirRegione(codReg, signal) {
  const r = await fetch(`${API}/pir/regioni/${codReg}`, { signal });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

/** Interrogazione puntuale del mosaico di pericolosità (WMS GetFeatureInfo). */
export async function featureInfoMosaico(layer, lon, lat, zoom, visible = true) {
  if (!visible) return null;
  const denom = 156543.03392804097 / Math.pow(2, zoom);
  const sizeM = denom * 512;
  const mx = lon * 20037508.34 / 180;
  const myRad = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  const myMerc = 6378137 * Math.max(Math.min(myRad, Math.PI), -Math.PI);
  const bbox = `${mx - sizeM / 2},${myMerc - sizeM / 2},${mx + sizeM / 2},${myMerc + sizeM / 2}`;
  const url = `${OWS}?service=WMS&version=1.3.0&request=GetFeatureInfo`
    + `&layers=idrogeo:${layer}&query_layers=idrogeo:${layer}`
    + `&crs=EPSG:3857&bbox=${encodeURIComponent(bbox)}&width=512&height=512&i=256&j=256`
    + `&info_format=application/json&format=image/png`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const fc = await r.json();
    return fc.features?.[0]?.properties ?? null;
  } catch {
    return null;
  }
}