// Action catalog, built-in profiles and difficulty presets, ported from the Fishbowl canvas
// (Game.dc.html, MultiGame.dc.html and Actions.dc.html).

export type Cat = 'idle' | 'creature' | 'commander' | 'ramp' | 'interaction' | 'wipe' | 'damage' | 'lifegain';
export type Difficulty = 'casual' | 'focused' | 'high';
export type Freq = 1 | 2 | 3;

export interface Action {
  id: string;
  name: string;
  /** Short description for the Profiles screen. */
  you: string;
  cat: Cat;
  /**
   * Mana cost. Ignored for 'cmdcast', which costs its commander's power plus tax. For `perLand`
   * actions it is the fewest lands needed; they spend every land.
   */
  cost: number;
  /** Default frequency (3 Common, 2 Normal, 1 Rare) for profiles that have no weight of their own. */
  w: Freq;
  p?: number;
  t?: number;
  /** Makes this many 1/1 tokens. */
  tokens?: number;
  /** Makes one 1/1 token per land it has. */
  perLand?: boolean;
  /** Only picked when its board has tokens, or any creatures. */
  needs?: 'tokens' | 'creatures';
  dmg?: number;
  gain?: number;
  /** Targeted: in Free for All with spread targeting it can hit another goldfish instead of you. */
  tgt?: boolean;
  builtIn: boolean;
  createdAt?: number;
}

export interface Profile {
  id: string;
  name: string;
  desc: string;
  builtIn: boolean;
  on: string[];
  w: Record<string, number>;
  createdAt?: number;
}

export const CATS: Record<Cat, { label: string; color: string }> = {
  idle: { label: 'Nothing', color: '#9FB6B3' },
  creature: { label: 'Creature', color: '#8FD694' },
  commander: { label: 'Commander', color: '#FF8B3D' },
  ramp: { label: 'Ramp', color: '#D9C27A' },
  interaction: { label: 'Interaction', color: '#86B6FF' },
  wipe: { label: 'Boardwipe', color: '#FF7A7A' },
  damage: { label: 'Damage', color: '#B99CFF' },
  lifegain: { label: 'Lifegain', color: '#F2A5CB' },
};
export const CAT_ORDER: Cat[] = ['creature', 'commander', 'interaction', 'wipe', 'damage', 'ramp', 'lifegain', 'idle'];

export const FREQ: { v: Freq; label: string }[] = [
  { v: 3, label: 'Common' },
  { v: 2, label: 'Normal' },
  { v: 1, label: 'Rare' },
];
export const FREQ_NAME: Record<number, string> = { 1: 'Rare', 2: 'Normal', 3: 'Common' };

export const PRESET: Record<Difficulty, Record<Cat | 'miss', number>> = {
  casual: { idle: 2, creature: 1.2, commander: 1, ramp: 1, interaction: 0.4, wipe: 0.3, damage: 0.8, lifegain: 1, miss: 0.15 },
  focused: { idle: 1, creature: 1, commander: 1, ramp: 1, interaction: 1, wipe: 1, damage: 1, lifegain: 1, miss: 0.08 },
  high: { idle: 0.4, creature: 1, commander: 1.1, ramp: 1.3, interaction: 2, wipe: 1.5, damage: 1.3, lifegain: 0.6, miss: 0.05 },
};

export const DIFFICULTIES: { id: Difficulty; label: string; short: string; setupDesc: string }[] = [
  { id: 'casual', label: 'Casual', short: 'Mostly builds a board. Removal is rare.', setupDesc: 'Mostly builds boards. Removal is rare.' },
  { id: 'focused', label: 'Focused', short: 'Some removal and the odd boardwipe.', setupDesc: 'Some removal and the odd boardwipe.' },
  { id: 'high', label: 'High-power', short: 'Removal, counters and wipes, early and often.', setupDesc: 'Removal, counters and wipes, early and often.' },
];
export const DIFF_LABEL: Record<Difficulty, string> = { casual: 'Casual', focused: 'Focused', high: 'High-power' };

