import { HEROES } from './roster';
import { getHeroStats } from './heroStats';
import { FIRST, SECOND } from './leaderboard';
import { between, hash, pick, rng } from '../lib/prng';

/**
 * Livestreams of Deadlock. The fixture is a set of invented channels (no real streamers, no network requests); the
 * live source reads Broadway's own /streams endpoint (server/proxy.mjs), which asks Twitch for the live Deadlock
 * category with credentials that never reach the browser.
 */

export interface LiveStream {
  id: string;
  /** Twitch login name, used for the channel link and the embed. */
  channel: string;
  /** Display name. */
  name: string;
  title: string;
  viewers: number;
  language: string;
  /** Stream preview image URL. Absent for sample streams, which use hero art instead. */
  thumbnail?: string;
  /** Hero shown on sample streams (their stand-in artwork). */
  heroSlug?: string;
  /** Unix seconds the stream went live. */
  startedAt?: number;
  illustrative: boolean;
}

const LANGS = ['en', 'en', 'en', 'en', 'es', 'pt', 'ru', 'fr', 'de', 'ko', 'zh', 'ja'];
export const LANG_NAME: Record<string, string> = { en: 'English', es: 'Spanish', pt: 'Portuguese', ru: 'Russian', fr: 'French', de: 'German', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
const TITLES = [
  'Eternus climb, one hero all night', 'Learning Deadlock from zero: day {n}', 'Road to Ascendant with chat picking builds', 'Spirit builds only, no excuses',
  'Duo queue with the lane partner', 'Reviewing viewer replays', 'Street Brawl high rolls', 'Unranked experiments and tier 4 tests',
  'Late-night ranked, come say hi', 'Patch day: testing the changes', 'Off-meta picks that actually work', 'Smurfing in the Initiate lobbies (not really)',
];
const BOOT = Math.floor(Date.now() / 1000);

export function sampleStreams(count = 12): LiveStream[] {
  const heroes = HEROES.filter((h) => !h.unreleased && getHeroStats(h.slug)).map((h) => h.slug);
  const used = new Set<string>();
  const usedHeroes = new Set<string>();
  const out: LiveStream[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng(hash(`stream:${i}`));
    let a = ''; let b = '';
    do { a = pick(r, FIRST); b = pick(r, SECOND); } while (used.has(a + b));
    used.add(a + b);
    let hero = pick(r, heroes);
    while (usedHeroes.has(hero) && usedHeroes.size < heroes.length) hero = pick(r, heroes);
    usedHeroes.add(hero);
    const name = `${a}${b}`.replace(/-/g, '');
    out.push({
      id: `sample-${i}`,
      channel: name.toLowerCase(),
      name,
      title: pick(r, TITLES).replace('{n}', String(2 + Math.floor(r() * 40))),
      viewers: Math.round(between(r, 0, 1) ** 2.4 * 4200) + 8,
      language: pick(r, LANGS),
      heroSlug: hero,
      startedAt: BOOT - Math.round(between(r, 600, 3600 * 6)),
      illustrative: true,
    });
  }
  return out.sort((x, y) => y.viewers - x.viewers);
}

interface RawStream { id?: string; channel?: string; user_login?: string; name?: string; user_name?: string; title?: string; viewers?: number; viewer_count?: number; language?: string; thumbnail?: string; thumbnail_url?: string; startedAt?: number; started_at?: string }

/** Reads the proxy's /streams answer (or a raw Twitch Helix list). Anything without a channel is dropped. */
export function normalizeStreams(raw: unknown): LiveStream[] {
  const list: RawStream[] = Array.isArray(raw) ? raw : Array.isArray((raw as { streams?: unknown })?.streams) ? ((raw as { streams: RawStream[] }).streams) : [];
  const out: LiveStream[] = [];
  for (const s of list) {
    const channel = (s.channel ?? s.user_login ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_]{1,25}$/.test(channel)) continue;
    const thumb = (s.thumbnail ?? s.thumbnail_url)?.replace('{width}', '440').replace('{height}', '248');
    const started = s.startedAt ?? (s.started_at ? Math.floor(Date.parse(s.started_at) / 1000) : undefined);
    out.push({
      id: String(s.id ?? channel),
      channel,
      name: (s.name ?? s.user_name ?? channel).trim() || channel,
      title: (s.title ?? '').trim() || 'Live on Twitch',
      viewers: Math.max(0, Math.round(s.viewers ?? s.viewer_count ?? 0)),
      language: (s.language ?? '').toLowerCase().slice(0, 5) || 'en',
      thumbnail: thumb && /^https:\/\//.test(thumb) ? thumb : undefined,
      startedAt: Number.isFinite(started) ? started : undefined,
      illustrative: false,
    });
  }
  return out.sort((a, b) => b.viewers - a.viewers);
}

/** Embed address for Twitch's player. `parent` must be the site's own host name. */
export const embedUrl = (channel: string, parent: string): string => `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&muted=true`;
