import { describe, expect, it } from 'vitest';
import { toAccountId } from './steam';

describe('toAccountId', () => {
  it('passes through a 32-bit account id', () => expect(toAccountId('123456789')).toBe(123456789));
  it('converts a SteamID64', () => expect(toAccountId('76561198083722517')).toBe(123456789));
  it('rejects names and nonsense', () => {
    expect(toAccountId('Haze')).toBeNull();
    expect(toAccountId('1234')).toBeNull();
    expect(toAccountId('')).toBeNull();
    expect(toAccountId('99999999999999999')).toBeNull();
  });
});

import { looksLikeSteamId, parseSteamInput, safeSteamHref, steamProfileUrl, toSteam64 } from './steam';

describe('parseSteamInput', () => {
  it('reads account ids and SteamID64s', () => {
    expect(parseSteamInput('123456789')).toEqual({ accountId: 123456789 });
    expect(parseSteamInput(' 76561198083722517 ')).toEqual({ accountId: 123456789 });
  });
  it('reads profile links with a number, with or without a scheme or trailing slash', () => {
    expect(parseSteamInput('https://steamcommunity.com/profiles/76561198083722517/')).toEqual({ accountId: 123456789 });
    expect(parseSteamInput('steamcommunity.com/profiles/76561198083722517')).toEqual({ accountId: 123456789 });
  });
  it('hands back the custom name from a vanity link, since only Steam can turn it into an id', () => {
    expect(parseSteamInput('https://steamcommunity.com/id/fox_trot/')).toEqual({ vanity: 'fox_trot' });
    expect(parseSteamInput('https://steamcommunity.com/id/caf%C3%A9')).toEqual({ vanity: 'café' });
  });
  it('reads the old and new SteamID text forms', () => {
    expect(parseSteamInput('[U:1:123456789]')).toEqual({ accountId: 123456789 });
    expect(parseSteamInput('U:1:42')).toEqual({ accountId: 42 });
    expect(parseSteamInput('STEAM_0:1:61728394')).toEqual({ accountId: 123456789 });
    expect(parseSteamInput('STEAM_0:0:5')).toEqual({ accountId: 10 });
  });
  it('returns null for plain names, empty text and impossible ids', () => {
    expect(parseSteamInput('Haze main')).toBeNull();
    expect(parseSteamInput('')).toBeNull();
    expect(parseSteamInput('[U:1:0]')).toBeNull();
    expect(parseSteamInput('https://steamcommunity.com/profiles/abc')).toBeNull();
    expect(looksLikeSteamId('Haze')).toBe(false);
  });
});

describe('Steam links', () => {
  it('round-trips an account id through a SteamID64', () => {
    expect(toSteam64(123456789)).toBe('76561198083722517');
    expect(steamProfileUrl(123456789)).toBe('https://steamcommunity.com/profiles/76561198083722517');
  });
  it('only allows https links to steamcommunity.com', () => {
    expect(safeSteamHref('https://steamcommunity.com/profiles/76561199122681813/')).toBe('https://steamcommunity.com/profiles/76561199122681813/');
    expect(safeSteamHref('javascript:alert(1)')).toBeNull();
    expect(safeSteamHref('http://steamcommunity.com/id/x')).toBeNull();
    expect(safeSteamHref('https://steamcommunity.com.evil.test/x')).toBeNull();
    expect(safeSteamHref(undefined)).toBeNull();
  });
});
