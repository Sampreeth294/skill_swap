import { useState } from 'react';

// Categorical palette validated for CVD separation (see README → Data viz)
export const SERIES = ['#7357E8', '#2E9E8F', '#E08A2E'];

const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
};
const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function Legend({ series }) {
  return (
    <div className="chart-legend">
      {series.map((s, i) => <span key={s.key}><i style={{ background: SERIES[i] }} />{s.label}</span>)}
    </div>
  );
}

function DataTable({ data, series }) {
  return (
    <div className="chart-table-wrap">
      <table className="table chart-table">
        <thead><tr><th>Date</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{shortDate(d.date)}</td>{series.map((s) => <td key={s.key}>{d[s.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Stacked bars with a 2px surface gap, rounded tops, per-bar tooltip and a table view. */
export function StackedBars({ data, series, height = 200, title }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const W = 640, H = height, pad = { l: 28, r: 8, t: 10, b: 26 };
  const totals = data.map((d) => series.reduce((s, k) => s + d[k.key], 0));
  const max = niceMax(Math.max(1, ...totals));
  const bw = (W - pad.l - pad.r) / data.length;
  const barW = Math.min(22, bw * 0.55);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);

  return (
    <div className="chart">
      <div className="chart-head">
        {title && <h3 className="card-title">{title}</h3>}
        <div className="row gap-12">
          <Legend series={series} />
          <button className="link-btn tiny" onClick={() => setTable((t) => !t)}>{table ? 'Chart' : 'Table'}</button>
        </div>
      </div>
      {table ? <DataTable data={data} series={series} /> : (
        <div className="chart-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="grid-line" />
                <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" className="axis-text">{Math.round(max * f)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = pad.l + bw * i + bw / 2;
              let acc = 0;
              const segs = series.map((s, si) => {
                const v = d[s.key];
                const y0 = y(acc), y1 = y(acc + v);
                acc += v;
                return { si, v, y0, y1 };
              }).filter((s) => s.v > 0);
              return (
                <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={cx - bw / 2} y={pad.t} width={bw} height={H - pad.t - pad.b} fill={hover === i ? '#F3F0FF' : 'transparent'} rx="6" />
                  {segs.map((s, k) => {
                    const top = k === segs.length - 1;
                    const h = Math.max(0, s.y0 - s.y1 - (k > 0 ? 2 : 0));
                    return <rect key={s.si} x={cx - barW / 2} y={s.y1} width={barW} height={h} rx={top ? 4 : 0} fill={SERIES[s.si]} />;
                  })}
                  {(i % 2 === 0 || data.length <= 8) && <text x={cx} y={H - 8} textAnchor="middle" className="axis-text">{shortDate(d.date)}</text>}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div className="chart-tip" style={{ left: `${((pad.l + bw * hover + bw / 2) / W) * 100}%` }}>
              <strong>{shortDate(data[hover].date)}</strong>
              {series.map((s, i) => <span key={s.key}><i style={{ background: SERIES[i] }} />{s.label}<b>{data[hover][s.key]}</b></span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Multi-series line chart with crosshair tooltip (single y-axis). */
export function LineChart({ data, series, height = 220, title }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const W = 640, H = height, pad = { l: 28, r: 12, t: 12, b: 26 };
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key]))));
  const x = (i) => pad.l + ((W - pad.l - pad.r) * i) / Math.max(1, data.length - 1);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1)))));
  };
  return (
    <div className="chart">
      <div className="chart-head">
        {title && <h3 className="card-title">{title}</h3>}
        <div className="row gap-12"><Legend series={series} /><button className="link-btn tiny" onClick={() => setTable((t) => !t)}>{table ? 'Chart' : 'Table'}</button></div>
      </div>
      {table ? <DataTable data={data} series={series} /> : (
        <div className="chart-plot">
          <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={title}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="grid-line" /><text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" className="axis-text">{Math.round(max * f)}</text></g>
            ))}
            {data.map((d, i) => (i % 3 === 0 || i === data.length - 1) && <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="axis-text">{shortDate(d.date)}</text>)}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#CFC6F5" strokeWidth="1" />}
            {series.map((s, si) => (
              <g key={s.key}>
                <polyline fill="none" stroke={SERIES[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')} />
                {hover !== null && <circle cx={x(hover)} cy={y(data[hover][s.key])} r="4.5" fill={SERIES[si]} stroke="#fff" strokeWidth="2" />}
              </g>
            ))}
          </svg>
          {hover !== null && (
            <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
              <strong>{shortDate(data[hover].date)}</strong>
              {series.map((s, i) => <span key={s.key}><i style={{ background: SERIES[i] }} />{s.label}<b>{data[hover][s.key]}</b></span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal rating distribution (5★ → 1★). */
export function RatingBars({ distribution }) {
  const total = distribution.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="rating-bars">
      {[5, 4, 3, 2, 1].map((star) => (
        <div key={star} className="rating-row" title={`${distribution[star - 1]} reviews`}>
          <span>{star}★</span>
          <div className="rating-track"><span style={{ width: `${(distribution[star - 1] / total) * 100}%` }} /></div>
          <span className="tiny muted">{distribution[star - 1]}</span>
        </div>
      ))}
    </div>
  );
}
