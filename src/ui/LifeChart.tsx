import { useState } from 'preact/hooks';

export interface Series {
  name: string;
  color: string;
  /** Life at the start, then at the end of each round. Shorter than the others once it's out. */
  vals: number[];
  /** The last value is a knockout: drawn as a hollow dot. */
  ko?: boolean;
  /** Label the final value at the right edge. */
  endLabel?: boolean;
}

const pct = (n: number) => n.toFixed(2) + '%';

/** Line chart from the Game detail boards: one line per player, a column per round to hover or tap. */
export function LifeChart({ series, rounds, notes, mobile }: { series: Series[]; rounds: number; notes: string[]; mobile?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const r = Math.max(1, rounds);
  let maxV = 40;
  series.forEach((s) => s.vals.forEach((v) => { if (v > maxV) maxV = v; }));
  maxV = Math.ceil(maxV / 10) * 10;
  const x = (i: number) => (i / r) * 100;
  const y = (v: number) => (1 - Math.max(0, v) / maxV) * 100;
  const yTicks: number[] = [];
  for (let v = maxV; v >= 0; v -= 10) yTicks.push(v);
  const flipAt = mobile ? 50 : 55;
  const inset = mobile ? 'margin: 0 26px 0 6px' : 'margin-right: 40px';
  const cols = Array.from({ length: rounds + 1 }, (_, i) => {
    const title = i === 0 ? 'Start' : 'Round ' + i;
    const vals = series.map((s) => (i < s.vals.length ? (s.ko && i === s.vals.length - 1 ? 'Out' : String(s.vals[i])) : '—'));
    return { i, title, vals, note: notes[i] || '' };
  });
  return (
    <div style={`display: grid; grid-template-columns: ${mobile ? 20 : 26}px minmax(0, 1fr); grid-template-rows: ${mobile ? '220px' : 'minmax(220px, 1fr)'} ${mobile ? 16 : 18}px; column-gap: ${mobile ? 8 : 12}px; row-gap: ${mobile ? 8 : 10}px; ${mobile ? '' : 'flex-grow: 1; min-height: 0'}`}>
      <div aria-hidden="true" style="position: relative">
        {yTicks.map((v) => (
          <span key={v} class="muted num" style={`position: absolute; right: 0; top: ${pct(y(v))}; transform: translateY(-50%); font-size: ${mobile ? 11 : 12}px`}>{v}</span>
        ))}
      </div>
      <div style={`position: relative; ${inset}`}>
        {yTicks.map((v) => (
          <div key={v} aria-hidden="true" style={`position: absolute; left: ${mobile ? '-6px' : '0'}; right: ${mobile ? '-26px' : '0'}; top: ${pct(y(v))}; height: 1px; background: ${v === 0 ? '#2C4B58' : '#1A323C'}`} />
        ))}
        {series.map((s, si) => (
          <svg key={si} aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible">
            <polyline points={s.vals.map((v, i) => x(i).toFixed(2) + ',' + y(v).toFixed(2)).join(' ')} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          </svg>
        ))}
        {series.map((s, si) => s.vals.map((v, i) => {
          const ko = s.ko && i === s.vals.length - 1;
          const size = ko ? 12 : 8;
          return (
            <span key={si + '-' + i} aria-hidden="true" style={`position: absolute; left: ${pct(x(i))}; top: ${pct(y(v))}; width: ${size}px; height: ${size}px; box-sizing: border-box; border-radius: 50%; background: ${ko ? '#10232B' : s.color}; border: ${ko ? '2px solid ' + s.color : '0'}; box-shadow: 0 0 0 2px #10232B; transform: translate(-50%, -50%)`} />
          );
        }))}
        {series.filter((s) => s.endLabel).map((s, si) => {
          const i = s.vals.length - 1;
          return (
            <span key={'end' + si} aria-hidden="true" class="num" style={`position: absolute; left: ${pct(x(i))}; top: ${pct(y(s.vals[i]))}; transform: translate(${mobile ? 9 : 12}px, -50%); font-size: ${mobile ? 12 : 14}px; font-weight: 700`}>{s.vals[i]}</span>
          );
        })}
        {cols.map((c) => {
          const right = x(c.i) > flipAt;
          const aria = c.title + ': ' + series.map((s, k) => (s.name === 'You' ? 'you ' : s.name + ' ') + c.vals[k]).join(', ') + '. ' + c.note + '.';
          return (
            <div key={c.i} class={'hc' + (sel === c.i ? ' on' : '')} tabindex={0} aria-label={aria} onClick={() => setSel(sel === c.i ? null : c.i)}
              style={`position: absolute; top: 0; bottom: 0; left: ${pct(x(c.i))}; width: ${pct(100 / r)}; transform: translateX(-50%); z-index: ${sel === c.i ? 3 : 2}`}>
              <div class="hc-line" style="position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: #4A6A76" />
              <div class="hc-tip" style={`position: absolute; top: ${mobile ? 2 : 4}px; ${right ? 'right' : 'left'}: calc(50% + ${mobile ? 10 : 12}px); width: ${mobile ? 176 : 210}px; padding: ${mobile ? '9px 11px' : '10px 12px'}; border-radius: 12px; background: #0B1A20; border: 1px solid #2C4B58; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45); flex-direction: column; gap: 6px; z-index: 3`}>
                <span class="muted" style={`font-size: ${mobile ? 11 : 12}px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase`}>{c.title}</span>
                {series.map((s, k) => (
                  <span key={k} style={`display: flex; align-items: center; gap: 8px; font-size: ${mobile ? 13 : 14}px`}>
                    <span class="dot" style={`background: ${s.color}`} />
                    <span class="soft" style="flex-grow: 1">{s.name}</span>
                    <span class="num" style="font-weight: 700">{c.vals[k]}</span>
                  </span>
                ))}
                {c.note && <span class="muted" style={`padding-top: 6px; border-top: 1px solid #1E3844; font-size: ${mobile ? 12 : 13}px; line-height: 1.35`}>{c.note}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div />
      <div aria-hidden="true" style={`position: relative; ${inset}`}>
        {cols.map((c) => (
          <span key={c.i} class="muted" style={`position: absolute; left: ${pct(x(c.i))}; top: 0; transform: translateX(-50%); font-size: ${mobile ? 11 : 12}px; white-space: nowrap`}>{c.i === 0 ? 'Start' : 'R' + c.i}</span>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ series, small }: { series: { name: string; color: string }[]; small?: boolean }) {
  return (
    <div aria-label="Legend" style={`display: flex; flex-wrap: wrap; column-gap: ${small ? 14 : 18}px; row-gap: 6px`}>
      {series.map((s, si) => (
        <span key={si} class="soft" style={`display: inline-flex; align-items: center; gap: 8px; font-size: ${small ? 13 : 14}px`}>
          <span style={`position: relative; width: ${small ? 18 : 20}px; height: 2px; border-radius: 1px; background: ${s.color}`}>
            <span style={`position: absolute; left: ${small ? 5 : 6}px; top: -3px; width: 8px; height: 8px; border-radius: 50%; background: ${s.color}`} />
          </span>
          {s.name}
        </span>
      ))}
    </div>
  );
}
