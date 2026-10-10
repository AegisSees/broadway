import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DELAY_MS = 1000;
const GAP = 10;
const EDGE = 8;

/**
 * Hover / keyboard-focus tooltip that opens after about a second, so it never flickers while the pointer is just
 * passing over a list. Rendered in a portal with fixed positioning so scrolling tables cannot clip it. Once shown
 * it is measured and placed above or below the trigger (whichever has room, or `prefer`), then kept fully inside
 * the window; a card taller than the window scrolls inside itself.
 */
export default function Tip({ content, children, className, prefer = 'above', delay = DELAY_MS }: { content: React.ReactNode; children: React.ReactNode; className?: string; prefer?: 'above' | 'below' | 'side'; delay?: number }) {
  const id = useId();
  const host = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  const place = useCallback(() => setOpen(true), []);
  const arm = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(place, delay); };
  const disarm = useCallback(() => { window.clearTimeout(timer.current); setOpen(false); setStyle(null); }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const a = host.current?.getBoundingClientRect();
    const t = tip.current;
    if (!a || !t) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(t.offsetWidth, vw - EDGE * 2);
    const natural = t.scrollHeight;
    if (prefer === 'side') {
      // Beside the trigger like the in-game shop card: right if it fits, else left, else fall through to below.
      const natH = t.scrollHeight, h2 = Math.min(natH, vh - EDGE * 2);
      const top2 = Math.min(Math.max(a.top + a.height / 2 - h2 / 2, EDGE), vh - h2 - EDGE);
      if (vw - a.right - GAP - EDGE >= w) { setStyle({ left: a.right + GAP, top: top2, maxHeight: h2, overflowY: natH > h2 ? 'auto' : undefined }); return; }
      if (a.left - GAP - EDGE >= w) { setStyle({ left: a.left - GAP - w, top: top2, maxHeight: h2, overflowY: natH > h2 ? 'auto' : undefined }); return; }
    }
    const roomAbove = a.top - GAP - EDGE;
    const roomBelow = vh - a.bottom - GAP - EDGE;
    const fitsAbove = natural <= roomAbove, fitsBelow = natural <= roomBelow;
    let below = prefer === 'below' ? (fitsBelow || !fitsAbove) : !fitsAbove && (fitsBelow || roomBelow > roomAbove);
    if (prefer === 'below' && !fitsBelow && fitsAbove) below = false;
    const room = below ? roomBelow : roomAbove;
    const h = Math.min(natural, Math.max(room, 160));
    const top = below ? a.bottom + GAP : a.top - GAP - h;
    const left = Math.min(Math.max(a.left + a.width / 2 - w / 2, EDGE), vw - w - EDGE);
    setStyle({ left, top: Math.min(Math.max(top, EDGE), vh - h - EDGE), maxHeight: h, overflowY: natural > h ? 'auto' : undefined });
  }, [open, prefer]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && disarm();
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', disarm, true);
    window.addEventListener('resize', disarm);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('scroll', disarm, true); window.removeEventListener('resize', disarm); };
  }, [open, disarm]);

  return (
    <span ref={host} className={`tip-host ${className ?? ''}`} tabIndex={0} aria-describedby={open ? id : undefined}
      onMouseEnter={arm} onMouseLeave={disarm} onFocus={arm} onBlur={disarm}>
      {children}
      {open && createPortal(
        <div ref={tip} id={id} role="tooltip" className="tip" style={style ?? { left: 0, top: 0, visibility: 'hidden' }}>{content}</div>,
        document.body,
      )}
    </span>
  );
}