export const DEFAULT_ACTIONS: Action[] = [
  { id: 'idle', name: 'Passes the turn', you: 'Nothing. It just sits there, like a good goldfish.', cat: 'idle', cost: 0, w: 3 },
  { id: 'c11', name: 'Casts a 1/1 creature', you: 'Joins its board, attacks next turn.', cat: 'creature', cost: 1, w: 3, p: 1, t: 1 },
  { id: 'c22', name: 'Casts a 2/2 creature', you: 'Joins its board, attacks next turn.', cat: 'creature', cost: 2, w: 3, p: 2, t: 2 },
  { id: 'c33', name: 'Casts a 3/3 creature', you: 'Joins its board, attacks next turn.', cat: 'creature', cost: 3, w: 2, p: 3, t: 3 },
  { id: 'c55', name: 'Casts a 5/5 creature', you: 'Joins its board, attacks next turn.', cat: 'creature', cost: 5, w: 1, p: 5, t: 5 },
  { id: 'tokens', name: 'Makes two 1/1 tokens', you: 'Two tokens join its board.', cat: 'creature', cost: 2, w: 2, tokens: 2 },
  { id: 'tokens3', name: 'Makes three 1/1 tokens', you: 'Three tokens join its board.', cat: 'creature', cost: 3, w: 2, tokens: 3 },
  { id: 'tokensx', name: 'Makes a 1/1 token for each land', you: 'Taps out for one 1/1 per land it has.', cat: 'creature', cost: 4, w: 1, perLand: true },
  { id: 'double', name: 'Doubles its tokens', you: 'Only with tokens out. Each token gets a 1/1 copy.', cat: 'creature', cost: 6, w: 1, needs: 'tokens' },
  { id: 'counters', name: 'Puts a +1/+1 counter on each of its creatures', you: 'Only with creatures out. Its whole team grows.', cat: 'creature', cost: 3, w: 1, needs: 'creatures' },
  { id: 'reanimate', name: 'Reanimates a 6/6 creature', you: 'A 6/6 comes back from its graveyard.', cat: 'creature', cost: 3, w: 1, p: 6, t: 6 },
  { id: 'cmdcast', name: 'Casts its commander', you: 'Its commander hits the battlefield as an X/X.', cat: 'commander', cost: 0, w: 3 },
  { id: 'equip', name: 'Suits up its commander (+2/+2)', you: 'Only when its commander is out.', cat: 'commander', cost: 2, w: 2 },
  { id: 'ramp', name: 'Ramps an extra land', you: 'It gets one more land.', cat: 'ramp', cost: 2, w: 2 },
  { id: 'kill', name: 'Destroys one of your creatures', you: 'Destroy your best creature that isn’t your commander.', cat: 'interaction', cost: 2, w: 2, tgt: true },
  { id: 'cmdr', name: 'Removes your commander', you: 'Your commander goes back to the command zone.', cat: 'interaction', cost: 3, w: 1, tgt: true },
  { id: 'art', name: 'Destroys an artifact or enchantment', you: 'Destroy your best artifact or enchantment.', cat: 'interaction', cost: 2, w: 1, tgt: true },
  { id: 'bounce', name: 'Bounces one of your permanents', you: 'Return your best nonland permanent to your hand.', cat: 'interaction', cost: 1, w: 1, tgt: true },
  { id: 'counter', name: 'Holds up a counterspell', you: 'Your first spell next turn gets countered.', cat: 'interaction', cost: 2, w: 1 },
  { id: 'tax', name: 'Taxes your spells', you: 'Your spells cost 1 more on your next turn.', cat: 'interaction', cost: 2, w: 1, tgt: true },
  { id: 'discard', name: 'Makes you discard a card', you: 'Discard a card of your choice.', cat: 'interaction', cost: 2, w: 1, tgt: true },
  { id: 'discard2', name: 'Makes you discard two cards', you: 'Discard two cards of your choice.', cat: 'interaction', cost: 4, w: 1, tgt: true },
  { id: 'gyhate', name: 'Exiles your graveyard', you: 'Exile every card in your graveyard.', cat: 'interaction', cost: 1, w: 1, tgt: true },
  { id: 'wipe', name: 'Casts a boardwipe', you: 'Destroy all creatures, its own too.', cat: 'wipe', cost: 4, w: 1 },
  { id: 'shock', name: 'Shocks you for 2', you: 'You take 2. It’s a spell, so no blocks.', cat: 'damage', cost: 1, w: 2, tgt: true, dmg: 2 },
  { id: 'drain', name: 'Drains you for 3', you: 'You lose 3 life, it gains 3.', cat: 'damage', cost: 3, w: 2, tgt: true, dmg: 3, gain: 3 },
  { id: 'overrun', name: 'Overruns: its creatures get +3/+3 this turn', you: 'Only with creatures out. Its attack hits much harder.', cat: 'damage', cost: 5, w: 1, needs: 'creatures' },
  { id: 'sacdrain', name: 'Sacrifices its tokens to drain you', you: 'Only with tokens out. You lose 1 life for each token.', cat: 'damage', cost: 2, w: 1, tgt: true, needs: 'tokens' },
  { id: 'gain', name: 'Gains 5 life', you: 'It just got harder to kill.', cat: 'lifegain', cost: 3, w: 1, gain: 5 },
].map((a) => ({ ...a, builtIn: true }) as Action);

