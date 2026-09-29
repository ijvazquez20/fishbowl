import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { COLOR_ORDER, PIPS } from '../engine/catalog';
import { useStore } from '../data/store';
import { href } from '../router';
import { Cards, ChevDown, FishLogo, List, Play, Plus } from './icons';

export type Section = 'decks' | 'profiles' | 'new';

/**
 * The same three links on every page. While a game is in progress (finished but unsaved counts),
 * "Back to game" takes New game's place, so a second game can't be started.
 */
export function MainNav({ current }: { current?: Section }) {
  const s = useStore();
  const here = (x: Section) => (current === x ? 'page' : undefined);
  return (
    <>
      <a href={href('/decks')} class="btn btn-ghost nav-link" aria-current={here('decks')}>Decks</a>
      <a href={href('/profiles')} class="btn btn-ghost nav-link" aria-current={here('profiles')}>Profiles</a>
      {s.game
        ? <a href={href('/game')} class="btn btn-primary"><Play size={16} />Back to game</a>
        : <a href={href('/')} class="btn btn-ghost btn-outline nav-link" aria-current={here('new')}>New game</a>}
    </>
  );
}

/** Phone version of MainNav: icon buttons for the page header. */
export function MobileNav({ current }: { current?: Section }) {
  const s = useStore();
  const here = (x: Section) => (current === x ? 'page' : undefined);
  return (
    <nav aria-label="Main" style="display: flex; align-items: center; gap: 2px; flex-shrink: 0">
      <a href={href('/decks')} class="icon-btn nav-link" aria-label="Decks" aria-current={here('decks')}><Cards size={22} /></a>
      <a href={href('/profiles')} class="icon-btn nav-link" aria-label="Opponent profiles" aria-current={here('profiles')}><List size={22} /></a>
      {s.game
        ? <a href={href('/game')} class="icon-btn nav-game" aria-label="Back to game"><Play size={20} /></a>
        : <a href={href('/')} class="icon-btn nav-link" aria-label="New game" aria-current={here('new')}><Plus size={22} /></a>}
    </nav>
  );
}

export function Brand({ sub, size = 28, to = '/' }: { sub?: string; size?: number; to?: string }) {
  return (
    <div style="display: flex; align-items: center; gap: 12px; min-width: 0">
      <a class="brand" href={href(to)} aria-label="Fishbowl home">
        <FishLogo size={size} />
        <span class="brand-name" style={size < 28 ? 'font-size: 20px' : undefined}>Fishbowl</span>
      </a>
      {sub && <span class="brand-sub">{sub}</span>}
    </div>
  );
}

export function TopBar({ sub, children, center }: { sub?: string; children?: ComponentChildren; center?: ComponentChildren }) {
  return (
    <header class="topbar">
      <div style="flex: 1 1 0; min-width: 0"><Brand sub={sub} /></div>
      {center}
      <nav aria-label="Main" class="topnav" style="flex: 1 1 0">{children}</nav>
    </header>
  );
}

