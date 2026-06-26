"use client";

import { useState, useRef } from "react";

interface PhotoUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
}

export function PhotoUpload({ onUpload, currentUrl }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Error al subir la imagen");

      const data = await res.json();
      setPreview(data.secure_url);
      onUpload(data.secure_url);
    } catch (e) {
      setError("No se pudo subir la foto. Intenta de nuevo.");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Hidden input — acepta archivos y cámara en móvil */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />

      {/* Preview o placeholder */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: "100%", aspectRatio: "1/1", maxWidth: 200,
          borderRadius: 3, overflow: "hidden",
          border: `1px dashed ${uploading ? "var(--amber)" : "var(--border-hi)"}`,
          background: "#1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: uploading ? "wait" : "pointer",
          position: "relative",
          transition: "border-color 0.15s",
        }}
      >
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>+</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: "0.08em" }}>
              SUBIR FOTO
            </div>
          </div>
        )}
        {uploading && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--amber)", letterSpacing: "0.1em" }}>
              SUBIENDO...
            </span>
          </div>
        )}
      </div>

      {/* Botones */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
          disabled={uploading}
          style={{
            background: "var(--bg-input)", border: "1px solid var(--border-hi)",
            borderRadius: 3, color: "var(--text-dim)", fontFamily: "var(--mono)",
            fontSize: "0.68rem", letterSpacing: "0.06em", padding: "0.4rem 0.75rem",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          GALERÍA
        </button>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.setAttribute("capture", "environment");
              inputRef.current.click();
            }
          }}
          disabled={uploading}
          style={{
            background: "var(--bg-input)", border: "1px solid var(--border-hi)",
            borderRadius: 3, color: "var(--text-dim)", fontFamily: "var(--mono)",
            fontSize: "0.68rem", letterSpacing: "0.06em", padding: "0.4rem 0.75rem",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          CÁMARA
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--red)" }}>{error}</p>
      )}
    </div>
  );
}
