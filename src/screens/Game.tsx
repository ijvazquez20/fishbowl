import { useEffect, useState } from 'preact/hooks';
import { CATS, DIFF_LABEL, SEATS } from '../engine/catalog';
import {
  advance, canReroll, createGame, edit, endYourTurn, peekNext, phaseOf, poss, reroll, undo,
  type Ctx, type Edit, type GameState,
} from '../engine/game';
import { saveGame } from '../data/mutations';
import { useStore } from '../data/store';
import { deckName, hasProgress } from '../play';
import { go } from '../router';
import { Reroll, Undo } from '../ui/icons';
import { Confirm, Modal } from '../ui/kit';
import { GameOne } from './GameOne';
import { GameTable } from './GameTable';
import './game.css';

export function GameScreen() {
  const s = useStore();
  useEffect(() => { if (!s.game) go('/'); }, [s.game]);
  if (!s.game) return null;
  return s.game.fish.length > 1 ? <GameTable /> : <GameOne />;
}

/** Everything a game screen needs: the state, its moves, and the shared dialogs. */
export function useGame() {
  const s = useStore();
  const g = s.game as GameState;
  const ctx: Ctx = { actions: s.actions, profiles: s.profiles, rng: Math.random };
  // The state before the last manual change, so a mis-tap that ends the game can be taken back.
  const [beforeEdit, setBeforeEdit] = useState<GameState | null>(null);
  const [askRestart, setAskRestart] = useState(false);
  const set = (n: GameState) => { setBeforeEdit(null); s.setGame(n); };
  const restart = () => {
    const n = createGame(g.setup, ctx, { id: s.backend.newKey() });
    n.power = g.power;
    set(n);
  };
  const dialogs = (
    <>
      {g.over && <OverDialog g={g} onAgain={restart} onUndo={beforeEdit ? () => set(beforeEdit) : undefined} />}
      {askRestart && (
        <Confirm title="Start over?" text="This game won’t be saved. You’ll start again with the same setup." confirm="Start over"
          onConfirm={() => { setAskRestart(false); restart(); }} onCancel={() => setAskRestart(false)} />
      )}
    </>
  );
  return {
    s, g, ctx,
    deck: deckName(s, g.deckId),
    phase: phaseOf(g),
    next: peekNext(g),
    canReroll: canReroll(g),
    canUndo: g.hist.length > 0,
    edit: (e: Edit) => { const n = edit(g, e); if (n !== g) { s.setGame(n); setBeforeEdit(g); } },
    endTurn: () => set(endYourTurn(g, ctx)),
    advance: () => set(advance(g, ctx)),
    reroll: () => set(reroll(g, ctx)),
    undo: () => set(undo(g)),
    newGame: () => (hasProgress(g) ? setAskRestart(true) : restart()),
    dialogs,
  };
}

export function modeLabel(g: GameState, long: boolean): string {
  if (g.setup.mode === 'passive') return long ? 'Passive goldfish' : 'Passive';
  return (long ? 'Active · ' : '') + DIFF_LABEL[g.setup.difficulty];
}

export function lastCat(g: GameState) {
  return g.last ? CATS[g.last.act.cat] || CATS.idle : CATS.idle;
}

export function RerollUndo({ game, compact, border }: { game: ReturnType<typeof useGame>; compact?: boolean; border: string }) {
  if (compact) {
    return (
      <div style="display: flex; gap: 4px; flex-shrink: 0">
        <button type="button" class="icon-btn" style={`width: 44px; border-radius: 10px; border: 1px solid ${border}`} aria-label="Pick another action" disabled={!game.canReroll} onClick={game.reroll}><Reroll /></button>
        <button type="button" class="icon-btn" style="width: 44px; border-radius: 10px; border: 1px solid #4A3526" aria-label="Undo goldfish turn" disabled={!game.canUndo} onClick={game.undo}><Undo /></button>
      </div>
    );
  }
  return (
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
      <button type="button" class="btn btn-ghost" style={`border: 1px solid ${border}; border-radius: 10px; font-size: 14px; color: #FFD2B3`} disabled={!game.canReroll} onClick={game.reroll}><Reroll size={16} />Pick another action</button>
      <button type="button" class="btn btn-ghost" style="border: 1px solid #4A3526; border-radius: 10px; font-size: 14px; color: #FFD2B3" disabled={!game.canUndo} onClick={game.undo}><Undo size={16} />{game.g.fish.length > 1 ? 'Undo' : 'Undo turn'}</button>
    </div>
  );
}

function OverDialog({ g, onAgain, onUndo }: { g: GameState; onAgain: () => void; onUndo?: () => void }) {
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const over = g.over!;
  const table = g.fish.length > 1;
  const sheet = typeof window !== 'undefined' && window.innerWidth < 1024;
  let title: string;
  let text = '';
  if (table) {
    title = over.win ? 'You cleared the table' : over.how === 'their-commander' && over.by !== undefined ? poss(g.fish[over.by].name) + ' commander finished you' : 'The goldfish got you';
  } else {
    title = over.win ? 'You killed the goldfish' : 'The goldfish got you';
    text = over.win
      ? (over.how === 'commander' ? 'Won with 21 commander damage on turn ' + over.turn + '.' : 'Won on damage on turn ' + over.turn + '.')
      : (over.how === 'their-commander' ? 'Its commander dealt you 21 damage by turn ' + over.turn + '.' : 'Your life hit 0 by its turn ' + over.turn + '.');
  }
  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const id = await saveGame(s, g);
      s.setGame(null);
      go(`/decks/${g.deckId}?just=${id}`);
    } catch (e) {
      setErr('Couldn’t save: ' + ((e as Error).message || 'unknown error'));
      setBusy(false);
    }
  };
  return (
    <Modal labelledby="over-title" sheet={sheet} cardClass="over-card">
      <span class="eyebrow" style="color: var(--accent-light); font-weight: 700; letter-spacing: 0.1em; font-size: 13px">Game over</span>
      <h2 id="over-title" class="display" style={`font-size: ${sheet ? 24 : 30}px`}>{title}</h2>
      <span class="display" style={`font-size: ${sheet ? 92 : 116}px; line-height: 1; letter-spacing: -0.04em; color: var(--accent)`}>T{over.turn}</span>
      {table ? (
        <ul style="margin-top: 4px; width: 100%; display: flex; flex-direction: column; gap: 6px">
          {g.fish.map((f, i) => (
            <li key={i} style="min-height: 40px; padding: 0 14px; border-radius: 10px; background: var(--bg); display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 15px">
              <span style={`font-weight: 700; color: ${SEATS[i].light}`}>{f.name}</span>
              <span class="soft">{f.out ? 'Out on turn ' + f.out.round + (f.out.by === 'you' ? ' · by you' : ' · by ' + g.fish[f.out.by as number].name) : 'Still swimming'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p class="soft" style="font-size: 16px; line-height: 1.5">{text}</p>
      )}
      {err && <p role="alert" style="color: var(--danger); font-size: 14px">{err}</p>}
      <div style={'margin-top: 10px; display: flex; gap: 12px; ' + (sheet ? 'flex-direction: column; width: 100%' : 'flex-wrap: wrap; justify-content: center')}>
        <button type="button" class="btn btn-primary btn-md" disabled={busy} onClick={save} data-autofocus>{busy ? 'Saving…' : 'Save and see stats'}</button>
        <button type="button" class="btn btn-outline btn-md" disabled={busy} onClick={onAgain}>Play again</button>
      </div>
      {onUndo && <button type="button" class="link-btn" style="margin-top: 4px" onClick={onUndo}>Undo that last change</button>}
    </Modal>
  );
}
