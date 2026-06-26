import Link from "next/link";
import { Suspense } from "react";
import { searchPersons, getStats } from "@/lib/actions";
import { PersonCard } from "@/components/PersonCard";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

const PHONES = [
  { number: "171",  label: "CANTV fijo" },
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
  const [persons, stats] = await Promise.all([searchPersons(q), getStats()]);

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 5rem" }}>

      {/* ── HEADER ───────────────────────────────────────────── */}
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
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.06em", borderLeft: "1px solid var(--border)", paddingLeft: "0.75rem", marginLeft: "0.1rem" }}>
              DESAPARECIDOS
            </span>
          </div>
          <Link
            href="/agregar"
            style={{
              fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 600,
              background: "var(--red)", color: "#fff",
              padding: "0.45rem 1rem", borderRadius: 2,
              textDecoration: "none", letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            + REPORTAR
          </Link>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "3.5rem 1.5rem 0",
        display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "start",
      }}>
        {/* Left: headline + description */}
        <div>
          <p className="anim-1" style={{
            fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600,
            color: "var(--red)", letterSpacing: "0.18em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", display: "inline-block", animation: "pulse-red 1.4s ease-in-out infinite" }} />
            EMERGENCIA · SISMO DE JUNIO 2026
          </p>

          <h1 className="anim-2" style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
            fontWeight: 900,
            lineHeight: 1.05,
            color: "#f0ece4",
            marginBottom: "1.25rem",
            letterSpacing: "-0.01em",
          }}>
            Reconectemos<br />
            a cada familia.
          </h1>

          <p className="anim-3" style={{
            fontFamily: "var(--sans)", fontSize: "1rem", lineHeight: 1.7,
            color: "#a0998e", maxWidth: 520, marginBottom: "2rem",
          }}>
            Tras el terremoto, muchas familias siguen sin saber de los suyos.
            Si no logras comunicarte con alguien, repórtalo aquí. Y si ya lo
            encontraste, avísanos — para que su nombre dé tranquilidad, no angustia.
          </p>

          <div className="anim-3" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Link href="/agregar" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: "var(--red)", color: "#fff",
              fontFamily: "var(--sans)", fontSize: "1rem", fontWeight: 700,
              padding: "0.95rem 2rem", borderRadius: 4,
              textDecoration: "none", letterSpacing: "0.02em",
              width: "fit-content", transition: "background 0.15s",
            }}>
              + Reportar a alguien
            </Link>
            <span style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-faint)" }}>
              Es gratis y toma menos de un minuto. Solo necesitas su nombre y dónde se le vio por última vez.
            </span>
          </div>
        </div>

        {/* Right: stats */}
        <div className="anim-4" style={{
          display: "flex", flexDirection: "column", gap: "0.6rem",
          paddingTop: "0.5rem", minWidth: 160,
        }}>
          {[
            { label: "PERSONAS REPORTADAS", value: stats?.total   ?? 0, color: "#f0ece4" },
            { label: "AÚN SIN CONTACTO",    value: stats?.missing ?? 0, color: "var(--red)" },
            { label: "LOCALIZADOS",          value: stats?.found  ?? 0, color: "var(--green)" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 4, padding: "0.75rem 1.1rem",
            }}>
              <p style={{ fontFamily: "var(--display)", fontSize: "2.2rem", color: s.color, lineHeight: 1, marginBottom: 3 }}>
                {s.value.toLocaleString("es-VE")}
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.58rem", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMERGENCY PHONES ─────────────────────────────────── */}
      <section className="anim-4" style={{
        maxWidth: 1100, margin: "2.5rem auto 0", padding: "0 1.5rem",
      }}>
        <div style={{
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #111 0%, #0e0e0e 100%)",
        }}>
          <p style={{
            fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 600,
            color: "var(--amber)", letterSpacing: "0.18em", textTransform: "uppercase",
            marginBottom: "1rem", display: "flex", alignItems: "center", gap: 7,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.53 2 2 0 0 1 3.68 1.36h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            TELÉFONOS DE EMERGENCIA · VENEZUELA
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.6rem",
          }}>
            {PHONES.map(p => (
              <a key={p.number} href={`tel:${p.number}`} style={{
                background: "#181818", border: "1px solid var(--border)",
                borderRadius: 4, padding: "0.75rem 1rem",
                textDecoration: "none", display: "block",
                transition: "border-color 0.15s",
              }}>
                <p style={{ fontFamily: "var(--display)", fontSize: "1.7rem", color: "#f0ece4", lineHeight: 1, marginBottom: 3 }}>
                  {p.number}
                </p>
                <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                  {p.label}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEARCH + GRID ─────────────────────────────────────── */}
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
          <>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              {persons.length} REGISTRO{persons.length !== 1 ? "S" : ""}{q ? ` PARA "${q.toUpperCase()}"` : ""}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
              alignItems: "stretch",
            }}>
              {persons.map((p, i) => (
                <PersonCard key={p.id} p={p} index={i} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── DISCLAIMER ───────────────────────────────────────── */}
      <footer style={{
        maxWidth: 1100, margin: "4rem auto 0", padding: "0 1.5rem",
        borderTop: "1px solid var(--border)", paddingTop: "2rem",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem",
        }}>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.14em", marginBottom: "0.6rem" }}>
              SOBRE ESTA PLATAFORMA
            </p>
            <p style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", lineHeight: 1.65, color: "#666" }}>
              Iniciativa ciudadana, voluntaria y sin fines de lucro para ayudar a localizar a las personas
              desaparecidas tras el terremoto de 2026. No solicitamos ni gestionamos dinero, donaciones
              ni ayudas de ningún tipo.
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.14em", marginBottom: "0.6rem" }}>
              AVISO LEGAL
            </p>
            <p style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", lineHeight: 1.65, color: "#666" }}>
              No vendemos ni compartimos tu información con terceros. Los datos publicados son
              responsabilidad de quien los envía — verifica siempre antes de difundir. Ante una
              emergencia activa, llama a los organismos de rescate.
            </p>
          </div>
        </div>
        <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.08em", marginTop: "1.5rem", paddingBottom: "1rem" }}>
          © 2026 SOS VENEZUELA · HECHO POR VENEZOLANOS
        </p>
      </footer>

    </main>
  );
}
