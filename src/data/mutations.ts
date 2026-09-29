import { type Cat, type Profile, profileToStored } from '../engine/catalog';
import type { GameState } from '../engine/game';
import { toStored } from '../engine/record';
import type { StoredDeck } from './backend';
import { gamesForDeck, type Store } from './store';

export interface DeckDraft { name: string; commander: string; colors: string }

export function saveDeck(s: Store, id: string | null, draft: DeckDraft): Promise<string> {
  const deckId = id || s.backend.newKey();
  const existing = s.decks.find((d) => d.id === deckId);
  const deck: StoredDeck = {
    name: draft.name.trim(),
    commander: draft.commander.trim(),
    colors: draft.colors,
    createdAt: existing ? existing.d.createdAt : Date.now(),
  };
  return s.update({ ['decks/' + deckId]: deck }).then(() => deckId);
}

/** Deletes the deck with its saved games and their turn logs, in one atomic write. */
export function deleteDeck(s: Store, id: string) {
  const patch: Record<string, unknown> = { ['decks/' + id]: null };
  gamesForDeck(s, id).forEach((e) => { patch['games/' + e.id] = null; patch['rounds/' + e.id] = null; });
  return s.update(patch);
}

export async function saveGame(s: Store, g: GameState): Promise<string> {
  const id = g.id || s.backend.newKey();
  const { summary, rounds } = toStored(g, Date.now());
  await s.update({ ['games/' + id]: summary, ['rounds/' + id]: rounds });
  return id;
}

export function deleteGame(s: Store, id: string) {
  return s.update({ ['games/' + id]: null, ['rounds/' + id]: null });
}

export function setActionCost(s: Store, id: string, builtIn: boolean, cost: number) {
  const patch: Record<string, unknown> = { [`actions/${id}/cost`]: cost };
  if (builtIn) patch[`actions/${id}/builtIn`] = true;
  return s.update(patch);
}

/** Removes an action from every profile. Built-ins stay deleted; custom ones are erased. */
export function deleteAction(s: Store, id: string, builtIn: boolean) {
  const patch: Record<string, unknown> = { [`actions/${id}`]: builtIn ? { builtIn: true, deleted: true } : null };
  Object.entries(s.storedProfiles).forEach(([pid, p]) => {
    if (p?.on?.[id]) patch[`profiles/${pid}/on/${id}`] = null;
    if (p?.w?.[id] != null) patch[`profiles/${pid}/w/${id}`] = null;
  });
  return s.update(patch);
}

export interface ActionDraft { text: string; cat: Cat; cost: number; p: number; t: number }
/** Adds a custom action to every profile, switched on in `profile` only. */
export function addAction(s: Store, draft: ActionDraft, profile: Profile) {
  const id = s.backend.newKey();
  const action: Record<string, unknown> = { name: draft.text.trim(), cat: draft.cat, cost: draft.cost, builtIn: false, createdAt: Date.now() };
  if (draft.cat === 'creature') { action.p = draft.p; action.t = draft.t; }
  const updated: Profile = { ...profile, on: profile.on.concat([id]), w: { ...profile.w, [id]: 2 } };
  return s.update({ ['actions/' + id]: action, ['profiles/' + profile.id]: profileToStored(updated) });
}

export function saveProfile(s: Store, p: Profile) {
  return s.update({ ['profiles/' + p.id]: profileToStored(p) });
}

export function resetProfile(s: Store, id: string) {
  return s.update({ ['profiles/' + id]: null });
}

export async function createProfile(s: Store, from: Profile, name: string, desc: string): Promise<string> {
  const id = s.backend.newKey();
  const p: Profile = { id, name, desc, builtIn: false, on: from.on.slice(), w: { ...from.w }, createdAt: Date.now() };
  await saveProfile(s, p);
  return id;
}

export function deleteProfile(s: Store, id: string) {
  return s.update({ ['profiles/' + id]: null });
}
