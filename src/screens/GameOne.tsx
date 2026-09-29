import { cmdPower, groupCreatures } from '../engine/game';
import { useDesktop } from '../router';
import { Arrow, Crown, FishLogo, Heart, Land, Shield } from '../ui/icons';
import { Brand, MiniStep } from '../ui/kit';
import { GameNav, lastCat, modeLabel, RerollUndo, stackView, useGame } from './Game';

export function GameOne() {
  const game = useGame();
  const desktop = useDesktop();
  const { g } = game;
  const f = g.fish[0];
  const opp = g.opponents[0];
  const last = g.last;
  const cat = lastCat(g);
  const started = g.pos >= 0;
  const nextRound = game.next.newRound ? g.round + 1 : g.round;
  const ctaTitle = started ? 'End your turn' : 'The goldfish goes first';
  const ctaSub = started ? 'Then the goldfish takes turn ' + nextRound : 'Play its turn 1';
  const boardPower = f.creatures.reduce((a, c) => a + c.p, 0);
  const n = f.creatures.length;
  const boardSummary = n ? `${n} ${n === 1 ? 'creature' : 'creatures'} · ${boardPower} power` : 'Empty';
  const castCost = f.cmd.power + f.cmd.tax;
  const theirCmd = cmdPower(f);
  const profileLabel = g.setup.mode === 'passive' ? 'Passive goldfish' : opp.profileName + ' profile';
  const hit = (delta: number) => () => game.edit({ k: 'fishLife', seat: 0, delta });
  const you = (delta: number) => () => game.edit({ k: 'youLife', delta });
  const died = (id: number) => () => game.edit({ k: 'creatureDied', seat: 0, id });
  const cmdHit = () => game.edit({ k: 'yourCmd', seat: 0 });
  const theirHit = () => game.edit({ k: 'theirCmd', seat: 0 });
  const pill = started
    ? <span class="turn-pill" style="background: #173A3B; color: var(--teal-light)"><span class="dot" style="background: var(--teal)" />Your turn</span>
    : <span class="turn-pill" style="background: #3A2415; color: var(--accent-light)"><span class="dot" style="background: var(--accent)" />Goldfish first</span>;

  if (!desktop) {
    return (
      <div class="page game-m">
        <header class="m-header" style="height: 60px; padding: 0 8px 0 16px">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0">
            <FishLogo size={22} />
            <span class="display" style="font-size: 20px; white-space: nowrap">Round {g.round}</span>
            <span style={`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; white-space: nowrap; color: ${started ? 'var(--teal-light)' : 'var(--accent-light)'}`}>
              <span class="dot" style={`width: 7px; height: 7px; background: ${started ? 'var(--teal)' : 'var(--accent)'}`} />{started ? 'Your turn' : 'Goldfish first'}
            </span>
          </div>
          <GameNav game={game} mobile />
        </header>
        <main class="game-m-main">
          <section aria-label="The goldfish" class="panel" style="flex-shrink: 0; padding: 14px; display: flex; flex-direction: column; gap: 10px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 26px">
              <span class="display" style="display: inline-flex; align-items: baseline; gap: 8px; font-size: 17px; letter-spacing: 0">The Goldfish<span class="muted" style="font-family: var(--body); font-size: 12px; font-weight: 600">{g.setup.mode === 'passive' ? 'Passive' : opp.profileName + ' · ' + modeLabel(g, false)}</span></span>
              {f.counter && <span class="badge-counter" style="height: 26px; padding: 0 10px; font-size: 12px">Counter up</span>}
            </div>
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 12px">
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--accent-light)"><Heart size={14} sw={2.2} />Life</span>
                <span aria-live="polite" class="display num" style="font-size: 92px; line-height: 0.95; letter-spacing: -0.04em">{f.life}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px">
                <div style="display: flex; flex-direction: column; gap: 6px">
                  <div style="display: flex; align-items: baseline; justify-content: space-between">
                    <span style="font-size: 12px; font-weight: 600; color: var(--teal-light)">Your cmdr dmg</span>
                    <span style="font-size: 15px; font-weight: 700">{f.fromYou}<span class="muted" style="font-weight: 600"> / 21</span></span>
                  </div>
                  <div class="bar" aria-hidden="true"><div style={`width: ${Math.min(100, Math.round((f.fromYou / 21) * 100))}%`} /></div>
                  <button type="button" class="btn-teal" onClick={cmdHit}>Hit for {g.power}</button>
                </div>
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--land)"><Land size={16} /><span style="font-size: 18px; font-weight: 800; color: var(--text)">{f.lands}</span> lands</span>
              </div>
            </div>
            <div class="pads4">
              <button type="button" class="pad" aria-label="Deal 10 damage to the goldfish" onClick={hit(-10)}>−10</button>
              <button type="button" class="pad" aria-label="Deal 5 damage to the goldfish" onClick={hit(-5)}>−5</button>
              <button type="button" class="pad" aria-label="Deal 1 damage to the goldfish" onClick={hit(-1)}>−1</button>
              <button type="button" class="pad" aria-label="Give the goldfish 1 life" onClick={hit(1)}>+1</button>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px" class="muted">
              <span>Your commander power</span>
              <MiniStep value={g.power} downLabel="Lower your commander power" upLabel="Raise your commander power" onDown={() => game.edit({ k: 'power', delta: -1 })} onUp={() => game.edit({ k: 'power', delta: 1 })} />
            </div>
          </section>

          <section aria-label="Its board" style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px">
              <h2 class="eyebrow sm">Its board</h2>
              <span style="font-size: 12px; color: var(--accent-light); font-weight: 600">{f.cmd.onBoard ? 'Commander on the battlefield' : 'Commander in command zone · costs ' + castCost}</span>
            </div>
            {n ? (
              <ul class="swipe" style="margin: 0 -16px; padding: 0 16px; display: flex; gap: 8px">
                {groupCreatures(f.creatures).map((grp) => {
                  const v = stackView(grp);
                  return (
                    <li key={grp.key} style="flex-shrink: 0">
                      <button type="button" class={'mini-creature' + (grp.cmd ? ' cmd' : '')} aria-label={v.label} onClick={died(v.lastId)}>
                        {v.stacked && <span class="stack-count sm">×{v.n}</span>}
                        <span class="display" style="font-size: 24px; line-height: 1">{v.pt}</span>
                        <span class="kind">{grp.cmd ? 'Cmdr' : grp.token ? v.kind : 'Tap if dead'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div class="empty-board" style="height: 64px; font-size: 13px">No creatures on its board</div>
            )}
            <span class="muted" style="font-size: 12px">Tap a creature when it dies</span>
          </section>

          <article aria-live="polite" class="fish-card" style="flex-grow: 1; min-height: 160px; overflow: auto; padding: 12px 14px 14px; border-radius: 20px; display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0">
                <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-light); white-space: nowrap">{last ? 'Goldfish · Turn ' + last.round : 'Goldfish'}</span>
                {last && <span class="tag dark sm"><span class="dot" style={`width: 7px; height: 7px; background: ${cat.color}`} />{cat.label}</span>}
              </div>
              <RerollUndo game={game} compact border="var(--accent)" />
            </div>
            {last ? (
              <div style="display: flex; flex-direction: column; gap: 8px">
                <h2 class="display" style="font-size: 22px; line-height: 1.1; letter-spacing: -0.01em">{last.name}</h2>
                <p style="font-size: 14px; line-height: 1.4">{last.you}</p>
                <ol class="steps" style="padding-top: 8px; gap: 4px">
                  {last.steps.map((st, i) => <li key={i} style="grid-template-columns: 58px minmax(0, 1fr); gap: 8px; font-size: 13px; line-height: 1.35"><span>{st.k}</span><span>{st.v}</span></li>)}
                </ol>
              </div>
            ) : (
              <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px">
                <h2 class="display" style="font-size: 22px">{started ? 'Waiting for its first turn' : 'The goldfish plays first'}</h2>
                <p class="soft" style="font-size: 14px; line-height: 1.4">{started ? 'Play your turn, then tap End your turn.' : 'Tap below to see its first turn.'}</p>
              </div>
            )}
          </article>

          <section aria-label="You" class="panel" style="flex-shrink: 0; padding: 8px 8px 8px 14px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <div style="display: flex; align-items: center; gap: 10px">
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--teal-light)"><span class="dot" style="background: var(--teal)" />You</span>
                <span aria-live="polite" class="display num" style="font-size: 34px; line-height: 1">{g.you}</span>
              </div>
              <div style="display: flex; gap: 6px">
                <button type="button" class="pad" style="width: 48px; font-size: 15px" aria-label="Lose 5 life" onClick={you(-5)}>−5</button>
                <button type="button" class="pad" style="width: 48px; font-size: 15px" aria-label="Lose 1 life" onClick={you(-1)}>−1</button>
                <button type="button" class="pad" style="width: 48px; font-size: 15px" aria-label="Gain 1 life" onClick={you(1)}>+1</button>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <span class="muted" style="font-size: 13px">Its cmdr dmg <strong style="font-size: 16px; color: var(--text)">{f.toYou}</strong> / 21</span>
              <button type="button" class="btn-orange-outline" disabled={!f.cmd.onBoard} onClick={theirHit}>It hit you for {theirCmd}</button>
            </div>
            {f.counter && <p class="notice" style="padding: 8px 10px; font-size: 13px">Your first spell this turn gets countered.</p>}
          </section>

          <button type="button" class="cta" style="height: 60px; border-radius: 16px; flex-direction: row; gap: 10px" onClick={game.endTurn}>
            <span class="display" style="font-size: 20px; letter-spacing: 0">{ctaTitle}</span>
            <Arrow size={20} />
          </button>
        </main>
        {game.dialogs}
      </div>
    );
  }

  return (
    <div class="page game-d">
      <header class="topbar">
        <div style="flex: 1 1 0; min-width: 0"><Brand sub={game.deck} /></div>
        <div style="display: flex; align-items: center; gap: 14px; flex-shrink: 0">
          <span class="display" style="font-size: 28px; font-weight: 700; letter-spacing: -0.01em">Round {g.round}</span>
          {pill}
        </div>
        <nav aria-label="Game" class="topnav" style="flex: 1 1 0">
          <span class="tag" style="height: 32px; border-radius: 16px">{modeLabel(g, true)}</span>
          <GameNav game={game} />
        </nav>
      </header>

      <main class="game-d-main">
        <section aria-label="The goldfish" class="panel" style="min-height: 0; padding: 26px 28px 28px; border-radius: 22px; display: flex; flex-direction: column; gap: 20px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 40px">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0">
              <span style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; background: #3A2415; display: flex; align-items: center; justify-content: center"><FishLogo size={24} /></span>
              <h1 class="display" style="font-size: 26px">The Goldfish</h1>
              <span class="tag dark">{profileLabel}</span>
            </div>
            {f.counter && <span class="badge-counter"><Shield size={16} sw={2.2} />Holding up a counterspell</span>}
          </div>

          <div class="fish-stats">
            <div class="well stat">
              <div class="stat-label" style="color: var(--accent-light)"><Heart />Life</div>
              <div aria-live="polite" class="display num" style="font-size: 112px; line-height: 0.95; letter-spacing: -0.04em">{f.life}</div>
              <div class="pads4" style="margin-top: auto">
                <button type="button" class="pad" aria-label="Deal 10 damage to the goldfish" onClick={hit(-10)}>−10</button>
                <button type="button" class="pad" aria-label="Deal 5 damage to the goldfish" onClick={hit(-5)}>−5</button>
                <button type="button" class="pad" aria-label="Deal 1 damage to the goldfish" onClick={hit(-1)}>−1</button>
                <button type="button" class="pad" aria-label="Give the goldfish 1 life" onClick={hit(1)}>+1</button>
              </div>
            </div>
            <div class="well stat">
              <div class="stat-label" style="color: var(--teal-light)"><Crown />Your commander damage</div>
              <div style="display: flex; align-items: baseline; gap: 6px">
                <span class="display" style="font-size: 56px; line-height: 1; letter-spacing: -0.03em">{f.fromYou}</span>
                <span class="muted" style="font-size: 18px; font-weight: 600">/ 21</span>
              </div>
              <div aria-hidden="true" class="segs">
                {Array.from({ length: 21 }, (_, i) => <span key={i} style={`background: ${i < f.fromYou ? 'var(--teal)' : 'var(--line)'}`} />)}
              </div>
              <button type="button" class="btn-teal" style="margin-top: auto; font-size: 15px" onClick={cmdHit}>Commander hits for {g.power}</button>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px" class="muted">
                <span>Power</span>
                <MiniStep value={g.power} downLabel="Lower your commander power" upLabel="Raise your commander power" onDown={() => game.edit({ k: 'power', delta: -1 })} onUp={() => game.edit({ k: 'power', delta: 1 })} />
              </div>
            </div>
            <div class="well stat">
              <div class="stat-label" style="color: var(--land)"><Land />Lands</div>
              <span class="display" style="font-size: 56px; line-height: 1; letter-spacing: -0.03em">{f.lands}</span>
              <div aria-hidden="true" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 22px">
                {Array.from({ length: Math.min(f.lands, 10) }, (_, i) => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#3B3522" stroke="#D9C27A" stroke-width="1.8" stroke-linejoin="round"><path d="M2 20l7-12 4 6.5 2.5-4L22 20z" /></svg>
                ))}
                {f.lands > 10 && <span style="font-size: 13px; color: var(--land); font-weight: 600">+{f.lands - 10}</span>}
              </div>
              <span class="muted" style="margin-top: auto; font-size: 13px">Its mana for the turn</span>
            </div>
          </div>

          <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px">
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap">
              <div style="display: flex; align-items: baseline; gap: 14px">
                <h2 class="eyebrow" style="font-size: 14px">Its board</h2>
                <span class="soft" style="font-size: 14px">{boardSummary}</span>
              </div>
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--accent-light)"><Crown size={16} />{f.cmd.onBoard ? 'Its commander is on the battlefield' : 'Its commander is in the command zone · costs ' + castCost}</span>
            </div>
            {n ? (
              <ul style="display: flex; flex-wrap: wrap; gap: 14px; overflow: auto; min-height: 0">
                {groupCreatures(f.creatures).map((grp) => {
                  const v = stackView(grp);
                  return (
                    <li key={grp.key} class={'creature' + (grp.cmd ? ' cmd' : '')}>
                      {v.stacked && <span class="stack-count">×{v.n}</span>}
                      <div class="art">
                        {grp.cmd && <Crown size={18} color="#FFB07A" />}
                        <span class="display" style="font-size: 40px; line-height: 1">{v.pt}</span>
                        <span class="kind">{v.kind}</span>
                      </div>
                      <button type="button" class="pad" style="font-size: 14px; font-weight: 600" aria-label={v.label} onClick={died(v.lastId)}>{v.stacked ? 'One died' : 'It died'}</button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div class="empty-board" style="flex-grow: 1; min-height: 120px">No creatures. Nothing is coming at you next turn.</div>
            )}
          </div>
        </section>

        <div style="min-height: 0; display: flex; flex-direction: column; gap: 16px">
          <article aria-live="polite" class="fish-card" style="flex-grow: 1; min-height: 0; overflow: auto; padding: 20px 22px 18px; display: flex; flex-direction: column; gap: 12px">
            {last ? (
              <div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
                  <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-light)">Goldfish · Turn {last.round}</span>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span class="tag dark"><span class="dot" style={`background: ${cat.color}`} />{cat.label}</span>
                    <span title="Mana spent" class="cost">{last.cost}</span>
                  </div>
                </div>
                <h2 class="display" style="font-size: 28px; line-height: 1.08; text-wrap: balance">{last.name}</h2>
                <div style="display: flex; flex-direction: column; gap: 4px">
                  <span class="eyebrow" style="font-size: 12px; font-weight: 700">What you do</span>
                  <p style="font-size: 16px; line-height: 1.45">{last.you}</p>
                </div>
                <ol class="steps">
                  {last.steps.map((st, i) => <li key={i}><span>{st.k}</span><span>{st.v}</span></li>)}
                </ol>
              </div>
            ) : (
              <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-light)">Goldfish</span>
                <h2 class="display" style="font-size: 28px; line-height: 1.08">{started ? 'Waiting for its first turn' : 'The goldfish plays first'}</h2>
                <p class="soft" style="font-size: 16px; line-height: 1.45">{started ? 'Play your turn, then hit End your turn. Its move shows up here.' : 'Hit the button below to see its first turn.'}</p>
              </div>
            )}
            <RerollUndo game={game} border="var(--accent)" />
          </article>

          <section aria-label="You" class="panel" style="flex-shrink: 0; padding: 16px 20px 18px; border-radius: 22px; display: flex; flex-direction: column; gap: 12px">
            <span style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--teal-light)"><span class="dot" style="width: 10px; height: 10px; background: var(--teal)" />You</span>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">
              <div style="display: flex; flex-direction: column; gap: 8px">
                <span class="muted" style="font-size: 13px">Your life</span>
                <span aria-live="polite" class="display num" style="font-size: 48px; line-height: 1; letter-spacing: -0.03em">{g.you}</span>
                <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">
                  <button type="button" class="pad" style="font-size: 15px" aria-label="Lose 5 life" onClick={you(-5)}>−5</button>
                  <button type="button" class="pad" style="font-size: 15px" aria-label="Lose 1 life" onClick={you(-1)}>−1</button>
                  <button type="button" class="pad" style="font-size: 15px" aria-label="Gain 1 life" onClick={you(1)}>+1</button>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px">
                <span class="muted" style="font-size: 13px">Its commander damage</span>
                <span class="display" style="font-size: 48px; line-height: 1; letter-spacing: -0.03em">{f.toYou}<span class="muted" style="font-family: var(--body); font-size: 16px; font-weight: 600; letter-spacing: 0"> / 21</span></span>
                <button type="button" class="btn-orange-outline" disabled={!f.cmd.onBoard} onClick={theirHit}>It hit you for {theirCmd}</button>
              </div>
            </div>
            {f.counter && <p class="notice">Your first spell this turn gets countered.</p>}
          </section>

          <button type="button" class="cta" onClick={game.endTurn}>
            <span class="display" style="font-size: 22px; letter-spacing: 0">{ctaTitle}</span>
            <span style="font-size: 13px; font-weight: 600; color: #4A2610">{ctaSub}</span>
          </button>
        </div>
      </main>
      {game.dialogs}
    </div>
  );
}
