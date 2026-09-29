import { useState } from 'preact/hooks';
import { COLOR_ORDER, FFA_COLOR, ONE_COLOR, PIPS } from '../engine/catalog';
import { deckAggregate, fmtAvg, fmtTurn, lastPlayedLabel } from '../engine/stats';
import { type DeckDraft, deleteDeck, saveDeck } from '../data/mutations';
import { gamesForDeck, useStore } from '../data/store';
import { go, href, useDesktop } from '../router';
import { Back, Chev, Dots, Plus } from '../ui/icons';
import { colorNames, Confirm, Modal, Pips, TopBar } from '../ui/kit';

type Sort = 'last' | 'name' | 'kill';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'last', label: 'Last played' },
  { id: 'name', label: 'Name' },
  { id: 'kill', label: 'Fastest kill turn' },
];

export function Decks({ query }: { query: URLSearchParams }) {
  const s = useStore();
  const desktop = useDesktop();
  const fromSetup = query.get('add') === '1';
  const [sort, setSort] = useState<Sort>('last');
  const [menu, setMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'add' | 'edit' | 'delete' | null>(fromSetup ? 'add' : null);
  const [target, setTarget] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeckDraft>({ name: '', commander: '', colors: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const cards = s.decks.map((d) => ({ ...d, agg: deckAggregate(gamesForDeck(s, d.id)) }));
  cards.sort((a, b) => {
    if (sort === 'name') return a.d.name.localeCompare(b.d.name);
    if (sort === 'kill') {
      if (a.agg.avg === null) return b.agg.avg === null ? a.d.name.localeCompare(b.d.name) : 1;
      if (b.agg.avg === null) return -1;
      return a.agg.avg - b.agg.avg;
    }
    return (b.agg.last ?? -1) - (a.agg.last ?? -1) || a.d.name.localeCompare(b.d.name);
  });
  const t = target ? cards.find((c) => c.id === target) : null;
  const close = () => { setDialog(null); setTarget(null); setMenu(null); setErr(''); };
  const openAdd = () => { setDraft({ name: '', commander: '', colors: '' }); setTarget(null); setMenu(null); setDialog('add'); };
  const canSave = draft.name.trim().length > 0;
  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setErr('');
    try {
      const id = await saveDeck(s, dialog === 'edit' ? target : null, draft);
      const wasAdd = dialog === 'add';
      close();
      if (wasAdd && fromSetup) go('/?deck=' + id);
    } catch (e) {
      setErr('Couldn’t save: ' + (e as Error).message);
    }
    setBusy(false);
  };
  const remove = async () => {
    if (!target) return;
    setBusy(true);
    try { await deleteDeck(s, target); close(); } catch (e) { setErr('Couldn’t delete: ' + (e as Error).message); }
    setBusy(false);
  };
  const count = s.decks.length + (s.decks.length === 1 ? ' deck' : ' decks');

  const card = (c: (typeof cards)[number]) => {
    const games = c.agg.games;
    const onePct = games ? Math.round((c.agg.one / games) * 100) : 0;
    const open = menu === c.id;
    return (
      <li key={c.id} style="position: relative">
        <a href={href('/decks/' + c.id)} class="deck deck-card" aria-label={'Open stats for ' + c.d.name}>
          <div style={`display: flex; flex-direction: column; gap: ${desktop ? 14 : 6}px; padding-right: 44px; min-width: 0`}>
            <div title={'Colors: ' + colorNames(c.d.colors)} style="display: flex; gap: 6px; min-height: 22px"><Pips colors={c.d.colors} size={desktop ? 22 : 20} /></div>
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
              <span class="display ellipsis" style={`font-size: ${desktop ? 24 : 21}px; line-height: 1.15; letter-spacing: -0.01em`}>{c.d.name}</span>
              <span class="muted ellipsis" style={`font-size: ${desktop ? 14 : 13}px`}>{c.d.commander || 'No commander set'}</span>
            </div>
          </div>
          {games ? (
            <div style="display: flex; flex-direction: column; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line)">
              <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
                {[['Games played', String(games)], ['Avg kill turn', fmtAvg(c.agg.avg)], ['Fastest kill', fmtTurn(c.agg.best)]].map(([l, v]) => (
                  <div key={l} style="display: flex; flex-direction: column; gap: 2px">
                    <span class="muted" style="font-size: 12px">{l}</span>
                    <span class="display" style={`font-size: ${desktop ? 26 : 22}px; line-height: 1.1; letter-spacing: 0`}>{v}</span>
                  </div>
                ))}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px">
                <div aria-hidden="true" style="height: 6px; display: flex; gap: 2px">
                  {c.agg.one > 0 && <span style={`width: ${onePct}%; border-radius: 3px; background: ${ONE_COLOR}`} />}
                  {c.agg.ffa > 0 && <span style={`flex-grow: 1; border-radius: 3px; background: ${FFA_COLOR}`} />}
                </div>
                <div class="muted" style="display: flex; gap: 14px; font-size: 12px">
                  <span style="display: inline-flex; align-items: center; gap: 6px"><span class="dot" style={`background: ${ONE_COLOR}`} />{c.agg.one} One vs One</span>
                  <span style="display: inline-flex; align-items: center; gap: 6px"><span class="dot" style={`background: ${FFA_COLOR}`} />{c.agg.ffa} Free for All</span>
                </div>
              </div>
            </div>
          ) : (
            <div class="muted" style="flex-grow: 1; padding-top: 14px; border-top: 1px solid var(--line); font-size: 14px; line-height: 1.45">No games yet. Play a game with this deck and its kill turn shows up here.</div>
          )}
          <div class="muted" style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px">
            <span>{c.agg.last !== null && 'Last played '}<span style="color: var(--text); font-weight: 600">{lastPlayedLabel(c.agg.last)}</span></span>
            <span class="go" style="font-weight: 700; color: var(--accent-light); display: inline-flex; align-items: center; gap: 4px">View stats<Chev size={14} sw={2.6} /></span>
          </div>
        </a>
        <button type="button" class="icon-btn" style={`position: absolute; top: ${desktop ? 12 : 8}px; right: ${desktop ? 12 : 8}px; color: var(--soft); z-index: 3`} aria-label={'More options for ' + c.d.name} aria-expanded={open} onClick={() => setMenu(open ? null : c.id)}><Dots /></button>
        {open && (
          <div role="menu" class="menu" style={`top: ${desktop ? 56 : 54}px; right: ${desktop ? 12 : 8}px`}>
            <button type="button" role="menuitem" onClick={() => { setTarget(c.id); setDraft({ name: c.d.name, commander: c.d.commander, colors: c.d.colors }); setMenu(null); setDialog('edit'); }}>Rename or edit</button>
            <button type="button" role="menuitem" style="color: var(--danger)" onClick={() => { setTarget(c.id); setMenu(null); setDialog('delete'); }}>Delete deck</button>
          </div>
        )}
      </li>
    );
  };

  const sortChips = (
    <div role="group" aria-labelledby="dk-sort" class={desktop ? '' : 'swipe'} style={desktop ? 'display: flex; gap: 6px' : 'display: flex; gap: 6px; margin: 0 -16px; padding: 0 16px'}>
      {SORTS.map((o) => <button key={o.id} type="button" class="chip" style={desktop ? '' : 'height: 40px; border-radius: 20px'} aria-pressed={o.id === sort} onClick={() => { setSort(o.id); setMenu(null); }}>{o.label}</button>)}
    </div>
  );
  const list = cards.length ? (
    <ul class="deck-grid" style={desktop ? '' : 'grid-template-columns: 1fr; grid-auto-rows: auto; gap: 12px'}>{cards.map(card)}</ul>
  ) : (
    <div style={`flex-grow: 1; padding: ${desktop ? 60 : 40}px 20px; border-radius: 20px; border: 1.5px dashed var(--line-3); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center`}>
      <span class="display" style={`font-size: ${desktop ? 26 : 22}px`}>No decks yet</span>
      <span class="muted" style={`font-size: ${desktop ? 16 : 14}px; line-height: 1.45`}>Add the decks you goldfish. Each one keeps its own kill-turn stats.</span>
      <button type="button" class="btn btn-primary btn-md" style="margin-top: 8px" onClick={openAdd}>Add your first deck</button>
    </div>
  );
  const dialogs = (
    <>
      {(dialog === 'add' || dialog === 'edit') && (
        <Modal labelledby="dk-edit-title" onClose={close}>
          <h2 id="dk-edit-title">{dialog === 'add' ? 'Add a deck' : 'Edit deck'}</h2>
          <form style="display: flex; flex-direction: column; gap: 20px" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label class="eyebrow" style="display: flex; flex-direction: column; gap: 8px">Deck name
              <input type="text" class="field dark" style="text-transform: none; letter-spacing: 0" maxLength={60} value={draft.name} placeholder="Dragons v4" onInput={(e) => setDraft({ ...draft, name: (e.target as HTMLInputElement).value })} />
            </label>
            <label class="eyebrow" style="display: flex; flex-direction: column; gap: 8px">Commander
              <input type="text" class="field dark" style="text-transform: none; letter-spacing: 0" maxLength={80} value={draft.commander} placeholder="The Ur-Dragon" onInput={(e) => setDraft({ ...draft, commander: (e.target as HTMLInputElement).value })} />
            </label>
            <div role="group" aria-labelledby="dk-colors" style="display: flex; flex-direction: column; gap: 8px">
              <span id="dk-colors" class="eyebrow">Colors</span>
              <div style="display: flex; gap: 10px; flex-wrap: wrap">
                {COLOR_ORDER.split('').map((c) => {
                  const on = draft.colors.includes(c);
                  return (
                    <button key={c} type="button" aria-pressed={on} aria-label={PIPS[c].label} class="color-toggle"
                      style={`border-color: ${on ? PIPS[c].bg : '#2C4B58'}; background: ${on ? PIPS[c].bg : 'transparent'}; color: ${on ? '#1A1A1A' : '#9FB6B3'}`}
                      onClick={() => setDraft({ ...draft, colors: on ? draft.colors.replace(c, '') : COLOR_ORDER.split('').filter((x) => x === c || draft.colors.includes(x)).join('') })}>{c}</button>
                  );
                })}
              </div>
            </div>
            {err && <p role="alert" style="color: var(--danger); font-size: 14px">{err}</p>}
            <div class="dialog-actions">
              <button type="button" class="btn btn-outline btn-md" onClick={close}>Cancel</button>
              <button type="submit" class="btn btn-primary btn-md" disabled={!canSave || busy}>{dialog === 'add' ? 'Add deck' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === 'delete' && t && (
        <Confirm danger title={'Delete ' + t.d.name + '?'}
          text={t.agg.games ? `This also deletes its ${t.agg.games} saved ${t.agg.games === 1 ? 'game' : 'games'} and their stats. You can’t undo this.` : 'It has no saved games yet. You can’t undo this.'}
          confirm="Delete deck" cancel="Keep deck" busy={busy} onConfirm={remove} onCancel={close} />
      )}
    </>
  );
  const scrim = menu && <div aria-hidden="true" style="position: fixed; inset: 0; z-index: 2" onClick={() => setMenu(null)} />;

  if (!desktop) {
    return (
      <div class="m-page">
        <header class="m-header">
          <div style="display: flex; align-items: center; gap: 4px">
            <a href={href('/')} class="icon-btn" style="margin-left: -10px" aria-label="Back to new game"><Back size={22} /></a>
            <h1 class="display" style="font-size: 24px">Decks</h1>
          </div>
          <button type="button" class="btn btn-primary" onClick={openAdd}><Plus size={16} sw={2.6} />Add deck</button>
        </header>
        <p class="muted" style="margin-top: -6px; font-size: 14px; line-height: 1.45">Tap a deck to see its stats. One vs One and Free for All games count together.</p>
        {cards.length > 0 && (
          <div style="display: flex; flex-direction: column; gap: 8px">
            <span id="dk-sort" class="muted" style="font-size: 13px">{count} · sort by</span>
            {sortChips}
          </div>
        )}
        {scrim}
        {list}
        {dialogs}
      </div>
    );
  }
  return (
    <div class="page">
      <TopBar>
        <a href={href('/profiles')} class="btn btn-ghost">Profiles</a>
        <a href={href('/')} class="btn btn-ghost btn-outline">New game</a>
      </TopBar>
      <main class="wrap" style="flex-grow: 1; padding-top: 32px; display: flex; flex-direction: column; gap: 24px">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 24px">
          <div style="display: flex; flex-direction: column; gap: 6px">
            <h1 class="display" style="font-size: 40px; line-height: 1.05">Decks</h1>
            <p class="muted" style="font-size: 16px">Pick a deck to see its stats. One vs One and Free for All games count together.</p>
          </div>
          <button type="button" class="btn btn-primary btn-md" onClick={openAdd}><Plus size={18} sw={2.6} />Add deck</button>
        </div>
        {cards.length > 0 && (
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px">
            <span class="soft" style="font-size: 15px; font-weight: 600">{count}</span>
            <div style="display: flex; align-items: center; gap: 10px">
              <span id="dk-sort" class="muted" style="font-size: 14px">Sort by</span>
              {sortChips}
            </div>
          </div>
        )}
        {scrim}
        {list}
      </main>
      {dialogs}
    </div>
  );
}
