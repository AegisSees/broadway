import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../lib/theme';

const MAX = 3.2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const fresh = () => (Math.random() < 0.5 ? -1 : 1) * rand(0.9, 2.8);

/**
 * The orange label plate. Each time one mounts (opening a page, or the spotlight moving to the next hero) it takes
 * a new random tilt, and it shifts a little when the colour theme is switched, so no two look pinned the same.
 */
export default function Kicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const theme = useTheme();
  const [angle, setAngle] = useState(fresh);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setAngle((a) => {
      const step = (Math.random() < 0.5 ? -1 : 1) * rand(0.9, 1.7);
      const n = a + step;
      return Math.abs(n) > MAX ? a - step : n;
    });
  }, [theme]);
  return <div className={`eyebrow kicker ${className}`} style={{ ['--kt' as string]: `${angle.toFixed(2)}deg` } as React.CSSProperties}>{children}</div>;
}
