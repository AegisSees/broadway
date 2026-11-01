import { sampleTierList } from './sampleTiers';
import type { BuildPath, DamageBreakdown, Guide, HeroOverview, HighRollTier, ItemCategory, ItemRef, MatchupGroup, SkillPath, TrendPoint } from './types';

/**
 * ILLUSTRATIVE SAMPLE DATA. None of these numbers are real game statistics. They exist so the interface can
 * be designed and tested before the live data source is connected. The UI labels them accordingly.
 */

const it = (name: string, category: ItemCategory): ItemRef => ({ name, category });

const sustainedFire: BuildPath = {
  id: 'sustained-fire', name: 'Sustained Fire', style: 'Weapon', winRate: 53.8, usage: 62.4, matches: 11633,
  slots: [
    { label: 'Early / lane', items: [it('Rapid Rounds', 'weapon'), it('Headshot Booster', 'weapon'), it('Extra Stamina', 'vitality')] },
    { label: 'Core purchases', items: [it('Swift Striker', 'weapon'), it('Bullet Lifesteal', 'vitality'), it('Quicksilver Reload', 'spirit')] },
    { label: 'Late / flexible', items: [it('Ricochet', 'weapon'), it('Unstoppable', 'vitality'), it('Silencer', 'weapon')] },
  ],
  lateGame: [
    { item: it('Lucky Shot', 'weapon'), winRate: 57.6, usage: 35.1, matches: 4083, avgBuy: '25:42' },
    { item: it('Ricochet', 'weapon'), winRate: 56.8, usage: 43.8, matches: 5095, avgBuy: '24:18' },
    { item: it('Silencer', 'weapon'), winRate: 55.3, usage: 14.2, matches: 1652, avgBuy: '28:04' },
    { item: it('Unstoppable', 'vitality'), winRate: 54.7, usage: 28.5, matches: 3315, avgBuy: '26:11' },
  ],
};

const bulletDanceBuild: BuildPath = {
  id: 'bullet-dance', name: 'Bullet Dance', style: 'Spirit', winRate: 51.9, usage: 22.1, matches: 4120,
  slots: [
    { label: 'Early / lane', items: [it('Mystic Burst', 'spirit'), it('Extra Spirit', 'spirit'), it('Extra Stamina', 'vitality')] },
    { label: 'Core purchases', items: [it('Mystic Expansion', 'spirit'), it('Compress Cooldown', 'spirit'), it('Quicksilver Reload', 'spirit')] },
    { label: 'Late / flexible', items: [it('Superior Cooldown', 'spirit'), it('Silencer', 'weapon'), it('Unstoppable', 'vitality')] },
  ],
  lateGame: [
    { item: it('Superior Cooldown', 'spirit'), winRate: 55.2, usage: 41.0, matches: 1689, avgBuy: '27:30' },
    { item: it('Silencer', 'weapon'), winRate: 53.9, usage: 20.5, matches: 845, avgBuy: '29:02' },
  ],
};

const skill: SkillPath = {
  note: 'Fixation first, then Sleep Dagger. Illustrative sequence; the live version shows win rate and matches per order.',
  winRate: 54.1, matches: 6290,
  rows: [
    { abilityIndex: 0, unlockAt: 2, upgrades: [{ at: 7, ap: 1 }, { at: 13, ap: 2 }, { at: 15, ap: 5 }] },
    { abilityIndex: 1, unlockAt: 4, upgrades: [{ at: 11, ap: 1 }, { at: 14, ap: 2 }, { at: 16, ap: 5 }] },
    { abilityIndex: 2, unlockAt: 1, upgrades: [{ at: 3, ap: 1 }, { at: 5, ap: 2 }, { at: 8, ap: 5 }] },
    { abilityIndex: 3, unlockAt: 6, upgrades: [{ at: 9, ap: 1 }, { at: 10, ap: 2 }, { at: 12, ap: 5 }] },
  ],
};

const col = (rows: [string, string, string, number, number][]) =>
  rows.map(([slug, name, display, matches, fill]) => ({ slug, name, display, matches, fill }));

