import { FREE_SHIPPING_FROM } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import {
  IconPrint,
  IconReturn,
  IconShield,
  IconTruck,
} from "@/components/ui/Icons";

export function ValueProps() {
  const items = [
    {
      Icon: IconTruck,
      title: "Envío en 48 h",
      text: `Gratuito a partir de ${formatPrice(FREE_SHIPPING_FROM)}. Seguimiento en tiempo real.`,
    },
    {
      Icon: IconPrint,
      title: "Personalización oficial",
      text: "Nombre y dorsal con la tipografía real de cada competición.",
    },
    {
      Icon: IconShield,
      title: "100 % originales",
      text: "Distribuidor autorizado. Cada pedido incluye certificado.",
    },
    {
      Icon: IconReturn,
      title: "30 días de cambio",
      text: "¿No es tu talla? La recogemos y la cambiamos sin coste.",
    },
  ];

  return (
    <section className="container">
      <div className="values">
        {items.map(({ Icon, title, text }) => (
          <div key={title} className="values__item">
            <Icon />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
