// The goldfish turn engine. One engine runs 1 to 3 goldfish: with one goldfish and no other
// targets it behaves exactly like the One vs One script in Game.dc.html, and with more it follows
// MultiGame.dc.html. Every state is plain JSON so it can live in localStorage mid-game.
import {
  type Action, type Cat, type Difficulty, type Profile,
  PRESET, gameYouText, weightFor,
} from './catalog';

export type Actor = 'you' | number;
export type Mode = 'passive' | 'active';
export type Targeting = 'spread' | 'you';
export type First = 'you' | 'goldfish' | 'random';

export interface OpponentSetup { name: string; profileId: string; cmdrPower: number }
export interface Setup {
  deckId: string;
  count: number;
  mode: Mode;
  difficulty: Difficulty;
  targeting: Targeting;
  startingLife: number;
  yourPower: number;
  missLands: boolean;
  /** One vs One: you, goldfish or random. Free for All: you (seat 1) or random seat. */
  first: First;
  opponents: OpponentSetup[];
}
export interface Opponent { name: string; profileId: string; profileName: string; cmdrPower: number }

export interface Creature { id: number; p: number; t: number; cmd?: boolean }
export interface Out { round: number; by: Actor; how: 'damage' | 'commander' }
export interface Fish {
  name: string;
  profileId: string;
  life: number;
  lands: number;
  creatures: Creature[];
  cmd: { power: number; tax: number; onBoard: boolean };
  /** Your commander damage to it. */
  fromYou: number;
  /** Its commander damage to you. */
  toYou: number;
  counter: boolean;
  alive: boolean;
  out: Out | null;
}
export interface Step { k: string; v: string }
export interface LastTurn {
  fish: number;
  round: number;
  act: { id: string; name: string; cat: Cat };
  name: string;
  you: string;
  cost: number;
  steps: Step[];
  missed: boolean;
  exclude: string[];
  canReroll: boolean;
  target: Actor | null;
  rerolls: number;
}
/** What one goldfish did on its turn, kept for the saved game. */
export interface SeatRec {
  action: string;
  name: string;
  cat: Cat;
  cost: number;
  missedLand: boolean;
  lands: number;
  rerolls: number;
  passive?: boolean;
  counter?: boolean;
  target?: Actor;
  /** Life its targeted spell took from its target. */
  spellHit?: number;
  gain?: number;
  attack?: { to: Actor; power: number; who: string };
  /** Life you logged losing after its turn (its attack, and its commander hits). */
  lost: number;
  cmdToYou: number;
  knockedOut: number[];
}
export interface RoundRec {
  n: number;
  /** Damage you dealt to each goldfish this round, by seat. */
  dealt: number[];
  /** Of that, your commander damage. */
  cmd: number[];
  seats: (SeatRec | null)[];
  /** Life at the end of the round. A goldfish that was already out is null. */
  life: { you: number; fish: (number | null)[] } | null;
}
export interface Over {
  win: boolean;
  turn: number;
  how: 'damage' | 'commander' | 'life' | 'their-commander';
  by?: number;
}

export interface GameState {
  v: 1;
  id: string;
  deckId: string;
  startedAt: number;
  setup: Setup;
  opponents: Opponent[];
  /** Your seat, 0-based: 0 means you go first. */
  yourSeat: number;
  order: Actor[];
  round: number;
  /** Index in `order` of the actor whose turn it is. -1 before anyone has acted. */
  pos: number;
  you: number;
  power: number;
  fish: Fish[];
  nextId: number;
  last: LastTurn | null;
  log: { fish: number; round: number; text: string }[];
  hist: Snapshot[];
  over: Over | null;
  rounds: RoundRec[];
  /** The goldfish turn that life you lose right now counts against. */
  attrib: { round: number; seat: number } | null;
}
export type Snapshot = Omit<GameState, 'hist'>;

export interface Ctx {
  actions: Action[];
  profiles: Profile[];
  rng: () => number;
}

const HIST_MAX = 12;
const IDLE: Action = { id: 'idle', name: 'Passes the turn', you: '', cat: 'idle', cost: 0, w: 3, builtIn: true };

