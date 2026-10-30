import { useCallback, useEffect, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import SearchBar from './components/SearchBar.jsx';
import ComuneCard from './components/ComuneCard.jsx';
import WeatherPanel from './components/WeatherPanel.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import LayersPanel from './components/LayersPanel.jsx';
import ComparePanel from './components/ComparePanel.jsx';
import ReportModal from './components/ReportModal.jsx';
import { fetchComuneAt, featureInfoMosaico, fetchComunePir, fetchPirItalia, fetchPirRegione } from './api/ispra.js';
import { fetchWeather } from './api/weather.js';
import { fetchAlerts } from './api/alerts.js';

const DEFAULT_VIS = { mosaic_frane: true, mosaic_alluvi: true, comuni_rischio: true, frane_aree: false, valanghe: false };
const COD_PERIT_MAP = { 0: 'Area in allerta (AA)', 1: 'P1 — bassa', 2: 'P2 — media', 3: 'P3 — alta', 4: 'P4 — molto alta' };
const COD_ALLUV_MAP = { 1: 'P1 — bassa', 2: 'P2 — media', 3: 'P3 — alta' };

export default function App() {
  const mapRef = useRef(null);
  const [basemap, setBasemap] = useState(() => localStorage.getItem('ir-basemap') ?? 'scuro');
  const [theme, setTheme] = useState(() => localStorage.getItem('ir-theme') ?? 'dark');
  const [visible, setVisible] = useState(DEFAULT_VIS);
  const [pick, setPick] = useState(null);
  const [comune, setComune] = useState(null);     // properties PIR del comune (WFS)
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [zoom, setZoom] = useState(5.8);
  const [mosaicInfo, setMosaicInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Confronto: uid→record PIR (via API tabellare) + benchmark
  const [compareUids, setCompareUids] = useState([]);
  const [compareData, setCompareData] = useState({});

  // Tema chiaro/scuro
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem('ir-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ir-basemap', basemap);
  }, [basemap]);

  // Allerte live: refresh ogni 5 min
  useEffect(() => {
    let dead = false;
    const load = async () => {
      setAlertsLoading(true);
      try {
        const a = await fetchAlerts();
        if (!dead) setAlerts(a);
      } catch { /* feed offline */ }
      if (!dead) setAlertsLoading(false);
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  const pickPoint = useCallback(async ({ lon, lat }) => {
    setPick({ lon, lat });
    setBusy(true);
    setError(null);
    const [c, fiFr, fiA] = await Promise.allSettled([
      fetchComuneAt(lon, lat),
      featureInfoMosaico('pericolosita_frane', lon, lat, zoom, visible.mosaic_frane),
      featureInfoMosaico('pericolosita_alluvioni', lon, lat, zoom, visible.mosaic_alluvi),
    ]);
    let comuneProps = null;
    if (c.status === 'fulfilled') {
      comuneProps = c.value;
      // arricchisce con il record API (breadcrumb provincia/regione) quando possibile
      if (comuneProps?.uid) {
        try {
          const rec = await fetchComunePir(comuneProps.uid);
          comuneProps = { ...rec, ...comuneProps, nome_prov: comuneProps.nome_prov ?? rec.nome_prov, nome_reg: comuneProps.nome_reg ?? rec.nome_reg };
        } catch { /* il record WFS basta */ }
      }
      setComune(comuneProps);
    } else { setComune(null); setError('Comune non disponibile per questo punto.'); }

    const infoFr = fiFr.value?.cod_per_it !== undefined ? fiFr.value : { cod_per_it: null };
    const infoAi = fiA.value?.cod_per_it !== undefined ? fiA.value : { cod_per_it: null };
    setMosaicInfo({
      frane: { code: infoFr.cod_per_it, desc: COD_PERIT_MAP[infoFr.cod_per_it] ?? 'non classificato', areaKmq: infoFr.area },
      alluvi: { code: infoAi.cod_per_it, desc: COD_ALLUV_MAP[infoAi.cod_per_it] ?? 'non classificato', areaKmq: infoAi.area },
    });

    try { setWeather(await fetchWeather(lat, lon)); } catch { setWeather(null); }
    setBusy(false);
  }, [visible.mosaic_frane, visible.mosaic_alluvi, zoom]);

  const onSearchSelect = useCallback((r) => {
    mapRef.current?.setMarker?.(r.lon, r.lat);
    if (r.extent) mapRef.current?.fitExtent(r.extent);
    else mapRef.current?.flyTo(r.lon, r.lat, 13);
    pickPoint({ lon: r.lon, lat: r.lat });
  }, [pickPoint]);

  // ─── Confronto ───
  const addToCompare = useCallback(async (uid) => {
    if (!uid || compareUids.includes(uid)) return;
    if (compareUids.length >= 4) return;
    setCompareUids((u) => [...u, uid]);
    if (!compareData[uid]) {
      try {
        const rec = await fetchComunePir(uid);
        setCompareData((d) => ({ ...d, [uid]: { ...rec, uid, pro_com: rec.pro_com } }));
      } catch { setCompareUids((u) => u.filter((x) => x !== uid)); }
    }
    // benchmark Italia una volta sola
    if (!compareData['__italia__']) {
      fetchPirItalia().then((it) => setCompareData((d) => ({ ...d, __italia__: { ...it, nome: 'Italia', __tipo__: 'benchmark nazionale' } }))).catch(() => {});
    }
    // benchmark regione del comune appena aggiunto
    try {
      const rec = compareData[uid] ?? await fetchComunePir(uid);
      const regB = rec.breadcrumb?.find((b) => b.t === 'r');
      if (regB && (!compareData['__reg__'] || compareData['__reg__'].cod_reg !== regB.id)) {
        const reg = await fetchPirRegione(regB.id);
        setCompareData((d) => ({ ...d, __reg__: { ...reg, cod_reg: regB.id, nome: regB.name, __tipo__: 'benchmark regionale' } }));
      }
    } catch { /* benchmark facoltativo */ }
  }, [compareUids, compareData]);

  const removeFromCompare = useCallback((uid) => {
    setCompareUids((u) => u.filter((x) => x !== uid));
    setCompareData((d) => {
      const { [uid]: _, ...rest } = d;
      return rest;
    });
  }, []);

  const addToCompareFromCard = useCallback((p) => {
    if (p?.uid) addToCompare(p.uid);
  }, [addToCompare]);

  return (
    <div className="app">
      <MapView
        ref={mapRef}
        basemap={basemap}
        visible={visible}
        onPick={(ll) => pickPoint(ll)}
        onZoom={setZoom}
      />

      <aside className="sidebar">
        <header className="brand">
          <div className="logo">🛰️</div>
          <div>
            <h1>Idrogeo<span>Radar</span></h1>
            <p>Dissesto idrogeologico italiano — dati aperti ISPRA, MeteoAlarm, Open-Meteo</p>
          </div>
          <button
            className="icon-btn theme-btn"
            title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              setTheme(next);
              // sincronizza la mappa di base con il tema
              setBasemap((b) => (b === 'scuro' && next === 'light') ? 'chiaro' : (b === 'chiaro' && next === 'dark') ? 'scuro' : b);
            }}
          >{theme === 'dark' ? '☀️' : '🌙'}</button>
        </header>

        <SearchBar onSelect={onSearchSelect} />

        {busy && <div className="loading-bar"><div /></div>}
        {error && <p className="error">{error}</p>}

        <ComuneCard
          props={comune}
          onReport={() => setReportOpen(true)}
          onCompare={addToCompareFromCard}
          inCompare={!!comune?.uid && compareUids.includes(comune.uid)}
        />

        {mosaicInfo && comune && (
          <div className="card mini">
            <div className="card-head"><h3>Pericolosità al punto selezionato</h3></div>
            <div className="point-info">
              <div><span>Frane</span><b>{mosaicInfo.frane.desc}</b></div>
              <div><span>Alluvioni</span><b>{mosaicInfo.alluvi.desc}</b></div>
            </div>
          </div>
        )}

        <WeatherPanel weather={weather} />
        <AlertsPanel alerts={alerts} loading={alertsLoading} comune={comune?.nome} provincia={comune?.nome_prov} />

        <ComparePanel
          compareUids={compareUids}
          compareData={compareData}
          addToCompare={addToCompare}
          removeFromCompare={removeFromCompare}
        />

        <LayersPanel
          visible={visible}
          basemap={basemap}
          onBasemap={setBasemap}
          onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
        />

        <footer className="credits">
          <p>Sorgenti: <a href="https://idrogeo.isprambiente.it/" target="_blank" rel="noreferrer">IdroGEO/ISPRA</a> (IFFI, PIR — aggiornati ogni 24 h),
            <a href="https://feeds.meteoalarm.org" target="_blank" rel="noreferrer">MeteoAlarm</a>, <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>,
            <a href="https://photon.komoot.io" target="_blank" rel="noreferrer">Photon</a>.</p>
          <p>Progetto open — i dati appartengono alle loro licenze open (CC-BY per ISPRA, ODbL per OSM).</p>
        </footer>
      </aside>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        comune={comune}
        point={pick}
        mosaicInfo={mosaicInfo}
        weather={weather}
        alerts={alerts}
      />
    </div>
  );
}
