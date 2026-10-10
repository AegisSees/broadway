import { setTheme, THEMES, useTheme, type ThemeId } from '../lib/theme';
import hkUrl from '../assets/ui/patron-hiddenking.png';
import amUrl from '../assets/ui/patron-archmother.png';

/** Per-theme emblem: the Hidden King's antlered mask, the Archmother's statue-of-liberty mask (both from the game's patron art), and a moon for Night Shift. */
const ICON: Record<ThemeId, React.ReactNode> = {
  'hidden-king': <img src={hkUrl} alt="" draggable={false} />,
  archmother: <img src={amUrl} alt="" draggable={false} />,
  'night-shift': (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a.5.5 0 0 0-.7-.6A9.6 9.6 0 1 0 20.8 15.3a.5.5 0 0 0-.6-.7Z" />
      <path d="m17.6 3.2.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  ),
};

/** Three-way colour theme switch. A knob slides under the chosen patron; each patron is a radio button, so arrow keys work too. */
export default function ThemeToggle() {
  const theme = useTheme();
  const idx = THEMES.findIndex((t) => t.id === theme);
  const here = THEMES[idx] ?? THEMES[0];
  const pick = (id: ThemeId, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTheme(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };
  const onKey = (e: React.KeyboardEvent<HTMLElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = THEMES[(idx + d + THEMES.length) % THEMES.length];
    pick(next.id, e.currentTarget);
    const group = e.currentTarget.parentElement;
    window.requestAnimationFrame(() => group?.querySelector<HTMLElement>(`[data-theme-id="${next.id}"]`)?.focus());
  };
  return (
    <div className="theme-toggle" style={{ ['--ti' as string]: idx } as React.CSSProperties}>
      <span className="tt-name" aria-hidden="true">
        {THEMES.map((t) => <span key={t.id} className={`n${t.id === theme ? ' on' : ''}`}>{t.name}</span>)}
      </span>
      <span className="tt-track" role="radiogroup" aria-label={`Colour theme, now ${here.name}`}>
        <span className="tt-knob" aria-hidden="true">
          {THEMES.map((t) => <span key={t.id} className={`k${t.id === 'archmother' ? ' am' : ''}${t.id === theme ? ' on' : ''}`}>{ICON[t.id]}</span>)}
        </span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            className="tt-opt"
            data-theme-id={t.id}
            aria-checked={t.id === theme}
            aria-label={t.name}
            title={t.name}
            tabIndex={t.id === theme ? 0 : -1}
            onClick={(e) => pick(t.id, e.currentTarget)}
            onKeyDown={onKey}
          >
            <span className="tt-ico">{ICON[t.id]}</span>
          </button>
        ))}
      </span>
    </div>
  );
}