// "What you do" copy on the goldfish card, One vs One (Game.dc.html).
const GAME_YOU_ONE: Record<string, string> = {
  idle: 'Nothing. It just sits there, like a good goldfish.',
  c11: 'Nothing yet. It can attack next turn.',
  c22: 'Nothing yet. It can attack next turn.',
  c33: 'Nothing yet. It can attack next turn.',
  c55: 'Nothing yet. It can attack next turn.',
  tokens: 'Nothing yet. Both can attack next turn.',
  tokens3: 'Nothing yet. All three can attack next turn.',
  tokensx: 'Nothing yet. They can all attack next turn.',
  double: 'Nothing yet. The copies can attack next turn.',
  counters: 'Nothing yet. Its whole team just got bigger.',
  overrun: 'Block what you can: every attacker has +3/+3 this turn.',
  reanimate: 'Nothing yet. It comes back from its graveyard and can attack next turn.',
  cmdcast: 'Nothing yet. Its commander can attack next turn.',
  equip: 'Nothing. Its commander just got bigger.',
  ramp: 'Nothing. It gets one more land, so bigger spells come sooner.',
  kill: 'Destroy your best creature that isn’t your commander.',
  cmdr: 'Put your commander back in the command zone. Its tax goes up by 2.',
  art: 'Destroy your best artifact or enchantment.',
  bounce: 'Return your best nonland permanent to your hand.',
  counter: 'Your first spell next turn gets countered. Bait it or play around it.',
  tax: 'Your spells cost 1 more on your next turn.',
  discard: 'Discard a card of your choice.',
  discard2: 'Discard two cards of your choice.',
  gyhate: 'Exile every card in your graveyard.',
  wipe: 'Destroy all your creatures. Its creatures die too.',
  shock: 'Already applied: you took 2. Spells can’t be blocked.',
  drain: 'Already applied: you lost 3 life and it gained 3.',
  gain: 'Nothing. It just got harder to kill.',
};
// Free for All copy (MultiGame.dc.html) where it differs.
const GAME_YOU_TABLE: Record<string, string> = {
  ...GAME_YOU_ONE,
  reanimate: 'Nothing yet. It can attack next turn.',
  ramp: 'Nothing. It gets one more land.',
  wipe: 'Destroy all your creatures. Every goldfish board is wiped too.',
  drain: 'Already applied: you lost 3 and it gained 3.',
};

