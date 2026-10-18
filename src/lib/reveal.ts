import { useEffect } from 'react';

const SEL = 'main :is(.panel, .dir-card, .tl-row, .mn-card, .tool-card, .tile, .lane-card, .paper-note, .section-heading, .meta-now-title)';

/**
 * Cards and panels rise into place as they scroll into view (styles in pop.css, .rv-pre / .rv-in). Runs again on
 * every route, and picks up cards that render later (data arriving) through a MutationObserver. Does nothing for
 * people who prefer reduced motion.
 */
export function useReveal(key: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const seen = new WeakSet<Element>();
    const timers: number[] = [];
    const show = (el: HTMLElement, delay: number) => {
      el.style.setProperty('--rv-d', `${delay}s`);
      el.classList.add('rv-in');
      requestAnimationFrame(() => el.classList.remove('rv-pre'));
      timers.push(window.setTimeout(() => { el.classList.remove('rv-in'); el.style.removeProperty('--rv-d'); }, 1400 + delay * 1000));
    };
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        show(e.target as HTMLElement, Math.min(n++, 6) * 0.06);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    const scan = () => {
      const fold = window.innerHeight;
      let n = 0;
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const top = el.getBoundingClientRect().top;
        if (top < fold * 0.92) { el.classList.add('rv-pre'); el.getBoundingClientRect(); show(el, Math.min(n++, 8) * 0.07); }
        else { el.classList.add('rv-pre'); io.observe(el); }
      });
    };
    scan();
    let queued = 0;
    const mo = new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); });
    const main = document.querySelector('main');
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(queued); timers.forEach(clearTimeout);
      document.querySelectorAll('.rv-pre, .rv-in').forEach((el) => el.classList.remove('rv-pre', 'rv-in'));
    };
  }, [key]);
}
