import Link from "next/link";
import { IconArrow } from "@/components/ui/Icons";

type AdminBackLinkProps = {
  href: string;
  label: string;
};

export function AdminBackLink({ href, label }: AdminBackLinkProps) {
  return (
    <Link className="admin-back-link" href={href}>
      <IconArrow className="icon--sm admin-back-link__icon" />
      <span>{label}</span>
    </Link>
  );
}
