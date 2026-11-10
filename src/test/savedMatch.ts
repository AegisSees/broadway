import raw from '../../api-samples/match-metadata.json';
import type { MatchMetadataRaw } from '../api/types';
import type { HeroIdMap } from '../data/heroIds';
import { normalizeMatch, type MatchDetail } from '../data/matchDetail';

/**
 * TEST HELPER ONLY. One real ranked game, saved from the live API on 8 Oct 2026, so tests can run the match code on a
 * real response without the network. Nothing under src/test may be imported by the site itself (noMockData.test.ts
 * checks this).
 */
const SLUGS: Record<number, string> = {
  4: 'lady-geist', 11: 'dynamo', 14: 'holliday', 17: 'grey-talon', 20: 'ivy', 27: 'yamato',
  65: 'venator', 66: 'victor', 67: 'paige', 76: 'graves', 84: 'rat-king', 88: 'baba',
};
const BY_SLUG = new Map(Object.entries(SLUGS).map(([id, slug]) => [slug, Number(id)]));
const ids: HeroIdMap = { slugById: (id) => SLUGS[id], idBySlug: (slug) => BY_SLUG.get(slug) };

export function savedMatchDetail(id: number): MatchDetail {
  return { ...normalizeMatch(raw as unknown as MatchMetadataRaw, ids), id };
}
