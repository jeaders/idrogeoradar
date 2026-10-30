import { computeRisk, fmtInt, fmtNum } from '../api/score.js';
import { weatherCodeLabel, rainAlertLevel } from '../api/weather.js';
import { alertsFor } from '../api/alerts.js';

export default function ReportModal({ open, onClose, comune, point, mosaicInfo, weather, alerts }) {
  if (!open || !comune) return null;
  const p = comune;
  const r = computeRisk(p);

  const dayName = (d) => new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const popIdr = (p.pop_idr_p1 ?? 0) + (p.pop_idr_p2 ?? 0) + (p.pop_idr_p3 ?? 0);
  const lvl = weather ? rainAlertLevel(weather) : null;
  const mine = alertsFor(alerts ?? [], p.nome, p.nome_prov);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal report print-area">
        <div className="modal-actions no-print">
          <button className="btn primary" onClick={() => window.print()}>🖨️ Stampa / Salva PDF</button>
          <button className="btn" onClick={onClose}>✕ Chiudi</button>
        </div>

        <header className="rep-head">
          <h1>Report di rischio idrogeologico · {p.nome}</h1>
          <p>{[p.nome_prov, p.nome_reg].filter(Boolean).join(' · ')}{point && <> — punto interrogato {point.lat.toFixed(5)}°N {point.lon.toFixed(5)}°E</>} — generato il {new Date().toLocaleString('it-IT')}</p>
        </header>

        <section className="rep-grade">
          <div className="grade-badge big" style={{ borderColor: r.gradeColor, color: r.gradeColor }}>{r.grade}</div>
          <div>
            <h2 style={{ color: r.gradeColor }}>{r.gradeLabel}</h2>
            <p>Indice sintetico {fmtNum(r.idx, 1)}/100, calcolato con gli indicatori PIR di ISPRA IdroGEO (valutazione informativa, non un atto tecnico).</p>
          </div>
        </section>

        <section>
          <h3>Indicatori comunali</h3>
          <table className="rep-table">
            <tbody>
              <tr><td>Territorio in area di pericolosità da frana P3+P4</td><th>{fmtNum(p.ar_frp3p4p ?? 0, 1)} % ({fmtNum(p.ar_fr_p3p4 ?? 0, 2)} km²)</th></tr>
              <tr><td>Territorio in area di pericolosità idraulica P1–P3</td><th>{fmtNum((p.aridp1_p ?? 0) + (p.aridp2_p ?? 0) + (p.aridp3_p ?? 0), 1)} %</th></tr>
              <tr><td>Abitanti in aree di frana P3+P4</td><th>{fmtInt(p.popfr_p3p4 ?? 0)} ({fmtNum(p.popfrp3p4p ?? 0, 1)}% della popolazione)</th></tr>
              <tr><td>Abitanti in aree idrauliche P1–P3</td><th>{fmtInt(popIdr)}</th></tr>
              <tr><td>Famiglie esposte (frana P3+P4)</td><th>{fmtInt(p.famfr_p3p4 ?? 0)}</th></tr>
              <tr><td>Edifici esposti (frana P3+P4)</td><th>{fmtInt(p.ed_fr_p3p4 ?? 0)}</th></tr>
              <tr><td>Superficie comunale</td><th>{fmtNum(p.ar_kmq ?? 0, 1)} km²</th></tr>
              <tr><td>Popolazione residente</td><th>{fmtInt(p.pop_res021 ?? 0)}</th></tr>
            </tbody>
          </table>
        </section>

        {mosaicInfo && (
          <section>
            <h3>Pericolosità al punto interrogato</h3>
            <table className="rep-table">
              <tbody>
                <tr><td>Frane (mosaico nazionale ISPRA)</td><th>{mosaicInfo.frane.desc}</th></tr>
                <tr><td>Alluvioni (mosaico nazionale ISPRA)</td><th>{mosaicInfo.alluvi.desc}</th></tr>
              </tbody>
            </table>
          </section>
        )}

        {weather && (
          <section>
            <h3>Meteo e previsioni (Open-Meteo)</h3>
            <p className="rep-note">
              Ora: {Math.round(weather.current?.temperature_2m ?? 0)}°, {weatherCodeLabel(weather.current?.weather_code)}, pioggia {fmtNum(weather.current?.precipitation ?? 0, 1)} mm.
              Pioggia attesa: 24 h <b>{fmtNum(weather.next24, 1)} mm</b>, 72 h <b>{fmtNum(weather.next72, 1)} mm</b>
              {lvl && <> — livello indicativo: <b style={{ color: lvl.color }}>{lvl.label}</b></>}.
            </p>
            <table className="rep-table">
              <tbody>
                {weather.daily.slice(0, 7).map((d) => (
                  <tr key={d.date}>
                    <td>{dayName(d.date)}</td>
                    <th>{fmtNum(d.mm, 1)} mm · prob. {fmtNum(d.prob ?? 0, 0)}% · max {fmtNum(d.tmax, 0)}°</th>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h3>Allerte MeteoAlarm attive {mine.length ? '— rilevanti per questo comune' : ''}</h3>
          {mine.length > 0 ? (
            <ul className="rep-alerts">
              {mine.map((a) => (
                <li key={a.id}>
                  <span className="a-sev" style={{ background: a.severity.color }}>{a.severity.label}</span>
                  {a.event} — {a.regions.slice(0, 6).join(', ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{alerts?.length ? 'Nessuna allerta CAP specifica per questo comune o provincia al momento della generazione.' : 'Feed allerte non disponibile.'}</p>
          )}
        </section>

        <footer className="rep-foot">
          <p>Fonti: ISPRA IdroGEO (IFFI, indicatori di rischio — aggiornati ogni 24 h), MeteoAlarm CAP, Open-Meteo. IdrogeoRadar è uno strumento informativo open-data: non sostituisce i canali ufficiali di protezione civile né valutazioni tecniche. Dati soggetti a licenza open (CC-BY ISPRA).</p>
        </footer>
      </div>
    </div>
  );
}
