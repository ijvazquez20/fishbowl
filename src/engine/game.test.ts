import { describe, expect, it } from 'vitest';
import { effectiveActions, effectiveProfiles, type Profile } from './catalog';
import {
  advance, canReroll, createGame, edit, endYourTurn, peekNext, reroll, undo,
  type Ctx, type GameState, type Setup,
} from './game';
import { scripted } from './rng';
import { toStored } from './record';
import { killTurnBars, type GameEntry } from './stats';

function profile(id: string, on: string[]): Profile {
  const w: Record<string, number> = {};
  on.forEach((a) => { w[a] = 3; });
  return { id, name: id, desc: '', builtIn: false, on, w };
}
function ctx(rolls: number[], extra: Profile[] = []): Ctx {
  return { actions: effectiveActions(null), profiles: effectiveProfiles(null).concat(extra), rng: scripted(rolls) };
}
function setup(over: Partial<Setup> = {}): Setup {
  return {
    deckId: 'd1', count: 1, mode: 'active', difficulty: 'focused', targeting: 'spread', startingLife: 40,
    yourPower: 4, missLands: false, first: 'you',
    opponents: [
      { name: '', profileId: 'test', cmdrPower: 4 },
      { name: '', profileId: 'test2', cmdrPower: 4 },
      { name: '', profileId: 'test2', cmdrPower: 4 },
    ],
    ...over,
  };
}
function times(s: GameState, n: number, c: Ctx): GameState {
  for (let i = 0; i < n; i++) s = endYourTurn(s, c);
  return s;
}

describe('setup', () => {
  it('puts you first by default and names a lone goldfish', () => {
    const s = createGame(setup(), ctx([0.5], [profile('test', ['idle'])]));
    expect(s.order).toEqual(['you', 0]);
    expect(s.pos).toBe(0);
    expect(s.opponents[0].name).toBe('The Goldfish');
    expect(s.opponents[0].profileName).toBe('test');
  });

  it('lets the goldfish go first', () => {
    const c = ctx([0.5], [profile('test', ['idle'])]);
    let s = createGame(setup({ first: 'goldfish' }), c);
    expect(s.order).toEqual([0, 'you']);
    expect(s.pos).toBe(-1);
    s = endYourTurn(s, c);
    expect(s.round).toBe(1);
    expect(s.last?.round).toBe(1);
    expect(s.order[s.pos]).toBe('you');
  });

  it('seats you at random in Free for All', () => {
    const s = createGame(setup({ count: 3, first: 'random' }), ctx([0.6], [profile('test', ['idle']), profile('test2', ['idle'])]));
    expect(s.yourSeat).toBe(2);
    expect(s.order).toEqual([0, 1, 'you', 2]);
    expect(s.opponents.map((o) => o.name)).toEqual(['Bubbles', 'Finn', 'Koi']);
  });
});

