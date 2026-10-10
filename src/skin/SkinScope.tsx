import { useLayoutEffect, useMemo } from 'react';
import { getHeroBg } from '../data/heroStats';
import { deriveTokens } from './derive';
import { getSkin } from './heroSkins';
import { setSkinOn, useSkinOn } from './pref';
import type { HeroSkin } from './types';

interface Props {
  /** Hero whose skin the page wears. No skin for the slug (or a skin switched off) renders the children as they are. */
  slug?: string;
  children: React.ReactNode;
  /** Draw the page-wide wallpaper. Nested scopes (a row inside a page) pass false and only carry the palette. */
  wall?: boolean;
  className?: string;
}

/** Everything the structural CSS keys on, as data attributes. */
export function skinAttrs(s: HeroSkin): Record<string, string> {
  return {
    'data-skin': s.slug, 'data-font': s.font, 'data-mode': s.mode, 'data-frame': s.frame, 'data-tex': s.tex, 'data-label': s.label, 'data-bar': s.bar,
    'data-rule': s.rule, 'data-fx': s.fx, 'data-tile': s.tile, 'data-head': s.head ?? 'left',
  };
}

/**
 * Wraps a page in a hero's skin: the palette goes on as custom properties (so every existing component picks it up),
 * the frame, texture, label, bar and rule styles go on as data attributes, and a fixed wallpaper made from the hero's
 * key art sits behind the content. The site header and rail keep the site theme.
 */
export default function SkinScope({ slug, children, wall = true, className = '' }: Props) {
  const enabled = useSkinOn();
  const skin = enabled ? getSkin(slug) : undefined;
  const tokens = useMemo(() => (skin && !skin.inherit ? deriveTokens(skin) : null), [skin]);
  const art = slug ? getHeroBg(slug) : undefined;
  const topLine = skin && !skin.inherit && wall ? skin.accent : null;
  const grain = skin?.grain ?? 0;

  // The film grain and the header's underline live outside the page wrapper, so they are set on <html> and put back on exit.
  useLayoutEffect(() => {
    if (!skin || skin.inherit || !wall) return;
    const el = document.documentElement;
    el.dataset.skinned = skin.slug;
    el.style.setProperty('--grain', String(grain));
    if (topLine) el.style.setProperty('--sk-top', topLine);
    return () => {
      delete el.dataset.skinned;
      el.style.removeProperty('--grain');
      el.style.removeProperty('--sk-top');
    };
  }, [skin, wall, grain, topLine]);

  if (!skin) return <div className="skin-none">{children}</div>;
  const style = { ...(tokens ?? {}), '--sk-art': art ? `url(${art})` : 'none' } as React.CSSProperties;
  return (
    <div className={`skin${skin.inherit ? ' inherit' : ''} ${className}`.trim()} {...skinAttrs(skin)} style={style}>
      {wall && !skin.inherit && (
        <div className="skin-wall" aria-hidden="true"><i className="sw-art" /><i className="sw-tex" /><i className="sw-vig" /><i className="sw-fx" /></div>
      )}
      {children}
    </div>
  );
}

/** A small switch that turns the hero's skin off (back to the site theme) and on again. Remembered per browser. */
export function SkinSwitch({ slug, label = 'Hero style' }: { slug?: string; label?: string }) {
  const on = useSkinOn();
  const skin = getSkin(slug);
  if (!skin || skin.inherit) return null;
  return (
    <button type="button" className="skin-switch" aria-pressed={on} title={on ? `${skin.concept} Click to use the site theme instead.` : 'Click to dress this page in the hero’s own style.'} onClick={() => setSkinOn(!on)}>
      <i aria-hidden="true" />{label}: {on ? 'on' : 'off'}
    </button>
  );
}
