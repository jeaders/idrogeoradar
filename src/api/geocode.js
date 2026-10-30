// Photon (Komoot / OpenStreetMap) — ricerca di luoghi, senza API key.
// Proxato via Vite: /photon → https://photon.komoot.io

export async function searchPlaces(q, signal) {
  const url = `/photon/api?q=${encodeURIComponent(q)}&limit=7`
    + `&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&osm_tag=county`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Photon ${r.status}`);
  const data = await r.json();
  return (data.features ?? [])
    .filter((f) => f.properties?.countrycode === 'IT')
    .map((f) => ({
      name: f.properties?.name ?? '',
      state: f.properties?.state ?? '',
      county: f.properties?.county ?? '',
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      extent: f.properties?.extent ?? null, // [minLon, maxLat, maxLon, minLat]
    }));
}

export async function geolocate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalizzazione non disponibile'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
