import { DIFF_LABEL, FFA_COLOR, ONE_COLOR } from '../engine/catalog';
import type { GameSummary } from '../engine/record';
import {
  type GameEntry, type ModeKey, MODE_LABEL, TYPE_LABEL, avgOf, killTurnBars, modeKey, ofType, shortDate, wins,
} from '../engine/stats';
import { href } from '../router';
import { Chev } from '../ui/icons';

export type Filter = 'all' | ModeKey;
export const FILTERS: Filter[] = ['all', 'passive', 'casual', 'focused', 'high'];

export function FilterChips({ value, onPick, mobile }: { value: Filter; onPick: (f: Filter) => void; mobile?: boolean }) {
  if (mobile) {
    return (
      <div role="group" aria-label="Filter by goldfish mode" class="swipe" style="display: flex; gap: 6px; margin: 0 -16px; padding: 0 16px">
        {FILTERS.map((f) => <button key={f} type="button" class="chip" style="height: 40px; border-radius: 20px" aria-pressed={f === value} onClick={() => onPick(f)}>{MODE_LABEL[f]}</button>)}
      </div>
    );
  }
  return (
    <div role="group" aria-label="Filter by goldfish mode" class="seg" style="padding: 4px; gap: 4px; height: 48px">
      {FILTERS.map((f) => <button key={f} type="button" style="height: 38px; padding: 0 16px; font-size: 14px" aria-pressed={f === value} onClick={() => onPick(f)}>{MODE_LABEL[f]}</button>)}
    </div>
  );
}

export function resultText(g: GameSummary): string { return (g.result.win ? 'Won on T' : 'Lost on T') + g.result.turn; }

export function GameRow({ e, mobile }: { e: GameEntry; mobile?: boolean }) {
  const g = e.g;
  const result = resultText(g);
  const color = g.result.win ? '#EDF3F0' : '#FF9A9A';
  const mode = MODE_LABEL[modeKey(g)];
  const aria = `Open game details: ${shortDate(g.endedAt)}, ${TYPE_LABEL[g.type]}, ${mode}, ${result}`;
  if (mobile) {
    return (
      <li style="border-bottom: 1px solid var(--rule)">
        <a href={href('/games/' + e.id)} class="row" aria-label={aria} style="min-height: 56px; margin: 0 -8px; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 10px">
          <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <span style={`font-size: 15px; font-weight: 700; color: ${color}`}>{result}</span>
            <span class="muted" style="font-size: 12px">{shortDate(g.endedAt)} · {TYPE_LABEL[g.type]}</span>
          </div>
          <span class="tag sm">{mode}</span>
          <Chev size={16} color="#6F8C8A" class="chev" />
        </a>
      </li>
    );
  }
  return (
    <li style="border-bottom: 1px solid var(--rule)">
      <a href={href('/games/' + e.id)} class="row" aria-label={aria} style="min-height: 46px; margin: 0 -10px; padding: 8px 10px; border-radius: 10px; display: grid; grid-template-columns: 56px 96px minmax(0, 1fr) auto 16px; align-items: center; gap: 10px; font-size: 14px">
        <span class="muted">{shortDate(g.endedAt)}</span>
        <span class="tag sm" style="justify-self: start">{mode}</span>
        <span style={`color: ${color}; font-weight: 700`}>{result}</span>
        <span class="soft" style="justify-self: end; font-weight: 600; white-space: nowrap">{TYPE_LABEL[g.type]}</span>
        <Chev size={16} color="#6F8C8A" class="chev" />
      </a>
    </li>
  );
}