export function gameYouText(a: Action, table: boolean): string {
  const map = table ? GAME_YOU_TABLE : GAME_YOU_ONE;
  if (a.builtIn && map[a.id]) return map[a.id];
  if (a.cat === 'creature') return 'Nothing yet. It can attack next turn.';
  return 'Resolve it as written, then carry on.';
}

interface BuiltInProfile {
  id: string;
  name: string;
  desc: string;
  w: Record<string, Freq>;
}
export const BUILTIN_PROFILES: BuiltInProfile[] = [
  { id: 'balanced', name: 'Balanced', desc: 'A bit of everything. A good default.', w: { idle: 3, c11: 3, c22: 3, c33: 2, c55: 1, cmdcast: 3, ramp: 2, kill: 2, cmdr: 1, art: 1, counter: 1, discard: 1, wipe: 1, drain: 2, gain: 1 } },
  { id: 'voltron', name: 'Voltron', desc: 'Builds around its commander and suits it up.', w: { idle: 1, c22: 2, c33: 1, cmdcast: 3, equip: 3, ramp: 2, kill: 1, art: 1, counter: 2, bounce: 1 } },
  { id: 'discard', name: 'Discard', desc: 'Strips your hand, turn after turn.', w: { idle: 2, c11: 2, c22: 2, c33: 1, cmdcast: 2, ramp: 2, discard: 3, discard2: 2, drain: 2, kill: 1 } },
  { id: 'reanimation', name: 'Reanimation', desc: 'Cheats big creatures back from its graveyard.', w: { idle: 2, c22: 2, c33: 1, cmdcast: 2, ramp: 2, reanimate: 3, gyhate: 2, kill: 1, wipe: 1 } },
  { id: 'spellslinger', name: 'Spellslinger', desc: 'Cheap spells: burn, bounce and tokens.', w: { idle: 1, c11: 1, tokens: 3, cmdcast: 2, ramp: 2, shock: 3, drain: 2, bounce: 2, counter: 2, kill: 1 } },
  { id: 'control', name: 'Control', desc: 'Counters, removal and wipes. Few threats.', w: { idle: 2, c22: 1, cmdcast: 2, ramp: 2, counter: 3, bounce: 2, tax: 1, kill: 3, cmdr: 2, art: 1, wipe: 2, gain: 1 } },
  { id: 'tokens', name: 'Tokens', desc: 'Floods the board with 1/1s, then pumps or sacrifices them.', w: { idle: 1, cmdcast: 2, ramp: 2, tokens: 3, tokens3: 3, tokensx: 2, double: 1, counters: 2, overrun: 1, sacdrain: 2, kill: 1 } },
];

/** A built-in profile as it ships: its actions on, and a frequency for every default action. */
export function builtInState(id: string): { on: string[]; w: Record<string, number> } | null {
  const b = BUILTIN_PROFILES.find((p) => p.id === id);
  if (!b) return null;
  const w: Record<string, number> = {};
  DEFAULT_ACTIONS.forEach((a) => { w[a.id] = a.w; });
  Object.assign(w, b.w);
  return { on: Object.keys(b.w), w };
}

export function weightFor(profile: Profile, a: Action): number {
  return profile.w[a.id] ?? a.w;
}

/** A built-in profile the user changed, compared over the actions that still exist. */
export function isEdited(profile: Profile, actions: Action[]): boolean {
  const base = builtInState(profile.id);
  if (!base) return false;
  const ids = new Set(actions.map((a) => a.id));
  const onA = profile.on.filter((id) => ids.has(id)).sort().join();
  const onB = base.on.filter((id) => ids.has(id)).sort().join();
  if (onA !== onB) return true;
  return actions.some((a) => weightFor(profile, a) !== (base.w[a.id] ?? a.w));
}

