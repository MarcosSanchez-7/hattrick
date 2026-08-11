"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el administrador.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="admin-field">
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="admin-field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="admin-help">Mínimo 8 caracteres.</p>
      </div>
      <div className="admin-field">
        <label htmlFor="confirmPassword">Confirmar contraseña</label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn--block" disabled={submitting}>
        {submitting ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