describe('One vs One turns', () => {
  it('plays a land, then casts what it can afford', () => {
    const c = ctx([0.9], [profile('test', ['idle', 'c22'])]);
    let s = createGame(setup(), c);
    s = endYourTurn(s, c);
    expect(s.fish[0].lands).toBe(1);
    expect(s.last?.act.id).toBe('idle');
    expect(s.round).toBe(2);
    s = endYourTurn(s, c);
    expect(s.fish[0].lands).toBe(2);
    expect(s.last?.act.id).toBe('c22');
    expect(s.fish[0].creatures).toHaveLength(1);
    expect(s.last?.steps[2].v).toBe('No creatures to attack with');
    s = endYourTurn(s, c);
    expect(s.last?.steps[2].v).toBe('Attacks with a 2/2 · up to 2 damage. Block, then adjust your life.');
  });

  it('does nothing in passive mode', () => {
    const c = ctx([0.9], [profile('test', ['c11'])]);
    const s = endYourTurn(createGame(setup({ mode: 'passive' }), c), c);
    expect(s.fish[0].lands).toBe(0);
    expect(s.last?.name).toBe('Does nothing');
    expect(canReroll(s)).toBe(false);
  });

  it('misses land drops only when the setup allows it', () => {
    const c = ctx([0.01], [profile('test', ['idle'])]);
    let s = times(createGame(setup({ missLands: true }), c), 2, c);
    expect(s.fish[0].lands).toBe(1);
    expect(s.last?.missed).toBe(true);
    s = times(createGame(setup({ missLands: false }), c), 2, c);
    expect(s.fish[0].lands).toBe(2);
  });

  it('costs its commander power plus tax and only suits it up once it is out', () => {
    const c = ctx([0.5], [profile('test', ['cmdcast', 'equip'])]);
    let s = times(createGame(setup({ opponents: [{ name: '', profileId: 'test', cmdrPower: 3 }] }), c), 3, c);
    expect(s.last?.name).toBe('Casts its commander (3/3)');
    expect(s.fish[0].cmd.onBoard).toBe(true);
    s = times(s, 1, c);
    expect(s.last?.act.id).toBe('equip');
    expect(s.fish[0].creatures[0]).toMatchObject({ p: 5, t: 5, cmd: true });
  });

  it('wipes every board and taxes its commander', () => {
    const c = ctx([0.5], [profile('test', ['wipe'])]);
    let s = createGame(setup(), c);
    s.fish[0].lands = 3;
    s.fish[0].creatures = [{ id: 1, p: 4, t: 4, cmd: true }, { id: 2, p: 2, t: 2 }];
    s.fish[0].cmd.onBoard = true;
    s = endYourTurn(s, c);
    expect(s.last?.act.id).toBe('wipe');
    expect(s.fish[0].creatures).toEqual([]);
    expect(s.fish[0].cmd).toMatchObject({ onBoard: false, tax: 2 });
    expect(s.last?.steps[2].v).toBe('No attack, it wiped its own board');
  });

  it('applies shocks to you and records them', () => {
    const c = ctx([0.5], [profile('test', ['shock'])]);
    const s = endYourTurn(createGame(setup(), c), c);
    expect(s.you).toBe(38);
    expect(s.rounds[0].seats[0]).toMatchObject({ target: 'you', spellHit: 2 });
  });

  it('rerolls to a different action and keeps the land drop', () => {
    const c = ctx([0.9], [profile('test', ['idle', 'c22'])]);
    let s = times(createGame(setup(), c), 2, c);
    expect(s.last?.act.id).toBe('c22');
    expect(canReroll(s)).toBe(true);
    s = reroll(s, c);
    expect(s.last?.act.id).toBe('idle');
    expect(s.last?.rerolls).toBe(1);
    expect(s.fish[0].lands).toBe(2);
    expect(s.fish[0].creatures).toHaveLength(0);
    expect(s.order[s.pos]).toBe('you');
    expect(canReroll(s)).toBe(false);
  });

  it('undoes the goldfish turn', () => {
    const c = ctx([0.9], [profile('test', ['idle', 'c22'])]);
    const before = times(createGame(setup(), c), 1, c);
    const after = endYourTurn(before, c);
    const back = undo(after);
    expect(back.round).toBe(before.round);
    expect(back.fish[0].lands).toBe(before.fish[0].lands);
    expect(back.hist).toHaveLength(before.hist.length);
  });
});

describe('manual changes and results', () => {
  it('counts life you lose after its attack against that turn', () => {
    const c = ctx([0.9], [profile('test', ['idle', 'c22'])]);
    let s = times(createGame(setup(), c), 3, c);
    s = edit(s, { k: 'youLife', delta: -2 });
    expect(s.you).toBe(38);
    expect(s.rounds[2].seats[0]?.lost).toBe(2);
    expect(s.rounds[2].life?.you).toBe(38);
    s = edit(s, { k: 'youLife', delta: 1 });
    expect(s.rounds[2].seats[0]?.lost).toBe(1);
  });

  it('wins on 21 commander damage', () => {
    const c = ctx([0.5], [profile('test', ['idle'])]);
    let s = times(createGame(setup({ yourPower: 7 }), c), 2, c);
    for (let i = 0; i < 3; i++) s = edit(s, { k: 'yourCmd', seat: 0 });
    expect(s.over).toEqual({ win: true, turn: 3, how: 'commander' });
    expect(s.fish[0].life).toBe(19);
    expect(s.rounds[2].cmd[0]).toBe(21);
  });

  it('dates a loss to the goldfish turn that caused it, and saves it without the empty round', () => {
    const c = ctx([0.9], [profile('test', ['idle', 'c22'])]);
    let s = times(createGame(setup(), c), 3, c);
    s.you = 2;
    s = edit(s, { k: 'youLife', delta: -2 });
    expect(s.over).toMatchObject({ win: false, turn: 3, how: 'life', by: 0 });
    const { summary, rounds } = toStored(s, 1000);
    expect(summary.type).toBe('one');
    expect(summary.result).toEqual({ win: false, turn: 3, how: 'life', by: 's0' });
    expect(rounds).toHaveLength(3);
    expect(summary.totals.took).toBe(2);
    expect(summary.totals.perSeat.s0.took).toBe(2);
  });

  it('adds its commander hits to damage you took', () => {
    const c = ctx([0.5], [profile('test', ['cmdcast'])]);
    let s = times(createGame(setup(), c), 4, c);
    expect(s.fish[0].cmd.onBoard).toBe(true);
    s = edit(s, { k: 'theirCmd', seat: 0 });
    expect(s.you).toBe(36);
    expect(s.fish[0].toYou).toBe(4);
    expect(s.rounds[3].seats[0]).toMatchObject({ cmdToYou: 4, lost: 4 });
  });
});