const matchups: MatchupGroup[] = [
  {
    key: 'best', title: 'Best picks vs {hero}', subtitle: "Opponent's match win rate", tone: 'bad', badge: 'deflated',
    entries: col([
      ['abrams', 'Abrams', '55.8%', 820, 1], ['mo-and-krill', 'Mo & Krill', '55.0%', 736, 0.89], ['warden', 'Warden', '54.2%', 652, 0.78],
      ['lash', 'Lash', '53.4%', 568, 0.67], ['dynamo', 'Dynamo', '52.6%', 484, 0.56], ['bebop', 'Bebop', '51.8%', 400, 0.45],
    ]),
  },
  {
    key: 'worst', title: 'Worst picks vs {hero}', subtitle: "Opponent's match win rate", tone: 'good', badge: 'gloat',
    entries: col([
      ['vindicta', 'Vindicta', '42.2%', 820, 1], ['grey-talon', 'Grey Talon', '42.9%', 736, 0.89], ['mcginnis', 'McGinnis', '43.6%', 652, 0.78],
      ['seven', 'Seven', '44.3%', 568, 0.67], ['wraith', 'Wraith', '45.0%', 484, 0.56], ['yamato', 'Yamato', '45.7%', 400, 0.45],
    ]),
  },
  {
    key: 'synergy', title: 'Best lane partners for {hero}', subtitle: "{hero}'s match win rate", tone: 'good',
    entries: col([
      ['ivy', 'Ivy', '57.8%', 820, 1], ['dynamo', 'Dynamo', '57.1%', 736, 0.89], ['kelvin', 'Kelvin', '56.4%', 652, 0.78],
      ['bebop', 'Bebop', '55.7%', 568, 0.67], ['viscous', 'Viscous', '55.0%', 484, 0.56], ['paradox', 'Paradox', '54.3%', 400, 0.45],
    ]),
  },
  {
    key: 'lane', title: 'Worst lanes for {hero}', subtitle: "{hero}'s soul deficit at 9:00", tone: 'bad',
    entries: col([
      ['abrams', 'Abrams', '−980', 820, 1], ['lash', 'Lash', '−845', 736, 0.86], ['shiv', 'Shiv', '−710', 652, 0.72],
      ['pocket', 'Pocket', '−575', 568, 0.59], ['lady-geist', 'Lady Geist', '−440', 484, 0.45], ['infernus', 'Infernus', '−305', 400, 0.31],
    ]),
  },
];

const guides: Guide[] = [
  { id: '484827', title: 'SwoleBenji YT FAST FARM Roaming Ganker', author: 'SwoleBenji', updated: '2026-10-04', tags: ['Weapon', 'Ultimate'] },
  { id: '3166', title: "Chrome's Advanced Haze", author: 'Chrome', updated: '2026-10-03', tags: ['Weapon', 'Dueling'] },
  { id: '770241', title: 'wander gcannon haze 2026', author: 'wander', updated: '2026-09-18', tags: ['Weapon'] },
  { id: '447603', title: 'The Only Haze Build You Need :)', author: 'JumpyWizard', updated: '2026-08-11', tags: ['Weapon', 'Fixation'] },
];

const trends: TrendPoint[] = [
  [6, 52.7, 20.4, 2410], [5, 52.9, 20.9, 2488], [4, 53.1, 21.2, 2560], [3, 52.8, 21.6, 2602], [2, 53.3, 22.0, 2655], [1, 53.6, 22.1, 2689], [0, 53.4, 21.7, 2565],
].map(([daysAgo, winRate, pickRate, matches]) => ({ daysAgo, winRate, pickRate, matches }));

const damage: DamageBreakdown = {
  perMatch: 31240,
  sources: [
    { name: 'Fixation', kind: 'ability', share: 33 },
    { name: 'Bullet Dance', kind: 'ability', share: 14 },
    { name: 'Ricochet', kind: 'item', share: 12 },
    { name: 'Lucky Shot', kind: 'item', share: 9 },
    { name: 'Sleep Dagger', kind: 'ability', share: 7 },
    { name: 'Melee', kind: 'melee', share: 5 },
    { name: 'Misc', kind: 'misc', share: 20 },
  ],
};

