import { useState } from 'preact/hooks';
import {
  type GameEntry, avgOf, bestOf, fmtAvg, fmtTurn, lastPlayedLabel, modeKey, ofType, wins,
} from '../engine/stats';
import { gamesForDeck, useStore } from '../data/store';
import { setupFromSummary, useStartGame } from '../play';
import { href, useDesktop } from '../router';
import { Back, Play } from '../ui/icons';
import { Brand, MainNav, MobileNav, Pips, TopBar } from '../ui/kit';
import { type Filter, FilterChips, GameRow, KillBars, Legend, gameMeta, gameTitle } from './statsParts';
import './stats.css';

export function Stats({ deckId, just }: { deckId: string; just: string | null }) {
  const s = useStore();
  const desktop = useDesktop();
  const start = useStartGame();
  const [filter, setFilter] = useState<Filter>('all');
  const deck = s.decks.find((d) => d.id === deckId);
  if (!deck) return <MissingDeck />;

  const all = gamesForDeck(s, deckId);
  const justGame = just ? all.find((e) => e.id === just) || null : null;
  const games = all.filter((e) => filter === 'all' || modeKey(e.g) === filter);
  const w = wins(games);
  const oneGames = ofType(games, 'one');
  const ffaGames = ofType(games, 'ffa');
  const oneWins = ofType(w, 'one');
  const ffaWins = ofType(w, 'ffa');
  const allWins = wins(all);
  const passiveAvg = avgOf(allWins.filter((e) => e.g.setup.mode === 'passive'));
  const activeAvg = avgOf(allWins.filter((e) => e.g.setup.mode !== 'passive'));
  const gap = passiveAvg !== null && activeAvg !== null ? Math.round((activeAvg - passiveAvg) * 10) / 10 : null;
  const recent = games.slice(0, desktop ? 6 : 5);
  const lastPlayed = all.length ? all[0].g.endedAt : null;
  const deckMeta = all.length
    ? `${all.length} ${all.length === 1 ? 'game' : 'games'} · fastest kill ${fmtTurn(bestOf(allWins))} · last played ${lastPlayedLabel(lastPlayed).toLowerCase()}`
    : 'No games yet';
  const kpis = [
    { label: 'Games played', value: String(games.length), split: [`${oneGames.length} One vs One`, `${ffaGames.length} Free for All`] },
    { label: 'Average kill turn', value: fmtAvg(avgOf(w)), split: [`One vs One ${fmtAvg(avgOf(oneWins))}`, `Free for All ${fmtAvg(avgOf(ffaWins))}`] },
    { label: 'Fastest kill', value: fmtTurn(bestOf(w)), split: [`One vs One ${fmtTurn(bestOf(oneWins))}`, `Free for All ${fmtTurn(bestOf(ffaWins))}`] },
    { label: 'Goldfish won', value: String(games.length - w.length), split: [`${oneGames.length - oneWins.length} One vs One`, `${ffaGames.length - ffaWins.length} Free for All`] },
  ];
  const gapText = gap === null
    ? <>Play both passive and active games to see how much interaction slows this deck down.</>
    : gap > 0
      ? <>Interaction slows this deck down by <strong style="color: var(--text)">{gap.toFixed(1)} turns</strong> on average.</>
      : <>Interaction hasn’t slowed this deck down so far.</>;
  const playAgain = (e: GameEntry) => start(setupFromSummary(e.g));
  // One game at a time: while one is in progress, the play buttons lead back to it.
  const backToGame = (cls: string) => <a href={href('/game')} class={'btn btn-primary ' + cls}><Play size={16} />Back to game</a>;
  const emptyNote = games.length === 0 && (
    <p class="muted" style="font-size: 14px; line-height: 1.45; padding: 8px 0">{all.length ? 'No games in this mode yet.' : 'No games yet. Play one and it shows up here.'}</p>
  );

  if (!desktop) {
    return (
      <div class="m-page stats-m">
        <header class="m-header">
          <div style="display: flex; align-items: center; gap: 4px; min-width: 0">
            <a href={href('/decks')} class="icon-btn" style="margin-left: -10px" aria-label="All decks"><Back size={22} /></a>
            <span class="m-title">{deck.d.name}</span>
          </div>
          <MobileNav current="decks" />
        </header>

        {justGame ? (
          <section aria-labelledby="over-title" class="fish-card" style="padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px">
            <div style="display: flex; align-items: center; gap: 16px">
              <span class="display" style="font-size: 80px; line-height: 1; letter-spacing: -0.05em; color: var(--accent)">T{justGame.g.result.turn}</span>
              <div style="display: flex; flex-direction: column; gap: 4px">
                <span class="over-eyebrow" style="font-size: 11px">Game over · saved</span>
                <h1 id="over-title" class="display" style="font-size: 21px; line-height: 1.15; letter-spacing: 0">{gameTitle(justGame.g)}</h1>
              </div>
            </div>
            <span class="soft" style="font-size: 13px; line-height: 1.45">{gameMeta(justGame, all)}</span>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
              <a href={href('/games/' + justGame.id)} class="btn btn-md" style="border: 1px solid #4A3526; color: #FFD2B3; font-size: 15px">Game details</a>
              {s.game ? backToGame('btn-md') : <button type="button" class="btn btn-primary btn-md" onClick={() => playAgain(justGame)}>Play again</button>}
            </div>
          </section>
        ) : (
          <section aria-labelledby="deck-title" class="panel" style="padding: 16px; display: flex; flex-direction: column; gap: 14px">
            <div style="display: flex; align-items: center; gap: 16px">
              <div style="flex-shrink: 0; min-width: 96px; display: flex; flex-direction: column; align-items: center; gap: 2px">
                <span class="display" style="font-size: 60px; line-height: 0.95; letter-spacing: -0.05em; color: var(--accent)">{fmtAvg(avgOf(allWins))}</span>
                <span style="font-size: 11px; font-weight: 600; color: var(--accent-light)">avg kill turn</span>
              </div>
              <div style="min-width: 0; display: flex; flex-direction: column; gap: 5px">
                <div aria-label="Colors" style="display: flex; gap: 4px"><Pips colors={deck.d.colors} size={18} /></div>
                <h1 id="deck-title" class="display" style="font-size: 22px; line-height: 1.15; letter-spacing: 0">{deck.d.name}</h1>
                <span class="soft" style="font-size: 13px">{deck.d.commander}</span>
              </div>
            </div>
            <span class="muted" style="font-size: 13px">{deckMeta}</span>
            {s.game ? backToGame('btn-md') : <a href={href('/?deck=' + deck.id)} class="btn btn-primary btn-md">Play this deck</a>}
          </section>
        )}

        <div style="display: flex; flex-direction: column; gap: 10px">
          <div style="display: flex; flex-direction: column; gap: 2px">
            <h2 class="display" style="font-size: 20px; letter-spacing: 0">Kill-turn stats</h2>
            <span class="muted" style="font-size: 12px; line-height: 1.4">One vs One and Free for All combined. In Free for All, the kill turn is when the last goldfish died.</span>
          </div>
          <FilterChips mobile value={filter} onPick={setFilter} />
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
          {kpis.map((k) => (
            <div key={k.label} class="panel" style="height: 116px; padding: 12px 14px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px">
              <span class="muted" style="font-size: 12px; font-weight: 600">{k.label}</span>
              <span class="display" style="font-size: 30px; line-height: 1; letter-spacing: 0">{k.value}</span>
              <span class="muted" style="margin-top: auto; font-size: 11px; line-height: 1.35">{k.split[0]}<br />{k.split[1]}</span>
            </div>
          ))}
        </div>

        <figure class="panel" style="margin: 0; padding: 16px 14px 12px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px">
          <figcaption style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px">
            <span style="font-size: 15px; font-weight: 700">When the goldfish died</span>
            <span class="muted" style="font-size: 12px">Wins by turn</span>
          </figcaption>
          <Legend small />
          <KillBars list={games} mobile />
        </figure>

        <section aria-labelledby="base-title" class="panel" style="padding: 14px 16px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px">
          <h3 id="base-title" style="font-size: 15px; font-weight: 700">Clean kill vs under pressure</h3>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
            <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 12px">Passive goldfish</span><span class="display" style="font-size: 28px; line-height: 1.05; letter-spacing: 0">{passiveAvg === null ? '—' : 'T' + fmtAvg(passiveAvg)}</span></div>
            <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 12px">Active goldfish</span><span class="display" style="font-size: 28px; line-height: 1.05; letter-spacing: 0">{activeAvg === null ? '—' : 'T' + fmtAvg(activeAvg)}</span></div>
          </div>
          <p class="soft" style="font-size: 14px; line-height: 1.45">{gapText}</p>
        </section>

        <section aria-labelledby="recent-title" class="panel" style="padding: 14px 16px 4px; border-radius: 18px">
          <div style="margin-bottom: 4px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px">
            <h3 id="recent-title" style="font-size: 15px; font-weight: 700">Recent games</h3>
            {games.length > 0 && <span class="muted" style="font-size: 12px">Tap for details</span>}
          </div>
          {emptyNote}
          <ul>{recent.map((e) => <GameRow key={e.id} e={e} mobile />)}</ul>
          {all.length > 0 && <a href={href(`/decks/${deck.id}/games`)} class="btn btn-ghost" style="width: 100%; margin: 4px 0 8px; color: var(--accent-light)">See all {all.length} games</a>}
        </section>
      </div>
    );
  }

  return (
    <div class="page">
      <TopBar sub={deck.d.name}><MainNav current="decks" /></TopBar>
      <main class="wrap stats-d">
        {justGame ? (
          <section aria-labelledby="over-title" class="fish-card stats-head">
            <span class="display" style="font-size: 112px; line-height: 1; letter-spacing: -0.05em; color: var(--accent)">T{justGame.g.result.turn}</span>
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px">
              <span class="over-eyebrow">Game over · saved</span>
              <h1 id="over-title" class="display" style="font-size: 34px; line-height: 1.1">{gameTitle(justGame.g)}</h1>
              <span class="soft" style="font-size: 16px">{gameMeta(justGame, all)}</span>
            </div>
            <div style="flex-shrink: 0; display: flex; gap: 12px">
              <a href={href('/games/' + justGame.id)} class="btn btn-lg" style="border: 1px solid #4A3526; color: #FFD2B3; font-size: 16px; padding: 0 20px">Game details</a>
              {s.game ? backToGame('btn-lg') : <button type="button" class="btn btn-primary btn-lg" onClick={() => playAgain(justGame)}>Play again</button>}
            </div>
          </section>
        ) : (
          <section aria-labelledby="deck-title" class="panel stats-head" style="border-radius: 24px">
            <div style="flex-shrink: 0; min-width: 150px; display: flex; flex-direction: column; align-items: center; gap: 2px">
              <span class="display" style="font-size: 88px; line-height: 0.95; letter-spacing: -0.05em; color: var(--accent)">{fmtAvg(avgOf(allWins))}</span>
              <span style="font-size: 13px; font-weight: 600; color: var(--accent-light)">avg kill turn</span>
            </div>
            <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px">
              <div style="display: flex; align-items: center; gap: 12px">
                <div aria-label="Colors" style="display: flex; gap: 5px"><Pips colors={deck.d.colors} /></div>
                <span class="soft" style="font-size: 15px">{deck.d.commander}</span>
              </div>
              <h1 id="deck-title" class="display" style="font-size: 34px; line-height: 1.1">{deck.d.name}</h1>
              <span class="muted" style="font-size: 15px">{deckMeta}</span>
            </div>
            <div style="flex-shrink: 0; display: flex; gap: 12px">
              <a href={href('/decks')} class="btn btn-outline btn-lg" style="font-size: 16px; padding: 0 20px">All decks</a>
              {s.game ? backToGame('btn-lg') : <a href={href('/?deck=' + deck.id)} class="btn btn-primary btn-lg">Play this deck</a>}
            </div>
          </section>
        )}

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
          <div style="display: flex; flex-direction: column; gap: 2px">
            <h2 class="display" style="font-size: 24px; letter-spacing: -0.01em">Kill-turn stats</h2>
            <span class="muted" style="font-size: 14px">One vs One and Free for All combined. In Free for All, the kill turn is when the last goldfish died.</span>
          </div>
          <FilterChips value={filter} onPick={setFilter} />
        </div>

        <div class="stats-grid">
          <div style="min-height: 0; display: flex; flex-direction: column; gap: 16px">
            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px">
              {kpis.map((k) => (
                <div key={k.label} class="panel" style="height: 112px; padding: 14px 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 6px">
                  <span class="muted" style="font-size: 13px; font-weight: 600">{k.label}</span>
                  <span class="display" style="font-size: 34px; line-height: 1; letter-spacing: 0">{k.value}</span>
                  <span class="muted" style="margin-top: auto; font-size: 12px">{k.split.join(' · ')}</span>
                </div>
              ))}
            </div>
            <figure class="panel" style="flex-grow: 1; margin: 0; padding: 18px 24px 16px; display: flex; flex-direction: column; gap: 14px">
              <figcaption style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap">
                <div style="display: flex; align-items: baseline; gap: 14px">
                  <span style="font-size: 17px; font-weight: 700">When the goldfish died</span>
                  <span class="muted" style="font-size: 14px">Games won, by kill turn</span>
                </div>
                <Legend />
              </figcaption>
              <KillBars list={games} />
            </figure>
          </div>

          <div style="min-height: 0; display: flex; flex-direction: column; gap: 16px">
            <section aria-labelledby="base-title" class="panel" style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px">
              <h3 id="base-title" style="font-size: 15px; font-weight: 700">Clean kill vs under pressure</h3>
              <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
                <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 13px">Passive goldfish</span><span class="display" style="font-size: 34px; line-height: 1.05; letter-spacing: 0">{passiveAvg === null ? '—' : 'T' + fmtAvg(passiveAvg)}</span></div>
                <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 13px">Active goldfish</span><span class="display" style="font-size: 34px; line-height: 1.05; letter-spacing: 0">{activeAvg === null ? '—' : 'T' + fmtAvg(activeAvg)}</span></div>
              </div>
              <p class="soft" style="font-size: 14px; line-height: 1.45">{gapText}</p>
            </section>
            <section aria-labelledby="recent-title" class="panel" style="flex-grow: 1; padding: 16px 20px 8px; display: flex; flex-direction: column">
              <div style="margin-bottom: 6px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
                <h3 id="recent-title" style="font-size: 15px; font-weight: 700">Recent games</h3>
                {all.length > 0 && <a href={href(`/decks/${deck.id}/games`)} style="font-size: 14px; font-weight: 600">See all {all.length}</a>}
              </div>
              {emptyNote}
              <ul>{recent.map((e) => <GameRow key={e.id} e={e} />)}</ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export function MissingDeck() {
  return (
    <main style="min-height: 100dvh; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center">
      <Brand />
      <h1 class="display" style="font-size: 28px">This deck isn’t here</h1>
      <p class="muted" style="font-size: 15px">It may have been deleted.</p>
      <a class="btn btn-primary" href={href('/decks')}>All decks</a>
    </main>
  );
}
