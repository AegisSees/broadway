import { useEffect, useRef } from 'react';

/**
 * The torn-paper art (assets/ui/note.webp, 520x454) is drawn tilted: corner to corner, its top edge rises about
 * 35 px over 440 px (the torn left corner dips lower than the straight run, and the eye reads the corners).
 * The art is stretched to fill each note, so the slope on screen depends on the note's own shape. This works the
 * angle out from the note's size and writes it to --pt, so the writing sits parallel to the paper's top edge.
 */
const RISE = 35 / 440;
export const paperAngle = (width: number, height: number): number =>
  -Math.atan((RISE * (height / 454)) / (width / 520)) * (180 / Math.PI);

export function usePaperTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const set = () => el.style.setProperty('--pt', `${paperAngle(el.offsetWidth, el.offsetHeight).toFixed(2)}deg`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return ref;
}