export const HAZE_OVERVIEW: HeroOverview = {
  slug: 'haze', tier: 'S', winRate: 53.4, pickRate: 21.7, banRate: 6.2, overallRank: { rank: 8, of: sampleTierList({ mode: 'standard', queue: 'ranked', rank: 'all' }).length }, matches: 18642,
  builds: [sustainedFire, bulletDanceBuild], skill, matchups, guides, trends, damage, provenance: 'illustrative',
};

const hash = (str: string): number => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const r1 = (n: number) => Math.round(n * 10) / 10;
const BRAWL_MATCHES = 9284;

/**
 * Sample high rolls. The Enhanced numbers are derived from the base ones (rarer, a bit stronger) so the toggle has
 * something to show; the real source will report them separately.
 */
const hr = (tier: 1 | 2 | 3 | 4 | 5, rows: [string, ItemCategory, number, number][]): HighRollTier => ({
  tier,
  items: rows.map(([name, category, pickRate, winRate]) => {
    const ep = r1(pickRate * (0.16 + hash(`ep${name}`) * 0.12));
    const ew = r1(winRate + 0.7 + hash(`ew${name}`) * 1.9);
    return {
      item: it(name, category), pickRate, winRate, matches: Math.round((pickRate / 100) * BRAWL_MATCHES),
      enhanced: { pickRate: ep, winRate: ew, matches: Math.round((ep / 100) * BRAWL_MATCHES) },
    };
  }),
});

