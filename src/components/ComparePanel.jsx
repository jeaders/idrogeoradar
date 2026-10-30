import { useEffect, useMemo, useState } from 'react';
import { getComuniIndex } from '../api/ispra.js';
import { computeRisk, fmtInt, fmtNum } from '../api/score.js';

// Ogni metrica legge direttamente dai dati PIR grezzi del comune
// (funziona per click su mappa, record API e benchmark regione/Italia).
const METRICS = [
  {
    key: 'idx', label: 'Indice di rischio', num: (p) => computeRisk(p).idx,
    fmt: (p) => `${fmtNum(computeRisk(p).idx, 1)}/100`, cmp: true,
  },
  {
    key: 'fr', label: 'Territorio in frana P3+P4', num: (p) => p.ar_frp3p4p ?? 0,
    fmt: (p) => `${fmtNum(p.ar_frp3p4p ?? 0, 1)}%`, cmp: true,
    fmt2: (p) => `${fmtNum(p.ar_fr_p3p4 ?? 0, 1)} km²`,
  },
  {
    key: 'all', label: 'Territorio alluvioni P1–P3', num: (p) => (p.aridp1_p ?? 0) + (p.aridp2_p ?? 0) + (p.aridp3_p ?? 0),
    fmt: (p) => `${fmtNum((p.aridp1_p ?? 0) + (p.aridp2_p ?? 0) + (p.aridp3_p ?? 0), 1)}%`, cmp: true,
    fmt2: (p) => `${fmtNum((p.ar_id_p1 ?? 0) + (p.ar_id_p2 ?? 0) + (p.ar_id_p3 ?? 0), 0)} km²`,
  },
  {
    key: 'popfr', label: 'Abitanti in aree frana P3+P4', num: (p) => p.popfr_p3p4 ?? 0,
    fmt: (p) => fmtInt(p.popfr_p3p4 ?? 0), cmp: true,
    fmt2: (p) => `${fmtNum(p.popfrp3p4p ?? 0, 1)}% pop.`,
  },
  {
    key: 'popidr', label: 'Abitanti in aree alluvioni', num: (p) => (p.pop_idr_p1 ?? 0) + (p.pop_idr_p2 ?? 0) + (p.pop_idr_p3 ?? 0),
    fmt: (p) => fmtInt((p.pop_idr_p1 ?? 0) + (p.pop_idr_p2 ?? 0) + (p.pop_idr_p3 ?? 0)), cmp: true,
    fmt2: (p) => `${fmtNum((p.popidp1_p ?? 0) + (p.popidp2_p ?? 0) + (p.popidp3_p ?? 0), 1)}% pop.`,
  },
  {
    key: 'fam', label: 'Famiglie (frana P3+P4)', num: (p) => p.famfr_p3p4 ?? 0,
    fmt: (p) => fmtInt(p.famfr_p3p4 ?? 0), cmp: true,
  },
  {
    key: 'ed', label: 'Edifici (frana P3+P4)', num: (p) => p.ed_fr_p3p4 ?? 0,
    fmt: (p) => fmtInt(p.ed_fr_p3p4 ?? 0), cmp: true,
  },
  {
    key: 'kmq', label: 'Superficie', num: (p) => p.ar_kmq ?? 0,
    fmt: (p) => `${fmtNum(p.ar_kmq ?? 0, 1)} km²`, cmp: false,
  },
];

