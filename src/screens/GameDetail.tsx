import { useEffect, useState } from 'preact/hooks';
import { CATS, DIFF_LABEL, SEATS, YOU_COLOR } from '../engine/catalog';
import { type GameSummary, type RoundView, type SeatView, readRounds, tookFrom } from '../engine/record';
import { shortDate } from '../engine/stats';
import { deleteGame } from '../data/mutations';
import { useStore } from '../data/store';
import { deckName, setupFromSummary, useStartGame } from '../play';
import { go, href, useDesktop } from '../router';
import { Back, Trash } from '../ui/icons';
import { Confirm, Loading, TopBar } from '../ui/kit';
import { ChartLegend, LifeChart, type Series } from '../ui/LifeChart';
import { gameTitle } from './statsParts';
import './detail.css';

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const names = (list: string[]) => (list.length < 3 ? list.join(' and ') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]);
const seatIdx = (k: string | undefined) => (k && k !== 'you' ? Number(k.slice(1)) : -1);

export function GameDetail({ gameId }: { gameId: string }) {
  const s = useStore();
  const desktop = useDesktop();
  const { start, confirm } = useStartGame();
  const entry = s.games.find((e) => e.id === gameId);
  const [rounds, setRounds] = useState<RoundView[] | null>(null);
  const [err, setErr] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const count = entry?.g.setup.count || 1;
  useEffect(() => {
    if (!entry) return;
    setRounds(null);
    s.backend.get(s.user.uid, 'rounds/' + gameId)
      .then((raw) => setRounds(readRounds(raw, count)))
      .catch((e) => setErr((e as Error).message));
  }, [gameId, !!entry]);

  if (deleting) return <Loading text="Deleting the game" />;
  if (!entry) {
    return (
      <main style="min-height: 100dvh; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center">
        <h1 class="display" style="font-size: 28px">This game isn’t here</h1>
        <p class="muted" style="font-size: 15px">It may have been deleted.</p>
        <a class="btn btn-primary" href={href('/decks')}>All decks</a>
      </main>
    );
  }
  const g = entry.g;
  const deck = deckName(s, g.deckId);
  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteGame(s, gameId);
      go('/decks/' + g.deckId);
    } catch (e) {
      setDeleting(false);
      setAskDelete(false);
      setErr('Couldn’t delete: ' + (e as Error).message);
    }
  };
  const table = g.type === 'ffa';
  const view = rounds ? (table ? ffaView(g, rounds) : oneView(g, rounds)) : null;
  const chips = table
    ? ['Free for All', count + ' goldfish', modeChip(g), ...(g.setup.mode === 'active' ? [g.setup.targeting === 'spread' ? (desktop ? 'Targeting spread out' : 'Spread out') : 'All on you'] : [])]
    : ['One vs One', modeChip(g), ...(g.setup.mode === 'active' ? [(g.setup.opponents.s0?.profileName || 'Balanced') + ' goldfish'] : []), resultChip(g)];
  const actions = (
    <>
      <button type="button" class="btn btn-primary" style={desktop ? 'height: 56px; padding: 0 26px; border-radius: 14px; font-size: 17px' : 'height: 52px; border-radius: 14px; font-size: 16px'} onClick={() => start(setupFromSummary(g))}>Replay this setup</button>
      <button type="button" class="btn btn-danger-outline" style={desktop ? 'height: 56px; padding: 0 18px; border-radius: 14px' : 'height: 48px; border-radius: 14px'} onClick={() => setAskDelete(true)}><Trash size={16} />Delete this game</button>
    </>
  );
  const dialogs = (
    <>
      {askDelete && (
        <Confirm danger title="Delete this game?" text="It comes out of this deck’s stats. You can’t undo this." confirm="Delete game" cancel="Keep game"
          onConfirm={onDelete} onCancel={() => setAskDelete(false)} />
      )}
      {confirm}
    </>
  );
  const kpis = view?.kpis || [];
  const body = !view ? (
    err ? <p role="alert" style="color: var(--danger); font-size: 14px">{err}</p> : <div style="padding: 40px; display: flex; justify-content: center"><div class="spinner" role="status" aria-label="Loading the turns" /></div>
  ) : null;

  if (!desktop) {
    return (
      <div class="m-page">
        <header class="m-header">
          <div style="display: flex; align-items: center; gap: 4px">
            <a href={href('/decks/' + g.deckId)} class="icon-btn" style="margin-left: -10px" aria-label="Back to stats"><Back size={22} /></a>
            <span class="m-title">Game detail</span>
          </div>
          <span class="muted" style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{deck}</span>
        </header>
        <section aria-labelledby="gd-title" class="panel" style="padding: 16px; display: flex; flex-direction: column; gap: 14px">
          <div style="display: flex; align-items: center; gap: 16px">
            <span class="display" style="font-size: 72px; line-height: 1; letter-spacing: -0.05em; color: var(--accent)">T{g.result.turn}</span>
            <div style="display: flex; flex-direction: column; gap: 4px">
              <span class="over-eyebrow" style="font-size: 11px">{shortDate(g.endedAt)}</span>
              <h1 id="gd-title" class="display" style="font-size: 21px; line-height: 1.15; letter-spacing: 0">{gameTitle(g)}</h1>
            </div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            {chips.map((c, i) => <span key={i} class={'tag' + (i === 0 ? ' solid' : '')} style="height: 26px; padding: 0 10px; font-size: 12px">{c}</span>)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">{actions}</div>
          {err && view && <p role="alert" style="color: var(--danger); font-size: 14px">{err}</p>}
        </section>
        {body}
        {view && (
          <>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
              {kpis.map((k) => (
                <div key={k.label} class="panel" style="height: 84px; padding: 12px 14px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between">
                  <span class="muted" style="font-size: 12px; font-weight: 600">{k.label}</span>
                  <span class="display" style="font-size: 30px; line-height: 1; letter-spacing: 0">{k.value}<span class="muted" style="font-family: var(--body); font-size: 14px; font-weight: 600; letter-spacing: 0">{k.of}</span></span>
                </div>
              ))}
            </div>
            <figure class="panel" style="margin: 0; padding: 16px 14px 12px; border-radius: 18px; display: flex; flex-direction: column; gap: 12px">
              <figcaption style="display: flex; flex-direction: column; gap: 4px">
                <span style="font-size: 15px; font-weight: 700">Life over the game</span>
                <span class="muted" style="font-size: 12px; line-height: 1.4">{view.caption} Tap a round for details.</span>
              </figcaption>
              <ChartLegend small series={view.series} />
              <LifeChart mobile series={view.series} rounds={rounds!.length} notes={view.notes} />
            </figure>
            {table && 'fishRows' in view && (
              <section aria-labelledby="gd-fish" class="panel" style="padding: 14px 16px 4px; border-radius: 18px">
                <h2 id="gd-fish" style="margin-bottom: 4px; font-size: 15px; font-weight: 700">How each goldfish went</h2>
                <ul>
                  {view.fishRows.map((f, i) => (
                    <li key={i} style="padding: 12px 0; border-bottom: 1px solid var(--rule); display: flex; flex-direction: column; gap: 6px">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
                        <span style="display: inline-flex; align-items: center; gap: 8px; min-width: 0"><span class="dot" style={`width: 10px; height: 10px; background: ${f.color}`} /><span style="font-size: 15px; font-weight: 700">{f.name}</span><span class="tag sm" style="height: 22px; font-size: 11px">{f.profile}</span></span>
                        <span style={`font-size: 13px; font-weight: 700; color: ${f.outColor}; white-space: nowrap`}>{f.outShort}</span>
                      </div>
                      <span class="muted" style="padding-left: 18px; font-size: 12px; line-height: 1.4">You dealt it {f.fromYou} · it dealt you {f.toYou}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="gd-log" class="panel" style="padding: 14px 16px 4px; border-radius: 18px">
              <h2 id="gd-log" style="margin-bottom: 4px; font-size: 15px; font-weight: 700">Turn by turn</h2>
              {table && 'table' in view ? (
                <ol>
                  {view.table.map((r) => (
                    <li key={r.n} class="log-row" style="grid-template-columns: 36px minmax(0, 1fr); gap: 10px; padding: 12px 0">
                      <span class="round-badge" style="height: 26px; font-size: 12px">R{r.n}</span>
                      <div style="min-width: 0; display: flex; flex-direction: column; gap: 8px">
                        <div style="display: flex; flex-direction: column; gap: 1px">
                          <span style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700"><span class="dot" style="background: var(--teal)" />{r.you.title}</span>
                          {r.you.sub && <span style="padding-left: 16px; font-size: 12px; font-weight: 600; color: var(--teal-light)">{r.you.sub}</span>}
                        </div>
                        {r.fish.map((c, i) => (
                          <div key={i} style="display: flex; gap: 8px; align-items: flex-start">
                            <span class="dot" style={`margin-top: 6px; box-sizing: border-box; background: ${c.dot}; border: ${c.ring}`} />
                            <div style="min-width: 0; display: flex; flex-direction: column; gap: 1px">
                              <span style={`font-size: 14px; line-height: 1.4; color: ${c.color}`}><span style="font-weight: 700; margin-right: 0.3em">{c.name}</span>{lower(c.title)}</span>
                              {c.sub && <span class="muted" style="font-size: 12px; line-height: 1.4">{c.sub}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : 'log' in view && (
                <ol>
                  {view.log.map((r) => (
                    <li key={r.n} class="log-row" style="grid-template-columns: 36px minmax(0, 1fr); gap: 10px; padding: 10px 0">
                      <span class="round-badge" style="height: 26px; font-size: 12px">R{r.n}</span>
                      <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px">
                        <span style={`display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; line-height: 1.35; color: ${r.color}`}><span class="dot" style={`background: ${r.dot}`} />{r.name}</span>
                        <span class="muted" style="padding-left: 16px; font-size: 12px; line-height: 1.4">{r.sub}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
        {dialogs}
      </div>
    );
  }

  return (
    <div class="page">
      <TopBar sub={table ? `${deck} · vs ${count} goldfish` : deck}>
        <a href={href('/profiles')} class="btn btn-ghost">Profiles</a>
        <a href={href('/?deck=' + g.deckId)} class="btn btn-ghost btn-outline">New setup</a>
      </TopBar>
      <main class="wrap" style="padding-top: 20px; display: flex; flex-direction: column; gap: 16px">
        <a href={href('/decks/' + g.deckId)} class="back-link"><Back />Back to stats</a>
        <section aria-labelledby="gd-title" class="panel" style="padding: 22px 28px; border-radius: 24px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap">
          <span class="display" style="font-size: 88px; line-height: 1; letter-spacing: -0.05em; color: var(--accent)">T{g.result.turn}</span>
          <div style="flex-grow: 1; min-width: 280px; display: flex; flex-direction: column; gap: 10px">
            <span class="over-eyebrow">Game detail · {shortDate(g.endedAt)}</span>
            <h1 id="gd-title" class="display" style="font-size: 32px; line-height: 1.1">{gameTitle(g)}</h1>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              {chips.map((c, i) => <span key={i} class={'tag' + (i === 0 ? ' solid' : '')}>{c}</span>)}
            </div>
          </div>
          <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 10px">{actions}</div>
        </section>
        {err && view && <p role="alert" style="color: var(--danger); font-size: 14px">{err}</p>}
        {body}
        {view && (
          <>
            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px">
              {kpis.map((k) => (
                <div key={k.label} class="panel" style="height: 92px; padding: 14px 20px; border-radius: 18px; display: flex; flex-direction: column; justify-content: space-between">
                  <span class="muted" style="font-size: 13px; font-weight: 600">{k.label}</span>
                  <span class="display" style="font-size: 34px; line-height: 1; letter-spacing: 0">{k.value}<span class="muted" style="font-family: var(--body); font-size: 16px; font-weight: 600; letter-spacing: 0">{k.of}</span></span>
                </div>
              ))}
            </div>
            <div class="detail-grid">
              <figure class="panel" style="margin: 0; min-height: 440px; padding: 18px 24px 16px; display: flex; flex-direction: column; gap: 16px">
                <figcaption style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap">
                  <div style="display: flex; flex-direction: column; gap: 4px">
                    <span style="font-size: 17px; font-weight: 700">Life over the game</span>
                    <span class="muted" style="font-size: 14px">{view.caption}</span>
                  </div>
                  <ChartLegend series={view.series} />
                </figcaption>
                <LifeChart series={view.series} rounds={rounds!.length} notes={view.notes} />
              </figure>
              {table && 'fishRows' in view ? (
                <section aria-labelledby="gd-fish" class="panel" style="padding: 18px 20px 8px">
                  <h2 id="gd-fish" style="margin-bottom: 6px; font-size: 17px; font-weight: 700">How each goldfish went</h2>
                  <ul>
                    {view.fishRows.map((f, i) => (
                      <li key={i} style="padding: 14px 0; border-bottom: 1px solid var(--rule); display: flex; flex-direction: column; gap: 10px">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
                          <span style="display: inline-flex; align-items: center; gap: 10px; min-width: 0"><span class="dot" style={`width: 12px; height: 12px; background: ${f.color}`} /><span style="font-size: 17px; font-weight: 700">{f.name}</span><span class="tag sm">{f.profile}</span></span>
                          <span style={`font-size: 14px; font-weight: 600; color: ${f.outColor}; text-align: right`}>{f.outLabel}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding-left: 22px">
                          <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 12px">You dealt it</span><span class="display" style="font-size: 24px; line-height: 1.1; letter-spacing: 0">{f.fromYou}</span></div>
                          <div style="display: flex; flex-direction: column; gap: 2px"><span class="muted" style="font-size: 12px">It dealt you</span><span class="display" style="font-size: 24px; line-height: 1.1; letter-spacing: 0">{f.toYou}</span></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : 'log' in view && (
                <section aria-labelledby="gd-log" class="panel" style="max-height: 640px; overflow: auto; padding: 18px 20px 6px">
                  <h2 id="gd-log" style="margin-bottom: 6px; font-size: 17px; font-weight: 700">Turn by turn</h2>
                  <ol>
                    {view.log.map((r) => (
                      <li key={r.n} class="log-row">
                        <span class="round-badge">R{r.n}</span>
                        <div style="min-width: 0; display: flex; flex-direction: column; gap: 3px">
                          <span style={`display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; line-height: 1.35; color: ${r.color}`}><span class="dot" style={`background: ${r.dot}`} />{r.name}</span>
                          <span class="muted" style="padding-left: 16px; font-size: 13px; line-height: 1.4">{r.sub}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
            {table && 'table' in view && (
              <section aria-labelledby="gd-table" class="panel" style="padding: 18px 24px 8px; overflow-x: auto">
                <h2 id="gd-table" style="margin-bottom: 10px; font-size: 17px; font-weight: 700">Turn by turn</h2>
                <div role="table" aria-labelledby="gd-table" style="min-width: 760px; display: flex; flex-direction: column">
                  <div role="row" class="ffa-row" style={`grid-template-columns: 56px repeat(${count + 1}, minmax(0, 1fr)); padding: 0 0 10px; border-bottom: 1px solid var(--line-3); font-size: 13px; font-weight: 600`}>
                    <span role="columnheader" class="muted">Round</span>
                    {view.heads.map((h, i) => (
                      <span key={i} role="columnheader" style="display: inline-flex; align-items: center; gap: 8px; min-width: 0"><span class="dot" style={`width: 10px; height: 10px; background: ${h.color}`} /><span>{h.name}</span><span class="muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{h.profile}</span></span>
                    ))}
                  </div>
                  {view.table.map((r) => (
                    <div key={r.n} role="row" class="ffa-row" style={`grid-template-columns: 56px repeat(${count + 1}, minmax(0, 1fr))`}>
                      <span role="rowheader" class="round-badge" style="width: 40px">R{r.n}</span>
                      {[{ ...r.you, name: 'You', dot: '#62D2C3', ring: '0', color: '#EDF3F0', subColor: '#7FE0D3' }, ...r.fish].map((c, i) => (
                        <div key={i} role="cell" style="min-width: 0; display: flex; flex-direction: column; gap: 3px">
                          <span style={`display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; line-height: 1.35; color: ${c.color}`}><span class="dot" style={`box-sizing: border-box; background: ${c.dot}; border: ${c.ring}`} />{c.title}</span>
                          {c.sub && <span style={`padding-left: 16px; font-size: 13px; line-height: 1.4; color: ${c.subColor}`}>{c.sub}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      {dialogs}
    </div>
  );
}

function modeChip(g: GameSummary): string {
  return g.setup.mode === 'passive' ? 'Passive' : 'Active · ' + DIFF_LABEL[g.setup.difficulty];
}
function resultChip(g: GameSummary): string {
  if (g.result.win) return g.result.how === 'commander' ? 'Won by commander damage' : 'Won on damage';
  return g.result.how === 'their-commander' ? 'Lost to its commander' : 'Lost on life';
}

interface Kpi { label: string; value: string; of: string }

function oneView(g: GameSummary, rounds: RoundView[]) {
  const start = g.setup.startingLife;
  const you = [start, ...rounds.map((r) => r.life.you)];
  let lastFish = start;
  const fish = [start, ...rounds.map((r) => { const v = r.life.fish[0]; if (v !== null) lastFish = v; return lastFish; })];
  const fishEnd = fish[fish.length - 1];
  const turn = g.result.turn;
  const caption = 'Life at the end of each round. ' + (g.result.win
    ? (g.result.how === 'commander' ? `It died at ${fishEnd} life, to 21 commander damage.` : `It died on round ${turn}.`)
    : (g.result.how === 'their-commander' ? `Its commander dealt you 21 damage by round ${turn}.` : `You died on round ${turn}.`));
  const winName = g.result.how === 'commander' ? 'You win: 21 commander damage' : 'You win: its life hit 0';
  const lossName = g.result.how === 'their-commander' ? 'It wins: 21 commander damage' : 'It wins: your life hit 0';
  const notes = ['Both start at ' + start];
  const log = rounds.map((r, idx) => {
    const seat = r.seats[0];
    const final = idx === rounds.length - 1;
    const parts: string[] = [];
    if (r.dealt[0]) parts.push('You dealt ' + r.dealt[0] + (r.cmd[0] ? ` (${r.cmd[0]} commander)` : ''));
    if (rounds[idx - 1]?.seats[0]?.counter) parts.push('Its counterspell was up');
    if (seat) parts.push(...seatNotes(seat, (i) => (i === 'you' ? 'you' : '')));
    if (final && g.result.win) {
      notes.push(winName);
      if (seat) parts.push('It ' + lower(seat.name));
      return { n: r.n, name: winName, dot: '#62D2C3', color: '#7FE0D3', sub: parts.join(' · ') };
    }
    const name = seat ? seat.name : 'Your turn';
    notes.push(final && !g.result.win ? lossName : seat ? 'It ' + lower(seat.name) : 'You dealt ' + r.dealt[0]);
    if (final && !g.result.win) parts.push(lossName);
    return {
      n: r.n, name,
      dot: seat ? (CATS[seat.cat] || CATS.idle).color : '#62D2C3',
      color: final && !g.result.win ? '#FF9A9A' : '#EDF3F0',
      sub: parts.length ? parts.join(' · ') : 'No damage either way',
    };
  });
  const kpis: Kpi[] = [
    { label: 'Damage you dealt', value: String(g.totals.dealt), of: '' },
    { label: 'Damage you took', value: String(g.totals.took), of: '' },
    { label: 'Your commander damage', value: String(g.totals.cmdDealt), of: ' / 21' },
    { label: 'Its commander damage', value: String(g.totals.cmdTaken), of: ' / 21' },
  ];
  const series: Series[] = [
    { name: 'You', color: YOU_COLOR.chart, vals: you, endLabel: true },
    { name: 'The goldfish', color: SEATS[0].chart, vals: fish, endLabel: true },
  ];
  return { kpis, series, notes, caption, log };
}

/** Notes about one goldfish turn: land drop, what its attack did, rerolls. */
function seatNotes(seat: SeatView, nameOf: (a: 'you' | number) => string): string[] {
  const out: string[] = [];
  if (seat.missedLand) out.push('Missed its land drop');
  if (seat.attack) {
    const who = seat.attack.who === 'creatures' ? 'creatures' : seat.attack.who;
    if (seat.attack.to === 'you') out.push(seat.lost ? `Its ${who} hit you for ${seat.lost}` : `Its ${who} attacked, you blocked`);
    else out.push(`Attacked ${nameOf(seat.attack.to)} for ${seat.attack.power}`);
  } else if (seat.lost) {
    out.push('You lost ' + seat.lost);
  }
  if (seat.rerolls) out.push(seat.rerolls === 1 ? 'Rerolled once' : 'Rerolled ' + seat.rerolls + ' times');
  return out;
}

function ffaView(g: GameSummary, rounds: RoundView[]) {
  const count = g.setup.count;
  const start = g.setup.startingLife;
  const seats = Array.from({ length: count }, (_, i) => i);
  const opp = (i: number) => g.setup.opponents['s' + i];
  const name = (i: number) => opp(i)?.name || SEATS[i].name;
  const per = (i: number) => g.totals.perSeat['s' + i] || { dealt: 0, cmd: 0, took: 0, cmdToYou: 0 };
  const byName = (k: string | undefined) => (k === 'you' ? 'you' : name(seatIdx(k)));
  const series: Series[] = [
    { name: 'You', color: YOU_COLOR.chart, vals: [start, ...rounds.map((r) => r.life.you)], endLabel: true },
    ...seats.map((i): Series => ({
      name: name(i),
      color: SEATS[i].chart,
      vals: [start, ...rounds.map((r) => r.life.fish[i]).filter((v): v is number => v !== null)],
      ko: per(i).outRound !== undefined,
    })),
  ];
  const notes = ['Everyone starts at ' + start];
  const table = rounds.map((r) => {
    const took = r.seats.reduce((a, x) => a + (x ? tookFrom(x) : 0), 0);
    const dealt = r.dealt.reduce((a, x) => a + x, 0);
    const kosByYou = seats.filter((i) => per(i).outRound === r.n && per(i).outBy === 'you').map(name);
    const kosByOthers = seats.filter((i) => per(i).outRound === r.n && per(i).outBy && per(i).outBy !== 'you')
      .map((i) => byName(per(i).outBy) + ' knocked out ' + name(i));
    const bits = [...(kosByYou.length ? ['You knocked out ' + names(kosByYou)] : []), ...kosByOthers];
    notes.push(bits.length ? bits.join('. ') : `You dealt ${dealt}, took ${took}`);
    const fish = seats.map((i) => {
      const p = per(i);
      const seat = r.seats[i];
      const cell = { name: name(i), title: '', sub: '', dot: 'transparent', ring: '0', color: '#EDF3F0', subColor: '#9FB6B3' };
      if (p.outRound !== undefined && p.outRound < r.n) return { ...cell, title: 'Out', color: '#4F6C72' };
      if (!seat) {
        if (p.outRound === r.n) return { ...cell, title: 'Knocked out', sub: p.outBy === 'you' ? 'By you, on your turn' : 'By ' + byName(p.outBy), dot: '#10232B', ring: '2px solid ' + SEATS[i].chart };
        return { ...cell, title: 'Didn’t play', color: '#9FB6B3' };
      }
      const lines: string[] = [];
      if (seat.gain && seat.action !== 'gain') lines.push('Gained ' + seat.gain + ' life');
      lines.push(...seatNotes(seat, (a) => (a === 'you' ? 'you' : name(a))).map((t) => t.replace(/^Its (.*) hit you for/, 'Attacked you, you took').replace(/^Its .* attacked, you blocked$/, 'Attacked you, you blocked')));
      seat.knockedOut.forEach((k) => lines.push('Knocked out ' + name(k)));
      if (p.outRound === r.n) lines.push('Then knocked out by ' + byName(p.outBy));
      return { ...cell, title: seat.name, sub: lines.join(' · '), dot: (CATS[seat.cat] || CATS.idle).color };
    });
    return { n: r.n, you: { title: `Dealt ${dealt} · took ${took}`, sub: kosByYou.length ? 'Knocked out ' + names(kosByYou) : '' }, fish };
  });
  const kpis: Kpi[] = [
    { label: 'Damage you dealt', value: String(g.totals.dealt), of: '' },
    { label: 'Damage you took', value: String(g.totals.took), of: '' },
    { label: 'Your knockouts', value: String(g.totals.knockouts), of: ' of ' + count },
    { label: 'Spells and attacks aimed at you', value: String(g.totals.aimedAtYou), of: ' of ' + g.totals.aimedTotal },
  ];
  const fishRows = seats.map((i) => {
    const p = per(i);
    const out = p.outRound !== undefined;
    return {
      name: name(i), profile: opp(i)?.profileName || '', color: SEATS[i].chart,
      outLabel: out ? 'Out on R' + p.outRound + (p.outBy === 'you' ? ' · your knockout' : ' · knocked out by ' + byName(p.outBy)) : 'Still in',
      outShort: out ? 'Out R' + p.outRound + (p.outBy === 'you' ? ' · by you' : '') : 'Still in',
      outColor: out && p.outBy === 'you' ? '#7FE0D3' : '#B4C7C4',
      fromYou: String(p.dealt), toYou: String(p.took),
    };
  });
  const heads = [{ name: 'You', profile: '', color: '#62D2C3' }].concat(seats.map((i) => ({ name: name(i), profile: g.setup.mode === 'passive' ? '' : opp(i)?.profileName || '', color: SEATS[i].chart })));
  const caption = 'Life at the end of each round. Hollow dots mark a knockout.';
  return { kpis, series, notes, caption, table, fishRows, heads };
}
