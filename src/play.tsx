import { createGame, type Setup } from './engine/game';
import type { GameSummary } from './engine/record';
import { useStore } from './data/store';
import { go } from './router';

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

/** Starts a game. Only one game at a time: with one in progress this just goes back to it. */
export function useStartGame() {
  const s = useStore();
  return (setup: Setup) => {
    if (!s.game) {
      s.setGame(createGame(setup, { actions: s.actions, profiles: s.profiles, rng: Math.random }, { id: s.backend.newKey() }));
    }
    go('/game');
  };
}

export function deckName(s: ReturnType<typeof useStore>, id: string): string {
  return s.decks.find((d) => d.id === id)?.d.name || 'Deleted deck';
}
