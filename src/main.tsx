import { render } from 'preact';
import './styles.css';
import { App } from './app';
import type { Backend } from './data/backend';

async function boot() {
  // `npm run dev:local` swaps Firebase for a localStorage stand-in; production builds drop it.
  const backend: Backend = import.meta.env.MODE === 'sandbox'
    ? (await import('./data/local')).localBackend
    : (await import('./data/firebase')).firebaseBackend;
  render(<App backend={backend} />, document.getElementById('app')!);
}
boot();
