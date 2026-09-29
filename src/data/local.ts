// Dev-only stand-in for Firebase (`npm run dev:local`): a fake signed-in user and a database kept
// in localStorage, so the app can be exercised without touching real data.
import { clean, type Backend, type UserKey } from './backend';

const DB_KEY = 'fishbowl.localdb';
const AUTH_KEY = 'fishbowl.localauth';
const USER = { uid: 'local', email: 'local@test', name: 'Local test' };

type Tree = Record<string, unknown>;
const authListeners = new Set<(u: typeof USER | null) => void>();
const watchers = new Set<{ uid: string; key: UserKey; cb: (v: unknown) => void }>();

function load(): Tree {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); } catch { return {}; }
}
function save(t: Tree) { localStorage.setItem(DB_KEY, JSON.stringify(t)); }
function at(t: Tree, path: string[]): unknown {
  let cur: unknown = t;
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Tree)[p];
  }
  return cur ?? null;
}
function setAt(t: Tree, path: string[], v: unknown) {
  let cur = t;
  for (let i = 0; i < path.length - 1; i++) {
    const next = cur[path[i]];
    if (!next || typeof next !== 'object') cur[path[i]] = {};
    cur = cur[path[i]] as Tree;
  }
  if (v === null) delete cur[path[path.length - 1]];
  else cur[path[path.length - 1]] = JSON.parse(JSON.stringify(v));
}
const userPath = (uid: string) => ['fishbowl', 'users', uid];
let counter = 0;

export const localBackend: Backend = {
  kind: 'local',
  onAuth: (cb) => {
    authListeners.add(cb);
    cb(localStorage.getItem(AUTH_KEY) ? USER : null);
    return () => authListeners.delete(cb);
  },
  signIn: async () => {
    localStorage.setItem(AUTH_KEY, '1');
    authListeners.forEach((cb) => cb(USER));
  },
  signOut: async () => {
    localStorage.removeItem(AUTH_KEY);
    authListeners.forEach((cb) => cb(null));
  },
  watch: (uid, key, cb, onError) => {
    // localStorage 'fishbowl.localdeny' = '1' acts like database rules that refuse this account.
    if (localStorage.getItem('fishbowl.localdeny')) {
      setTimeout(() => onError(new Error('PERMISSION_DENIED: Permission denied')), 0);
      return () => {};
    }
    const w = { uid, key, cb };
    watchers.add(w);
    setTimeout(() => cb(at(load(), [...userPath(uid), key])), 0);
    return () => watchers.delete(w);
  },
  update: async (uid, patch) => {
    const t = load();
    Object.entries(clean(patch)).forEach(([k, v]) => setAt(t, [...userPath(uid), ...k.split('/')], v));
    save(t);
    watchers.forEach((w) => { if (w.uid === uid) w.cb(at(t, [...userPath(uid), w.key])); });
  },
  get: async (uid, path) => at(load(), [...userPath(uid), ...path.split('/')]),
  newKey: () => Date.now().toString(36).padStart(9, '0') + (counter++).toString(36) + Math.random().toString(36).slice(2, 6),
};
