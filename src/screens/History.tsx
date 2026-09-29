import { useState } from 'preact/hooks';
import { modeKey } from '../engine/stats';
import { gamesForDeck, useStore } from '../data/store';
import { href, useDesktop } from '../router';
import { Back } from '../ui/icons';
import { TopBar } from '../ui/kit';
import { MissingDeck } from './Stats';
import { type Filter, FilterChips, GameRow } from './statsParts';

export function History({ deckId }: { deckId: string }) {
  const s = useStore();
  const desktop = useDesktop();
  const [filter, setFilter] = useState<Filter>('all');
  const deck = s.decks.find((d) => d.id === deckId);
  if (!deck) return <MissingDeck />;
  const all = gamesForDeck(s, deckId);
  const games = all.filter((e) => filter === 'all' || modeKey(e.g) === filter);
  const won = games.filter((e) => e.g.result.win).length;
  const count = `${games.length} ${games.length === 1 ? 'game' : 'games'} · ${won} won · ${games.length - won} lost`;
  const empty = <p class="muted" style="font-size: 15px; padding: 16px 0">{all.length ? 'No games in this mode yet.' : 'No games with this deck yet.'}</p>;

  if (!desktop) {
    return (
      <div class="m-page">
        <header class="m-header">
          <div style="display: flex; align-items: center; gap: 4px; min-width: 0">
            <a href={href('/decks/' + deckId)} class="icon-btn" style="margin-left: -10px" aria-label="Back to stats"><Back size={22} /></a>
            <span class="m-title">All games</span>
          </div>
          <span class="muted" style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{deck.d.name}</span>
        </header>
        <FilterChips mobile value={filter} onPick={setFilter} />
        <span class="muted" style="font-size: 13px">{count}</span>
        <section class="panel" style="padding: 6px 16px 4px; border-radius: 18px">
          {games.length ? <ul>{games.map((e) => <GameRow key={e.id} e={e} mobile />)}</ul> : empty}
        </section>
      </div>
    );
  }
  return (
    <div class="page">
      <TopBar sub={deck.d.name}>
        <a href={href('/decks')} class="btn btn-ghost">Decks</a>
        <a href={href('/profiles')} class="btn btn-ghost">Profiles</a>
        <a href={href('/?deck=' + deck.id)} class="btn btn-ghost btn-outline">New game</a>
      </TopBar>
      <main class="wrap" style="max-width: 960px; display: flex; flex-direction: column; gap: 18px">
        <a href={href('/decks/' + deckId)} class="back-link"><Back />Back to stats</a>
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap">
          <div style="display: flex; flex-direction: column; gap: 4px">
            <h1 class="display" style="font-size: 34px">All games</h1>
            <span class="muted" style="font-size: 15px">{count}</span>
          </div>
          <FilterChips value={filter} onPick={setFilter} />
        </div>
        <section class="panel" style="padding: 8px 20px">
          {games.length ? <ul>{games.map((e) => <GameRow key={e.id} e={e} />)}</ul> : empty}
        </section>
      </main>
    </div>
  );
}
