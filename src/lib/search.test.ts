import { describe, expect, it } from 'vitest';
import { buildResults, searchHeroes } from './search';

describe('search', () => {
  it('puts exact hero matches first', () => {
    expect(searchHeroes('haze')[0].slug).toBe('haze');
    expect(searchHeroes('HAZ')[0].slug).toBe('haze');
  });
  it('matches second words and ignores punctuation', () => {
    expect(searchHeroes('krill').map((h) => h.slug)).toContain('mo-and-krill');
    expect(searchHeroes('mo & krill')[0].slug).toBe('mo-and-krill');
  });
  it('returns nothing for empty queries', () => expect(searchHeroes('  ')).toEqual([]));
  it('lists heroes before players and puts a steam id first', () => {
    const r = buildResults('haze', [{ kind: 'player', accountId: 1, name: 'Haze Fan' }]);
    expect(r[0].kind).toBe('hero');
    expect(r.filter((x) => x.kind === 'player')).toHaveLength(1);
    expect(r[r.length - 1]).toEqual({ kind: 'find', query: 'haze' }); // a name can always be searched
    expect(buildResults('76561198083722517')[0]).toEqual({ kind: 'steam-id', accountId: 123456789 });
    expect(buildResults('https://steamcommunity.com/profiles/76561198083722517')[0]).toEqual({ kind: 'steam-id', accountId: 123456789 });
    expect(buildResults('https://steamcommunity.com/id/foxtrot')).toContainEqual({ kind: 'find', query: 'foxtrot' });
    expect(buildResults('76561198083722517').some((x) => x.kind === 'find')).toBe(false); // an ID is not a name
  });
});
