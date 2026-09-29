import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { get, getDatabase, onValue, push, ref, update } from 'firebase/database';
import { clean, type Backend } from './backend';

// Shared with the PF2e sheets app. Fishbowl only reads and writes under fishbowl/users/{uid}.
const config = {
  apiKey: 'AIzaSyDLAijERu7g8ysWRwXtrI2mNu8IlYVF9hY',
  authDomain: 'pf2e-sheets-cc4fc.firebaseapp.com',
  databaseURL: 'https://pf2e-sheets-cc4fc-default-rtdb.firebaseio.com',
  projectId: 'pf2e-sheets-cc4fc',
  storageBucket: 'pf2e-sheets-cc4fc.firebasestorage.app',
  messagingSenderId: '366119399321',
  appId: '1:366119399321:web:3fef2733622361c66cad08',
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getDatabase(app);
const root = (uid: string) => `fishbowl/users/${uid}`;

export const firebaseBackend: Backend = {
  kind: 'firebase',
  onAuth: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null)),
  signIn: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
  signOut: () => signOut(auth),
  watch: (uid, key, cb, onError) => onValue(ref(db, `${root(uid)}/${key}`), (snap) => cb(snap.val()), onError),
  update: (uid, patch) => update(ref(db, root(uid)), clean(patch)),
  get: async (uid, path) => (await get(ref(db, `${root(uid)}/${path}`))).val(),
  // push() without a value only generates a time-ordered key; nothing is written.
  newKey: () => push(ref(db, 'fishbowl/keys')).key as string,
};
