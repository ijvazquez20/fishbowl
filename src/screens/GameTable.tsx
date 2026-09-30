import { useEffect, useState } from 'preact/hooks';
import { SEATS, YOU_COLOR } from '../engine/catalog';
import { cmdPower, type Fish, groupCreatures, poss, yourTurnBrief } from '../engine/game';
import { useDesktop } from '../router';
import { Crown, FishLogo, Land, Shield, Undo } from '../ui/icons';
import { Brand, MiniStep } from '../ui/kit';
import { GameNav, lastCat, modeLabel, RerollUndo, stackView, TapSlot, useGame } from './Game';

export function GameTable() {
  const game = useGame();
  const desktop = useDesktop();
  const { g, phase, next } = game;
  const n = g.fish.length;
  const spread = g.setup.targeting === 'spread';
  const passive = g.setup.mode === 'passive';
  const last = g.last;
  const cat = lastCat(g);
  const lastSeat = last ? SEATS[last.fish] : null;
  const cardColor = lastSeat ? lastSeat.color : '#2C4B58';
  const cardLight = lastSeat ? lastSeat.light : '#9FB6B3';
  const tgt = last ? last.target : null;
  const target = tgt === null ? null : tgt === 'you'
    ? { name: 'you', color: YOU_COLOR.color, light: YOU_COLOR.light }
    : { name: g.fish[tgt].name, color: SEATS[tgt].color, light: SEATS[tgt].light };

  const [sel, setSel] = useState(() => (typeof phase === 'number' ? phase : Math.max(0, g.fish.findIndex((f) => f.alive))));
  useEffect(() => { if (typeof phase === 'number') setSel(phase); }, [g.pos, g.round]);

  let ctaTitle: string;
  let ctaSub: string;
  let ctaBg: string;
  const nextFish = next.actor === 'you' ? null : g.fish[next.actor];
  if (phase === 'you') {
    ctaTitle = 'End your turn';
    ctaSub = nextFish ? 'Then ' + nextFish.name + ' plays' : '';
    ctaBg = nextFish ? SEATS[next.actor as number].color : YOU_COLOR.color;
  } else if (phase === 'start') {
    ctaTitle = 'Start: ' + poss(nextFish!.name) + ' turn';
    ctaSub = 'The goldfish before you go first';
    ctaBg = SEATS[next.actor as number].color;
  } else if (nextFish) {
    ctaTitle = 'Next: ' + poss(nextFish.name) + ' turn';
    ctaSub = 'Resolve ' + poss(g.fish[phase].name) + ' turn first';
    ctaBg = SEATS[next.actor as number].color;
  } else {
    ctaTitle = 'Back to you';
    ctaSub = 'Round ' + (next.newRound ? g.round + 1 : g.round);
    ctaBg = YOU_COLOR.color;
  }
  const turnColor = typeof phase === 'number' ? SEATS[phase].color : YOU_COLOR.color;
  const turnLight = typeof phase === 'number' ? SEATS[phase].light : YOU_COLOR.light;
  const turnLabel = phase === 'you' ? 'Your turn' : phase === 'start' ? 'Before your turn' : poss(g.fish[phase].name) + ' turn';

  const acted = (i: number) => g.log.find((e) => e.fish === i);
  const summary = g.fish.map((f, i) => {
    const e = acted(i);
    const shown = e && (e.round === g.round || (phase === 'you' && e.round === g.round - 1));
    return {
      name: f.name, light: SEATS[i].light,
      text: shown ? e!.text : !f.alive ? 'Out' : phase === 'you' ? '—' : 'Waiting',
      bright: !!shown,
    };
  });
  const posOf = (a: 'you' | number) => g.order.indexOf(a);
  const seats = g.order.map((a) => {
    const isYou = a === 'you';
    const dot = isYou ? YOU_COLOR.color : SEATS[a].color;
    const on = phase === a;
    const out = !isYou && !g.fish[a].alive;
    const done = g.pos >= 0 && posOf(a) < g.pos;
    return { key: String(a), name: isYou ? 'You' : g.fish[a].name, dot, on, out, done };
  });

  const fishView = (f: Fish, i: number) => {
    const seat = SEATS[i];
    const edit = game.edit;
    return {
      seat, f,
      profileName: passive ? (desktop ? 'Passive goldfish' : 'Passive') : g.opponents[i].profileName + (desktop ? ' profile' : ''),
      isTurn: phase === i && !g.over,
      zone: f.cmd.onBoard ? 'Commander out' : (desktop ? 'Command zone · costs ' : 'Cmdr in zone · costs ') + (f.cmd.power + f.cmd.tax),
      cmdPow: cmdPower(f),
      pct: Math.min(100, Math.round((f.fromYou / 21) * 100)) + '%',
      hit: (d: number) => () => edit({ k: 'fishLife', seat: i, delta: d }),
      cmdHit: () => edit({ k: 'yourCmd', seat: i }),
      hitYou: () => edit({ k: 'theirCmd', seat: i }),
      died: (id: number) => () => edit({ k: 'creatureDied', seat: i, id }),
      outText: f.out ? (f.out.by === 'you' ? 'You took it out' : 'Taken out by ' + g.fish[f.out.by as number].name) : '',
    };
  };
  const pads = (v: ReturnType<typeof fishView>, size = 15) => (
    <div class="pads4" style="gap: 6px">
      <button type="button" class="pad" style={`font-size: ${size}px`} aria-label={'Deal 10 damage to ' + v.f.name} onClick={v.hit(-10)}>−10</button>
      <button type="button" class="pad" style={`font-size: ${size}px`} aria-label={'Deal 5 damage to ' + v.f.name} onClick={v.hit(-5)}>−5</button>
      <button type="button" class="pad" style={`font-size: ${size}px`} aria-label={'Deal 1 damage to ' + v.f.name} onClick={v.hit(-1)}>−1</button>
      <button type="button" class="pad" style={`font-size: ${size}px`} aria-label={'Give ' + v.f.name + ' 1 life'} onClick={v.hit(1)}>+1</button>
    </div>
  );
  const creatureButtons = (v: ReturnType<typeof fishView>, w: number, h: number) => (
    <>
      {groupCreatures(v.f.creatures).map((grp) => {
        const sv = stackView(grp, v.f.name);
        return (
          <TapSlot key={grp.key} grp={grp} w={w} h={h}>
            <button type="button" class="mini-creature" style={`border-color: ${grp.cmd ? v.seat.color : '#2C4B58'}; background: ${grp.cmd ? v.seat.tint : '#152E38'}`}
              aria-label={sv.label} onClick={v.died(sv.lastId)}>
              {sv.stacked && <span class="stack-count sm">×{sv.n}</span>}
              <span class="display" style={`font-size: ${h > 60 ? 24 : 22}px; line-height: 1`}>{sv.pt}</span>
              <span class="kind" style={`color: ${grp.cmd ? v.seat.light : '#9FB6B3'}`}>{grp.cmd ? 'Cmdr' : sv.kind}</span>
            </button>
          </TapSlot>
        );
      })}
    </>
  );
  const outOverlay = (v: ReturnType<typeof fishView>, radius: number) => !v.f.alive && (
    <div class="out-overlay" style={`border-radius: ${radius}px`}>
      <span class="eyebrow sm" style="font-weight: 700; letter-spacing: 0.1em">Out</span>
      <span class="display" style={`font-size: 44px; line-height: 1; color: ${v.seat.light}`}>T{v.f.out?.round}</span>
      <span class="soft" style="font-size: 14px">{v.outText}</span>
    </div>
  );
  // On your turn the card is yours: what to play around, and what the goldfish did to you since.
  const brief = yourTurnBrief(g);
  const headsUp = [
    ...brief.counters.map((i) => g.fish[i].name + ' is holding up a counterspell: your first spell gets countered.'),
    ...brief.taxes.map((i) => g.fish[i].name + ' taxed your spells: they cost 1 more this turn.'),
  ];
  const hits = brief.hits;
  const lostTotal = hits.reduce((a, h) => a + h.n, 0);
  const undoButton = (compact: boolean) => compact
    ? <button type="button" class="icon-btn" style="width: 44px; border-radius: 10px; border: 1px solid #2C4B58" aria-label="Undo" disabled={!game.canUndo} onClick={game.undo}><Undo /></button>
    : <button type="button" class="btn btn-ghost" style="align-self: flex-start; border: 1px solid #2C4B58; border-radius: 10px; font-size: 14px" disabled={!game.canUndo} onClick={game.undo}><Undo size={16} />Undo</button>;
  const yourCard = (compact: boolean) => (
    <article aria-live="polite" class="table-card" style={`border-color: ${YOU_COLOR.color}; ${compact ? 'padding: 10px 12px 12px 14px; border-radius: 18px; gap: 8px' : 'gap: 14px'}`}>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
        <span style={`font-size: ${compact ? 11 : 13}px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${YOU_COLOR.light}`}>Your turn · Round {g.round}</span>
        {compact && undoButton(true)}
      </div>
      {!compact && (
        <div style="display: flex; flex-direction: column; gap: 6px">
          <h2 class="display" style="font-size: 26px; line-height: 1.1">Play your turn</h2>
          <p class="soft" style="font-size: 15px; line-height: 1.45">Then hit End your turn. Each goldfish plays in seat order, one at a time.</p>
        </div>
      )}
      <section aria-label="Heads-up" style="display: flex; flex-direction: column; gap: 6px">
        {!compact && <span class="eyebrow" style="font-size: 12px; font-weight: 700">Heads-up</span>}
        {headsUp.length
          ? headsUp.map((t, i) => <p key={i} class="notice" style={`display: flex; align-items: flex-start; gap: 8px; ${compact ? 'padding: 8px 10px; font-size: 13px' : ''}`}><Shield size={16} style="flex-shrink: 0; margin-top: 2px" />{t}</p>)
          : <p class="muted" style={`font-size: ${compact ? 13 : 14}px; line-height: 1.4`}>Nothing to play around: no counterspells or taxes on you.</p>}
      </section>
      <section aria-label="Since your last turn" style={`display: flex; flex-direction: column; gap: 6px; ${compact ? '' : 'padding-top: 12px; border-top: 1px solid #1E3844'}`}>
        {!compact && <span class="eyebrow" style="font-size: 12px; font-weight: 700">Since your last turn</span>}
        {brief.played === 0 ? (
          <p class="muted" style={`font-size: ${compact ? 13 : 14}px`}>No goldfish has played yet.</p>
        ) : !hits.length ? (
          <p class="muted" style={`font-size: ${compact ? 13 : 14}px`}>{compact ? 'No damage to you since your last turn.' : 'None of them hurt you.'}</p>
        ) : compact ? (
          <p style="font-size: 13px; line-height: 1.4"><span class="muted">Since your last turn: </span>
            {hits.map((h, i) => <span key={h.seat}>{i > 0 && ' · '}<span style={`font-weight: 700; color: ${SEATS[h.seat].light}`}>{g.fish[h.seat].name}</span> −{h.n}</span>)}
          </p>
        ) : (
          <ul style="display: flex; flex-direction: column; gap: 4px">
            {hits.map((h) => (
              <li key={h.seat} style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 14px">
                <span style={`font-weight: 700; color: ${SEATS[h.seat].light}`}>{g.fish[h.seat].name}</span>
                <span class="num" style="font-weight: 700">−{h.n}</span>
              </li>
            ))}
            {hits.length > 1 && (
              <li style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px solid #1E3844; font-size: 14px">
                <span class="muted">You lost</span>
                <span class="num" style="font-weight: 800">{lostTotal}</span>
              </li>
            )}
          </ul>
        )}
      </section>
      {!compact && <div style="margin-top: auto">{undoButton(false)}</div>}
    </article>
  );
  const lastCard = (compact: boolean) => phase === 'you' ? yourCard(compact) : (
    <article aria-live="polite" class="table-card" style={`border-color: ${cardColor}; ${compact ? 'padding: 10px 12px 12px 14px; border-radius: 18px; gap: 6px' : ''}`}>
      {compact ? (
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
          <span style={`font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${cardLight}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}>{last ? g.fish[last.fish].name + ' · Turn ' + last.round + ' · ' + cat.label : 'Goldfish'}</span>
          <RerollUndo game={game} compact border={cardColor} />
        </div>
      ) : last && (
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
          <span style={`font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${cardLight}`}>{g.fish[last.fish].name} · Turn {last.round}</span>
          <div style="display: flex; align-items: center; gap: 6px">
            <span class="tag dark sm"><span class="dot" style={`background: ${cat.color}`} />{cat.label}</span>
            <span title="Mana spent" class="cost" style="width: 26px; height: 26px; font-size: 12px">{last.cost}</span>
          </div>
        </div>
      )}
      {last ? (
        <div style={`display: flex; flex-direction: column; gap: ${compact ? 6 : 10}px; flex-grow: 1`}>
          <h2 class="display" style={`font-size: ${compact ? 21 : 26}px; line-height: 1.1; text-wrap: balance`}>{last.name}</h2>
          {target && (
            <span class="aim" style={`border-color: ${target.color}; color: ${target.light}`}>Aimed at {target.name}</span>
          )}
          <div style="display: flex; flex-direction: column; gap: 3px">
            {!compact && <span class="eyebrow" style="font-size: 12px; font-weight: 700">What you do</span>}
            <p style={`font-size: ${compact ? 14 : 15}px; line-height: 1.4`}>{last.you}</p>
          </div>
          <ol class="steps" style={`border-top-color: #2A2A28; padding-top: ${compact ? 6 : 10}px; gap: ${compact ? 3 : 6}px`}>
            {last.steps.map((sp, i) => (
              <li key={i} style={`grid-template-columns: ${compact ? 54 : 62}px minmax(0, 1fr); gap: ${compact ? 6 : 8}px; font-size: ${compact ? 12 : 13}px`}><span>{sp.k}</span><span>{sp.v}</span></li>
            ))}
          </ol>
        </div>
      ) : (
        <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px">
          {!compact && <h2 class="display" style="font-size: 26px">{phase === 'start' ? 'Goldfish first' : 'Your turn first'}</h2>}
          <p class="soft" style="font-size: 14px; line-height: 1.45">
            {phase === 'start'
              ? 'The goldfish seated before you play first. Tap the button below to start.'
              : 'Play your turn, then hit End your turn. Each goldfish then plays in seat order, one at a time.'}
          </p>
        </div>
      )}
      {!compact && <RerollUndo game={game} border={cardColor} />}
    </article>
  );
  const youPads = (w: number) => (
    <div style="display: flex; gap: 6px">
      <button type="button" class="pad" style={`width: ${w}px; font-size: 15px`} aria-label="Lose 5 life" onClick={() => game.edit({ k: 'youLife', delta: -5 })}>−5</button>
      <button type="button" class="pad" style={`width: ${w}px; font-size: 15px`} aria-label="Lose 1 life" onClick={() => game.edit({ k: 'youLife', delta: -1 })}>−1</button>
      <button type="button" class="pad" style={`width: ${w}px; font-size: 15px`} aria-label="Gain 1 life" onClick={() => game.edit({ k: 'youLife', delta: 1 })}>+1</button>
    </div>
  );
  const powerRow = (
    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px" class="muted">
      <span>Your commander power</span>
      <MiniStep value={g.power} downLabel="Lower your commander power" upLabel="Raise your commander power" onDown={() => game.edit({ k: 'power', delta: -1 })} onUp={() => game.edit({ k: 'power', delta: 1 })} />
    </div>
  );
  const cta = (big: boolean) => (
    <button type="button" class="cta" style={`background: ${ctaBg}; color: #0B1A20; ${big ? '' : 'height: 60px; border-radius: 16px; gap: 1px'}`} onClick={game.advance}>
      <span class="display" style={`font-size: ${big ? 22 : 19}px; letter-spacing: 0`}>{ctaTitle}</span>
      {ctaSub && <span style="font-size: 13px; font-weight: 600; opacity: 0.8">{ctaSub}</span>}
    </button>
  );

  if (!desktop) {
    const selIdx = Math.min(sel, n - 1);
    const v = fishView(g.fish[selIdx], selIdx);
    return (
      <div class="page game-m">
        <header class="m-header" style="height: 56px; padding: 0 8px 0 16px">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0">
            <span class="display" style="font-size: 20px; white-space: nowrap">Round {g.round}</span>
            <span style={`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${turnLight}; white-space: nowrap`}><span class="dot" style={`background: ${turnColor}`} />{turnLabel}</span>
          </div>
          <GameNav game={game} mobile />
        </header>
        <main class="game-m-main" style="gap: 10px">
          <div role="tablist" aria-label="Goldfish" style={`flex-shrink: 0; display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: 8px`}>
            {g.fish.map((f, i) => {
              const on = i === selIdx;
              return (
                <button key={i} type="button" role="tab" aria-selected={on} class="fish-tab" onClick={() => setSel(i)}
                  style={`border-color: ${on ? SEATS[i].color : '#1E3844'}; background: ${on ? SEATS[i].tint : '#10232B'}; opacity: ${f.alive ? 1 : 0.5}`}>
                  <span style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 4px">
                    <span style={`display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 800; color: ${SEATS[i].light}; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}><span class="dot" style={`width: 7px; height: 7px; background: ${SEATS[i].color}`} />{f.name}</span>
                    {phase === i && !g.over && <span class="turn-flag" style={`background: ${SEATS[i].color}`}>TURN</span>}
                  </span>
                  <span style="display: flex; align-items: baseline; gap: 6px">
                    <span class="display" style="font-size: 26px; line-height: 1">{f.alive ? f.life : 'Out'}</span>
                    <span class="muted" style="font-size: 11px">{f.alive ? 'cmdr ' + f.fromYou : 'T' + (f.out?.round ?? '')}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <section aria-label={v.f.name} class="panel" style={`position: relative; flex-shrink: 0; padding: 12px 14px 14px; border-radius: 18px; border: 2px solid ${v.seat.color}; display: flex; flex-direction: column; gap: 10px`}>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <span style="display: inline-flex; align-items: baseline; gap: 8px; min-width: 0">
                <span class="display" style={`font-size: 18px; letter-spacing: 0; color: ${v.seat.light}`}>{v.f.name}</span>
                <span class="muted" style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{v.profileName}</span>
              </span>
              {v.f.counter && <span class="badge-counter" style="height: 24px; padding: 0 8px; font-size: 11px">Counter up</span>}
            </div>
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 156px; gap: 12px">
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span class="muted" style="font-size: 12px; font-weight: 600">Life</span>
                <span aria-live="polite" class="display num" style="font-size: 76px; line-height: 0.95; letter-spacing: -0.04em">{v.f.life}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px">
                <div style="display: flex; flex-direction: column; gap: 5px">
                  <div style="display: flex; align-items: baseline; justify-content: space-between">
                    <span style="font-size: 12px; font-weight: 600; color: var(--teal-light)">Your cmdr dmg</span>
                    <span style="font-size: 14px; font-weight: 800">{v.f.fromYou}<span class="muted" style="font-weight: 600">/21</span></span>
                  </div>
                  <div class="bar" style="height: 5px" aria-hidden="true"><div style={`width: ${v.pct}`} /></div>
                  <button type="button" class="btn-teal" onClick={v.cmdHit}>Hit for {g.power}</button>
                </div>
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: var(--land)"><Land size={15} /><span style="font-size: 17px; font-weight: 800; color: var(--text)">{v.f.lands}</span> lands</span>
              </div>
            </div>
            {pads(v)}
            <div style="display: flex; flex-direction: column; gap: 6px">
              <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px">
                <span class="eyebrow" style="font-size: 11px">Board · tap if dead</span>
                <span style={`font-size: 11px; font-weight: 600; color: ${v.seat.light}`}>{v.zone}</span>
              </div>
              {v.f.creatures.length ? (
                <ul class="swipe board-list" style="margin: -8px -14px; padding: 8px 14px; min-height: 92px; gap: 12px">{creatureButtons(v, 76, 58)}</ul>
              ) : (
                <div class="empty-board" style="height: 58px; font-size: 13px">No creatures</div>
              )}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <span class="muted" style="font-size: 12px">Its cmdr dmg to you <strong style="font-size: 15px; color: var(--text)">{v.f.toYou}</strong>/21</span>
              <button type="button" class="seat-outline" style={`border-color: ${v.seat.color}; color: ${v.seat.light}`} disabled={!v.f.cmd.onBoard || !v.f.alive} onClick={v.hitYou}>It hit you for {v.cmdPow}</button>
            </div>
            {outOverlay(v, 16)}
          </section>

          {lastCard(true)}

          <section aria-label="You" class="panel" style="flex-shrink: 0; padding: 8px 8px 8px 14px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <div style="display: flex; align-items: center; gap: 10px">
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--teal-light)"><span class="dot" style="background: var(--teal)" />You</span>
                <span aria-live="polite" class="display num" style="font-size: 32px; line-height: 1">{g.you}</span>
              </div>
              {youPads(48)}
            </div>
            <div style="padding-right: 6px">{powerRow}</div>
          </section>

          {cta(false)}
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
          <span class="turn-pill" style={`background: #0F2129; border: 1px solid ${turnColor}; color: ${turnLight}`}><span class="dot" style={`background: ${turnColor}`} />{turnLabel}</span>
        </div>
        <nav aria-label="Game" class="topnav" style="flex: 1 1 0">
          <span class="tag" style="height: 32px; border-radius: 16px">{passive ? 'Passive' : modeLabel(g, false) + ' · ' + (spread ? 'Spread out' : 'All on you')}</span>
          <GameNav game={game} />
        </nav>
      </header>

      <main class="game-d-main" style="grid-template-columns: minmax(0, 1fr) 400px">
        <div style={`min-height: 0; display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: 16px`}>
          {g.fish.map((f, i) => {
            const v = fishView(f, i);
            return (
              <article key={i} aria-label={f.name} class="panel fish-col" style={`border: 2px solid ${v.isTurn ? v.seat.color : '#1E3844'}`}>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px">
                  <div style="display: flex; align-items: center; gap: 10px; min-width: 0">
                    <span style={`width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px; background: ${v.seat.tint}; display: flex; align-items: center; justify-content: center`}><FishLogo size={20} color={v.seat.color} eye={false} sw={2.2} /></span>
                    <div style="display: flex; flex-direction: column; min-width: 0">
                      <h2 class="display" style={`font-size: 20px; line-height: 1.1; letter-spacing: 0; color: ${v.seat.light}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}>{f.name}</h2>
                      <span class="muted" style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{v.profileName}</span>
                    </div>
                  </div>
                  {v.isTurn && <span class="turn-flag" style={`height: 26px; padding: 0 10px; border-radius: 13px; font-size: 12px; background: ${v.seat.color}`}>Its turn</span>}
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px">
                  <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 8px">
                    <div style="display: flex; flex-direction: column; gap: 2px">
                      <span class="muted" style="font-size: 12px; font-weight: 600">Life</span>
                      <span aria-live="polite" class="display num" style="font-size: 64px; line-height: 0.95; letter-spacing: -0.04em">{f.life}</span>
                    </div>
                    <span style="padding-bottom: 6px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--land)"><Land size={16} /><span style="font-size: 18px; font-weight: 800; color: var(--text)">{f.lands}</span> lands</span>
                  </div>
                  {pads(v)}
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px">
                  <div style="display: flex; align-items: baseline; justify-content: space-between">
                    <span style="font-size: 12px; font-weight: 600; color: var(--teal-light)">Your commander damage</span>
                    <span style="font-size: 15px; font-weight: 800">{f.fromYou}<span class="muted" style="font-weight: 600"> / 21</span></span>
                  </div>
                  <div class="bar" aria-hidden="true"><div style={`width: ${v.pct}`} /></div>
                  <button type="button" class="btn-teal" onClick={v.cmdHit}>Your commander hits for {g.power}</button>
                </div>

                <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px">
                  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px">
                    <span class="eyebrow" style="font-size: 12px">Board</span>
                    <span style={`display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: ${v.seat.light}`}><Crown size={14} />{v.zone}</span>
                  </div>
                  {f.creatures.length ? (
                    <ul class="board-list" style="flex-wrap: wrap; gap: 12px; overflow: auto; min-height: 0; margin: -8px 0; padding: 8px 8px 8px 0">{creatureButtons(v, 84, 64)}</ul>
                  ) : (
                    <div class="empty-board" style="height: 64px; font-size: 13px">No creatures</div>
                  )}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid var(--line); flex-wrap: wrap">
                  <span class="muted" style="font-size: 12px">Its cmdr damage to you <strong style="font-size: 15px; color: var(--text)">{f.toYou}</strong>/21</span>
                  <button type="button" class="seat-outline" style={`border-color: ${v.seat.color}; color: ${v.seat.light}`} disabled={!f.cmd.onBoard || !f.alive} onClick={v.hitYou}>It hit you for {v.cmdPow}</button>
                </div>
                {f.counter && <span class="badge-counter" style="align-self: flex-start; height: 28px; padding: 0 10px; font-size: 12px">Holding up a counterspell</span>}
                {outOverlay(v, 18)}
              </article>
            );
          })}
        </div>

        <div style="min-height: 0; display: flex; flex-direction: column; gap: 14px">
          <ol aria-label="Turn order" class="order" style={`grid-template-columns: repeat(${seats.length}, minmax(0, 1fr))`}>
            {seats.map((st) => (
              <li key={st.key} style={`background: ${st.on ? '#183240' : 'transparent'}; border-color: ${st.on ? st.dot : 'transparent'}; color: ${st.out ? '#5F7572' : st.done ? '#9FB6B3' : '#EDF3F0'}; text-decoration: ${st.out ? 'line-through' : 'none'}`}>
                <span class="dot" style={`background: ${st.dot}`} />{st.name}
              </li>
            ))}
          </ol>

          {lastCard(false)}

          <section aria-label="This round" class="panel" style="flex-shrink: 0; padding: 12px 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px">
            <span class="eyebrow" style="font-size: 12px">{phase === 'you' ? 'Last round' : 'This round'}</span>
            <ul style="display: flex; flex-direction: column; gap: 4px">
              {summary.map((r, i) => (
                <li key={i} style="display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 8px; font-size: 13px; line-height: 1.35">
                  <span style={`font-weight: 700; color: ${r.light}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}>{r.name}</span>
                  <span style={`color: ${r.bright ? '#EDF3F0' : '#9FB6B3'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}>{r.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="You" class="panel" style="flex-shrink: 0; padding: 12px 16px 14px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
              <div style="display: flex; align-items: center; gap: 12px">
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--teal-light)"><span class="dot" style="width: 10px; height: 10px; background: var(--teal)" />You</span>
                <span aria-live="polite" class="display num" style="font-size: 44px; line-height: 1">{g.you}</span>
              </div>
              {youPads(50)}
            </div>
            {powerRow}
          </section>

          {cta(true)}
        </div>
      </main>
      {game.dialogs}
    </div>
  );
}
