import { alertsFor } from '../api/alerts.js';

export default function AlertsPanel({ alerts, loading, comune, provincia }) {
  if (loading) return <div className="card"><h3>Allerte in tempo reale</h3><p className="muted">Caricamento feed MeteoAlarm…</p></div>;

  const mine = comune ? alertsFor(alerts, comune, provincia) : [];
  return (
    <div className="card">
      <div className="card-head">
        <h3>Allerte in tempo reale</h3>
        {mine.length > 0 && <span className="dot" title="Allerta attiva per l'area selezionata" />}
      </div>

      {alerts.length === 0 && <p className="muted">Nessuna allerta meteo attiva in Italia. 🟢</p>}

      {alerts.length > 0 && (
        <ul className="alerts">
          {alerts.slice(0, 12).map((a) => (
            <li key={a.id} className={mine.some((m) => m.id === a.id) ? 'mine' : ''}>
              <div className="a-head">
                <span className="a-sev" style={{ background: a.severity.color }}>{a.severity.label}</span>
                <b>{a.title}</b>
              </div>
              <div className="a-sub">{a.event || 'Allerta'} · {a.regions.slice(0, 4).join(', ')}{a.regions.length > 4 ? '…' : ''}</div>
            </li>
          ))}
        </ul>
      )}

      {mine.length > 0 && <p className="warn">⚠️ {mine.length} allerta/e attiva/e che riguardano l'area selezionata.</p>}
      <p className="footnote">Feed CAP MeteoAlarm (agenzia nazionale per Meteo Italia). Consulta sempre la protezione civile regionale per le allerte ufficiali.</p>
    </div>
  );
}