function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
function snapshot(s: GameState): Snapshot {
  const { hist: _hist, ...rest } = s;
  return clone(rest);
}
function withHist(s: GameState, prev: GameState): GameState {
  s.hist = prev.hist.concat([snapshot(prev)]).slice(-HIST_MAX);
  return s;
}
/** A working copy that shares the (immutable) history array. */
function work(s: GameState): GameState {
  const { hist, ...rest } = s;
  const c = clone(rest) as GameState;
  c.hist = hist;
  return c;
}

export function isTable(s: GameState): boolean { return s.fish.length > 1; }
export function phaseOf(s: GameState): Actor | 'start' { return s.pos < 0 ? 'start' : s.order[s.pos]; }
export function poss(n: string): string { return n + (/s$/i.test(n) ? '’' : '’s'); }
export function cmdPower(f: Fish): number {
  let p = f.cmd.power;
  f.creatures.forEach((c) => { if (c.cmd) p = c.p; });
  return p;
}
export function ptLabel(c: Creature): string { return (c.cmd ? 'Commander ' : '') + c.p + '/' + c.t; }

function newRound(n: number, count: number): RoundRec {
  return { n, dealt: new Array(count).fill(0), cmd: new Array(count).fill(0), seats: new Array(count).fill(null), life: null };
}

export function createGame(setup: Setup, ctx: Ctx, opts: { id?: string; now?: number } = {}): GameState {
  const count = Math.min(3, Math.max(1, setup.count));
  const profiles = ctx.profiles.length ? ctx.profiles : [];
  const opponents: Opponent[] = setup.opponents.slice(0, count).map((o, i) => {
    let prof = profiles.find((p) => p.id === o.profileId);
    if (!prof || o.profileId === 'random') prof = profiles[Math.floor(ctx.rng() * profiles.length)];
    const fallback = count === 1 ? 'The Goldfish' : ['Bubbles', 'Finn', 'Koi'][i];
    return {
      name: (o.name || '').trim() || fallback,
      profileId: prof ? prof.id : 'balanced',
      profileName: prof ? prof.name : 'Balanced',
      cmdrPower: o.cmdrPower,
    };
  });
  let yourSeat = 0;
  if (count === 1) {
    if (setup.first === 'goldfish') yourSeat = 1;
    else if (setup.first === 'random') yourSeat = ctx.rng() < 0.5 ? 0 : 1;
  } else if (setup.first === 'random') {
    yourSeat = Math.floor(ctx.rng() * (count + 1));
  }
  const seats = opponents.map((_, i) => i);
  const order: Actor[] = [...seats.slice(0, yourSeat), 'you', ...seats.slice(yourSeat)];
  const fish: Fish[] = opponents.map((o) => ({
    name: o.name, profileId: o.profileId, life: setup.startingLife, lands: 0, creatures: [],
    cmd: { power: o.cmdrPower, tax: 0, onBoard: false }, fromYou: 0, toYou: 0, counter: false, alive: true, out: null,
  }));
  return {
    v: 1,
    id: opts.id || '',
    deckId: setup.deckId,
    startedAt: opts.now ?? Date.now(),
    setup: clone({ ...setup, count }),
    opponents,
    yourSeat,
    order,
    round: 1,
    pos: yourSeat === 0 ? 0 : -1,
    you: setup.startingLife,
    power: setup.yourPower,
    fish,
    nextId: 1,
    last: null,
    log: [],
    hist: [],
    over: null,
    rounds: [newRound(1, count)],
    attrib: null,
  };
}

function profileOf(f: Fish, ctx: Ctx): Profile | null {
  return ctx.profiles.find((p) => p.id === f.profileId) || ctx.profiles.find((p) => p.id === 'balanced') || ctx.profiles[0] || null;
}
function costOf(a: Action, f: Fish): number { return a.id === 'cmdcast' ? f.cmd.power + f.cmd.tax : a.cost; }
function usable(a: Action, f: Fish): boolean {
  if (a.id === 'cmdcast') return !f.cmd.onBoard;
  if (a.id === 'equip') return f.cmd.onBoard;
  return true;
}
function poolFor(f: Fish, profile: Profile | null, exclude: string[], actions: Action[]): Action[] {
  if (!profile) return [];
  return actions.filter((a) => profile.on.includes(a.id) && usable(a, f) && costOf(a, f) <= f.lands && !exclude.includes(a.id));
}
function weightOf(a: Action, profile: Profile, diff: Difficulty): number {
  return weightFor(profile, a) * (PRESET[diff][a.cat] ?? 1);
}

