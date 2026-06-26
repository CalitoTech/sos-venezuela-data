"use client";

import Link from "next/link";
import Image from "next/image";
import { MissingPerson } from "@/lib/db";
import { StatusBadge } from "./StatusBadge";
import { formatDate, cleanText } from "@/lib/format";

const PHOTO_SIZE = 52;
const photoStyle = {
  width: PHOTO_SIZE,
  height: PHOTO_SIZE,
  objectFit: "cover" as const,
  borderRadius: 2,
  flexShrink: 0,
  filter: "grayscale(20%)",
};

// Only Cloudinary (our own uploads) goes through next/image optimization.
// Photos scraped from arbitrary hosts fall back to a plain lazy <img> so an
// un-allow-listed host can never 400 the optimizer and blank out the card.
function PersonPhoto({ src, alt }: { src: string; alt: string }) {
  let optimizable = false;
  try {
    optimizable = new URL(src).hostname === "res.cloudinary.com";
  } catch {
    optimizable = false;
  }

  if (optimizable) {
    return (
      <Image src={src} alt={alt} width={PHOTO_SIZE} height={PHOTO_SIZE} style={photoStyle} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={PHOTO_SIZE}
      height={PHOTO_SIZE}
      style={photoStyle}
    />
  );
}

export function PersonCard({ p, index }: { p: MissingPerson; index: number }) {
  const location = cleanText(p.last_seen_location);
  const seenDate = formatDate(p.last_seen_date);

  return (
    <Link
      href={`/persona/${p.id}`}
      style={{ animationDelay: `${index * 40}ms`, height: "100%" }}
      className="animate-fade-in-up block"
    >
      <article
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderTop: p.status === "missing" ? "2px solid var(--red)" : "2px solid var(--border-hi)",
          borderRadius: 4,
          padding: "1.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          height: "100%",
          transition: "border-color 0.15s, background 0.15s",
          cursor: "pointer",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
          (e.currentTarget as HTMLElement).style.background = "#161616";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
        }}
      >
        {/* Photo + name row */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          {p.photo_url ? (
            <PersonPhoto src={p.photo_url} alt={p.full_name} />
          ) : (
            <div style={{
              width: 52, height: 52, flexShrink: 0, borderRadius: 2,
              background: "#1e1e1e", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-faint)", fontSize: "1.4rem",
            }}>
              ?
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: "var(--display)",
              fontSize: "1.15rem",
              letterSpacing: "0.04em",
              lineHeight: 1.1,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {p.full_name.toUpperCase()}
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 3 }}>
              {p.cedula ? `C.I. ${p.cedula}` : "SIN CÉDULA"}
            </p>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {location && (
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-faint)" }}>LUGAR </span>{location}
            </p>
          )}
          {seenDate && (
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-faint)" }}>FECHA </span>{seenDate}
            </p>
          )}
          {p.age != null && (
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-faint)" }}>EDAD  </span>{p.age} años
            </p>
          )}
        </div>

        <div style={{ marginTop: "auto" }}>
          <StatusBadge status={p.status} />
        </div>
      </article>
    </Link>
  );
}
