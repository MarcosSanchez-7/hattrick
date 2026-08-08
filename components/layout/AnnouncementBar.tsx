const ITEMS = [
  "Envío gratis desde 80 €",
  "Personalización oficial en 24 h",
  "Devoluciones gratuitas 30 días",
];

export function AnnouncementBar() {
  return (
    <div className="announce">
      <div className="container announce__inner">
        {ITEMS.map((item, i) => (
          <span key={item} className="announce__item">
            {i > 0 ? <span className="announce__dot">—</span> : null}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
