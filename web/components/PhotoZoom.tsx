"use client";

import { useState, useEffect } from "react";

export function PhotoZoom({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        style={{
          width: "100%", aspectRatio: "3/4", objectFit: "cover",
          borderRadius: 3, filter: "grayscale(15%)",
          cursor: "zoom-in", transition: "filter 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = "grayscale(0%)")}
        onMouseLeave={e => (e.currentTarget.style.filter = "grayscale(15%)")}
      />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
            animation: "fade-in-up 0.15s ease both",
          }}
        >
          <img
            src={src}
            alt={alt}
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: "90vh", maxWidth: "90vw",
              objectFit: "contain", borderRadius: 3,
              boxShadow: "0 0 80px rgba(0,0,0,0.8)",
              cursor: "default",
            }}
          />
          <button
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", top: "1.25rem", right: "1.5rem",
              background: "transparent", border: "1px solid #444",
              borderRadius: 3, color: "#888", fontFamily: "var(--mono)",
              fontSize: "0.75rem", padding: "0.3rem 0.6rem", cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            ESC
          </button>
        </div>
      )}
    </>
  );
}
