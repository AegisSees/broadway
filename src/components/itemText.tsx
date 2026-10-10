import { Fragment } from 'react';

export interface ParsedItem { stats: { value: string; label: string }[]; body: string; upgrades: string[] }

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The wiki summaries are written as "+X stat, +Y stat. Effect sentence. Upgrades from Z." This pulls the three parts
 * apart so the tooltip can lay them out like the in-game card: stat rows, an effect block and an "upgrades from" footer.
 */
export function parseItem(desc: string): ParsedItem {
  const sentences = desc.split(/\.\s+/).map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);
  let stats: ParsedItem['stats'] = [];
  const first = sentences[0] ?? '';
  const parts = first.split(/,\s*|\s+and\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0 && parts.every((p) => /^[+\-−]\s?\d/.test(p))) {
    stats = parts.map((p) => {
      const m = /^([+\-−]\s?[\d.,]+\s?%?)\s*(.*)$/.exec(p);
      return { value: m ? m[1].replace(/\s/g, '') : p, label: m ? cap(m[2]) : '' };
    });
    sentences.shift();
  }
  const upgrades: string[] = [];
  const rest = sentences.filter((s) => {
    const m = /^Upgrades from (.+)$/i.exec(s);
    if (!m) return true;
    m[1].split(';')[0].split(/,\s*|\s+and\s+/).forEach((n) => { if (n.trim()) upgrades.push(n.trim()); });
    return false;
  });
  return { stats, body: rest.map((s) => `${s}.`).join(' '), upgrades };
}

/** Bold the numbers and durations in an effect sentence, as the in-game text does. */
export function Emph({ text }: { text: string }) {
  const bits = text.split(/(\+?-?\d[\d.,]*\s?(?:%|s\b|m\b|x\b)?)/g);
  return <>{bits.map((b, i) => (i % 2 ? <b key={i}>{b}</b> : <Fragment key={i}>{b}</Fragment>))}</>;
}

export function barLabel(body: string): string | null {
  if (!body) return null;
  if (/\b(activate|activated|active)\b/i.test(body)) return 'Active';
  if (/^(your|after|when|while|enemies|hitting|bullets|ability|gain|every|each|dealing|nearby|damaging|shooting|killing|heal)/i.test(body)) return 'Passive';
  return 'Effect';
}
