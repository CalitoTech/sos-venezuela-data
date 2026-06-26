"use client";

import { useState } from "react";
import type { MissingPerson } from "@/lib/db";
import { searchPersons } from "@/lib/actions";
import { PersonCard } from "./PersonCard";

interface ResultsGridProps {
  initial: MissingPerson[];
  total: number;
  query: string;
}

export function ResultsGrid({ initial, total, query }: ResultsGridProps) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);

  const hasMore = rows.length < total;

  async function loadMore() {
    setLoading(true);
    try {
      const more = await searchPersons(query, rows.length);
      setRows((prev) => [...prev, ...more]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
        MOSTRANDO {rows.length.toLocaleString("es-VE")} DE {total.toLocaleString("es-VE")} REGISTRO{total !== 1 ? "S" : ""}
        {query ? ` PARA "${query.toUpperCase()}"` : ""}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
        alignItems: "stretch",
      }}>
        {rows.map((p, i) => (
          <PersonCard key={p.id} p={p} index={i} />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-hi)",
              borderRadius: 3,
              color: "var(--text)",
              fontFamily: "var(--mono)",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              padding: "0.75rem 2rem",
              cursor: loading ? "wait" : "pointer",
              transition: "border-color 0.15s",
            }}
          >
            {loading ? "CARGANDO..." : "CARGAR MÁS"}
          </button>
        </div>
      )}
    </>
  );
}
