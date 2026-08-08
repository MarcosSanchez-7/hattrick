import { FREE_SHIPPING_FROM } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/format";

export function AnnouncementBar() {
  const items = [
    `Envío gratis desde ${formatPrice(FREE_SHIPPING_FROM)}`,
    "Personalización oficial en 24 h",
    "Devoluciones gratuitas 30 días",
  ];

  return (
    <div className="announce">
      <div className="container announce__inner">
        {items.map((item, i) => (
          <span key={item} className="announce__item">
            {i > 0 ? <span className="announce__dot">—</span> : null}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
