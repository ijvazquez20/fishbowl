// Saved-game shapes and the conversion from a finished GameState. Seats are keyed "s0".."s2"
// rather than stored as arrays, because Realtime Database drops empty arrays.
import type { Cat, Difficulty } from './catalog';
import type { Actor, First, GameState, Mode, Over, RoundRec, SeatRec, Targeting } from './game';

export interface StoredOpponent { name: string; profileId: string; profileName: string; cmdrPower: number }
export interface SeatTotals { dealt: number; cmd: number; took: number; cmdToYou: number; outRound?: number; outBy?: string }
export interface GameSummary {
  deckId: string;
  startedAt: number;
  endedAt: number;
  type: 'one' | 'ffa';
  setup: {
    count: number;
    mode: Mode;
    difficulty: Difficulty;
    targeting: Targeting;
    startingLife: number;
    yourPower: number;
    missLands: boolean;
    first: First;
    yourSeat: number;
    opponents: Record<string, StoredOpponent>;
  };
  result: { win: boolean; turn: number; how: Over['how']; by?: string };
  totals: {
    dealt: number;
    took: number;
    cmdDealt: number;
    cmdTaken: number;
    knockouts: number;
    aimedAtYou: number;
    aimedTotal: number;
    perSeat: Record<string, SeatTotals>;
  };
}
export interface StoredSeat {
  action: string;
  name: string;
  cat: Cat;
  cost: number;
  missedLand: boolean;
  lands: number;
  rerolls: number;
  passive?: boolean;
  counter?: boolean;
  target?: string;
  spellHit?: number;
  gain?: number;
  attack?: { to: string; power: number; who: string };
  lost: number;
  cmdToYou: number;
  knockedOut?: Record<string, boolean>;
}
export interface StoredRound {
  life: Record<string, number>;
  dealt?: Record<string, number>;
  cmd?: Record<string, number>;
  seats?: Record<string, StoredSeat>;
}

export const seatKey = (i: number) => 's' + i;
export const actorKey = (a: Actor) => (a === 'you' ? 'you' : seatKey(a));
export function keyActor(k: string | undefined): Actor | undefined {
  if (k === undefined) return undefined;
  return k === 'you' ? 'you' : Number(k.slice(1));
}

/** Life you lost to one goldfish turn: its spell on you plus what you logged after it. */
export function tookFrom(rec: { target?: Actor; spellHit?: number; lost: number }): number {
  return (rec.target === 'you' ? rec.spellHit || 0 : 0) + rec.lost;
}

function seatToStored(rec: SeatRec): StoredSeat {
  const out: StoredSeat = {
    action: rec.action, name: rec.name, cat: rec.cat, cost: rec.cost, missedLand: rec.missedLand,
    lands: rec.lands, rerolls: rec.rerolls, lost: rec.lost, cmdToYou: rec.cmdToYou,
  };
  if (rec.passive) out.passive = true;
  if (rec.counter) out.counter = true;
  if (rec.target !== undefined) out.target = actorKey(rec.target);
  if (rec.spellHit) out.spellHit = rec.spellHit;
  if (rec.gain) out.gain = rec.gain;
  if (rec.attack) out.attack = { to: actorKey(rec.attack.to), power: rec.attack.power, who: rec.attack.who };
  if (rec.knockedOut.length) {
    out.knockedOut = {};
    rec.knockedOut.forEach((i) => { out.knockedOut![seatKey(i)] = true; });
  }
  return out;
}

function isEmptyRound(r: RoundRec): boolean {
  return r.seats.every((x) => !x) && r.dealt.every((x) => !x);
}