export function KillBars({ list, mobile }: { list: GameEntry[]; mobile?: boolean }) {
  const w = wins(list);
  const { lo, bars } = killTurnBars(w);
  const avg = avgOf(w);
  const cols = `repeat(${bars.length}, minmax(0, 1fr))`;
  const avgLeft = avg === null ? null : ((avg - lo + 0.5) / bars.length) * 100;
  return (
    <div style={`display: flex; flex-direction: column; gap: 8px; ${mobile ? '' : 'flex-grow: 1; min-height: 220px'}`}>
      <div style={`position: relative; ${mobile ? 'height: 190px' : 'flex-grow: 1; min-height: 0'}; border-bottom: 1px solid var(--line-3); background-image: linear-gradient(#1A323C 1px, transparent 1px); background-size: 100% 25%`}>
        <div style={`position: absolute; inset: 0; display: grid; grid-template-columns: ${cols}; gap: 2px; align-items: end`}>
          {bars.map((b) => (
            <div key={b.turn} title={`Turn ${b.turn}: ${b.one} One vs One, ${b.ffa} Free for All`} style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px">
              <span style={`font-size: ${mobile ? 12 : 14}px; font-weight: 700; min-height: ${mobile ? 15 : 18}px`}>{b.total || ''}</span>
              <div style={`width: min(${mobile ? 22 : 40}px, 80%); height: ${b.h}%; display: flex; flex-direction: column; gap: ${b.one && b.ffa ? 2 : 0}px`}>
                <div style={`flex: ${b.ffa} 1 0px; border-radius: 4px 4px 0 0; background: ${FFA_COLOR}`} />
                <div style={`flex: ${b.one} 1 0px; border-radius: ${b.ffa ? '0' : '4px 4px 0 0'}; background: ${ONE_COLOR}`} />
              </div>
            </div>
          ))}
        </div>
        {avgLeft !== null && (
          <div aria-hidden="true" style={`position: absolute; top: 0; bottom: 0; left: ${avgLeft.toFixed(2)}%; border-left: 2px dashed var(--muted)`}>
            <span class="soft" style={`position: absolute; top: -2px; left: ${mobile ? 6 : 8}px; white-space: nowrap; font-size: ${mobile ? 11 : 12}px; font-weight: 600`}>avg {avg!.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div aria-hidden="true" style={`display: grid; grid-template-columns: ${cols}; gap: 2px`}>
        {bars.map((b) => <span key={b.turn} class="muted" style={`text-align: center; font-size: ${mobile ? 11 : 13}px`}>T{b.turn}</span>)}
      </div>
    </div>
  );
}

export function Legend({ small }: { small?: boolean }) {
  const sq = small ? 10 : 12;
  return (
    <div aria-label="Legend" class="soft" style={`display: flex; gap: ${small ? 14 : 16}px; font-size: ${small ? 12 : 14}px`}>
      <span style="display: inline-flex; align-items: center; gap: 8px"><span style={`width: ${sq}px; height: ${sq}px; border-radius: 3px; background: ${ONE_COLOR}`} />One vs One</span>
      <span style="display: inline-flex; align-items: center; gap: 8px"><span style={`width: ${sq}px; height: ${sq}px; border-radius: 3px; background: ${FFA_COLOR}`} />Free for All</span>
    </div>
  );
}

/** Title and one-line summary for the game-over banner and Game detail. */
export function gameTitle(g: GameSummary): string {
  const t = g.result.turn;
  if (g.type === 'one') return g.result.win ? 'You killed the goldfish on turn ' + t : 'The goldfish won on turn ' + t;
  return g.result.win ? 'You cleared the table on turn ' + t : 'You died on turn ' + t;
}
export function howLabel(g: GameSummary): string {
  switch (g.result.how) {
    case 'commander': return 'Commander damage';
    case 'damage': return 'Damage';
    case 'their-commander': return 'Its commander';
    default: return 'Life';
  }
}
export function modeText(g: GameSummary): string {
  if (g.setup.mode === 'passive') return 'Passive';
  const d = DIFF_LABEL[g.setup.difficulty];
  if (g.type === 'one') return 'Active, ' + d;
  return d + ', ' + (g.setup.targeting === 'spread' ? 'spread out' : 'all on you');
}
export function gameMeta(e: GameEntry, all: GameEntry[]): string {
  const g = e.g;
  const parts: string[] = [TYPE_LABEL[g.type]];
  if (g.type === 'ffa') parts.push(g.setup.count + ' goldfish');
  if (g.type === 'one') parts.push(howLabel(g));
  parts.push(modeText(g));
  if (g.result.win) {
    const typeWins = wins(ofType(all, g.type));
    if (typeWins.length <= 1) parts.push('your first ' + TYPE_LABEL[g.type] + ' win');
    else {
      const avg = avgOf(typeWins)!;
      const diff = Math.round((avg - g.result.turn) * 10) / 10;
      parts.push(diff > 0 ? diff.toFixed(1) + ' turns faster than your ' + TYPE_LABEL[g.type] + ' average'
        : diff < 0 ? Math.abs(diff).toFixed(1) + ' turns slower than your ' + TYPE_LABEL[g.type] + ' average'
          : 'right on your ' + TYPE_LABEL[g.type] + ' average');
    }
  }
  return parts.join(' · ');
}
