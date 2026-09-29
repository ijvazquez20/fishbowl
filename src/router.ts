import { useEffect, useState } from 'preact/hooks';

export interface Route { parts: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs || '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const href = (path: string) => '#' + path;
export function go(path: string) { location.hash = '#' + path; }

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setOn(m.matches);
    m.addEventListener('change', fn);
    fn();
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return on;
}
/** The desktop boards need about 1024px; narrower screens get the phone layouts. */
export const useDesktop = () => useMedia('(min-width: 1024px)');
