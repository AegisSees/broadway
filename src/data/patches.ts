import type { PatchEntry } from '../api/types';

/** One post from the game's news feed (/v2/patches). */
export interface PatchNote {
  title: string;
  /** Unix seconds. */
  date: number;
  link: string;
  source: 'steam' | 'forum';
  /** First few sentences as plain text. */
  excerpt: string;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&apos;': "'" };

/** Strips tags and entities from the feed's HTML and shortens it to whole words. Never returns markup. */
export function plainExcerpt(html: string | undefined, max = 180): string {
  if (!html) return '';
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|div|h\d)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[^>]*$/, ' ') // a tag cut off at the end of a shortened post
    .replace(/[<>]/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** Newest first. Posts without a usable date or a web link are dropped. */
export function normalizePatches(raw: readonly PatchEntry[] | null | undefined): PatchNote[] {
  const out: PatchNote[] = [];
  for (const p of raw ?? []) {
    const ms = Date.parse(p.pub_date);
    if (!Number.isFinite(ms) || !/^https?:\/\//.test(p.link ?? '')) continue;
    out.push({
      title: (p.title ?? '').trim() || 'Update',
      date: Math.floor(ms / 1000),
      link: p.link,
      source: p.source === 'forum' ? 'forum' : 'steam',
      excerpt: plainExcerpt(p.content),
    });
  }
  return out.sort((a, b) => b.date - a.date);
}
