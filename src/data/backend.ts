import type { StoredAction, StoredProfile } from '../engine/catalog';
import type { GameSummary } from '../engine/record';

export interface AuthUser { uid: string; email: string | null; name: string | null }

export interface StoredDeck { name: string; commander: string; colors: string; createdAt: number }

/** The four branches the app keeps live. Rounds are fetched on demand by Game detail. */
export interface UserData {
  decks: Record<string, StoredDeck>;
  games: Record<string, GameSummary>;
  actions: Record<string, StoredAction>;
  profiles: Record<string, StoredProfile>;
}
export type UserKey = keyof UserData;
export const USER_KEYS: UserKey[] = ['decks', 'games', 'actions', 'profiles'];

export interface Backend {
  kind: 'firebase' | 'local';
  onAuth(cb: (u: AuthUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Live value of one branch under the user's root. */
  watch(uid: string, key: UserKey, cb: (v: unknown) => void, onError: (e: Error) => void): () => void;
  /** Multi-path update relative to the user's root; a null value deletes. */
  update(uid: string, patch: Record<string, unknown>): Promise<void>;
  get(uid: string, path: string): Promise<unknown>;
  newKey(): string;
}

/** Realtime Database rejects undefined anywhere in a write, so strip it. Nulls stay (they delete). */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(v as Record<string, unknown>).forEach(([k, x]) => { if (x !== undefined) out[k] = clean(x); });
    return out as T;
  }
  return v;
}
