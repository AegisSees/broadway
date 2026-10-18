/**
 * Lane art behind a hero banner. Both themes' images are mounted and cross-faded by CSS, so a theme
 * switch never waits on a download. Hidden King (amber) shows the York lane, Archmother (blue) the Broadway lane.
 */
const files = import.meta.glob('../assets/lanes/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const lane = (n: string): string => files[`../assets/lanes/${n}.webp`] ?? '';

export const BROADWAY = ['broadway-lolo-noir', 'broadway-hex-jazz', 'broadway-succubus'].map(lane);
export const YORK = ['york-exchange', 'york-docks', 'york-silos'].map(lane);
export const GREENWICH = ['greenwich-university', 'greenwich-park', 'greenwich-monkey'].map(lane);

const hash = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function LaneBackdrop({ seed, className = 'city' }: { seed: string; className?: string }) {
  const i = hash(seed);
  return (
    <>
      <div className={`${className} lane-hk`} style={{ backgroundImage: `url(${YORK[i % YORK.length]})` }} />
      <div className={`${className} lane-am`} style={{ backgroundImage: `url(${BROADWAY[i % BROADWAY.length]})` }} />
    </>
  );
}

const halls = import.meta.glob('../assets/halls/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const HALL_HK = halls['../assets/halls/hidden-king-hall.webp'] ?? '';
export const HALL_AM = halls['../assets/halls/archmother-hall.webp'] ?? '';
const streets = import.meta.glob('../assets/city/uptown.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const HALL_CITY = streets['../assets/city/uptown.webp'] ?? '';

/**
 * Backdrop behind the home hero, cross-faded by theme: the Hidden King's amber hall, the Archmother's blue one, and
 * for City Never Sleeps (no patron) a street of the city itself.
 */
export function HallBackdrop() {
  return (
    <>
      <div className="city hall lane-city" style={{ backgroundImage: `url(${HALL_CITY})` }} />
      <div className="city hall lane-hk" style={{ backgroundImage: `url(${HALL_HK})` }} />
      <div className="city hall lane-am" style={{ backgroundImage: `url(${HALL_AM})` }} />
    </>
  );
}
