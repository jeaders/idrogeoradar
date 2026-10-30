// Open-Meteo — meteo in diretta + previsione 7 giorni (nessuna API key).
// Proxato via Vite: /open-meteo → https://api.open-meteo.com

export async function fetchWeather(lat, lon, signal) {
  const url = `/open-meteo/v1/forecast`
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + `&current=temperature_2m,precipitation,weather_code`
    + `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max`
    + `&hourly=precipitation&past_hours=24&forecast_hours=72`
    + `&timezone=Europe%2FBerlin`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const w = await r.json();

  // Pioggia = mm. Cumulata prossime 24/48/72h dalle serie orarie.
  const hh = w.hourly?.precipitation ?? [];
  const next = hh.slice(24); // le prime 24 sono le ore passate
  const sum24 = next.slice(0, 24).reduce((a, b) => a + (b || 0), 0);
  const sum48 = next.slice(0, 48).reduce((a, b) => a + (b || 0), 0);
  const sum72 = next.slice(0, 72).reduce((a, b) => a + (b || 0), 0);
  const past24 = hh.slice(0, 24).reduce((a, b) => a + (b || 0), 0);

  return {
    current: w.current ?? null,
    past24,
    next24: sum24,
    next48: sum48,
    next72: sum72,
    daily: (w.daily?.time ?? []).map((t, i) => ({
      date: t,
      mm: w.daily?.precipitation_sum?.[i] ?? 0,
      prob: w.daily?.precipitation_probability_max?.[i],
      tmax: w.daily?.temperature_2m_max?.[i],
    })),
  };
}

/**
 * Indicativa soglia di allerta idrogeologica per pioggia attesa nel nord/bassa
 * quota dell'Italia (valore di riferimento, non è un bollettino ufficiale).
 */
export function rainAlertLevel({ next24, next72 }) {
  const max = Math.max(next24, next72 / 3);
  if (max >= 100) return { level: 4, label: 'Critico', color: '#b3001b' };
  if (max >= 60) return { level: 3, label: 'Elevato', color: '#e05038' };
  if (max >= 30) return { level: 2, label: 'Attenzione', color: '#f28c28' };
  if (max >= 10) return { level: 1, label: 'Pioggia in arrivo', color: '#f5c630' };
  return { level: 0, label: 'Condizioni tranquille', color: '#2ecc8f' };
}

export function weatherCodeLabel(code) {
  const map = {
    0: 'Sereno', 1: 'Poco nuvoloso', 2: 'Parzialmente nuvoloso', 3: 'Coperto',
    45: 'Nebbia', 48: 'Nebbia con brina', 51: 'Pioviggina', 53: 'Pioviggina', 55: 'Pioviggina intensa',
    61: 'Pioggia debole', 63: 'Pioggia', 65: 'Pioggia forte',
    71: 'Neve', 73: 'Neve', 75: 'Neve abbondante', 77: 'Grani di neve',
    80: 'Rovesci deboli', 81: 'Rovesci', 82: 'Rovesci violenti',
    85: 'Rovesci di neve', 86: 'Rovesci di neve intensi', 95: 'Temporale', 96: 'Temporale con grandine', 99: 'Temporale violento',
  };
  return map[code] ?? '—';
}
