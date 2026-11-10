
/**
 * Livestreams of Deadlock. The live source reads Broadway's own /streams endpoint (server/proxy.mjs), which asks Twitch for the live Deadlock
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
  /** Stream preview image URL. */
  thumbnail?: string;
  /** Unix seconds the stream went live. */
  startedAt?: number;
}

export const LANG_NAME: Record<string, string> = { en: 'English', es: 'Spanish', pt: 'Portuguese', ru: 'Russian', fr: 'French', de: 'German', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
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
    });
  }
  return out.sort((a, b) => b.viewers - a.viewers);
}

/** Embed address for Twitch's player. `parent` must be the site's own host name. */
export const embedUrl = (channel: string, parent: string): string => `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&muted=true`;
