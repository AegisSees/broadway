const STEAM64_BASE = 76561197960265728n;

/**
 * The Deadlock API identifies players by 32-bit account id. People paste either that or a
 * 17-digit SteamID64, so accept both. Returns null when the text is not a usable id.
 */
export function toAccountId(text: string): number | null {
  const t = text.trim();
  if (!/^\d{5,17}$/.test(t)) return null;
  const n = BigInt(t);
  const account = n >= STEAM64_BASE ? n - STEAM64_BASE : n;
  if (account <= 0n || account > 0xffffffffn) return null;
  return Number(account);
}

export const looksLikeSteamId = (text: string): boolean => toAccountId(text) !== null;

/** The 17-digit SteamID64 for an account id, as a string (it does not fit in a JavaScript number). */
export function toSteam64(accountId: number): string {
  return (STEAM64_BASE + BigInt(accountId)).toString();
}

export const steamProfileUrl = (accountId: number): string => `https://steamcommunity.com/profiles/${toSteam64(accountId)}`;

export type SteamInput = { accountId: number } | { vanity: string } | null;

/**
 * Reads whatever a person pastes to identify themselves: an account id, a SteamID64, a steamcommunity.com profile
 * link, or a SteamID in the old (STEAM_0:1:123) or new ([U:1:123]) text forms. A link that uses a custom name
 * (steamcommunity.com/id/name) cannot be turned into an id without asking Steam, so it comes back as `vanity`.
 */
export function parseSteamInput(text: string): SteamInput {
  const t = text.trim();
  if (!t) return null;
  const direct = toAccountId(t);
  if (direct !== null) return { accountId: direct };
  const s3 = /^\[?U:1:(\d{1,10})\]?$/i.exec(t);
  if (s3) { const n = Number(s3[1]); return n > 0 ? { accountId: n } : null; }
  const s2 = /^STEAM_[0-5]:([01]):(\d{1,10})$/i.exec(t);
  if (s2) { const n = Number(s2[2]) * 2 + Number(s2[1]); return n > 0 ? { accountId: n } : null; }
  const url = /(?:^|\/\/|\.)steamcommunity\.com\/(profiles|id)\/([^/?#\s]+)/i.exec(t);
  if (url) {
    if (url[1].toLowerCase() === 'profiles') { const id = toAccountId(url[2]); return id === null ? null : { accountId: id }; }
    return { vanity: decodeURIComponent(url[2]) };
  }
  return null;
}

/** Only ever link out to Steam itself: addresses come from an API response, so anything else is dropped. */
export function safeSteamHref(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'steamcommunity.com' || u.hostname.endsWith('.steamcommunity.com')) ? u.toString() : null;
  } catch {
    return null;
  }
}