function normColor(v, min, max) {
  if (max <= min) return 'transparent';
  const t = (v - min) / (max - min); // "better: low" → 0 migliore
  const alpha = 0.1 + t * 0.55;
  const r = Math.round(46 + t * (179 - 46));
  const g = Math.round(204 - t * (204 - 0));
  const b = Math.round(143 - t * (143 - 27));
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ComparePanel({ compareUids, addToCompare, removeFromCompare, compareData }) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoadingIndex(true);
    getComuniIndex()
      .then(setIndex)
      .catch(() => setError('Indice comuni non disponibile (API IdroGEO).'))
      .finally(() => setLoadingIndex(false));
  }, []);

  const suggestions = useMemo(() => {
    if (!index || q.trim().length < 2) return [];
    const needle = q.trim().toLowerCase();
    return index
      .filter((c) => c.nome.toLowerCase().includes(needle))
      .sort((a, b) => {
        const sa = a.nome.toLowerCase().startsWith(needle) ? 0 : 1;
        const sb = b.nome.toLowerCase().startsWith(needle) ? 0 : 1;
        return sa - sb || a.nome.localeCompare(b.nome);
      })
      .slice(0, 8);
  }, [index, q]);

  const rows = compareUids.map((uid) => compareData[uid]).filter(Boolean);
  const italia = compareData['__italia__'];
  const regione = compareData['__reg__'];
  const benches = [regione, italia].filter(Boolean);

  const rangeOf = (m) => {
    if (!m.cmp) return [0, 1];
    const vals = rows.map((p) => m.num(p)).concat(benches.map((p) => m.num(p)));
    return [Math.min(...vals), Math.max(...vals)];
  };

  return (
    <div className="card compare">
      <div className="card-head">
        <h3>Confronto comuni</h3>
        <span className="muted">{compareUids.length}/4</span>
      </div>

      <div className="compare-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={index ? 'Aggiungi un comune… (min 2 lettere)' : loadingIndex ? "Carico l'indice comuni…" : 'Indice non disponibile'}
          disabled={!index}
        />
        {suggestions.length > 0 && (
          <ul className="search-list">
            {suggestions.map((c) => (
              <li key={c.uid}>
                <button onMouseDown={() => { addToCompare(c.uid); setQ(''); }}>
                  <strong>{c.nome}</strong>
                  <span>{[c.provincia, c.regione].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {rows.length === 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          Aggiungi comuni per comparare punteggio, territorio a rischio e popolazione esposta (fino a 4). Il comune selezionato sulla mappa può essere aggiunto con ➕.
        </p>
      )}

      {rows.length > 0 && (
        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Indicatore</th>
                {rows.map((p) => (
                  <th key={p.uid} className="c-col">
                    <button className="x" onClick={() => removeFromCompare(p.uid)} title="Rimuovi">✕</button>
                    <span className="c-name">{p.nome}</span>
                    <small>{[p.nome_prov].filter(Boolean).join(' · ')}</small>
                  </th>
                ))}
                {benches.map((p) => (
                  <th key={p.nome} className="bench">
                    <span className="c-name">{p.nome}</span>
                    <small>{p.__tipo__}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Punteggio</td>
                {rows.map((p) => {
                  const r = computeRisk(p);
                  return <td key={p.uid}><span className="grade-badge sm" style={{ borderColor: r.gradeColor, color: r.gradeColor }}>{r.grade}</span></td>;
                })}
                {benches.map((p) => {
                  const r = computeRisk(p);
                  return (
                    <td key={p.nome} className="bench">
                      <span className="grade-badge sm" style={{ borderColor: r.gradeColor, color: r.gradeColor }}>{r.grade}</span>
                    </td>
                  );
                })}
              </tr>
              {METRICS.map((m) => {
                const [min, max] = rangeOf(m);
                return (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    {rows.map((p) => (
                      <td key={p.uid} style={m.cmp ? { background: normColor(m.num(p), min, max) } : undefined}>
                        {m.fmt(p)}
                        {m.fmt2 && <small>{m.fmt2(p)}</small>}
                      </td>
                    ))}
                    {benches.map((p) => (
                      <td key={p.nome} className="bench">
                        {m.fmt(p)}
                        {m.fmt2 && <small>{m.fmt2(p)}</small>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="footnote">Benchmark di sintesi PIR {italia ? 'Italia' : ''}{italia && regione ? ' e ' : ''}{regione ? `regione ${regione.nome}` : ''} (IdroGEO API). Il colore della cella va da verde (migliore) a rosso (peggiore) tra i comuni confrontati.</p>
    </div>
  );
}