export function toStored(s: GameState, endedAt: number): { summary: GameSummary; rounds: StoredRound[] } {
  if (!s.over) throw new Error('Only finished games can be saved');
  const over = s.over;
  let rounds = s.rounds.slice();
  while (rounds.length > 1 && rounds[rounds.length - 1].n > over.turn && isEmptyRound(rounds[rounds.length - 1])) rounds.pop();

  const count = s.fish.length;
  const perSeat: Record<string, SeatTotals> = {};
  s.fish.forEach((f, i) => {
    const t: SeatTotals = { dealt: 0, cmd: 0, took: 0, cmdToYou: 0 };
    if (f.out) { t.outRound = f.out.round; t.outBy = actorKey(f.out.by); }
    perSeat[seatKey(i)] = t;
  });
  let aimedAtYou = 0;
  let aimedTotal = 0;
  const stored: StoredRound[] = rounds.map((r) => {
    const life: Record<string, number> = { you: r.life ? r.life.you : s.you };
    s.fish.forEach((f, i) => {
      const v = r.life ? r.life.fish[i] : (f.alive ? f.life : null);
      if (v !== null && v !== undefined) life[seatKey(i)] = v;
    });
    const out: StoredRound = { life };
    r.dealt.forEach((d, i) => {
      if (!d) return;
      (out.dealt ||= {})[seatKey(i)] = d;
      perSeat[seatKey(i)].dealt += d;
    });
    r.cmd.forEach((d, i) => {
      if (!d) return;
      (out.cmd ||= {})[seatKey(i)] = d;
      perSeat[seatKey(i)].cmd += d;
    });
    r.seats.forEach((rec, i) => {
      if (!rec) return;
      (out.seats ||= {})[seatKey(i)] = seatToStored(rec);
      const t = perSeat[seatKey(i)];
      t.took += tookFrom(rec);
      t.cmdToYou += rec.cmdToYou;
      if (rec.target !== undefined) { aimedTotal++; if (rec.target === 'you') aimedAtYou++; }
      if (rec.attack) { aimedTotal++; if (rec.attack.to === 'you') aimedAtYou++; }
    });
    return out;
  });

  const opponents: Record<string, StoredOpponent> = {};
  s.opponents.forEach((o, i) => { opponents[seatKey(i)] = { ...o }; });
  const seatsList = Object.values(perSeat);
  const result: GameSummary['result'] = { win: over.win, turn: over.turn, how: over.how };
  if (over.by !== undefined) result.by = seatKey(over.by);

  const summary: GameSummary = {
    deckId: s.deckId,
    startedAt: s.startedAt,
    endedAt,
    type: count === 1 ? 'one' : 'ffa',
    setup: {
      count,
      mode: s.setup.mode,
      difficulty: s.setup.difficulty,
      targeting: s.setup.targeting,
      startingLife: s.setup.startingLife,
      yourPower: s.setup.yourPower,
      missLands: s.setup.missLands,
      first: s.setup.first,
      yourSeat: s.yourSeat,
      opponents,
    },
    result,
    totals: {
      dealt: seatsList.reduce((a, t) => a + t.dealt, 0),
      took: seatsList.reduce((a, t) => a + t.took, 0),
      cmdDealt: seatsList.reduce((a, t) => a + t.cmd, 0),
      cmdTaken: seatsList.reduce((a, t) => a + t.cmdToYou, 0),
      knockouts: s.fish.filter((f) => f.out && f.out.by === 'you').length,
      aimedAtYou,
      aimedTotal,
      perSeat,
    },
  };
  return { summary, rounds: stored };
}

// Read side: normalized rounds for the Game detail pages.
export interface SeatView {
  action: string;
  name: string;
  cat: Cat;
  cost: number;
  missedLand: boolean;
  lands: number;
  rerolls: number;
  passive: boolean;
  counter: boolean;
  target?: Actor;
  spellHit: number;
  gain: number;
  attack?: { to: Actor; power: number; who: string };
  lost: number;
  cmdToYou: number;
  knockedOut: number[];
}
export interface RoundView {
  n: number;
  life: { you: number; fish: (number | null)[] };
  dealt: number[];
  cmd: number[];
  seats: (SeatView | null)[];
}

export function readRounds(raw: unknown, count: number): RoundView[] {
  const list: StoredRound[] = Array.isArray(raw)
    ? (raw as (StoredRound | null)[]).filter((x): x is StoredRound => !!x)
    : raw && typeof raw === 'object' ? Object.keys(raw as object).sort((a, b) => Number(a) - Number(b)).map((k) => (raw as Record<string, StoredRound>)[k]) : [];
  const seats = Array.from({ length: count }, (_, i) => i);
  return list.map((r, idx) => ({
    n: idx + 1,
    life: { you: r.life?.you ?? 0, fish: seats.map((i) => r.life?.[seatKey(i)] ?? null) },
    dealt: seats.map((i) => r.dealt?.[seatKey(i)] || 0),
    cmd: seats.map((i) => r.cmd?.[seatKey(i)] || 0),
    seats: seats.map((i) => {
      const x = r.seats?.[seatKey(i)];
      if (!x) return null;
      return {
        action: x.action, name: x.name, cat: x.cat, cost: x.cost || 0, missedLand: !!x.missedLand, lands: x.lands || 0,
        rerolls: x.rerolls || 0, passive: !!x.passive, counter: !!x.counter, target: keyActor(x.target),
        spellHit: x.spellHit || 0, gain: x.gain || 0,
        attack: x.attack ? { to: keyActor(x.attack.to) as Actor, power: x.attack.power, who: x.attack.who } : undefined,
        lost: x.lost || 0, cmdToYou: x.cmdToYou || 0,
        knockedOut: Object.keys(x.knockedOut || {}).map((k) => Number(k.slice(1))),
      };
    }),
  }));
}