/** 'you', or another living goldfish at random when spread targeting is on (like a real pod). */
function pickTarget(s: GameState, idx: number, spread: boolean, rng: () => number): Actor {
  if (!spread) return 'you';
  const options: Actor[] = ['you'];
  s.fish.forEach((g, j) => { if (j !== idx && g.alive) options.push(j); });
  return options[Math.floor(rng() * options.length)];
}
function biggest(f: Fish): Creature | null {
  const list = f.creatures.filter((c) => !c.cmd).sort((a, b) => b.p - a.p);
  return list[0] || null;
}
function eliminate(g: Fish, round: number, by: Actor, how: Out['how']) {
  g.alive = false;
  g.out = { round, by, how };
  g.creatures = [];
  g.cmd.onBoard = false;
  g.counter = false;
}
function vsName(id: string, t: string, x: string | null): string {
  switch (id) {
    case 'kill': return x ? 'Destroys ' + poss(t) + ' ' + x : 'Goes after ' + poss(t) + ' creatures, but finds none';
    case 'bounce': return x ? 'Bounces ' + poss(t) + ' ' + x : 'Tries to bounce something of ' + poss(t) + '. Nothing there';
    case 'cmdr': return x ? 'Removes ' + poss(t) + ' commander' : 'Aims at ' + poss(t) + ' commander, but it isn’t out';
    case 'art': return 'Destroys an artifact of ' + poss(t);
    case 'tax': return 'Taxes ' + poss(t) + ' spells';
    case 'discard': return 'Makes ' + t + ' discard a card';
    case 'discard2': return 'Makes ' + t + ' discard two cards';
    case 'gyhate': return 'Exiles ' + poss(t) + ' graveyard';
    case 'shock': return 'Shocks ' + t + ' for 2';
    case 'drain': return 'Drains ' + t + ' for 3';
  }
  return '';
}
function attackerLabel(list: Creature[]): string {
  if (list.length !== 1) return 'creatures';
  const c = list[0];
  return c.cmd ? c.p + '/' + c.t + ' commander' : c.p + '/' + c.t;
}

function finishRound(s: GameState) {
  const r = s.rounds[s.round - 1];
  if (!r) return;
  r.life = {
    you: s.you,
    fish: s.fish.map((g) => (g.alive || (g.out && g.out.round === s.round) ? Math.max(0, g.life) : null)),
  };
}

function checkOver(s: GameState) {
  if (s.over) return;
  const lostTo = s.fish.findIndex((g) => g.toYou >= 21);
  if (s.you <= 0 || lostTo >= 0) {
    s.over = {
      win: false,
      turn: s.attrib ? s.attrib.round : s.round,
      how: lostTo >= 0 ? 'their-commander' : 'life',
      by: lostTo >= 0 ? lostTo : s.attrib?.seat,
    };
  } else if (s.fish.every((g) => !g.alive)) {
    const lastOut = s.fish.filter((g) => g.out && g.out.round === s.round).pop();
    s.over = { win: true, turn: s.round, how: lastOut?.out?.how === 'commander' ? 'commander' : 'damage' };
  }
  if (s.over) finishRound(s);
}

interface TurnOpts { exclude?: string[]; missed?: boolean; rerolls?: number }

