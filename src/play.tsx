import { useState } from 'preact/hooks';
import { createGame, type GameState, type Setup } from './engine/game';
import type { GameSummary } from './engine/record';
import { useStore } from './data/store';
import { go } from './router';
import { Confirm } from './ui/kit';

export function hasProgress(g: GameState): boolean {
  return !!g.over || g.round > 1 || !!g.last || g.rounds[0].dealt.some((d) => d > 0) || g.you !== g.setup.startingLife;
}

/** The setup a saved game was played with, for "Replay this setup" and "Play again". */
export function setupFromSummary(g: GameSummary): Setup {
  const st = g.setup;
  const opponents = Array.from({ length: st.count }, (_, i) => {
    const o = st.opponents['s' + i];
    return { name: o?.name || '', profileId: o?.profileId || 'balanced', cmdrPower: o?.cmdrPower || 4 };
  });
  return {
    deckId: g.deckId,
    count: st.count,
    mode: st.mode,
    difficulty: st.difficulty,
    targeting: st.targeting,
    startingLife: st.startingLife,
    yourPower: st.yourPower,
    missLands: st.missLands,
    first: st.first,
    opponents,
  };
}

/** Starts a game, asking first if it would throw away one in progress. */
export function useStartGame() {
  const s = useStore();
  const [pending, setPending] = useState<Setup | null>(null);
  const begin = (setup: Setup) => {
    const g = createGame(setup, { actions: s.actions, profiles: s.profiles, rng: Math.random }, { id: s.backend.newKey() });
    s.setGame(g);
    go('/game');
  };
  const start = (setup: Setup) => {
    if (s.game && hasProgress(s.game)) setPending(setup);
    else begin(setup);
  };
  const finished = !!s.game?.over;
  const confirm = pending ? (
    <Confirm
      title="Start a new game?"
      text={finished ? 'The game you just finished hasn’t been saved. Starting a new one discards it.' : 'Your game in progress won’t be saved.'}
      confirm="Start new game"
      onConfirm={() => { const p = pending; setPending(null); begin(p); }}
      onCancel={() => setPending(null)}
    />
  ) : null;
  return { start, confirm };
}

export function deckName(s: ReturnType<typeof useStore>, id: string): string {
  return s.decks.find((d) => d.id === id)?.d.name || 'Deleted deck';
}
