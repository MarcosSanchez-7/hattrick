import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <div className="empty-state" style={{ paddingBlock: 160 }}>
        <span className="label" style={{ color: "var(--ink-muted)" }}>
          Error 404
        </span>
        <h1 className="display">Fuera de juego</h1>
        <p className="lead" style={{ textAlign: "center" }}>
          La página que buscas no existe o el producto ya no está disponible.
        </p>
        <div className="row gap-3">
          <Link href="/" className="btn">
            Volver al inicio
          </Link>
          <Link href="/buscar" className="btn btn--ghost">
            Buscar una camiseta
          </Link>
        </div>
      </div>
    </div>
  );
}
