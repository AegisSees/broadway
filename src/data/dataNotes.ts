import { useSyncExternalStore } from 'react';

/**
 * A running log of everything the site left out of its numbers, and why. The About page prints it.
 *
 * Whenever a calculation drops something (a hero id the site does not know, a hero with too few games to rank, an item
 * with too few purchases), it writes one line here. Each line has a fixed `id`, so loading the same page twice updates
 * the line instead of adding a second one.
 */
export interface DataNote {
  id: string;
  /** What was left out, in plain words. */
  text: string;
  /** How many things the line covers. */
  count: number;
}

const notes = new Map<string, DataNote>();
const listeners = new Set<() => void>();
let snapshot: DataNote[] = [];

export function noteDropped(id: string, text: string, count: number): void {
  const old = notes.get(id);
  if (count <= 0) {
    if (!old) return;
    notes.delete(id);
  } else {
    if (old && old.text === text && old.count === count) return;
    notes.set(id, { id, text, count });
  }
  snapshot = [...notes.values()];
  listeners.forEach((l) => l());
}

export function clearDataNotes(): void {
  notes.clear();
  snapshot = [];
  listeners.forEach((l) => l());
}

export const getDataNotes = (): DataNote[] => snapshot;

export function useDataNotes(): DataNote[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getDataNotes, getDataNotes);
}