describe('Free for All', () => {
  const shooters = () => [profile('test', ['idle', 'shock']), profile('test2', ['idle', 'c11'])];

  it('steps one goldfish at a time and can aim spells at another goldfish', () => {
    const c = ctx([0.9], shooters());
    let s = createGame(setup({ count: 2 }), c);
    expect(peekNext(s).actor).toBe(0);
    s = advance(s, c);
    expect(s.order[s.pos]).toBe(0);
    expect(s.last?.name).toBe('Shocks Finn for 2');
    expect(s.fish[1].life).toBe(38);
    expect(s.last?.target).toBe(1);
    expect(canReroll(s)).toBe(true);
    s = advance(s, c);
    expect(s.order[s.pos]).toBe(1);
    expect(canReroll(s)).toBe(true);
    s = advance(s, c);
    expect(s.order[s.pos]).toBe('you');
    expect(s.round).toBe(2);
    expect(s.rounds[0].life?.fish).toEqual([40, 38]);
  });

  it('knocks out a goldfish another goldfish finished', () => {
    const c = ctx([0.9], shooters());
    let s = createGame(setup({ count: 2 }), c);
    s.fish[1].life = 2;
    s = advance(s, c);
    expect(s.fish[1].alive).toBe(false);
    expect(s.fish[1].out).toEqual({ round: 1, by: 0, how: 'damage' });
    expect(s.rounds[0].seats[0]?.knockedOut).toEqual([1]);
    expect(s.over).toBeNull();
    expect(peekNext(s).actor).toBe('you');
  });

  it('keeps everything on you when targeting is all on you', () => {
    const c = ctx([0.9], shooters());
    const s = advance(createGame(setup({ count: 2, targeting: 'you' }), c), c);
    expect(s.you).toBe(38);
    expect(s.last?.name).toBe('Shocks you for 2');
  });

  it('clears the table when the last goldfish dies', () => {
    const c = ctx([0.5], [profile('test', ['idle']), profile('test2', ['idle'])]);
    let s = createGame(setup({ count: 2 }), c);
    s = edit(s, { k: 'fishLife', seat: 0, delta: -40 });
    expect(s.fish[0].out).toMatchObject({ round: 1, by: 'you' });
    s = edit(s, { k: 'fishLife', seat: 1, delta: -40 });
    expect(s.over).toEqual({ win: true, turn: 1, how: 'damage' });
    const { summary } = toStored(s, 5);
    expect(summary.type).toBe('ffa');
    expect(summary.totals.knockouts).toBe(2);
    expect(summary.totals.dealt).toBe(80);
  });
});

describe('stats', () => {
  it('fits the kill-turn chart to the data, nine turns minimum', () => {
    const entry = (turn: number): GameEntry => ({ id: String(turn), g: { type: 'one', result: { win: true, turn } } as GameEntry['g'] });
    const { lo, hi, bars } = killTurnBars([6, 7, 7, 9].map(entry));
    expect([lo, hi]).toEqual([5, 13]);
    expect(bars.find((b) => b.turn === 7)).toMatchObject({ one: 2, total: 2, h: 80 });
    expect(killTurnBars([]).lo).toBe(4);
  });
});
