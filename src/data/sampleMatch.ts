import raw from '../../api-samples/match-metadata.json';
import type { MatchMetadataRaw } from '../api/types';
import type { HeroIdMap } from './heroIds';
import { normalizeMatch, type MatchDetail } from './matchDetail';

/**
 * The sample game shown in Sample data mode: one real ranked game (trimmed, saved from the live API on 8 Oct 2026) for any
 * match id. Its twelve hero ids are mapped by hand here because Sample mode never calls the API for the hero list.
 * Player names are not part of the game record; the page generates labelled sample names for these accounts.
 */
const SLUGS: Record<number, string> = {
  4: 'lady-geist', 11: 'dynamo', 14: 'holliday', 17: 'grey-talon', 20: 'ivy', 27: 'yamato',
  65: 'venator', 66: 'victor', 67: 'paige', 76: 'graves', 84: 'rat-king', 88: 'baba',
};
const BY_SLUG = new Map(Object.entries(SLUGS).map(([id, slug]) => [slug, Number(id)]));
const ids: HeroIdMap = { slugById: (id) => SLUGS[id], idBySlug: (slug) => BY_SLUG.get(slug) };

export function sampleMatchDetail(id: number): MatchDetail {
  return { ...normalizeMatch(raw as unknown as MatchMetadataRaw, ids, { illustrative: true }), id };
}
