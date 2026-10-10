/** Page buttons for a list split into pages: Previous, 1 2 3 ..., Next. */
export default function Pager({ page, pages, onPage, label = 'Pages' }: { page: number; pages: number; onPage: (n: number) => void; label?: string }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label={label}>
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>{'‹'} Prev</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>
      ))}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages}>Next {'›'}</button>
    </nav>
  );
}