/** Street Brawl sample for Haze: no build paths, skill order or guides, but item-tier high rolls. */
const BRAWL_ROW = sampleTierList({ mode: 'street_brawl', queue: 'ranked', rank: 'all' }).find((r) => r.slug === 'haze');
export const HAZE_BRAWL: HeroOverview = {
  slug: 'haze', tier: BRAWL_ROW?.tier, winRate: BRAWL_ROW?.winRate ?? 52.7, pickRate: BRAWL_ROW?.pickRate ?? 18.4, banRate: BRAWL_ROW?.banRate ?? 5.1, overallRank: { rank: 11, of: sampleTierList({ mode: 'street_brawl', queue: 'ranked', rank: 'all' }).length },
  matches: BRAWL_MATCHES, builds: [], matchups: [], guides: [],
  trends: trends.map((t, i) => ({ ...t, winRate: Math.round((t.winRate - 0.9 + (i % 3) * 0.15) * 10) / 10, pickRate: Math.round((t.pickRate - 3.1) * 10) / 10, matches: Math.round(t.matches * 0.38) })),
  damage: {
    perMatch: 14860,
    sources: [
      { name: 'Fixation', kind: 'ability', share: 36 }, { name: 'Bullet Dance', kind: 'ability', share: 12 }, { name: 'Ricochet', kind: 'item', share: 10 },
      { name: 'Sleep Dagger', kind: 'ability', share: 9 }, { name: 'Lucky Shot', kind: 'item', share: 6 }, { name: 'Melee', kind: 'melee', share: 8 }, { name: 'Misc', kind: 'misc', share: 19 },
    ],
  },
  highRolls: [
    hr(1, [['Headshot Booster', 'weapon', 41.0, 52.9], ['Rapid Rounds', 'weapon', 36.4, 53.4], ['Extended Magazine', 'weapon', 18.2, 50.8], ['Monster Rounds', 'weapon', 12.5, 51.7], ['Close Quarters', 'weapon', 9.8, 50.1], ['Restorative Shot', 'weapon', 6.1, 49.9], ['Extra Stamina', 'vitality', 7.2, 50.4], ['Extra Health', 'vitality', 5.4, 49.6], ['Sprint Boots', 'vitality', 4.1, 50.9], ['Mystic Burst', 'spirit', 3.2, 48.8]]),
    hr(2, [['Swift Striker', 'weapon', 44.7, 54.1], ['Bullet Lifesteal', 'vitality', 39.2, 53.6], ['Quicksilver Reload', 'spirit', 28.3, 51.9], ['Active Reload', 'weapon', 22.6, 52.8], ['Fleetfoot', 'weapon', 15.4, 51.2], ['Battle Vest', 'vitality', 11.0, 50.6], ['Slowing Bullets', 'weapon', 9.6, 50.9], ['Kinetic Dash', 'weapon', 8.8, 52.1], ['Long Range', 'weapon', 7.4, 49.9], ['Titanic Magazine', 'weapon', 6.3, 50.2], ['Healing Booster', 'vitality', 5.1, 49.4]]),
    hr(3, [['Burst Fire', 'weapon', 33.5, 54.6], ['Hollow Point', 'weapon', 24.1, 53.7], ['Berserker', 'weapon', 21.0, 52.3], ['Tesla Bullets', 'weapon', 18.8, 53.1], ['Point Blank', 'weapon', 11.4, 51.4], ['Veil Walker', 'vitality', 8.2, 50.2], ['Sharpshooter', 'weapon', 9.7, 51.8], ['Shadow Weave', 'weapon', 8.9, 52.5], ["Hunter's Aura", 'weapon', 7.3, 50.4], ['Toxic Bullets', 'weapon', 6.2, 50.8], ['Metal Skin', 'vitality', 5.3, 50.1], ['Rescue Beam', 'vitality', 4.4, 49.3]]),
    hr(4, [['Ricochet', 'weapon', 47.6, 55.2], ['Lucky Shot', 'weapon', 36.9, 56.1], ['Unstoppable', 'vitality', 21.3, 54.0], ['Silencer', 'weapon', 17.7, 53.4], ['Glass Cannon', 'weapon', 12.8, 52.2], ['Crippling Headshot', 'weapon', 9.0, 51.5], ['Frenzy', 'weapon', 7.4, 52.9], ['Siphon Bullets', 'vitality', 6.1, 51.6], ['Spiritual Overflow', 'weapon', 5.6, 51.0], ['Leech', 'vitality', 5.0, 50.7], ['Phantom Strike', 'vitality', 4.9, 52.4], ['Divine Barrier', 'vitality', 3.9, 50.2]]),
    hr(5, [['Infinite Rounds', 'weapon', 38.4, 57.8], ['Haunting Shot', 'weapon', 24.2, 55.9], ['Seraphim Wings', 'vitality', 22.7, 54.6], ['Shadow Strike', 'vitality', 20.3, 56.3], ['Cloak of Opportunity', 'vitality', 14.5, 53.0], ['Electric Slippers', 'vitality', 11.8, 52.4], ['Unstable Concoction', 'spirit', 10.9, 53.7], ['Celestial Blessing', 'vitality', 9.6, 54.1], ['Nullification Burst', 'vitality', 8.4, 51.9], ['Eternal Gift', 'vitality', 7.9, 50.7], ['Runed Gauntlets', 'weapon', 6.1, 49.8], ['Shrink Ray', 'spirit', 5.8, 51.5], ['Omnicharge Signet', 'spirit', 5.2, 49.9], ['Mystic Conduit', 'spirit', 4.7, 50.3], ['Frostbite Charm', 'spirit', 4.1, 49.2], ['Mystical Piano', 'spirit', 3.6, 48.8], ['Prism Blast', 'spirit', 3.2, 50.6]]),
  ],
  provenance: 'illustrative',
};


/** Top of the sample Standard / Ranked tier list, for the homepage marquee. */
export const SAMPLE_TIERS = sampleTierList({ mode: 'standard', queue: 'ranked', rank: 'all' }).slice(0, 8);

export const SAMPLE_PATCH_NOTES = [
  { tag: 'nerf' as const, title: 'Haze · Fixation', body: 'Example entry. Real entries show previous → new values only when verified, and link to the original notes.' },
  { tag: 'buff' as const, title: 'Ivy · base health', body: 'Example entry.' },
  { tag: 'adj' as const, title: 'Street Brawl · roll pool', body: 'Example entry.' },
];

export const SAMPLE_MOVERS: { slug: string; delta: number }[] = [
  { slug: 'lash', delta: 1.4 }, { slug: 'seven', delta: 1.1 }, { slug: 'mirage', delta: -1.2 }, { slug: 'vindicta', delta: -1.6 },
];