export interface SegOption<T extends string | number> { id: T; label: string; aria?: string; disabled?: boolean }
export function Seg<T extends string | number>(props: {
  options: SegOption<T>[];
  value: T;
  onPick: (v: T) => void;
  class?: string;
  label?: string;
  labelledby?: string;
  style?: string;
}) {
  return (
    <div role="group" aria-label={props.label} aria-labelledby={props.labelledby} class={'seg ' + (props.class || '')} style={props.style}>
      {props.options.map((o) => (
        <button type="button" key={String(o.id)} aria-pressed={o.id === props.value} aria-label={o.aria} disabled={o.disabled} onClick={() => props.onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper(props: {
  value: ComponentChildren;
  onDown: () => void;
  onUp: () => void;
  downLabel: string;
  upLabel: string;
  valueStyle?: string;
  class?: string;
  style?: string;
  labelledby?: string;
}) {
  return (
    <div class={'stepper ' + (props.class || '')} style={props.style} role="group" aria-labelledby={props.labelledby}>
      <button type="button" aria-label={props.downLabel} onClick={props.onDown}>−</button>
      <span class="val" style={props.valueStyle}>{props.value}</span>
      <button type="button" aria-label={props.upLabel} onClick={props.onUp}>+</button>
    </div>
  );
}

export function MiniStep(props: { value: ComponentChildren; onDown: () => void; onUp: () => void; downLabel: string; upLabel: string }) {
  return (
    <div class="mini-step">
      <button type="button" aria-label={props.downLabel} onClick={props.onDown}>−</button>
      <span class="val">{props.value}</span>
      <button type="button" aria-label={props.upLabel} onClick={props.onUp}>+</button>
    </div>
  );
}

export function Switch({ on, small }: { on: boolean; small?: boolean }) {
  return <span class={'switch' + (on ? ' on' : '') + (small ? ' sm' : '')} aria-hidden="true"><span /></span>;
}

export function Pips({ colors, size = 22 }: { colors: string; size?: number }) {
  const list = COLOR_ORDER.split('').filter((c) => colors.includes(c));
  return (
    <>
      {list.map((c) => (
        <span key={c} style={`width: ${size}px; height: ${size}px; border-radius: 50%; background: ${PIPS[c].bg}; color: #1A1A1A; font-size: ${Math.round(size / 2)}px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0`}>{c}</span>
      ))}
    </>
  );
}
export function colorNames(colors: string): string {
  const n = COLOR_ORDER.split('').filter((c) => colors.includes(c)).map((c) => PIPS[c].label.toLowerCase());
  return n.length ? n.join(', ') : 'colorless';
}

export function SelectField(props: JSX.SelectHTMLAttributes<HTMLSelectElement> & { wrapStyle?: string }) {
  const { wrapStyle, class: cls, ...rest } = props;
  return (
    <div class="select-wrap" style={wrapStyle}>
      <select class={'field ' + (cls || '')} {...rest} />
      <ChevDown size={18} color="#9FB6B3" />
    </div>
  );
}

/** Modal with Escape to close and focus moved inside. */
export function Modal(props: {
  onClose?: () => void;
  labelledby: string;
  describedby?: string;
  alert?: boolean;
  sheet?: boolean;
  children: ComponentChildren;
  cardClass?: string;
  cardStyle?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input, [data-autofocus], button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.onClose) props.onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div class={'scrim' + (props.sheet ? ' sheet' : '')} onClick={(e) => { if (e.target === e.currentTarget && props.onClose) props.onClose(); }}>
      <div ref={ref} role={props.alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={props.labelledby} aria-describedby={props.describedby} class={props.cardClass ?? 'dialog'} style={props.cardStyle}>
        {props.children}
      </div>
    </div>
  );
}

export function Confirm(props: {
  title: string;
  text: string;
  confirm: string;
  cancel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal alert labelledby="confirm-title" describedby="confirm-text" onClose={props.onCancel} cardClass={'dialog' + (props.danger ? ' danger' : '')}>
      <h2 id="confirm-title" style="font-size: 26px">{props.title}</h2>
      <p id="confirm-text" style="font-size: 16px; line-height: 1.5; color: var(--soft)">{props.text}</p>
      <div class="dialog-actions" style="margin-top: 10px">
        <button type="button" class="btn btn-outline btn-md" data-autofocus onClick={props.onCancel}>{props.cancel || 'Cancel'}</button>
        <button type="button" class={'btn btn-md ' + (props.danger ? 'btn-danger' : 'btn-primary')} disabled={props.busy} onClick={props.onConfirm}>{props.confirm}</button>
      </div>
    </Modal>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <div style="min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px">
      <FishLogo size={40} />
      <div class="spinner" role="status" aria-label={text || 'Loading'} />
      {text && <p class="muted" style="font-size: 15px">{text}</p>}
    </div>
  );
}
