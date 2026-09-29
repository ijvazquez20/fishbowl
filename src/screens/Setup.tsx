import { useMemo, useState } from 'preact/hooks';
import { DIFFICULTIES, type Difficulty, SEATS } from '../engine/catalog';
import type { First, Mode, Setup as GameSetup, Targeting } from '../engine/game';
import { readLocal, useStore, writeLocal } from '../data/store';
import { useStartGame } from '../play';
import { go, href, useDesktop } from '../router';
import { Arrow, Bowl, Crown, FishLogo } from '../ui/icons';
import { Brand, MainNav, MobileNav, Seg, SelectField, Stepper, Switch } from '../ui/kit';
import './setup.css';

interface FishForm { name: string; profileId: string; power: number }
interface Form {
  deckId: string;
  count: number;
  mode: Mode;
  difficulty: Difficulty;
  targeting: Targeting;
  life: number;
  power: number;
  first: First;
  miss: boolean;
  fish: FishForm[];
}
const DEFAULT: Form = {
  deckId: '', count: 1, mode: 'active', difficulty: 'focused', targeting: 'spread', life: 40, power: 4, first: 'you', miss: true,
  fish: [
    { name: 'Bubbles', profileId: 'balanced', power: 4 },
    { name: 'Finn', profileId: 'control', power: 5 },
    { name: 'Koi', profileId: 'spellslinger', power: 3 },
  ],
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Setup({ query }: { query: URLSearchParams }) {
  const s = useStore();
  const desktop = useDesktop();
  const start = useStartGame();
  const key = `fishbowl.setup.${s.user.uid}`;
  const [form, setForm] = useState<Form>(() => {
    const f = readLocal(key, DEFAULT);
    const fish = DEFAULT.fish.map((d, i) => ({ ...d, ...(f.fish?.[i] || {}) }));
    const want = query.get('deck');
    return { ...f, fish, deckId: want || f.deckId };
  });
  const put = (fn: (f: Form) => Partial<Form>) => setForm((f) => {
    const n = { ...f, ...fn(f) };
    writeLocal(key, n);
    return n;
  });
  const putFish = (i: number, patch: Partial<FishForm>) => put((f) => ({ fish: f.fish.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const lastPlayed = useMemo(() => {
    const m: Record<string, number> = {};
    s.games.forEach((e) => { m[e.g.deckId] = Math.max(m[e.g.deckId] || 0, e.g.endedAt); });
    return m;
  }, [s.games]);
  const decks = s.decks.slice().sort((a, b) => (lastPlayed[b.id] || 0) - (lastPlayed[a.id] || 0) || a.d.name.localeCompare(b.d.name));
  const deck = decks.find((d) => d.id === form.deckId) || decks[0];
  const count = form.count;
  const active = form.mode === 'active';
  const table = count > 1;
  const first: First = table && form.first === 'goldfish' ? 'you' : form.first;
  const known = (id: string) => s.profiles.some((p) => p.id === id);
  const soloProfile = known(form.fish[0].profileId) ? form.fish[0].profileId : 'balanced';
  const soloDesc = s.profiles.find((p) => p.id === soloProfile)?.desc || '';
  const diff = DIFFICULTIES.find((d) => d.id === form.difficulty)!;

  const setup = (): GameSetup => ({
    deckId: deck!.id,
    count,
    mode: form.mode,
    difficulty: form.difficulty,
    targeting: form.targeting,
    startingLife: form.life,
    yourPower: form.power,
    missLands: form.miss,
    first,
    opponents: table
      ? form.fish.slice(0, count).map((f) => ({ name: f.name, profileId: known(f.profileId) ? f.profileId : 'random', cmdrPower: f.power }))
      : [{ name: 'The Goldfish', profileId: soloProfile, cmdrPower: form.fish[0].power }],
  });
  const onStart = () => { if (deck) start(setup()); };

  const deckField = decks.length ? (
    <div style="display: flex; flex-direction: column; gap: 8px">
      <label for="deck" class="eyebrow" style={desktop ? undefined : 'font-size: 12px'}>Deck</label>
      <div style="display: flex; align-items: center; gap: 12px">
        <SelectField id="deck" wrapStyle={desktop ? 'width: 440px; max-width: 100%' : 'flex: 1; min-width: 0'} value={deck!.id} onChange={(e) => put(() => ({ deckId: (e.target as HTMLSelectElement).value }))}>
          {decks.map((d) => <option key={d.id} value={d.id}>{d.d.name}</option>)}
        </SelectField>
        <a href={href('/decks')} class="btn btn-ghost btn-outline" style="height: 52px; flex-shrink: 0">Manage decks</a>
      </div>
    </div>
  ) : (
    <div class="panel" style="padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
      <span style="display: flex; flex-direction: column; gap: 4px">
        <span style="font-weight: 700; font-size: 16px">Add a deck to start</span>
        <span class="muted" style="font-size: 14px">Each deck keeps its own kill-turn stats.</span>
      </span>
      <a href={href('/decks?add=1')} class="btn btn-primary">Add a deck</a>
    </div>
  );

  const countSeg = (
    <Seg
      class={'big ' + (desktop ? '' : 'md')}
      labelledby="count-label"
      options={[1, 2, 3].map((n) => ({ id: n, label: String(n), aria: n === 1 ? '1 goldfish, One vs One' : n + ' goldfish, Free for All' }))}
      value={count}
      onPick={(n) => put(() => ({ count: n }))}
    />
  );
  const diffSeg = (
    <Seg class={desktop ? '' : 'md'} labelledby="diff-label" options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))} value={form.difficulty} onPick={(d) => put(() => ({ difficulty: d }))} />
  );
  const firstOptions = table
    ? [{ id: 'you' as First, label: 'You go first' }, { id: 'random' as First, label: 'Random seat' }]
    : [{ id: 'you' as First, label: 'You' }, { id: 'goldfish' as First, label: 'Goldfish' }, { id: 'random' as First, label: 'Random' }];
  const firstSeg = <Seg class={desktop ? '' : 'md'} labelledby="first-label" options={firstOptions} value={first} onPick={(v) => put(() => ({ first: v }))} />;
  const lifeStep = (
    <Stepper labelledby="life-label" value={form.life} downLabel="Lower starting life" upLabel="Raise starting life"
      onDown={() => put((f) => ({ life: clamp(f.life - 1, 1, 99) }))} onUp={() => put((f) => ({ life: clamp(f.life + 1, 1, 99) }))} />
  );
  const powerStep = (
    <Stepper labelledby="power-label" value={form.power} downLabel="Lower your commander power" upLabel="Raise your commander power"
      onDown={() => put((f) => ({ power: clamp(f.power - 1, 0, 21) }))} onUp={() => put((f) => ({ power: clamp(f.power + 1, 0, 21) }))} />
  );
  const missToggle = (
    <button type="button" class="miss" aria-pressed={form.miss} onClick={() => put((f) => ({ miss: !f.miss }))}>
      {desktop && <Switch on={form.miss} />}
      <span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px">
        <span style="font-size: 16px; font-weight: 600">Goldfish can miss land drops</span>
        <span class="muted" style="font-size: 13px">{desktop ? 'More often on Casual, rarely on High-power' : 'More often on Casual'}</span>
      </span>
      {!desktop && <Switch on={form.miss} />}
    </button>
  );
  const profilePills = (
    <div class={desktop ? '' : 'swipe'} style={desktop ? 'display: flex; flex-wrap: wrap; gap: 8px' : 'display: flex; gap: 6px; margin: 0 -20px; padding: 0 20px'}>
      {s.profiles.map((p) => (
        <button key={p.id} type="button" class="pill" aria-pressed={p.id === soloProfile} onClick={() => putFish(0, { profileId: p.id })}>{p.name}</button>
      ))}
    </div>
  );
  const soloStepper = (
    <div style="flex-shrink: 0; display: flex; align-items: center; gap: 8px">
      <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--accent-light)"><Crown size={16} />Its commander</span>
      <div class="mini-step" style="gap: 8px">
        <button type="button" class="pad" style="width: 44px; font-size: 20px; font-weight: 400" aria-label="Make its commander smaller" onClick={() => putFish(0, { power: clamp(form.fish[0].power - 1, 1, 12) })}>−</button>
        <span class="display" style="min-width: 48px; text-align: center; font-size: 20px; color: var(--accent-light)">{form.fish[0].power}/{form.fish[0].power}</span>
        <button type="button" class="pad" style="width: 44px; font-size: 20px; font-weight: 400" aria-label="Make its commander bigger" onClick={() => putFish(0, { power: clamp(form.fish[0].power + 1, 1, 12) })}>+</button>
      </div>
    </div>
  );
  const profileSelect = (i: number, f: FishForm) => (
    <select aria-label={'Opponent profile for ' + (f.name || SEATS[i].name)} class="field dark" style={'height: ' + (desktop ? 44 : 48) + 'px; padding: 0 10px; font-size: 15px; font-weight: 600; border-radius: 10px' + (desktop ? '' : '; flex-grow: 1; min-width: 0')} value={known(f.profileId) ? f.profileId : 'random'} onChange={(e) => putFish(i, { profileId: (e.target as HTMLSelectElement).value })}>
      {s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      <option value="random">Random</option>
    </select>
  );
  const fishDesc = (f: FishForm) => (known(f.profileId) ? s.profiles.find((p) => p.id === f.profileId)!.desc : 'Picked at random when the game starts.');
  const nameInput = (i: number, f: FishForm) => (
    <input type="text" aria-label={`Goldfish ${i + 1} name`} value={f.name} maxLength={24} onChange={(e) => putFish(i, { name: (e.target as HTMLInputElement).value })}
      class="field dark display" style={`flex-grow: 1; min-width: 0; height: ${desktop ? 40 : 44}px; padding: 0 10px; border-radius: 8px; font-size: 18px; color: ${SEATS[i].light}`} />
  );
  const start1 = (
    <button type="button" class="btn btn-primary btn-lg" style={desktop ? 'padding: 0 32px; font-size: 18px' : 'width: 100%; font-size: 18px'} disabled={!deck} onClick={onStart}>
      Start game<Arrow size={20} />
    </button>
  );
  const signOut = (
    <span class="muted" style="font-size: 13px">
      Signed in as {s.user.email || s.user.name} · <button type="button" class="link-btn" onClick={() => s.backend.signOut()}>Sign out</button>
    </span>
  );

  if (!desktop) {
    return (
      <div class="m-page setup-m">
        <header class="m-header">
          <Brand size={26} />
          <MobileNav current="new" />
        </header>
        <div style="display: flex; flex-direction: column; gap: 4px">
          <h1 class="display" style="font-size: 32px">New game</h1>
          <p class="muted" style="font-size: 15px">{table ? 'Set up the table, then draw seven.' : 'Set up the goldfish, then draw seven.'}</p>
        </div>
        {deckField}
        <div class="m-field" role="group" aria-labelledby="mode-label">
          <span id="mode-label" class="eyebrow sm">Goldfish mode</span>
          <Seg class="md" labelledby="mode-label" options={[{ id: 'passive' as Mode, label: 'Passive' }, { id: 'active' as Mode, label: 'Active' }]} value={form.mode} onPick={(m) => put(() => ({ mode: m }))} />
          <p class="soft" style="font-size: 14px; line-height: 1.4">
            {active
              ? (table ? 'They play lands, cast what they can afford, and attack.' : 'Plays lands, casts what it can afford, attacks you.')
              : (table ? 'True goldfish that never act. How fast can you clear the table?' : 'A true goldfish. Measures your clean kill turn.')}
          </p>
        </div>
        <div class="m-field">
          <span id="count-label" class="eyebrow sm">How many goldfish</span>
          {countSeg}
        </div>
        {active && (
          <div class="m-field">
            <span id="diff-label" class="eyebrow sm">{table ? 'Difficulty · all goldfish' : 'Difficulty'}</span>
            {diffSeg}
            <p class="soft" style="font-size: 14px; line-height: 1.4">{diff.setupDesc}</p>
          </div>
        )}
        {active && table && (
          <div class="m-field">
            <span id="target-label" class="eyebrow sm">Who do they attack</span>
            <Seg class="md" labelledby="target-label" options={[{ id: 'spread' as Targeting, label: 'Spread out' }, { id: 'you' as Targeting, label: 'All on you' }]} value={form.targeting} onPick={(t) => put(() => ({ targeting: t }))} />
            <p class="soft" style="font-size: 14px; line-height: 1.4">{form.targeting === 'spread' ? 'Each attack or targeted spell picks you or another goldfish, like a real pod.' : 'Everything comes at you. A gauntlet for your defense.'}</p>
          </div>
        )}
        {active && !table && (
          <div class="m-field" role="group" aria-labelledby="profile-label">
            <span id="profile-label" class="eyebrow sm">Opponent profile</span>
            {profilePills}
            <p class="soft" style="font-size: 14px; line-height: 1.4">{soloDesc}</p>
            <div class="stepper" style="padding: 5px 5px 5px 14px">
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--accent-light)"><Crown size={16} />Its commander</span>
              <div style="display: flex; align-items: center; gap: 6px">
                <button type="button" class="pad" style="width: 44px; font-size: 20px; font-weight: 400" aria-label="Make its commander smaller" onClick={() => putFish(0, { power: clamp(form.fish[0].power - 1, 1, 12) })}>−</button>
                <span class="display" style="min-width: 44px; text-align: center; font-size: 19px; color: var(--accent-light)">{form.fish[0].power}/{form.fish[0].power}</span>
                <button type="button" class="pad" style="width: 44px; font-size: 20px; font-weight: 400" aria-label="Make its commander bigger" onClick={() => putFish(0, { power: clamp(form.fish[0].power + 1, 1, 12) })}>+</button>
              </div>
            </div>
          </div>
        )}
        {table && (
          <div class="m-field" style="gap: 10px">
            <span class="eyebrow sm">The goldfish · seat order</span>
            {form.fish.slice(0, count).map((f, i) => (
              <div key={i} class="seat-m" style={`border-left-color: ${SEATS[i].color}`}>
                <div style="display: flex; align-items: center; gap: 8px">
                  <FishLogo size={22} color={SEATS[i].color} eye={false} sw={2.2} />
                  {nameInput(i, f)}
                  <span class="muted" style="flex-shrink: 0; font-size: 12px; font-weight: 700">{first === 'random' ? 'Seat ?' : 'Seat ' + (i + 2)}</span>
                </div>
                {active && (
                  <>
                    <div style="display: flex; align-items: center; gap: 8px">
                      {profileSelect(i, f)}
                      <div class="stepper" style="height: 48px; padding: 2px; border-radius: 10px; background: var(--bg); gap: 2px" role="group" aria-label={f.name + ' commander size'}>
                        <button type="button" style="width: 42px; height: 42px; border-radius: 8px; font-size: 18px" aria-label={'Make ' + f.name + ' commander smaller'} onClick={() => putFish(i, { power: clamp(f.power - 1, 1, 12) })}>−</button>
                        <span class="display" style={`min-width: 40px; text-align: center; font-size: 16px; color: ${SEATS[i].light}`}>{f.power}/{f.power}</span>
                        <button type="button" style="width: 42px; height: 42px; border-radius: 8px; font-size: 18px" aria-label={'Make ' + f.name + ' commander bigger'} onClick={() => putFish(i, { power: clamp(f.power + 1, 1, 12) })}>+</button>
                      </div>
                    </div>
                    <span class="soft" style="font-size: 13px; line-height: 1.4">{fishDesc(f)} <span style={`color: ${SEATS[i].light}`}>Commander {f.power}/{f.power}.</span></span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
          <div class="m-field">
            <span id="life-label" class="eyebrow sm">Starting life</span>
            {lifeStep}
          </div>
          <div class="m-field">
            <span id="power-label" class="eyebrow sm">Your cmdr</span>
            {powerStep}
          </div>
        </div>
        <div class="m-field">
          <span id="first-label" class="eyebrow sm">{table ? 'Your seat' : 'Who goes first'}</span>
          {firstSeg}
        </div>
        {missToggle}
        <div style="display: flex; flex-direction: column; gap: 8px">
          {start1}
          <a href={href('/profiles')} class="btn btn-ghost" style="height: 48px">Edit profiles</a>
        </div>
        <div style="text-align: center">{signOut}</div>
      </div>
    );
  }

  return (
    <div class="setup">
      <aside class="setup-aside">
        <Brand size={32} />
        <div style="display: flex; justify-content: center"><Bowl size={260} table={table} /></div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <h1 class="display" style="font-size: 40px; line-height: 1.05; letter-spacing: -0.03em; text-wrap: pretty">{table ? 'A whole table of goldfish.' : 'A goldfish that fights back. A little.'}</h1>
          <p class="muted" style="font-size: 16px; line-height: 1.5">{table ? 'Play your real deck on the table. Fishbowl runs up to three opponents, each with its own profile.' : 'Play your real deck on the table. Fishbowl runs the opponent.'}</p>
        </div>
        <ol class="how">
          {(table
            ? ['You play first, then each goldfish in seat order', 'Each one plays a land and does one thing it can afford', 'Attacks you or another goldfish, casts interaction']
            : ['Plays a land, and sometimes misses', 'Does one thing its lands can pay for', 'Attacks you with its creatures, casts interaction']
          ).map((t, i) => <li key={i}><span>{i + 1}</span>{t}</li>)}
        </ol>
        <div style="margin-top: auto">{signOut}</div>
      </aside>

      <main class="setup-main">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px">
          <div style="display: flex; flex-direction: column; gap: 6px">
            <h2 class="display" style="font-size: 36px">New game</h2>
            <p class="muted" style="font-size: 16px">{table ? 'Set up the table, shuffle up, and draw seven.' : 'Set up the goldfish, shuffle up, and draw seven.'}</p>
          </div>
          <nav aria-label="Main" class="topnav" style="flex-shrink: 0"><MainNav current="new" /></nav>
        </div>

        {deckField}

        <div style="display: flex; flex-direction: column; gap: 10px" role="group" aria-labelledby="mode-label">
          <span id="mode-label" class="eyebrow">Goldfish mode</span>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px">
            {([
              ['passive', 'Passive', table ? 'True goldfish that never act. How fast can you clear a whole table?' : 'A true goldfish that never acts. Use it to measure your clean kill turn.'],
              ['active', 'Active', table ? 'They play lands, cast what they can afford, and attack. Tests your deck at a real table.' : 'Plays lands, casts what it can afford, and attacks you. Tests how your deck handles pressure.'],
            ] as [Mode, string, string][]).map(([id, label, desc]) => (
              <button key={id} type="button" class="choice" style="min-height: 100px" aria-pressed={form.mode === id} onClick={() => put(() => ({ mode: id }))}>
                <span style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%">
                  <span class="choice-title">{label}</span>
                  <span class="radio" />
                </span>
                <span class="choice-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px">
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span id="count-label" class="eyebrow">How many goldfish</span>
            {countSeg}
            <span class="soft" style="font-size: 14px">{table ? 'Free for All' : 'One vs One'}</span>
          </div>
          {active && (
            <div style="display: flex; flex-direction: column; gap: 10px">
              <span id="diff-label" class="eyebrow">{table ? 'Difficulty · all goldfish' : 'Difficulty'}</span>
              {diffSeg}
              <span class="soft" style="font-size: 14px">{diff.setupDesc}</span>
            </div>
          )}
        </div>

        {active && table && (
          <div style="display: flex; flex-direction: column; gap: 10px" role="group" aria-labelledby="target-label">
            <span id="target-label" class="eyebrow">Who do they attack</span>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px">
              {([
                ['spread', 'Spread out', 'Each attack or targeted spell picks you or another goldfish. Plays like a real pod.'],
                ['you', 'All on you', 'Everything comes at you. A gauntlet to stress-test your defense.'],
              ] as [Targeting, string, string][]).map(([id, label, desc]) => (
                <button key={id} type="button" class="choice" style="min-height: 84px; padding: 14px 18px; border-radius: 14px; gap: 4px" aria-pressed={form.targeting === id} onClick={() => put(() => ({ targeting: id }))}>
                  <span style="font-size: 17px; font-weight: 700">{label}</span>
                  <span style="font-size: 14px; line-height: 1.4; color: var(--soft)">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {active && !table && (
          <div style="display: flex; flex-direction: column; gap: 10px" role="group" aria-labelledby="profile-label">
            <span id="profile-label" class="eyebrow">Opponent profile</span>
            {profilePills}
            <div class="profile-desc">
              <span class="soft" style="font-size: 15px; line-height: 1.4">{soloDesc}</span>
              {soloStepper}
            </div>
          </div>
        )}

        {table && (
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span class="eyebrow">The goldfish · in seat order</span>
            <div style={`display: grid; grid-template-columns: repeat(${count}, minmax(0, 1fr)); gap: 14px`}>
              {form.fish.slice(0, count).map((f, i) => (
                <div key={i} class="seat-card" style={`border-top-color: ${SEATS[i].color}`}>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <FishLogo size={22} color={SEATS[i].color} eye={false} sw={2.2} />
                    {nameInput(i, f)}
                    <span class="muted" style="flex-shrink: 0; font-size: 12px; font-weight: 700">{first === 'random' ? 'Seat ?' : 'Seat ' + (i + 2)}</span>
                  </div>
                  {active && (
                    <>
                      <div style="display: flex; flex-direction: column; gap: 6px">
                        <span class="muted" style="font-size: 12px; font-weight: 600">Opponent profile</span>
                        {profileSelect(i, f)}
                        <span class="soft" style="min-height: 38px; font-size: 13px; line-height: 1.45">{fishDesc(f)}</span>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 6px">
                        <span style={`display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: ${SEATS[i].light}`}><Crown size={14} />Its commander</span>
                        <Stepper class="dark" style="height: 52px; padding: 4px; border-radius: 12px; background: var(--bg)" value={f.power + '/' + f.power}
                          valueStyle={`font-size: 20px; font-weight: 800; color: ${SEATS[i].light}`}
                          downLabel={'Make ' + f.name + ' commander smaller'} upLabel={'Make ' + f.name + ' commander bigger'}
                          onDown={() => putFish(i, { power: clamp(f.power - 1, 1, 12) })} onUp={() => putFish(i, { power: clamp(f.power + 1, 1, 12) })} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style="display: grid; grid-template-columns: 200px 200px minmax(0, 1fr); gap: 20px">
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span id="life-label" class="eyebrow">Starting life</span>
            {lifeStep}
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span id="power-label" class="eyebrow">Your cmdr power</span>
            {powerStep}
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span id="first-label" class="eyebrow">{table ? 'Your seat' : 'Who goes first'}</span>
            {firstSeg}
          </div>
        </div>

        {missToggle}

        <div style="margin-top: auto; padding-top: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 12px">
          {start1}
          <a href={href('/profiles')} class="btn btn-outline btn-lg" style="font-size: 16px; padding: 0 22px">Edit profiles</a>
          <button type="button" class="btn btn-outline btn-lg" style="font-size: 16px; padding: 0 22px" onClick={() => go(deck ? '/decks/' + deck.id : '/decks')}>Deck stats</button>
        </div>
      </main>
    </div>
  );
}
