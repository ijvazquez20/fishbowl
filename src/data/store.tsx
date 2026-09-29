import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import {
  type Action, type Profile, type StoredAction, type StoredProfile,
  effectiveActions, effectiveProfiles,
} from '../engine/catalog';
import type { GameState } from '../engine/game';
import type { GameSummary } from '../engine/record';
import { type GameEntry, newestFirst } from '../engine/stats';
import { type AuthUser, type Backend, type StoredDeck, type UserKey, USER_KEYS } from './backend';

export interface DeckEntry { id: string; d: StoredDeck }

export interface Store {
  backend: Backend;
  user: AuthUser;
  decks: DeckEntry[];
  games: GameEntry[];
  storedActions: Record<string, StoredAction>;
  storedProfiles: Record<string, StoredProfile>;
  actions: Action[];
  profiles: Profile[];
  game: GameState | null;
  setGame: (g: GameState | null) => void;
  update: (patch: Record<string, unknown>) => Promise<void>;
}

export const StoreCtx = createContext<Store | null>(null);
export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore outside the signed-in app');
  return s;
}

export function useUserData(backend: Backend, uid: string) {
  const [raw, setRaw] = useState<Partial<Record<UserKey, unknown>>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setRaw({});
    setError(null);
    const offs = USER_KEYS.map((k) => backend.watch(
      uid, k,
      (v) => setRaw((r) => ({ ...r, [k]: v ?? {} })),
      (e) => setError(e.message || String(e)),
    ));
    return () => offs.forEach((off) => off());
  }, [backend, uid]);

  const loaded = USER_KEYS.every((k) => k in raw);
  const data = useMemo(() => {
    const decks = Object.entries((raw.decks || {}) as Record<string, StoredDeck>)
      .filter(([, d]) => d && d.name)
      .map(([id, d]) => ({ id, d }));
    const games = newestFirst(Object.entries((raw.games || {}) as Record<string, GameSummary>)
      .filter(([, g]) => g && g.result)
      .map(([id, g]) => ({ id, g })));
    const storedActions = (raw.actions || {}) as Record<string, StoredAction>;
    const storedProfiles = (raw.profiles || {}) as Record<string, StoredProfile>;
    return {
      decks, games, storedActions, storedProfiles,
      actions: effectiveActions(storedActions),
      profiles: effectiveProfiles(storedProfiles),
    };
  }, [raw]);
  return { loaded, error, ...data };
}

const gameKey = (uid: string) => `fishbowl.game.${uid}`;
export function useActiveGame(uid: string): [GameState | null, (g: GameState | null) => void] {
  const [game, setGameState] = useState<GameState | null>(() => {
    try {
      const g = JSON.parse(localStorage.getItem(gameKey(uid)) || 'null');
      return g && g.v === 1 ? g : null;
    } catch { return null; }
  });
  const setGame = (g: GameState | null) => {
    setGameState(g);
    try {
      if (g) localStorage.setItem(gameKey(uid), JSON.stringify(g));
      else localStorage.removeItem(gameKey(uid));
    } catch { /* storage full or blocked: the game still runs in memory */ }
  };
  return [game, setGame];
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch { return fallback; }
}
export function writeLocal(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

export function gamesForDeck(s: Store, deckId: string): GameEntry[] {
  return s.games.filter((e) => e.g.deckId === deckId);
}
