/** The last few players someone opened, kept in this browser only. Storage can be blocked, so every call is wrapped. */
const KEY = 'broadway-recent-players-v1';
const MAX = 8;

export interface RecentPlayer { accountId: number; name: string; avatar?: string; at: number }

export function readRecent(): RecentPlayer[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r): r is RecentPlayer => !!r && typeof (r as RecentPlayer).accountId === 'number' && typeof (r as RecentPlayer).name === 'string')
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberPlayer(p: Omit<RecentPlayer, 'at'>): void {
  try {
    const next = [{ ...p, at: Date.now() }, ...readRecent().filter((r) => r.accountId !== p.accountId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* history just will not be kept */ }
}

export function forgetPlayers(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
