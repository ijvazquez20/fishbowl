import type { JSX } from 'preact';

interface P { size?: number; color?: string; sw?: number; style?: string | JSX.CSSProperties; class?: string }

function Stroke({ d, size = 18, color = 'currentColor', sw = 2, style, class: cls }: P & { d: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style={style} class={cls}>
      <path d={d} />
    </svg>
  );
}

const FISH = 'M2.5 12c2.8-4.2 8.5-5.6 12.8-2.6L21 6v12l-5.7-3.4C11 17.6 5.3 16.2 2.5 12z';
export const FishLogo = ({ size = 28, color = '#FF8B3D', eye = true, sw = 2 }: P & { eye?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={FISH} />
    {eye && <circle cx="7.5" cy="11" r="0.9" fill={color} />}
  </svg>
);
export const Crown = (p: P) => <Stroke d="M3 18h18M4 15l-1-8 5 4 4-7 4 7 5-4-1 8z" {...p} />;
export const Heart = (p: P) => <Stroke d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" {...p} />;
export const Land = (p: P) => <Stroke d="M2 20l7-12 4 6.5 2.5-4L22 20z" {...p} />;
export const Shield = (p: P) => <Stroke d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" {...p} />;
export const Reroll = (p: P) => <Stroke d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" sw={2.2} {...p} />;
export const Undo = (p: P) => <Stroke d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" sw={2.2} {...p} />;
export const Back = (p: P) => <Stroke d="M19 12H5M11 18l-6-6 6-6" sw={2.2} {...p} />;
export const Arrow = (p: P) => <Stroke d="M5 12h14M13 6l6 6-6 6" sw={2.4} {...p} />;
export const Chev = (p: P) => <Stroke d="M9 6l6 6-6 6" sw={2.2} {...p} />;
export const ChevDown = (p: P) => <Stroke d="M6 9l6 6 6-6" sw={2.4} {...p} />;
export const Plus = (p: P) => <Stroke d="M12 5v14M5 12h14" sw={2.4} {...p} />;
export const Trash = (p: P) => <Stroke d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...p} />;
export const List = (p: P) => <Stroke d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" {...p} />;
export const Bars = (p: P) => <Stroke d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p} />;
export const Cards = (p: P) => <Stroke d="M9 3h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 7v11a3 3 0 0 0 3 3h8" {...p} />;
export const Play = (p: P) => <Stroke d="M7 4.5v15l12.5-7.5z" {...p} />;
export const Flag = (p: P) => <Stroke d="M5 21V4M5 4h12l-2.5 4 2.5 4H5" {...p} />;
export const Dots = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

/** The fishbowl illustration from the setup screen: one goldfish, or a table of three. */
export function Bowl({ size = 300, table = false }: { size?: number; table?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 360 360" fill="none" aria-hidden="true">
      <path d="M112 62 C 18 110, 22 332, 180 342 C 338 332, 342 110, 248 62" stroke="#2C4B58" stroke-width="4" stroke-linecap="round" />
      <path d="M98 58 H262" stroke="#2C4B58" stroke-width="6" stroke-linecap="round" />
      <path d="M50 150 q 32 -14 64 0 t 64 0 t 64 0 t 64 0" stroke="#62D2C3" stroke-width="3" stroke-linecap="round" opacity="0.7" />
      {table ? (
        <g>
          <ellipse cx="128" cy="206" rx="36" ry="22" fill="#FF8B3D" />
          <path d="M160 206 L190 186 L185 206 L190 226 Z" fill="#FF8B3D" stroke="#FF8B3D" stroke-width="3" stroke-linejoin="round" />
          <circle cx="111" cy="202" r="4" fill="#0B1A20" />
          <ellipse cx="236" cy="236" rx="34" ry="21" fill="#6FA8FF" />
          <path d="M204 236 L176 218 L180 236 L176 254 Z" fill="#6FA8FF" stroke="#6FA8FF" stroke-width="3" stroke-linejoin="round" />
          <circle cx="252" cy="232" r="4" fill="#0B1A20" />
          <ellipse cx="150" cy="286" rx="30" ry="18" fill="#F472B6" />
          <path d="M177 286 L202 270 L198 286 L202 302 Z" fill="#F472B6" stroke="#F472B6" stroke-width="3" stroke-linejoin="round" />
          <circle cx="136" cy="283" r="3.5" fill="#0B1A20" />
          <circle cx="96" cy="170" r="5" stroke="#62D2C3" stroke-width="2.5" />
          <circle cx="262" cy="196" r="4" stroke="#62D2C3" stroke-width="2.5" />
          <circle cx="270" cy="176" r="3" stroke="#62D2C3" stroke-width="2.5" />
          <ellipse cx="130" cy="322" rx="16" ry="7" fill="#1E3844" />
          <ellipse cx="206" cy="326" rx="18" ry="7" fill="#1E3844" />
          <ellipse cx="240" cy="318" rx="10" ry="5" fill="#25424F" />
        </g>
      ) : (
        <g>
          <ellipse cx="170" cy="236" rx="60" ry="36" fill="#FF8B3D" />
          <path d="M224 236 L272 200 L264 236 L272 272 Z" fill="#FF8B3D" stroke="#FF8B3D" stroke-width="4" stroke-linejoin="round" />
          <path d="M158 202 q 20 -24 42 -6" stroke="#FF8B3D" stroke-width="6" stroke-linecap="round" />
          <circle cx="138" cy="228" r="6" fill="#0B1A20" />
          <path d="M150 256 q 10 6 22 2" stroke="#0B1A20" stroke-width="3" stroke-linecap="round" opacity="0.5" />
          <circle cx="104" cy="200" r="7" stroke="#62D2C3" stroke-width="2.5" />
          <circle cx="90" cy="176" r="4.5" stroke="#62D2C3" stroke-width="2.5" />
          <circle cx="102" cy="160" r="3" stroke="#62D2C3" stroke-width="2.5" />
          <ellipse cx="130" cy="322" rx="16" ry="7" fill="#1E3844" />
          <ellipse cx="164" cy="328" rx="12" ry="6" fill="#25424F" />
          <ellipse cx="206" cy="326" rx="18" ry="7" fill="#1E3844" />
          <ellipse cx="240" cy="318" rx="10" ry="5" fill="#25424F" />
        </g>
      )}
    </svg>
  );
}