/** Runs goldfish `idx`'s turn on `s` (already a working copy, positioned on that goldfish). */
function runFishTurn(s: GameState, idx: number, opts: TurnOpts, ctx: Ctx): GameState {
  const table = isTable(s);
  const f = s.fish[idx];
  const diff = s.setup.difficulty;
  const P = PRESET[diff] || PRESET.focused;
  const spread = table && s.setup.targeting === 'spread';
  const exclude = opts.exclude || [];
  const steps: Step[] = [];
  let act: Action = IDLE;
  let name: string;
  let you: string;
  let cost = 0;
  let missed = false;
  let canReroll = false;
  let target: Actor | null = null;
  const rec: SeatRec = {
    action: 'idle', name: '', cat: 'idle', cost: 0, missedLand: false, lands: f.lands,
    rerolls: opts.rerolls || 0, lost: 0, cmdToYou: 0, knockedOut: [],
  };
  f.counter = false;

  if (s.setup.mode === 'passive') {
    act = { ...IDLE, id: 'passive', name: 'Does nothing' };
    name = act.name;
    rec.passive = true;
    if (table) {
      you = 'A true goldfish. Keep swinging.';
      steps.push({ k: 'Turn', v: 'Passive goldfish: no land, no spell, no attack' });
    } else {
      you = 'A true goldfish. Keep swinging and count your kill turn.';
      steps.push({ k: 'Land', v: 'None in passive mode' });
      steps.push({ k: 'Action', v: 'Nothing' });
      steps.push({ k: 'Combat', v: 'No attack' });
    }
  } else {
    const attackerIds = f.creatures.map((c) => c.id);
    missed = typeof opts.missed === 'boolean' ? opts.missed : (s.setup.missLands && f.lands > 0 && ctx.rng() < P.miss);
    if (missed) steps.push({ k: 'Land', v: 'Missed its land drop · ' + f.lands + ' total' });
    else { f.lands += 1; steps.push({ k: 'Land', v: 'Played a land · ' + f.lands + ' total' }); }

    const profile = profileOf(f, ctx);
    const pool = poolFor(f, profile, exclude, ctx.actions);
    act = ctx.actions.find((a) => a.id === 'idle') || IDLE;
    if (pool.length && profile) {
      let total = 0;
      pool.forEach((a) => { total += weightOf(a, profile, diff); });
      let r = ctx.rng() * total;
      act = pool[0];
      for (let i = 0; i < pool.length; i++) {
        r -= weightOf(pool[i], profile, diff);
        if (r <= 0) { act = pool[i]; break; }
      }
    }
    canReroll = poolFor(f, profile, exclude.concat([act.id]), ctx.actions).length > 0;
    cost = costOf(act, f);
    name = act.name;
    you = gameYouText(act, table);

    if (act.id === 'cmdcast') {
      f.creatures.push({ id: s.nextId, p: f.cmd.power, t: f.cmd.power, cmd: true }); s.nextId += 1;
      f.cmd.onBoard = true;
      name = 'Casts its commander (' + f.cmd.power + '/' + f.cmd.power + ')';
    } else if (act.id === 'equip') {
      f.creatures.forEach((c) => { if (c.cmd) { c.p += 2; c.t += 2; } });
    } else if (act.tokens) {
      for (let k = 0; k < act.tokens; k++) { f.creatures.push({ id: s.nextId, p: 1, t: 1 }); s.nextId += 1; }
    } else if (act.cat === 'creature' && act.p != null) {
      f.creatures.push({ id: s.nextId, p: act.p, t: act.t ?? act.p }); s.nextId += 1;
    }
    if (act.id === 'ramp') f.lands += 1;
    if (act.id === 'wipe') {
      s.fish.forEach((g) => {
        if (!g.alive) return;
        if (g.cmd.onBoard) { g.cmd.onBoard = false; g.cmd.tax += 2; }
        g.creatures = [];
      });
    }
    if (act.id === 'counter') { f.counter = true; rec.counter = true; }
    if (act.gain) { f.life += act.gain; rec.gain = act.gain; }
    if (act.tgt) {
      target = pickTarget(s, idx, spread, ctx.rng);
      rec.target = target;
      if (target === 'you') {
        if (act.dmg) { s.you -= act.dmg; rec.spellHit = act.dmg; }
      } else {
        const t = s.fish[target];
        let hit: string | null = null;
        if (act.id === 'kill' || act.id === 'bounce') {
          const b = biggest(t);
          if (b) { hit = b.p + '/' + b.t; t.creatures = t.creatures.filter((c) => c.id !== b.id); }
        } else if (act.id === 'cmdr') {
          if (t.cmd.onBoard) { hit = 'commander'; t.creatures = t.creatures.filter((c) => !c.cmd); t.cmd.onBoard = false; t.cmd.tax += 2; }
        } else if (act.dmg) {
          t.life -= act.dmg;
          rec.spellHit = act.dmg;
        }
        if (act.builtIn) name = vsName(act.id, t.name, hit) || name;
        you = 'Nothing for you. ' + t.name + ' takes this one.';
      }
    }
    steps.push({ k: 'Action', v: name });

    const attackers = f.creatures.filter((c) => attackerIds.includes(c.id));
    if (attackers.length) {
      let dmg = 0;
      attackers.forEach((c) => { dmg += c.p; });
      const who = attackers.map(ptLabel).join(', ');
      const ct = pickTarget(s, idx, spread, ctx.rng);
      rec.attack = { to: ct, power: dmg, who: attackerLabel(attackers) };
      if (ct === 'you') {
        const lead = table ? 'Attacks you with ' : 'Attacks with ' + (attackers.length === 1 && !attackers[0].cmd ? 'a ' : '');
        steps.push({ k: 'Combat', v: lead + who + ' · up to ' + dmg + ' damage. Block, then adjust your life.' });
      } else {
        const t = s.fish[ct];
        t.life -= dmg;
        steps.push({ k: 'Combat', v: 'Attacks ' + t.name + ' with ' + who + ' · ' + t.name + ' takes ' + dmg });
      }
    } else if (act.id === 'wipe') {
      steps.push({ k: 'Combat', v: table ? 'No attack, the whole table got wiped' : 'No attack, it wiped its own board' });
    } else {
      steps.push({ k: 'Combat', v: 'No creatures to attack with' });
    }
    s.fish.forEach((g, gi) => {
      if (g.alive && g.life <= 0) { eliminate(g, s.round, idx, 'damage'); rec.knockedOut.push(gi); }
    });
  }

  rec.action = act.id; rec.name = name; rec.cat = act.cat; rec.cost = cost;
  rec.missedLand = missed; rec.lands = f.lands;
  s.rounds[s.round - 1].seats[idx] = rec;
  s.attrib = { round: s.round, seat: idx };
  s.last = {
    fish: idx, round: s.round, act: { id: act.id, name: act.name, cat: act.cat }, name, you, cost, steps,
    missed, exclude, canReroll, target, rerolls: opts.rerolls || 0,
  };
  s.log = s.log.filter((e) => e.fish !== idx).concat([{ fish: idx, round: s.round, text: name }]);
  checkOver(s);
  return s;
}