// Stored shapes (Realtime Database). Built-ins are stored only once edited.
export interface StoredAction {
  name?: string;
  cat?: Cat;
  cost?: number;
  p?: number;
  t?: number;
  builtIn?: boolean;
  deleted?: boolean;
  createdAt?: number;
}
export interface StoredProfile {
  name?: string;
  desc?: string;
  builtIn?: boolean;
  on?: Record<string, boolean>;
  w?: Record<string, number>;
  createdAt?: number;
}

export function effectiveActions(stored: Record<string, StoredAction> | null | undefined): Action[] {
  const s = stored || {};
  const builtIns = DEFAULT_ACTIONS
    .filter((a) => !s[a.id]?.deleted)
    .map((a) => (s[a.id]?.cost != null ? { ...a, cost: s[a.id].cost as number } : a));
  const customs: Action[] = Object.entries(s)
    .filter(([, v]) => v && !v.builtIn && !v.deleted && v.name)
    .map(([id, v]) => {
      const cat = v.cat || 'interaction';
      const a: Action = { id, name: v.name as string, you: '', cat, cost: v.cost ?? 0, w: 2, builtIn: false, createdAt: v.createdAt };
      if (cat === 'creature') { a.p = v.p ?? 2; a.t = v.t ?? 2; }
      if (cat === 'interaction' || cat === 'damage') a.tgt = true;
      return a;
    })
    .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
  return customs.concat(builtIns);
}

export function effectiveProfiles(stored: Record<string, StoredProfile> | null | undefined): Profile[] {
  const s = stored || {};
  const builtIns: Profile[] = BUILTIN_PROFILES.map((b) => {
    const base = builtInState(b.id)!;
    const o = s[b.id];
    if (!o) return { id: b.id, name: b.name, desc: b.desc, builtIn: true, on: base.on, w: base.w };
    return { id: b.id, name: b.name, desc: b.desc, builtIn: true, on: Object.keys(o.on || {}), w: { ...base.w, ...(o.w || {}) } };
  });
  const customs: Profile[] = Object.entries(s)
    .filter(([id, v]) => v && !v.builtIn && !BUILTIN_PROFILES.some((b) => b.id === id))
    .map(([id, v]) => ({ id, name: v.name || 'Untitled profile', desc: v.desc || 'Your profile.', builtIn: false, on: Object.keys(v.on || {}), w: { ...(v.w || {}) }, createdAt: v.createdAt }))
    .sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
  return builtIns.concat(customs);
}

export function profileToStored(p: Profile): StoredProfile {
  const on: Record<string, boolean> = {};
  p.on.forEach((id) => { on[id] = true; });
  const out: StoredProfile = { name: p.name, desc: p.desc, builtIn: p.builtIn, on, w: { ...p.w } };
  if (p.createdAt) out.createdAt = p.createdAt;
  return out;
}

// Seat colors: the first set is for the game screens, the chart-safe steps are for charts.
export const SEATS = [
  { name: 'Bubbles', color: '#FF8B3D', light: '#FFB07A', tint: '#2E1D10', chart: '#DF6E13' },
  { name: 'Finn', color: '#6FA8FF', light: '#A9CBFF', tint: '#13233D', chart: '#5A92E7' },
  { name: 'Koi', color: '#F472B6', light: '#F9A8D4', tint: '#2E1426', chart: '#DD5DA2' },
];
export const YOU_COLOR = { color: '#62D2C3', light: '#7FE0D3', chart: '#2FA799' };
export const ONE_COLOR = '#DF6E13';
export const FFA_COLOR = '#5A92E7';

export const PIPS: Record<string, { bg: string; label: string }> = {
  W: { bg: '#F8F6D8', label: 'White' },
  U: { bg: '#C1D7E9', label: 'Blue' },
  B: { bg: '#BAB1AB', label: 'Black' },
  R: { bg: '#E49977', label: 'Red' },
  G: { bg: '#A3C095', label: 'Green' },
};
export const COLOR_ORDER = 'WUBRG';
