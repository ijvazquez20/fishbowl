import { useState } from 'preact/hooks';
import {
  type Action, type Cat, CAT_ORDER, CATS, DIFFICULTIES, type Difficulty, FREQ, FREQ_NAME, PRESET, type Profile,
  isEdited, weightFor,
} from '../engine/catalog';
import {
  addAction, createProfile, deleteAction, deleteProfile, resetProfile, saveProfile, setActionCost,
} from '../data/mutations';
import { useStore } from '../data/store';
import { useDesktop } from '../router';
import { ChevDown, Plus, Trash } from '../ui/icons';
import { Confirm, MainNav, MobileNav, Seg, Switch, TopBar } from '../ui/kit';
import './profiles.css';

const CMD_POWER = 4;
const costOf = (a: Action) => (a.id === 'cmdcast' ? CMD_POWER : a.cost);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const CAT_OPTIONS: Cat[] = ['creature', 'commander', 'interaction', 'wipe', 'damage', 'ramp', 'lifegain', 'idle'];

interface Form { text: string; cat: Cat; cost: number; p: number; t: number }

export function Profiles() {
  const s = useStore();
  const desktop = useDesktop();
  const { actions, profiles } = s;
  const [sel, setSel] = useState('balanced');
  const [lands, setLands] = useState(4);
  const [diff, setDiff] = useState<Difficulty>('focused');
  const [zone, setZone] = useState<'command' | 'battlefield'>('command');
  const [form, setForm] = useState<Form>({ text: '', cat: 'interaction', cost: 2, p: 2, t: 2 });
  const [open, setOpen] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [oddsOpen, setOddsOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ kind: 'action'; a: Action } | { kind: 'profile' } | null>(null);
  const [err, setErr] = useState('');
  const run = (p: Promise<unknown>) => p.catch((e) => setErr('Couldn’t save: ' + (e as Error).message));

  const profile = profiles.find((p) => p.id === sel) || profiles[0];
  const edited = profile.builtIn && isEdited(profile, actions);
  const ids = new Set(actions.map((a) => a.id));
  const onCount = profile.on.filter((id) => ids.has(id)).length;
  const customs = profiles.filter((p) => !p.builtIn);
  const put = (p: Profile) => run(saveProfile(s, p));
  const toggle = (a: Action) => {
    const on = profile.on.includes(a.id);
    put({ ...profile, on: on ? profile.on.filter((id) => id !== a.id) : profile.on.concat([a.id]) });
  };
  const setFreq = (a: Action, v: number) => put({ ...profile, w: { ...profile.w, [a.id]: v } });
  const setCost = (a: Action, d: number) => run(setActionCost(s, a.id, a.builtIn, clamp(a.cost + d, 0, 12)));
  const newProfile = () => {
    const bal = profiles.find((p) => p.id === 'balanced') || profiles[0];
    run(createProfile(s, bal, 'New profile ' + (customs.length + 1), 'Your profile. Starts from Balanced.').then(setSel));
  };
  const duplicate = () => run(createProfile(s, profile, 'Copy of ' + profile.name, 'Your profile. Copied from ' + profile.name + '.').then(setSel));
  const reset = () => run(resetProfile(s, profile.id));
  const rename = (name: string) => { if (name.trim() && name !== profile.name) put({ ...profile, name: name.trim() }); };
  const submit = (e: Event) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    run(addAction(s, form, profile));
    setForm({ ...form, text: '' });
    setFormOpen(false);
  };

  // Odds preview: one goldfish turn with this profile, at this difficulty and land count.
  const P = PRESET[diff];
  const pool = actions.filter((a) => {
    if (!profile.on.includes(a.id)) return false;
    if (a.id === 'cmdcast' && zone !== 'command') return false;
    if (a.id === 'equip' && zone !== 'battlefield') return false;
    return costOf(a) <= lands;
  });
  let total = 0;
  const byCat: Partial<Record<Cat, number>> = {};
  pool.forEach((a) => { const w = weightFor(profile, a) * (P[a.cat] ?? 1); total += w; byCat[a.cat] = (byCat[a.cat] || 0) + w; });
  const odds = CAT_ORDER.map((c) => {
    const pct = total ? ((byCat[c] || 0) / total) * 100 : 0;
    return { cat: c, label: CATS[c].label, color: CATS[c].color, pct, pctLabel: pct ? Math.round(pct) + '%' : '—' };
  });
  const interact = total ? (((byCat.interaction || 0) + (byCat.wipe || 0)) / total) * 100 : 0;
  const far = actions.filter((a) => profile.on.includes(a.id) && costOf(a) > lands).map((a) => a.name + ' (' + costOf(a) + ')');

  const diffSeg = <Seg class="dark sm" label="Difficulty" style={desktop ? '' : 'height: 48px'} options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))} value={diff} onPick={setDiff} />;
  const zoneSeg = <Seg class="dark sm" label="Where its commander is" options={[{ id: 'command' as const, label: 'Command zone' }, { id: 'battlefield' as const, label: 'Battlefield' }]} value={zone} onPick={setZone} />;
  const landStep = (
    <div style="display: flex; align-items: center; justify-content: space-between">
      <span style="font-size: 14px; font-weight: 600">Goldfish has</span>
      <div style="display: flex; align-items: center; gap: 6px">
        <button type="button" class="pad" style="width: 40px; height: 40px; font-size: 18px; font-weight: 400" aria-label="Fewer lands" onClick={() => setLands(clamp(lands - 1, 0, 12))}>−</button>
        <span style="min-width: 70px; text-align: center; font-size: 15px; font-weight: 700; color: var(--land)">{lands} lands</span>
        <button type="button" class="pad" style="width: 40px; height: 40px; font-size: 18px; font-weight: 400" aria-label="More lands" onClick={() => setLands(clamp(lands + 1, 0, 12))}>+</button>
      </div>
    </div>
  );
  const freqSeg = (a: Action, mobile: boolean) => (
    <Seg class="dark sm" style={mobile ? 'padding: 3px; gap: 3px; height: 48px; border: 0' : 'padding: 3px; gap: 3px; border: 0; border-radius: 10px'} label={'How often in ' + profile.name + ': ' + a.name}
      options={FREQ.map((f) => ({ id: f.v as number, label: f.label }))} value={weightFor(profile, a)} onPick={(v) => setFreq(a, v)} />
  );
  const costControl = (a: Action, big: boolean) => a.id === 'cmdcast'
    ? <span style="font-size: 13px; font-weight: 600; color: var(--land)">{big ? 'Its power + tax' : 'Power + tax'}</span>
    : (
      <div style="display: flex; align-items: center; gap: 4px">
        <button type="button" class="pad" style={`width: ${big ? 44 : 32}px; height: ${big ? 44 : 32}px; border-radius: 8px; font-size: 15px; font-weight: 400`} aria-label={'Lower cost of ' + a.name} onClick={() => setCost(a, -1)}>−</button>
        <span style="width: 32px; text-align: center; font-size: 14px; font-weight: 800; color: var(--land)">{a.cost}</span>
        <button type="button" class="pad" style={`width: ${big ? 44 : 32}px; height: ${big ? 44 : 32}px; border-radius: 8px; font-size: 15px; font-weight: 400`} aria-label={'Raise cost of ' + a.name} onClick={() => setCost(a, 1)}>+</button>
      </div>
    );
  const toggleButton = (a: Action) => {
    const on = profile.on.includes(a.id);
    return (
      <button type="button" aria-pressed={on} aria-label={(on ? 'Turn off in ' : 'Turn on in ') + profile.name + ': ' + a.name} onClick={() => toggle(a)} style="width: 52px; height: 44px; flex-shrink: 0; padding: 0; border: 0; background: transparent; display: flex; align-items: center; justify-content: center">
        <Switch on={on} small />
      </button>
    );
  };
  const nameField = profile.builtIn
    ? <h2 class="display" style={`font-size: ${desktop ? 28 : 24}px`}>{profile.name}</h2>
    : <input key={profile.id} aria-label="Profile name" type="text" maxLength={40} class="field dark display" style={`${desktop ? 'width: 320px; font-size: 22px' : 'flex-grow: 1; min-width: 0; font-size: 19px'}; height: 44px; padding: 0 12px; border-radius: 10px`} value={profile.name} onChange={(e) => rename((e.target as HTMLInputElement).value)} />;
  const profileButtons = (
    <>
      <button type="button" class="btn btn-outline" style="border-radius: 10px; font-size: 14px" onClick={duplicate}>Duplicate</button>
      {profile.builtIn
        ? <button type="button" class="btn btn-outline" style="border-radius: 10px; font-size: 14px" disabled={!edited} onClick={reset}>Reset</button>
        : <button type="button" class="btn btn-danger-outline" style="border-radius: 10px; font-size: 14px" onClick={() => setConfirmDel({ kind: 'profile' })}>Delete profile</button>}
    </>
  );
  const catSelect = (style: string) => (
    <select aria-label="Type" class="field dark" style={style} value={form.cat} onChange={(e) => setForm({ ...form, cat: (e.target as HTMLSelectElement).value as Cat })}>
      {CAT_OPTIONS.map((c) => <option key={c} value={c}>{CATS[c].label}</option>)}
    </select>
  );
  const formCost = (h: number) => (
    <div style={`height: ${h}px; padding: 2px 4px; border-radius: 10px; border: 1px solid var(--line-3); background: var(--bg); display: flex; align-items: center; justify-content: space-between; gap: 4px`}>
      <button type="button" class="pad" style={`width: ${h - 8}px; height: ${h - 8}px; border-radius: 8px; font-size: 16px; font-weight: 400`} aria-label="Lower cost" onClick={() => setForm({ ...form, cost: clamp(form.cost - 1, 0, 12) })}>−</button>
      <span style="min-width: 56px; text-align: center; font-size: 14px; font-weight: 600">{form.cost} mana</span>
      <button type="button" class="pad" style={`width: ${h - 8}px; height: ${h - 8}px; border-radius: 8px; font-size: 16px; font-weight: 400`} aria-label="Raise cost" onClick={() => setForm({ ...form, cost: clamp(form.cost + 1, 0, 12) })}>+</button>
    </div>
  );
  const ptInputs = form.cat === 'creature' && (
    <div style="display: flex; align-items: center; gap: 4px">
      <input aria-label="Power" type="number" min={0} max={20} class="field dark" style="width: 56px; height: 44px; padding: 0 6px; border-radius: 10px; font-size: 15px; text-align: center" value={form.p} onInput={(e) => setForm({ ...form, p: clamp(parseInt((e.target as HTMLInputElement).value, 10) || 0, 0, 20) })} />
      <span class="muted">/</span>
      <input aria-label="Toughness" type="number" min={1} max={20} class="field dark" style="width: 56px; height: 44px; padding: 0 6px; border-radius: 10px; font-size: 15px; text-align: center" value={form.t} onInput={(e) => setForm({ ...form, t: clamp(parseInt((e.target as HTMLInputElement).value, 10) || 1, 1, 20) })} />
    </div>
  );
  const dialogs = (
    <>
      {confirmDel?.kind === 'action' && (
        <Confirm danger title={'Delete “' + confirmDel.a.name + '”?'}
          text={confirmDel.a.builtIn ? 'It comes out of every profile, built-in ones too. Built-in actions can’t be brought back.' : 'It comes out of every profile. You can’t undo this.'}
          confirm="Delete action" onConfirm={() => { run(deleteAction(s, confirmDel.a.id, confirmDel.a.builtIn)); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />
      )}
      {confirmDel?.kind === 'profile' && (
        <Confirm danger title={'Delete ' + profile.name + '?'} text="Games you already played with it keep its name. You can’t undo this." confirm="Delete profile"
          onConfirm={() => { run(deleteProfile(s, profile.id)); setSel('balanced'); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />
      )}
    </>
  );
  const errBar = err && <p role="alert" class="notice warn" style="display: flex; justify-content: space-between; gap: 12px">{err}<button type="button" class="link-btn" onClick={() => setErr('')}>Dismiss</button></p>;

  if (!desktop) {
    return (
      <div class="m-page">
        <header class="m-header">
          <h1 class="m-title" style="font-size: 22px">Opponent profiles</h1>
          <MobileNav current="profiles" />
        </header>
        {errBar}
        <div role="group" aria-label="Choose a profile" class="swipe" style="flex-shrink: 0; display: flex; gap: 6px; margin: -4px -16px 0; padding: 0 16px">
          <button type="button" class="chip lg" style="border-style: dashed; border-color: var(--accent); color: var(--accent-light); display: inline-flex; align-items: center; gap: 6px" onClick={newProfile}><Plus size={16} />New</button>
          {profiles.map((p) => <button key={p.id} type="button" class="chip lg" aria-pressed={p.id === profile.id} onClick={() => setSel(p.id)}>{p.name}</button>)}
        </div>
        <section aria-label="Selected profile" class="panel" style="padding: 16px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
            {nameField}
            <span class="tag sm" style="flex-shrink: 0">{profile.builtIn ? (edited ? 'Built-in · edited' : 'Built-in') : 'Custom'}</span>
          </div>
          <p class="soft" style="font-size: 14px; line-height: 1.45">{profile.desc}</p>
          <span class="muted" style="font-size: 13px">{onCount} of {actions.length} actions on · on/off and how often are saved per profile</span>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">{profileButtons}</div>
        </section>
        <section aria-labelledby="m-odds-title" class="panel" style="padding: 14px 16px; border-radius: 18px; display: flex; flex-direction: column; gap: 12px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <h2 id="m-odds-title" style="font-size: 15px; font-weight: 700">Odds preview</h2>
              <span class="soft" style="font-size: 13px">Messes with you on <strong style="color: var(--accent-light)">{Math.round(interact)}%</strong> of turns</span>
            </div>
            <button type="button" class="btn btn-outline" style="border-radius: 10px; font-size: 14px" aria-expanded={oddsOpen} onClick={() => setOddsOpen(!oddsOpen)}>{oddsOpen ? 'Hide' : 'Show odds'}</button>
          </div>
          {oddsOpen && (
            <div style="display: flex; flex-direction: column; gap: 12px">
              {diffSeg}
              {landStep}
              {zoneSeg}
              <ul style="display: flex; flex-direction: column; gap: 10px">
                {odds.map((o) => (
                  <li key={o.cat} style={`display: grid; grid-template-columns: 104px minmax(0, 1fr) 40px; align-items: center; gap: 10px; font-size: 13px; opacity: ${o.pct ? 1 : 0.45}`}>
                    <span style="display: inline-flex; align-items: center; gap: 6px"><span class="dot" style={`width: 7px; height: 7px; background: ${o.color}`} />{o.label}</span>
                    <div class="odds-bar"><div style={`width: ${o.pct.toFixed(1)}%`} /></div>
                    <span class="num" style="text-align: right; font-weight: 700">{o.pctLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {formOpen ? (
          <form onSubmit={submit} class="add-form-m">
            <label for="m-new-name" class="eyebrow sm">New action</label>
            <input id="m-new-name" type="text" maxLength={60} placeholder="e.g. Steals your best creature" class="field dark" style="height: 48px; font-size: 16px; border-radius: 10px" value={form.text} onInput={(e) => setForm({ ...form, text: (e.target as HTMLInputElement).value })} />
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 8px">
              {catSelect('height: 48px; padding: 0 10px; font-size: 15px; border-radius: 10px')}
              {formCost(48)}
            </div>
            {ptInputs}
            <p class="muted" style="font-size: 13px">It’s added to every profile, turned on in {profile.name} only.</p>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">
              <button type="button" class="btn btn-outline" style="height: 48px" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit" class="btn btn-primary" style="height: 48px" disabled={!form.text.trim()}>Add action</button>
            </div>
          </form>
        ) : (
          <button type="button" class="add-dashed" style="height: 52px; border-radius: 14px" onClick={() => setFormOpen(true)}><Plus size={18} />Add an action</button>
        )}
        <ul class="panel" style="border-radius: 18px; overflow: hidden">
          {actions.map((a) => {
            const on = profile.on.includes(a.id);
            const isOpen = open === a.id;
            const cat = CATS[a.cat] || CATS.idle;
            return (
              <li key={a.id} style={`border-bottom: 1px solid var(--rule); opacity: ${on ? 1 : 0.5}`}>
                <div style="min-height: 64px; padding: 6px 4px 6px 8px; display: flex; align-items: center; gap: 6px">
                  {toggleButton(a)}
                  <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
                    <span style="font-size: 15px; font-weight: 600; line-height: 1.25">{a.name}</span>
                    <span class="muted" style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px"><span class="dot" style={`width: 7px; height: 7px; background: ${cat.color}`} />{cat.label} · {a.id === 'cmdcast' ? 'power + tax' : a.cost + ' mana'} · {FREQ_NAME[weightFor(profile, a)]}</span>
                  </div>
                  <button type="button" class="icon-btn" style="color: var(--soft)" aria-expanded={isOpen} aria-label={'Edit ' + a.name} onClick={() => setOpen(isOpen ? null : a.id)}><ChevDown size={20} sw={2.2} style={isOpen ? 'transform: rotate(180deg)' : undefined} /></button>
                </div>
                {isOpen && (
                  <div style="padding: 4px 14px 16px 66px; display: flex; flex-direction: column; gap: 10px">
                    <div style="display: flex; align-items: center; justify-content: space-between">
                      <span class="muted" style="font-size: 13px">Mana cost</span>
                      {costControl(a, true)}
                    </div>
                    {freqSeg(a, true)}
                    <button type="button" class="btn" style="align-self: flex-start; padding: 0 12px; border-radius: 10px; color: var(--danger); font-size: 14px" onClick={() => setConfirmDel({ kind: 'action', a })}><Trash size={16} />Delete from every profile</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {dialogs}
      </div>
    );
  }

  return (
    <div class="page">
      <TopBar><MainNav current="profiles" /></TopBar>
      <main class="wrap" style="display: flex; flex-direction: column; gap: 20px">
        <div style="display: flex; flex-direction: column; gap: 6px">
          <h1 class="display" style="font-size: 34px">Opponent profiles</h1>
          <p class="muted" style="font-size: 16px">A profile decides which actions the goldfish can take. Pick one when you start a game.</p>
        </div>
        {errBar}
        <div style="display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; align-items: start">
          <div style="display: flex; flex-direction: column; gap: 20px; position: sticky; top: 20px">
            <nav aria-label="Profiles list" class="panel" style="padding: 16px; display: flex; flex-direction: column; gap: 10px">
              <span class="eyebrow" style="font-size: 12px">Built-in</span>
              <ul style="display: flex; flex-direction: column; gap: 4px">
                {profiles.filter((p) => p.builtIn).map((p) => <ProfileItem key={p.id} p={p} on={p.id === profile.id} count={p.on.filter((id) => ids.has(id)).length} pick={() => setSel(p.id)} />)}
              </ul>
              <span class="eyebrow" style="margin-top: 6px; font-size: 12px">Yours</span>
              {customs.length ? (
                <ul style="display: flex; flex-direction: column; gap: 4px">
                  {customs.map((p) => <ProfileItem key={p.id} p={p} on={p.id === profile.id} count={p.on.filter((id) => ids.has(id)).length} pick={() => setSel(p.id)} />)}
                </ul>
              ) : <p class="muted" style="font-size: 14px; line-height: 1.45">Profiles you make show up here.</p>}
              <button type="button" class="add-dashed" style="margin-top: 4px; height: 48px; border-radius: 12px" onClick={newProfile}><Plus size={18} />New profile</button>
            </nav>

            <aside aria-labelledby="odds-title" class="panel" style="padding: 20px; display: flex; flex-direction: column; gap: 16px">
              <div style="display: flex; flex-direction: column; gap: 4px">
                <h2 id="odds-title" class="display" style="font-size: 20px; letter-spacing: 0">Odds preview</h2>
                <p class="muted" style="font-size: 14px; line-height: 1.45">One goldfish turn with {profile.name}.</p>
              </div>
              {diffSeg}
              {landStep}
              <div style="display: flex; flex-direction: column; gap: 6px">
                <span class="muted" style="font-size: 13px">Its commander is</span>
                {zoneSeg}
              </div>
              <p style="padding: 12px 14px; border-radius: 12px; background: var(--bg); font-size: 14px; line-height: 1.45">It messes with you on <strong style="color: var(--accent-light); font-size: 18px">{Math.round(interact)}%</strong> of turns.</p>
              <ul style="display: flex; flex-direction: column; gap: 10px">
                {odds.map((o) => (
                  <li key={o.cat} style={`display: flex; flex-direction: column; gap: 5px; opacity: ${o.pct ? 1 : 0.45}`}>
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px">
                      <span style="display: inline-flex; align-items: center; gap: 8px"><span class="dot" style={`background: ${o.color}`} />{o.label}</span>
                      <span class="num" style="font-weight: 700">{o.pctLabel}</span>
                    </div>
                    <div class="odds-bar"><div style={`width: ${o.pct.toFixed(1)}%`} /></div>
                  </li>
                ))}
              </ul>
              <div class="muted" style="display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 13px; line-height: 1.45">
                <span>Misses its land drop on {Math.round(P.miss * 100)}% of turns. Assumes a 4/4 commander.</span>
                <span>{far.length ? 'Can’t afford yet: ' + far.join(', ') + '.' : 'It can afford everything this profile has.'}</span>
              </div>
            </aside>
          </div>

          <section aria-label="Profile actions" class="panel" style="overflow: hidden">
            <div style="padding: 20px 20px 18px; border-bottom: 1px solid var(--line); display: flex; align-items: flex-start; justify-content: space-between; gap: 20px">
              <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
                  {nameField}
                  <span class="tag sm" style="height: 26px; padding: 0 10px">{profile.builtIn ? (edited ? 'Built-in · edited' : 'Built-in') : 'Custom'}</span>
                </div>
                <p class="soft" style="font-size: 15px">{profile.desc} <span class="muted">· {onCount} of {actions.length} actions on</span></p>
                <p class="muted" style="font-size: 13px">On/off and How often are saved for this profile only. Mana cost is shared by every profile.</p>
              </div>
              <div style="display: flex; gap: 8px; flex-shrink: 0">{profileButtons}</div>
            </div>

            <form onSubmit={submit} class="add-form">
              <label for="new-name" class="sr-only">New action</label>
              <input id="new-name" type="text" maxLength={60} placeholder="Add an action, e.g. Steals your best creature" class="field dark" style="width: auto; flex: 1 1 200px; min-width: 0; height: 44px; padding: 0 14px; border-radius: 10px; font-size: 15px" value={form.text} onInput={(e) => setForm({ ...form, text: (e.target as HTMLInputElement).value })} />
              {catSelect('width: 150px; height: 44px; padding: 0 10px; font-size: 15px; border-radius: 10px')}
              {formCost(44)}
              {ptInputs}
              <button type="submit" class="btn btn-primary" style="border-radius: 10px; padding: 0 18px" disabled={!form.text.trim()}>Add</button>
            </form>

            <div aria-hidden="true" class="act-row act-head">
              <span>On</span><span>Action</span><span>Type</span><span>Cost</span><span>How often</span><span />
            </div>
            <ul>
              {actions.map((a) => {
                const on = profile.on.includes(a.id);
                const cat = CATS[a.cat] || CATS.idle;
                return (
                  <li key={a.id} class="act-row" style={`opacity: ${on ? 1 : 0.5}`}>
                    {toggleButton(a)}
                    <div style="min-width: 0; display: flex; flex-direction: column; gap: 1px">
                      <span class="ellipsis" style="font-size: 15px; font-weight: 600">{a.name}</span>
                      <span class="muted ellipsis" style="font-size: 13px">{a.you || cat.label + ' action' + (a.cat === 'creature' && a.p != null ? ' · ' + a.p + '/' + a.t : '')}</span>
                    </div>
                    <span class="tag dark sm" style="justify-self: start; height: 26px; padding: 0 10px; font-size: 13px"><span class="dot" style={`background: ${cat.color}`} />{cat.label}</span>
                    <div>{costControl(a, false)}</div>
                    {freqSeg(a, false)}
                    <button type="button" class="icon-btn" style="width: 36px; height: 36px; border-radius: 8px; color: var(--muted)" aria-label={'Delete ' + a.name + ' from every profile'} onClick={() => setConfirmDel({ kind: 'action', a })}><Trash /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
      {dialogs}
    </div>
  );
}

function ProfileItem({ p, on, count, pick }: { p: Profile; on: boolean; count: number; pick: () => void }) {
  return (
    <li>
      <button type="button" aria-pressed={on} onClick={pick} class="profile-item">
        <span class="ellipsis" style="font-size: 15px; font-weight: 700">{p.name}</span>
        <span class="muted" style="flex-shrink: 0; font-size: 13px">{count} actions</span>
      </button>
    </li>
  );
}
