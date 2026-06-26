import Link from "next/link";
import { Suspense } from "react";
import { searchPersons, getStats } from "@/lib/actions";
import { PersonCard } from "@/components/PersonCard";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [persons, stats] = await Promise.all([searchPersons(q), getStats()]);

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 4rem" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "#0d0d0d",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", display: "inline-block", animation: "pulse-red 1.4s ease-in-out infinite" }} />
            <span style={{ fontFamily: "var(--display)", fontSize: "1.4rem", letterSpacing: "0.1em", color: "var(--text)" }}>
              SOS VENEZUELA
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.08em", marginTop: 2 }}>
              DESAPARECIDOS
            </span>
          </div>
          <Link
            href="/agregar"
            style={{
              fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600,
              background: "var(--red)", color: "#fff",
              padding: "0.45rem 1rem", borderRadius: 2,
              textDecoration: "none", letterSpacing: "0.06em",
            }}
          >
            + REPORTAR
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem 0" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {[
            { label: "BUSCADOS",    value: stats?.missing  ?? 0, color: "var(--red)"      },
            { label: "ENCONTRADOS", value: stats?.found    ?? 0, color: "var(--green)"    },
            { label: "FALLECIDOS",  value: stats?.deceased ?? 0, color: "#555"            },
            { label: "TOTAL",       value: stats?.total    ?? 0, color: "var(--text-dim)" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 3, padding: "0.6rem 1.2rem",
            }}>
              <p style={{ fontFamily: "var(--display)", fontSize: "2rem", color: s.color, lineHeight: 1 }}>
                {s.value}
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.1em", marginTop: 2 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: "2rem" }}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Results */}
        {persons.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-faint)", fontFamily: "var(--mono)", fontSize: "0.85rem" }}>
            {q ? `No se encontraron resultados para "${q}"` : "No hay registros aún. Sé el primero en reportar."}
          </div>
        ) : (
          <>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-faint)", letterSpacing: "0.08em", marginBottom: "1rem" }}>
              {persons.length} REGISTRO{persons.length !== 1 ? "S" : ""}{q ? ` PARA "${q.toUpperCase()}"` : ""}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
            }}>
              {persons.map((p, i) => (
                <PersonCard key={p.id} p={p} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
