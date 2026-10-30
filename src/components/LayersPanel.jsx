import { BASEMAP_KEYS, BASEMAP_LABELS } from '../map/style.js';

export default function LayersPanel({ visible, onToggle, basemap, onBasemap }) {
  return (
    <div className="card">
      <h3>Mappe di base</h3>
      <div className="seg">
        {BASEMAP_KEYS.map((key) => (
          <button
            key={key}
            className={basemap === key ? 'on' : ''}
            onClick={() => onBasemap(key)}
          >{BASEMAP_LABELS[key]}</button>
        ))}
      </div>

      <h3>Layer dati</h3>
      <label className="layer-switch">
        <input type="checkbox" checked={!!visible.mosaic_frane} onChange={() => onToggle('mosaic_frane')} />
        Pericolosità frane (mosaico ISPRA)
      </label>
      <label className="layer-switch">
        <input type="checkbox" checked={!!visible.mosaic_alluvi} onChange={() => onToggle('mosaic_alluvi')} />
        Pericolosità alluvioni (mosaico ISPRA)
      </label>
      <label className="layer-switch">
        <input type="checkbox" checked={!!visible.comuni_rischio} onChange={() => onToggle('comuni_rischio')} />
        Popolazione comunale a rischio<span className="zoom-note"> (da z=5,5)</span>
      </label>
      <label className="layer-switch">
        <input type="checkbox" checked={!!visible.frane_aree} onChange={() => onToggle('frane_aree')} />
        Aree di frana IFFI<span className="zoom-note"> (da z=8)</span>
      </label>
      <label className="layer-switch">
        <input type="checkbox" checked={!!visible.valanghe} onChange={() => onToggle('valanghe')} />
        Aree valanghive<span className="zoom-note"> (da z=9)</span>
      </label>

      <div className="legend">
        <h4>Choropleth comuni</h4>
        <div className="legend-scale">
          <i style={{ background: '#2a755e' }} /><i style={{ background: '#f5c630' }} /><i style={{ background: '#f28c28' }} />
          <i style={{ background: '#e05038' }} /><i style={{ background: '#b3001b' }} />
          <span>0% → 30% pop. in aree frana P3+P4</span>
        </div>
      </div>
    </div>
  );
}
