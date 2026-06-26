"use client";

import Link from "next/link";
import { MissingPerson } from "@/lib/db";
import { StatusBadge } from "./StatusBadge";

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

export function PersonCard({ p, index }: { p: MissingPerson; index: number }) {
  return (
    <Link
      href={`/persona/${p.id}`}
      style={{ animationDelay: `${index * 40}ms` }}
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
            <img
              src={p.photo_url}
              alt={p.full_name}
              style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 2, flexShrink: 0, filter: "grayscale(20%)" }}
            />
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
          {p.last_seen_location && (
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-faint)" }}>LUGAR </span>{p.last_seen_location}
            </p>
          )}
          {p.last_seen_date && (
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-faint)" }}>FECHA </span>{formatDate(p.last_seen_date)}
            </p>
          )}
          {p.age && (
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
