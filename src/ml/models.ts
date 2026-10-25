import { useEffect, useState } from 'react';
import type { CentroidModel, ItemTableModel, LinearModel, MatchupModel } from '../../ml/web/score';

/**
 * The seven trained models (ml/models/*.json, written by `python -m broadway_ml.train`), loaded on first use. They are
 * read as raw text so TypeScript does not have to infer a type for 650 KB of JSON, and so each one becomes its own
 * chunk in the normal build (the standalone build inlines them like everything else). Retraining updates the site:
 * nothing is copied into src/.
 */
export interface Models {
  draft: LinearModel;
  live: LinearModel;
  builds: ItemTableModel;
  topItems: ItemTableModel;
  matchups: MatchupModel;
  playstyle: CentroidModel;
  rank: LinearModel;
}
export type ModelName = keyof Models;

const SOURCES: Record<ModelName, () => Promise<{ default: string }>> = {
  draft: () => import('../../ml/models/draft_win.json?raw'),
  live: () => import('../../ml/models/live_win.json?raw'),
  builds: () => import('../../ml/models/build_recommender.json?raw'),
  topItems: () => import('../../ml/models/top_player_items.json?raw'),
  matchups: () => import('../../ml/models/matchups.json?raw'),
  playstyle: () => import('../../ml/models/playstyle.json?raw'),
  rank: () => import('../../ml/models/rank_estimate.json?raw'),
};

const cache = new Map<ModelName, Promise<unknown>>();
const ready = new Map<ModelName, unknown>();

export function loadModel<K extends ModelName>(name: K): Promise<Models[K]> {
  let p = cache.get(name);
  if (!p) {
    p = SOURCES[name]().then((m) => {
      const v = JSON.parse(m.default) as Models[K];
      ready.set(name, v);
      return v;
    });
    // a failed load (e.g. a dropped chunk request) can be retried on the next mount
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p as Promise<Models[K]>;
}

/** The model once it has loaded, null before (and if it fails to load, so the page simply leaves the feature out). */
export function useModel<K extends ModelName>(name: K): Models[K] | null {
  const [m, setM] = useState<Models[K] | null>(() => (ready.get(name) as Models[K] | undefined) ?? null);
  useEffect(() => {
    if (m) return;
    let live = true;
    loadModel(name).then((v) => live && setM(v), () => undefined);
    return () => { live = false; };
  }, [name, m]);
  return m;
}
