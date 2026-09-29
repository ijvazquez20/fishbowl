import { useEffect, useState } from 'preact/hooks';
import type { AuthUser, Backend } from './data/backend';
import { type Store, StoreCtx, useActiveGame, useUserData } from './data/store';
import { href, useRoute } from './router';
import { Decks } from './screens/Decks';
import { GameDetail } from './screens/GameDetail';
import { GameScreen } from './screens/Game';
import { History } from './screens/History';
import { Profiles } from './screens/Profiles';
import { Setup } from './screens/Setup';
import { Stats } from './screens/Stats';
import { Bowl } from './ui/icons';
import { Brand, Loading } from './ui/kit';

export function App({ backend }: { backend: Backend }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  // Set when the database refused the account that just signed in.
  const [turnedAway, setTurnedAway] = useState(false);
  useEffect(() => backend.onAuth(setUser), [backend]);
  if (user === undefined) return <Loading />;
  if (!user) return <SignIn backend={backend} turnedAway={turnedAway} onTry={() => setTurnedAway(false)} />;
  return <SignedIn key={user.uid} backend={backend} user={user} onDenied={() => setTurnedAway(true)} />;
}

function SignIn({ backend, turnedAway, onTry }: { backend: Backend; turnedAway: boolean; onTry: () => void }) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    onTry();
    setError(false);
    setBusy(true);
    try { await backend.signIn(); } catch { setError(true); }
    setBusy(false);
  };
  return (
    <main style="min-height: 100dvh; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; text-align: center">
      <Brand size={32} />
      <Bowl size={240} />
      <div style="max-width: 440px; display: flex; flex-direction: column; gap: 12px">
        <h1 class="display" style="font-size: clamp(30px, 6vw, 40px); line-height: 1.05; letter-spacing: -0.03em">A goldfish that fights back. A little.</h1>
        <p class="muted" style="font-size: 16px; line-height: 1.5">Play your real deck on the table. Fishbowl runs the opponent and keeps your kill-turn stats.</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" onClick={signIn} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <p role="alert" style="color: var(--danger); font-size: 14px">Sign-in didn’t go through. Try again.</p>}
      {turnedAway && !error && (
        <p role="alert" class="notice warn" style="max-width: 440px">Fishbowl is private. That account doesn’t have access, so it was signed out.</p>
      )}
      {backend.kind === 'local' && <p class="muted" style="font-size: 13px">Local test mode: data stays in this browser.</p>}
    </main>
  );
}

function SignedIn({ backend, user, onDenied }: { backend: Backend; user: AuthUser; onDenied: () => void }) {
  const data = useUserData(backend, user.uid);
  const [game, setGame] = useActiveGame(user.uid);
  // The database rules only let the owner in; anyone else is signed straight back out.
  const denied = !!data.error && /permission/i.test(data.error);
  useEffect(() => {
    if (denied) { onDenied(); backend.signOut(); }
  }, [denied]);
  if (denied) return <Loading />;
  if (data.error) return <DataError backend={backend} message={data.error} />;
  if (!data.loaded) return <Loading text="Loading your decks" />;
  const store: Store = {
    backend,
    user,
    decks: data.decks,
    games: data.games,
    storedActions: data.storedActions,
    storedProfiles: data.storedProfiles,
    actions: data.actions,
    profiles: data.profiles,
    game,
    setGame,
    update: (patch) => backend.update(user.uid, patch),
  };
  return (
    <StoreCtx.Provider value={store}>
      <Routes />
    </StoreCtx.Provider>
  );
}

function DataError({ backend, message }: { backend: Backend; message: string }) {
  return (
    <main style="min-height: 100dvh; padding: 32px 20px; display: flex; align-items: center; justify-content: center">
      <div class="panel" style="max-width: 520px; padding: 28px; display: flex; flex-direction: column; gap: 14px">
        <Brand />
        <h1 class="display" style="font-size: 26px">Couldn’t load your data</h1>
        <p class="soft" style="font-size: 15px; line-height: 1.5">Check your connection and reload the page.</p>
        <p class="muted" style="font-size: 13px; font-family: ui-monospace, monospace; word-break: break-word">{message}</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap">
          <button type="button" class="btn btn-primary" onClick={() => location.reload()}>Reload</button>
          <button type="button" class="btn btn-outline" onClick={() => backend.signOut()}>Sign out</button>
        </div>
      </div>
    </main>
  );
}

function Routes() {
  const { parts, query } = useRoute();
  const [a, b, c] = parts;
  if (!a) return <Setup query={query} />;
  if (a === 'game') return <GameScreen />;
  if (a === 'decks' && !b) return <Decks query={query} />;
  if (a === 'decks' && c === 'games') return <History deckId={b} />;
  if (a === 'decks') return <Stats deckId={b} just={query.get('just')} />;
  if (a === 'games' && b) return <GameDetail gameId={b} />;
  if (a === 'profiles') return <Profiles />;
  return (
    <main style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px">
      <h1 class="display" style="font-size: 28px">Nothing here</h1>
      <a class="btn btn-primary" href={href('/')}>New game</a>
    </main>
  );
}
