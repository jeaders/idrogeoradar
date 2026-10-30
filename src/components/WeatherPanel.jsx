import { weatherCodeLabel, rainAlertLevel } from '../api/weather.js';
import { fmtNum } from '../api/score.js';

export default function WeatherPanel({ weather, pickInfo }) {
  if (!weather) return null;
  const alertLvl = rainAlertLevel(weather);
  const days = weather.daily.slice(0, 7);
  const maxMm = Math.max(5, ...days.map((d) => d.mm));

  return (
    <div className="card">
      <div className="card-head">
        <h3>Meteo in diretta & previsioni</h3>
        <span className="pill" style={{ background: alertLvl.color }}>{alertLvl.label}</span>
      </div>

      {weather.current && (
        <p className="live">
          <b className="temp">{Math.round(weather.current.temperature_2m)}°</b>
          <span>{weatherCodeLabel(weather.current.weather_code)}</span>
          <span>Pioggia ora: <b>{fmtNum(weather.current.precipitation, 1)} mm</b></span>
        </p>
      )}

      <div className="rain-stripes">
        <div>24 h passate<b>{fmtNum(weather.past24, 1)} mm</b></div>
        <div>Pross. 24 h<b style={{ color: alertLvl.color }}>{fmtNum(weather.next24, 1)} mm</b></div>
        <div>Pross. 72 h<b>{fmtNum(weather.next72, 1)} mm</b></div>
      </div>

      <p className="muted">
        {alertLvl.level >= 2
          ? '⚠️ Pioggia attesa significativa: con suolo saturo o pendenze elevate può innescare franosità o allagamenti. Segui le allerte ufficiali.'
          : 'Nessun evento di pioggia rilevante atteso nei prossimi giorni.'}
      </p>

      <div className="forecast">
        {days.map((d) => (
          <div className="fc-day" key={d.date} title={`${fmtNum(d.mm, 1)} mm · prob. ${d.prob ?? 0}%`}>
            <span className="fc-date">{new Date(d.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}</span>
            <div className="fc-bar"><div style={{ height: `${(d.mm / maxMm) * 100}%` }} /></div>
            <span className="fc-mm">{fmtNum(d.mm, 1)}</span>
            <span className="fc-prob">{fmtNum(d.prob ?? 0, 0)}%</span>
          </div>
        ))}
      </div>

      {pickInfo && (
        <p className="footnote">
          Pericolosità locale al punto: <b>{pickInfo.frane?.desc ?? 'non classificato'}</b>
          {pickInfo.alluvi?.desc && <> · alluvioni: <b>{pickInfo.alluvi.desc}</b></>}
        </p>
      )}
    </div>
  );
}
