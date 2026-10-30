import { computeRisk, fmtInt, fmtNum } from '../api/score.js';

function Bar({ label, value, max = 100, color = '#57c1ff', suffix = '%' }) {
  const w = Math.min(100, (value / max) * 100);
  return (
    <div className="bar">
      <div className="bar-head">
        <span>{label}</span>
        <b>{fmtNum(value, 1)}{suffix}</b>
      </div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${w}%`, background: color }} /></div>
    </div>
  );
}

export default function ComuneCard({ props: p, name, provincia, regione, onReport, onCompare, inCompare }) {
  const risk = computeRisk(p);
  if (!p || !risk) {
    return (
      <div className="card">
        <h3>Nessun comune selezionato</h3>
        <p className="muted">Cerca un luogo, usa ⌖ per il GPS o clicca sulla mappa per leggere indicatori, pericolosità e allerte live.</p>
      </div>
    );
  }

  const popIdr = (p.pop_idr_p3 ?? 0) + (p.pop_idr_p2 ?? 0) + (p.pop_idr_p1 ?? 0);

  return (
    <div className="card">
      <div className="grade-row">
        <div className="grade-badge" style={{ borderColor: risk.gradeColor, color: risk.gradeColor }}>{risk.grade}</div>
        <div>
          <h3>{p.nome || name}</h3>
          <div className="muted">{[p.nome_prov || provincia, p.nome_reg || regione].filter(Boolean).join(' · ')}</div>
          <div className="grade-label" style={{ color: risk.gradeColor }}>{risk.gradeLabel}</div>
        </div>
      </div>

      <div className="risk-bars">
        <Bar label="Territorio in frana (P3+P4)" value={risk.frPct} color="#e05038" />
        <Bar label="Territorio alluvioni (P1–P3)" value={risk.allPct} color="#3baadd" />
      </div>

      <dl className="stats">
        <div><dt>Abitanti in aree frana P3+P4</dt><dd>{fmtInt(risk.popAtRisk)}</dd></div>
        <div><dt>Abitanti in aree alluvioni</dt><dd>{fmtInt(popIdr)}</dd></div>
        <div><dt>Famiglie (frana P3+P4)</dt><dd>{fmtInt(risk.famAtRisk)}</dd></div>
        <div><dt>Edifici (frana P3+P4)</dt><dd>{fmtInt(risk.edAtRisk)}</dd></div>
        <div><dt>Area frane P3+P4</dt><dd>{fmtNum(p.ar_fr_p3p4 ?? 0, 2)} km²</dd></div>
        <div><dt>Superficie comune</dt><dd>{fmtNum(p.ar_kmq ?? 0, 1)} km²</dd></div>
      </dl>

      <div className="card-actions">
        <button className="btn primary" onClick={() => onReport?.()}>📄 Report PDF</button>
        <button className="btn" onClick={() => onCompare?.(p)} disabled={!p.uid}>➕ {inCompare ? 'Nel confronto' : 'Confronto'}</button>
      </div>

      <p className="footnote">Indice sintetico {fmtNum(risk.idx, 1)}/100 calcolato dagli indicatori ISPRA IdroGEO (PIR). Valore informativo: non sostituisce uno studio tecnico.</p>
    </div>
  );
}
