export function AnnouncementBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="announce">
      <div className="container announce__inner">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="announce__item">
            {i > 0 ? <span className="announce__dot">—</span> : null}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
