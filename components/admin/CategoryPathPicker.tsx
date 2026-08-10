"use client";

import { useMemo } from "react";
import {
  categoryChildren,
  categorySlugPath,
  topLevelCategories,
  type Category,
} from "@/lib/catalog";

/**
 * Selector en cascada: primero categorías raíz, y si la elegida tiene
 * subcategorías aparece un select más para elegirlas, y así hasta el nivel
 * que exista. El producto queda asignado a la categoría más profunda
 * seleccionada — no hace falta llegar hasta una hoja, se puede dejar en
 * cualquier nivel intermedio.
 */
export function CategoryPathPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const path = useMemo(
    () => (value ? categorySlugPath(categories, value) : []),
    [categories, value],
  );

  const levels = useMemo(() => {
    const result: Category[][] = [topLevelCategories(categories)];
    for (const slug of path) {
      const children = categoryChildren(categories, slug);
      if (children.length === 0) break;
      result.push(children);
    }
    return result;
  }, [categories, path]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {levels.map((options, i) => (
        <select
          key={i}
          required={i === 0}
          value={path[i] ?? ""}
          onChange={(e) => onChange(e.target.value || path[i - 1] || "")}
        >
          <option value="" disabled={i === 0}>
            {i === 0 ? "Selecciona una categoría" : "— Usar esta categoría (sin subdividir) —"}
          </option>
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
