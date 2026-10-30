// MeteoAlarm — allerte CAP per l'Italia, in tempo reale.
// Proxato via Vite: /meteoalarm → https://feeds.meteoalarm.org

const FEED = '/meteoalarm/feeds/meteoalarm-legacy-atom-italy';

const SEVERITY = {
  extreme: { label: 'Estremo', color: '#b3001b', order: 4 },
  severe: { label: 'Grave', color: '#e05038', order: 3 },
  moderate: { label: 'Moderato', color: '#f28c28', order: 2 },
  minor: { label: 'Lieve', color: '#f5c630', order: 1 },
  unknown: { label: '—', color: '#7f8fa6', order: 0 },
};

export async function fetchAlerts(signal) {
  const r = await fetch(FEED, { signal });
  if (!r.ok) throw new Error(`MeteoAlarm ${r.status}`);
  const xml = new DOMParser().parseFromString(await r.text(), 'application/xml');
  const entries = [...xml.querySelectorAll('entry')];
  return entries.map((e) => {
    const sev = (e.querySelector('severity')?.textContent ?? 'unknown').trim().toLowerCase();
    const summary = e.querySelector('summary')?.textContent ?? '';
    const regions = (e.querySelector('subject')?.textContent ?? '')
      .split(/;|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: e.querySelector('id')?.textContent ?? Math.random().toString(36),
      title: e.querySelector('title')?.textContent ?? 'Allerta',
      updated: e.querySelector('updated')?.textContent,
      severity: SEVERITY[sev] ?? SEVERITY.unknown,
      summary,
      regions,
      event: e.querySelector('cap\\:eventCode')?.textContent ?? e.querySelector('event')?.textContent ?? '',
    };
  });
}

/** Le allerte che menzionano il nome di un comune/provincia. */
export function alertsFor(alerts, comune, provincia) {
  const want = [comune, provincia].filter(Boolean).map((s) => s.toLowerCase());
  return alerts.filter((a) => {
    const text = `${a.title} ${a.summary} ${a.regions.join(' ')}`.toLowerCase();
    return want.some((w) => text.includes(w));
  });
}
