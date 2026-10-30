import { useEffect, useRef, useState } from 'react';
import { searchPlaces, geolocate } from '../api/geocode.js';

export default function SearchBar({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const abort = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      setBusy(true);
      try {
        const r = await searchPlaces(q.trim(), abort.current.signal);
        setResults(r);
        setOpen(true);
      } catch { /* silenzioso */ }
      setBusy(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="search">
      <div className="search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Cerca comune, città o luogo…"
          aria-label="Cerca luogo"
        />
        {busy && <span className="search-spin" />}
        <button
          className="icon-btn"
          title="Usa la mia posizione"
          onClick={async () => {
            try {
              const [lon, lat] = await geolocate();
              onSelect({ name: 'La mia posizione', state: '', county: '', lon, lat, extent: null });
            } catch { /* permesso negato */ }
          }}
        >
          ⌖
        </button>
      </div>
      {open && results.length > 0 && (
        <ul className="search-list" role="listbox">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onMouseDown={() => { onSelect(r); setOpen(false); }}
              >
                <strong>{r.name}</strong>
                <span>{[r.county, r.state].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
