// Calcolo del punteggio di rischio idrogeologico comunale (A–F)
// a partire dagli indicatori PIR di IdroGEO (percentuali già calcolate da ISPRA).

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

export const GRADE_META = {
  A: { color: '#2ecc8f', label: 'Rischio molto basso' },
  B: { color: '#7ac74f', label: 'Rischio basso' },
  C: { color: '#f5c630', label: 'Rischio medio' },
  D: { color: '#f28c28', label: 'Rischio elevato' },
  E: { color: '#e05038', label: 'Rischio alto' },
  F: { color: '#b3001b', label: 'Rischio critico' },
};

/**
 * Indice composito semplice e trasparente:
 *  - % del territorio comunale in area di pericolosità da frana P3+P4 (ar_frp3p4p)
 *  - % del territorio comunale in area di pericolosità idraulica P1..P3,
 *    ponderata per gravità (P3=1.0, P2=0.6, P1=0.3).
 * Nota: classificazione indicativa di sintesi, non un atto tecnico.
 */
export function computeRisk(p) {
  if (!p) return null;
  const fr = num(p.ar_frp3p4p);
  const a1 = num(p.aridp1_p);
  const a2 = num(p.aridp2_p);
  const a3 = num(p.aridp3_p);
  const allTot = a1 + a2 + a3;
  const allW = a3 + a2 * 0.6 + a1 * 0.3;
  const idx = Math.min(100, fr * 0.55 + allW * 0.45 + Math.min(fr, allW) * 0.15);

  let grade, meta;
  if (idx < 2) [grade, meta] = ['A', GRADE_META.A];
  else if (idx < 7) [grade, meta] = ['B', GRADE_META.B];
  else if (idx < 15) [grade, meta] = ['C', GRADE_META.C];
  else if (idx < 27) [grade, meta] = ['D', GRADE_META.D];
  else if (idx < 45) [grade, meta] = ['E', GRADE_META.E];
  else [grade, meta] = ['F', GRADE_META.F];

  return {
    grade, gradeColor: meta.color, gradeLabel: meta.label, idx,
    frPct: fr,
    allPct: allTot,
    frP3P4AreaKmq: num(p.ar_fr_p3p4 ?? 0),
    popAtRisk: num(p.popfr_p3p4 ?? 0),         // abitanti in area frana P3+P4
    popAtRiskIdr: num(p.pop_idr_p3 + p.pop_idr_p2 + p.pop_idr_p1),
    edAtRisk: num(p.ed_fr_p3p4 ?? 0),
    famAtRisk: num(p.famfr_p3p4 ?? 0),
  };
}

export const fmtInt = (n) => new Intl.NumberFormat('it-IT').format(Math.round(n));
export const fmtNum = (n, d = 1) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: d }).format(n);