/** The next living actor after the current one, and whether reaching it starts a new round. */
export function peekNext(s: GameState): { actor: Actor; pos: number; newRound: boolean } {
  let pos = s.pos;
  let newRound = false;
  for (let i = 0; i < s.order.length * 2; i++) {
    pos += 1;
    if (pos >= s.order.length) { pos = 0; newRound = true; }
    const a = s.order[pos];
    if (a === 'you' || s.fish[a].alive) return { actor: a, pos, newRound };
  }
  return { actor: 'you', pos: s.order.indexOf('you'), newRound: true };
}

function step(s0: GameState, ctx: Ctx, opts: TurnOpts, keepHist: boolean): GameState {
  const nx = peekNext(s0);
  const s = work(s0);
  if (nx.newRound) {
    finishRound(s);
    s.round += 1;
    s.rounds.push(newRound(s.round, s.fish.length));
  }
  s.pos = nx.pos;
  if (nx.actor !== 'you') runFishTurn(s, nx.actor, opts, ctx);
  return keepHist ? withHist(s, s0) : s;
}

/**
 * Free for All: moves to the next actor, one at a time. Returns the state unchanged once the game
 * is over. Every step can be undone.
 */
export function advance(s: GameState, ctx: Ctx): GameState {
  if (s.over) return s;
  return step(s, ctx, {}, true);
}

/**
 * One vs One: plays goldfish turns until it is your turn again. Only the goldfish turn itself is
 * kept in the undo history, so undo and reroll always act on the goldfish's last turn.
 */
export function endYourTurn(s: GameState, ctx: Ctx): GameState {
  let cur = s;
  for (let guard = 0; guard < 8 && !cur.over; guard++) {
    if (peekNext(cur).actor === 'you') return step(cur, ctx, {}, false);
    cur = step(cur, ctx, {}, true);
  }
  return cur;
}

