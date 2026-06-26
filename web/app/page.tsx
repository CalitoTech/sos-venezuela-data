import Link from "next/link";
import { Suspense } from "react";
import { searchPersons } from "@/lib/actions";
import { countPersons, getStats } from "@/lib/queries";
import { ResultsGrid } from "@/components/ResultsGrid";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

const PHONES = [
  { number: "171",  label: "CANTV" },
  { number: "*1",   label: "Movilnet" },
  { number: "112",  label: "Digitel" },
  { number: "911",  label: "Movistar" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [persons, total, stats] = await Promise.all([
    searchPersons(q),
    countPersons(q),
    getStats(),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 5rem" }}>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "#0a0a0a",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block", animation: "pulse-red 1.4s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", color: "var(--text)" }}>
              SOS VENEZUELA
            </span>
            <span className="header-sub" style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.06em", borderLeft: "1px solid var(--border)", paddingLeft: "0.75rem" }}>
              DESAPARECIDOS
            </span>
          </div>
          <Link href="/agregar" style={{
            fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--red)", color: "#fff",
            padding: "0.45rem 1rem", borderRadius: 2,
            textDecoration: "none", letterSpacing: "0.08em",
          }}>
            + REPORTAR
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem 0",
        borderLeft: "none",
      }}>
        {/* Eyebrow */}
        <p className="anim-1" style={{
          fontFamily: "var(--mono)", fontSize: "0.62rem", fontWeight: 600,
          color: "var(--red)", letterSpacing: "0.2em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", display: "inline-block", animation: "pulse-red 1.4s ease-in-out infinite" }} />
          EMERGENCIA — SISMO DE JUNIO 2026
        </p>

        {/* Headline with red left border */}
        <div className="anim-2" style={{
          borderLeft: "3px solid var(--red)", paddingLeft: "1.5rem",
          marginBottom: "2rem",
        }}>
          <h1 style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(3rem, 7vw, 5.5rem)",
            fontWeight: 700,
            lineHeight: 1.0,
            color: "#f5f0e8",
            letterSpacing: "-0.02em",
            fontStyle: "italic",
          }}>
            Cada nombre<br />
            <span style={{ fontStyle: "normal", color: "#c8c0b0" }}>importa.</span>
          </h1>
        </div>

        {/* Body copy + CTA side by side */}
        <div className="anim-3" style={{
          display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-start",
          paddingLeft: "calc(1.5rem + 3px)", marginBottom: "3rem",
        }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <p style={{
              fontFamily: "var(--sans)", fontSize: "1rem", lineHeight: 1.75,
              color: "#7a7060",
            }}>
              Hay familias que siguen sin dormir esperando una noticia.
              Si perdiste contacto con alguien, repórtalo aquí — cualquier
              dato ayuda. Si ya apareció, también avísanos, para que su
              nombre deje de estar en esta lista.
            </p>
            <p style={{
              fontFamily: "var(--sans)", fontSize: "0.82rem", lineHeight: 1.65,
              color: "#4a4438", marginTop: "1rem",
            }}>
              Plataforma ciudadana y sin fines de lucro. No solicitamos dinero.
              Los datos publicados son responsabilidad de quien los reporta.
            </p>
          </div>

          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.25rem" }}>
            <Link href="/agregar" style={{
              display: "block", textAlign: "center",
              background: "var(--red)", color: "#fff",
              fontFamily: "var(--sans)", fontSize: "0.9rem", fontWeight: 700,
              padding: "1rem 1.75rem", borderRadius: 3,
              textDecoration: "none", letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}>
              + Reportar a alguien
            </Link>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", textAlign: "center", letterSpacing: "0.05em" }}>
              GRATIS · MENOS DE 1 MINUTO
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── tipo periódico, horizontal */}
      <div className="anim-3" style={{
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        background: "#0e0e0e",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem", display: "flex", flexWrap: "wrap" }}>
          {[
            { label: "PERSONAS REPORTADAS", value: stats?.total   ?? 0, color: "#f5f0e8" },
            { label: "AÚN SIN CONTACTO",    value: stats?.missing ?? 0, color: "var(--red)" },
            { label: "LOCALIZADAS",          value: stats?.found  ?? 0, color: "var(--green)" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: "1 1 120px",
              display: "flex", alignItems: "baseline", gap: "0.75rem",
              padding: "1.1rem 1rem",
              borderRight: "1px solid var(--border)",
            }}>
              <span style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(1.6rem, 6vw, 2.6rem)",
                fontWeight: 700, lineHeight: 1, color: s.color,
              }}>
                {s.value.toLocaleString("es-VE")}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.57rem", color: "var(--text-faint)", letterSpacing: "0.12em" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── EMERGENCY PHONES ── franja roja oscura */}
      <div className="anim-4" style={{
        background: "#1a0505", borderBottom: "1px solid #3a1010",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "1rem 1.5rem",
          display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "0.58rem", fontWeight: 600,
            color: "#cc6060", letterSpacing: "0.16em", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.53 2 2 0 0 1 3.68 1.36h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            EMERGENCIAS
          </span>
          <div style={{ width: 1, height: 20, background: "#3a1010" }} />
          {PHONES.map((p, i) => (
            <a key={p.number} href={`tel:${p.number}`} style={{
              display: "flex", alignItems: "baseline", gap: 5,
              textDecoration: "none",
            }}>
              <span style={{ fontFamily: "var(--display)", fontSize: "1.5rem", fontWeight: 700, color: "#e8a0a0", lineHeight: 1 }}>
                {p.number}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.58rem", color: "#7a4040", letterSpacing: "0.06em" }}>
                {p.label}
              </span>
              {i < PHONES.length - 1 && (
                <span style={{ color: "#3a1010", marginLeft: 8, fontFamily: "var(--mono)", fontSize: "0.7rem" }}>·</span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* ── SEARCH + GRID ── */}
      <div style={{ maxWidth: 1100, margin: "2.5rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {persons.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-faint)", fontFamily: "var(--mono)", fontSize: "0.85rem" }}>
            {q ? `No se encontraron resultados para "${q}"` : "No hay registros aún. Sé el primero en reportar."}
          </div>
        ) : (
          <ResultsGrid key={q} initial={persons} total={total} query={q} />
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        maxWidth: 1100, margin: "4rem auto 0", padding: "2rem 1.5rem 0",
        borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: "1.5rem",
      }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.08em", lineHeight: 1.8 }}>
          © 2026 SOS VENEZUELA<br />
          HECHO POR VENEZOLANOS, PARA VENEZOLANOS
        </p>
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "#4a4438", lineHeight: 1.65, maxWidth: 420, textAlign: "right" }}>
          Ante una emergencia activa, llama a los organismos de rescate.
          Esta herramienta es ciudadana y no partidista.
        </p>
      </footer>

    </main>
  );
}
