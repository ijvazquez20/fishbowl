// Kill-turn stats. One vs One and Free for All count together; for Free for All the kill turn is
// the turn the last goldfish died (a win) or the turn you died (a loss).
import type { Difficulty } from './catalog';
import type { GameSummary } from './record';

export type ModeKey = 'passive' | Difficulty;
export interface GameEntry { id: string; g: GameSummary }

export const MODE_LABEL: Record<ModeKey | 'all', string> = {
  all: 'All', passive: 'Passive', casual: 'Casual', focused: 'Focused', high: 'High-power',
};
export const TYPE_LABEL = { one: 'One vs One', ffa: 'Free for All' } as const;

export function modeKey(g: GameSummary): ModeKey {
  return g.setup.mode === 'passive' ? 'passive' : g.setup.difficulty;
}

export function avgOf(list: GameEntry[]): number | null {
  if (!list.length) return null;
  let t = 0;
  list.forEach((e) => { t += e.g.result.turn; });
  return Math.round((t / list.length) * 10) / 10;
}
export function bestOf(list: GameEntry[]): number | null {
  return list.length ? Math.min(...list.map((e) => e.g.result.turn)) : null;
}
export function fmtAvg(n: number | null): string { return n === null ? '—' : n.toFixed(1); }
export function fmtTurn(n: number | null): string { return n === null ? '—' : 'T' + n; }
export const wins = (list: GameEntry[]) => list.filter((e) => e.g.result.win);
export const ofType = (list: GameEntry[], type: 'one' | 'ffa') => list.filter((e) => e.g.type === type);

export function newestFirst(list: GameEntry[]): GameEntry[] {
  return list.slice().sort((a, b) => b.g.endedAt - a.g.endedAt);
}

export interface DeckAggregate { games: number; one: number; ffa: number; avg: number | null; best: number | null; last: number | null }
export function deckAggregate(list: GameEntry[]): DeckAggregate {
  const w = wins(list);
  return {
    games: list.length,
    one: ofType(list, 'one').length,
    ffa: ofType(list, 'ffa').length,
    avg: avgOf(w),
    best: bestOf(w),
    last: list.length ? Math.max(...list.map((e) => e.g.endedAt)) : null,
  };
}

/** Stacked kill-turn bars; the turn range follows the data, at least nine turns wide. */
export function killTurnBars(winsList: GameEntry[]) {
  const turns = winsList.map((e) => e.g.result.turn);
  let lo = turns.length ? Math.max(1, Math.min(...turns) - 1) : 4;
  let hi = turns.length ? Math.max(...turns) + 1 : 12;
  if (hi - lo + 1 < 9) hi = lo + 8;
  if (hi - lo + 1 > 16) lo = Math.max(1, hi - 15);
  const counts: Record<number, { one: number; ffa: number }> = {};
  winsList.forEach((e) => {
    const c = (counts[e.g.result.turn] ||= { one: 0, ffa: 0 });
    c[e.g.type]++;
  });
  let max = 1;
  Object.values(counts).forEach((c) => { max = Math.max(max, c.one + c.ffa); });
  const bars = [];
  for (let t = lo; t <= hi; t++) {
    const n = counts[t] || { one: 0, ffa: 0 };
    bars.push({ turn: t, one: n.one, ffa: n.ffa, total: n.one + n.ffa, h: Math.round(((n.one + n.ffa) / max) * 80) });
  }
  return { lo, hi, bars };
}

const DAY = 86400000;
function startOfDay(t: number): number { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function shortDate(t: number, now = Date.now()): string {
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}
export function lastPlayedLabel(t: number | null, now = Date.now()): string {
  if (t === null) return 'Not played yet';
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return shortDate(t, now);
}
