import type { NoticeIcon } from "@/lib/catalog";
import type { ValuePropsSettings } from "@/lib/settings";
import {
  IconPrint,
  IconReturn,
  IconShield,
  IconTruck,
} from "@/components/ui/Icons";

const ICONS: Record<NoticeIcon, typeof IconTruck> = {
  truck: IconTruck,
  print: IconPrint,
  return: IconReturn,
  shield: IconShield,
};

export function ValueProps({ settings }: { settings: ValuePropsSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section className="container">
      <div className="values">
        {settings.items.map(({ icon, title, text }, i) => {
          const Icon = ICONS[icon];
          return (
            <div key={i} className="values__item">
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
