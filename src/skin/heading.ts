import { DEFAULT_COPY, type HeroSkin, type SkinCopy } from './types';

/** A section title in a skin's voice, with the plain title kept as a quiet subtitle so the page still says what it shows. */
export function heading(skin: HeroSkin | undefined, key: keyof SkinCopy): { title: string; sub?: string } {
  const plain = DEFAULT_COPY[key];
  const themed = skin?.copy?.[key];
  if (!themed || themed === plain) return { title: plain };
  return { title: themed, sub: plain };
}
