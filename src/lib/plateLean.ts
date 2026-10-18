/**
 * Which way a selected tab's or pill's label is cut. Most of the time it is the plain, level label; now and then,
 * when you pick something new, it leans a little up or down, so the page never settles into one repeated tilt.
 * The choice is written to the button as data-lean, and tilt.css picks the cut from it.
 */
export type Lean = 'level' | 'up' | 'down';

/** The controls that show a pinned label when selected (the same list as the selector group in city.css). */
export const PLATE_CONTROLS = '.seg button, .btabs button, .tabs a, .pill, .dir-filters button, .pager button, .fav-toggle';

/** Half the time level, a quarter each up and down. */
export function pickLean(r: number = Math.random()): Lean {
  if (r < 0.5) return 'level';
  return r < 0.75 ? 'up' : 'down';
}

let installed = false;

/** Listens for clicks (keyboard activation of a button is a click too) and gives the newly picked control its lean. */
export function installPlateLean(doc: Document = document): void {
  if (installed) return;
  installed = true;
  doc.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>(PLATE_CONTROLS) : null;
    if (t) t.dataset.lean = pickLean();
  }, true);
}
