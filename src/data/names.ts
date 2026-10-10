const urls = import.meta.glob('../assets/names/*.{svg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Hero name wordmark (white artwork on transparent), keyed by hero slug. */
const bySlug: Record<string, string> = {};
for (const [path, url] of Object.entries(urls)) {
  const slug = path.split('/').pop()!.replace(/\.(svg|png)$/, '');
  bySlug[slug] = url;
}

export const getWordmark = (slug: string): string | undefined => bySlug[slug];