export function canReroll(s: GameState): boolean {
  if (s.over || !s.last || !s.last.canReroll || !s.hist.length || s.setup.mode === 'passive') return false;
  if (isTable(s)) return phaseOf(s) === s.last.fish;
  return true;
}

/** Re-rolls the goldfish's last action, keeping its land drop, and never picking the same action again. */
export function reroll(s: GameState, ctx: Ctx): GameState {
  if (!canReroll(s) || !s.last) return s;
  const base = { ...(clone(s.hist[s.hist.length - 1]) as GameState), hist: s.hist.slice(0, -1) };
  const opts: TurnOpts = { missed: s.last.missed, exclude: s.last.exclude.concat([s.last.act.id]), rerolls: s.last.rerolls + 1 };
  const next = step(base, ctx, opts, true);
  if (isTable(s) || next.over) return next;
  return peekNext(next).actor === 'you' ? step(next, ctx, {}, false) : next;
}

export function undo(s: GameState): GameState {
  if (!s.hist.length) return s;
  return { ...(clone(s.hist[s.hist.length - 1]) as GameState), hist: s.hist.slice(0, -1) };
}

export type Edit =
  | { k: 'fishLife'; seat: number; delta: number }
  | { k: 'yourCmd'; seat: number }
  | { k: 'power'; delta: number }
  | { k: 'youLife'; delta: number }
  | { k: 'theirCmd'; seat: number }
  | { k: 'creatureDied'; seat: number; id: number };

/** Shifts end-of-round life snapshots for rounds that already closed, back to `fromRound`. */
function patchYouSnapshots(s: GameState, fromRound: number, delta: number) {
  for (let n = fromRound; n < s.round; n++) {
    const r = s.rounds[n - 1];
    if (r && r.life) r.life.you += delta;
  }
}
/** Manual changes from the game screen. They don't enter the undo history, like the canvas. */
export function edit(s0: GameState, e: Edit): GameState {
  if (s0.over) return s0;
  const s = work(s0);
  const r = s.rounds[s.round - 1];
  switch (e.k) {
    case 'fishLife': {
      const f = s.fish[e.seat];
      if (!f || !f.alive) return s0;
      f.life += e.delta;
      if (e.delta < 0) r.dealt[e.seat] += -e.delta;
      else r.dealt[e.seat] = Math.max(0, r.dealt[e.seat] - e.delta);
      break;
    }
    case 'yourCmd': {
      const f = s.fish[e.seat];
      if (!f || !f.alive) return s0;
      f.fromYou += s.power;
      f.life -= s.power;
      r.dealt[e.seat] += s.power;
      r.cmd[e.seat] += s.power;
      break;
    }
    case 'power':
      s.power = Math.min(21, Math.max(0, s.power + e.delta));
      break;
    case 'youLife': {
      s.you += e.delta;
      if (s.attrib) {
        const rec = s.rounds[s.attrib.round - 1].seats[s.attrib.seat];
        if (rec) {
          if (e.delta < 0) rec.lost += -e.delta;
          else rec.lost = Math.max(0, rec.lost - e.delta);
        }
        patchYouSnapshots(s, s.attrib.round, e.delta);
      }
      break;
    }
    case 'theirCmd': {
      const f = s.fish[e.seat];
      if (!f || !f.alive || !f.cmd.onBoard) return s0;
      const p = cmdPower(f);
      f.toYou += p;
      s.you -= p;
      for (let i = s.rounds.length - 1; i >= 0; i--) {
        const rec = s.rounds[i].seats[e.seat];
        if (rec) { rec.cmdToYou += p; rec.lost += p; patchYouSnapshots(s, i + 1, -p); break; }
      }
      break;
    }
    case 'creatureDied': {
      const f = s.fish[e.seat];
      if (!f) return s0;
      const c = f.creatures.find((x) => x.id === e.id);
      if (!c) return s0;
      f.creatures = f.creatures.filter((x) => x.id !== e.id);
      if (c.cmd) { f.cmd.onBoard = false; f.cmd.tax += 2; }
      break;
    }
  }
  s.fish.forEach((g) => {
    if (g.alive && (g.life <= 0 || g.fromYou >= 21)) eliminate(g, s.round, 'you', g.fromYou >= 21 ? 'commander' : 'damage');
  });
  checkOver(s);
  return s;
}
