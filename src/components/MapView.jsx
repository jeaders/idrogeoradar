import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import { buildStyle, DATA_LAYERS } from '../map/style.js';
import { fetchComuneAt } from '../api/ispra.js';

const MapView = forwardRef(function MapView(
  { basemap, visible, onPick, onZoom },
  ref,
) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useImperativeHandle(ref, () => ({
    flyTo: (lon, lat, zoom = 12) => map.current?.flyTo({ center: [lon, lat], zoom, duration: 1800 }),
    fitExtent: (extent) => {
      if (!map.current) return;
      const [minLon, maxLat, maxLon, minLat] = extent;
      map.current.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 80, duration: 1800 });
    },
    setMarker: (lon, lat) => setMarker(lon, lat),
    getMap: () => map.current,
  }));

  function setMarker(lon, lat) {
    if (!map.current) return;
    if (marker.current) marker.current.remove();
    marker.current = new maplibregl.Marker({ color: '#57c1ff' })
      .setLngLat([lon, lat])
      .addTo(map.current);
  }

  // Creazione mappa (una sola volta)
  useEffect(() => {
    let dead = false;
    (async () => {
      const style = await buildStyle(basemap, visibleRef.current);
      if (dead) return;
      const m = new maplibregl.Map({
        container: container.current,
        style,
        center: [11.35, 42.5],
        zoom: 5.8,
        maxZoom: 15,
        attributionControl: { compact: true },
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
      map.current = m;

      m.on('zoomend', () => onZoom?.(m.getZoom()));
      m.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setMarker(lng, lat);
        onPick?.({ lon: lng, lat });
      });
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
    // basemap non dipendenza: gestita sotto
  }, []); // eslint-disable-line

  // Cambio basemap: ricostruisce lo stile completo (con i layer dati)
  useEffect(() => {
    let dead = false;
    (async () => {
      const m = map.current;
      if (!m) return; // la prima creazione usa buildStyle già
      const style = await buildStyle(basemap, visibleRef.current);
      if (dead) return;
      m.setStyle(style, { diff: false });
    })();
    return () => { dead = true; };
  }, [basemap]); // eslint-disable-line

  // Visibilità layer
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    for (const key of Object.keys(DATA_LAYERS)) {
      const show = visible[key] ? 'visible' : 'none';
      for (const id of [`lyr_${key}`, `lyr_out_${key}`]) {
        if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', show);
      }
    }
  }, [visible]);

  return <div ref={container} className="map-container" />;
});

export default MapView;
