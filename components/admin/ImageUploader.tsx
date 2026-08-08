"use client";

import { useRef, useState } from "react";
import { IconClose, IconUpload } from "@/components/ui/Icons";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  /** 1 = portada única (categorías); mayor que 1 = galería (productos). */
  max?: number;
  label?: string;
};

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen.");
  return data.url as string;
}

export function ImageUploader({ images, onChange, max = 6, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = max - images.length;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const files = Array.from(fileList).slice(0, Math.max(0, remainingSlots));
    if (files.length === 0) {
      setError(`Ya tienes el máximo de ${max} imagen${max > 1 ? "es" : ""}.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        uploaded.push(await uploadFile(file));
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveToFront = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  };

  return (
    <div>
      {images.length < max ? (
        <div
          className="admin-dropzone"
          data-dragging={dragging ? "true" : "false"}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
        >
          <IconUpload />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            {busy
              ? "Subiendo…"
              : label ?? "Arrastra una imagen o haz clic para subirla"}
          </span>
          <span className="admin-help">
            PNG, JPG, WEBP, GIF o SVG · máx. 5 MB
            {max > 1 ? ` · hasta ${max} imágenes` : ""}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            multiple={max > 1}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="admin-error" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className="admin-uploads">
          {images.map((src, idx) => (
            <div
              key={src}
              className={`admin-upload${max === 1 ? " admin-single-upload" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Imagen ${idx + 1}`}
                onClick={() => moveToFront(idx)}
                title={idx === 0 ? "Portada" : "Clic para hacer portada"}
                style={{ cursor: max > 1 ? "pointer" : "default" }}
              />
              {idx === 0 ? <span className="admin-upload__cover">Portada</span> : null}
              <button
                type="button"
                className="admin-upload__remove"
                onClick={() => removeAt(idx)}
                aria-label="Quitar imagen"
              >
                <IconClose className="icon--sm" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
