interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, start + 4);
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {start > 1 && <button type="button" onClick={() => onChange(1)}>1</button>}
      {start > 2 && <span>…</span>}
      {pages.map((p) => (
        <button key={p} type="button" className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      {end < pageCount - 1 && <span>…</span>}
      {end < pageCount && (
        <button type="button" onClick={() => onChange(pageCount)}>
          {pageCount}
        </button>
      )}
      <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </div>
  );
}
