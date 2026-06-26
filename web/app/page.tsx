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
    <main className="min-h-screen pb-20">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--red)] shrink-0 animate-[pulse-red_1.4s_ease-in-out_infinite]" />
            <span className="font-mono text-xs font-semibold tracking-widest text-[var(--text)]">
              SOS VENEZUELA
            </span>
            <span className="hidden sm:inline font-mono text-[0.6rem] text-[var(--text-faint)] tracking-wider border-l border-[var(--border)] pl-3">
              DESAPARECIDOS
            </span>
          </div>
          <Link href="/agregar" className="font-mono text-[0.72rem] font-semibold bg-[var(--red)] text-white px-4 py-2 rounded-sm tracking-wider no-underline">
            + REPORTAR
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-10 sm:pt-16">
        <p className="anim-1 font-mono text-[0.62rem] font-semibold text-[var(--red)] tracking-[0.2em] uppercase flex items-center gap-2 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-[pulse-red_1.4s_ease-in-out_infinite]" />
          EMERGENCIA — SISMO DE JUNIO 2026
        </p>

        <div className="anim-2 border-l-[3px] border-[var(--red)] pl-6 mb-8">
          <h1 className="font-[var(--display)] font-bold italic text-[#f5f0e8] leading-none tracking-tight" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
            Cada nombre<br />
            <span className="not-italic text-[#c8c0b0]">importa.</span>
          </h1>
        </div>

        <div className="anim-3 flex flex-wrap gap-8 items-start pl-6 mb-10">
          <div className="flex-1 min-w-[240px]">
            <p className="font-[var(--sans)] text-base leading-relaxed text-[#7a7060]">
              Hay familias que siguen sin dormir esperando una noticia.
              Si perdiste contacto con alguien, repórtalo aquí — cualquier
              dato ayuda. Si ya apareció, también avísanos, para que su
              nombre deje de estar en esta lista.
            </p>
            <p className="font-[var(--sans)] text-[0.82rem] leading-relaxed text-[#4a4438] mt-4">
              Plataforma ciudadana y sin fines de lucro. No solicitamos dinero.
              Los datos publicados son responsabilidad de quien los reporta.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1 shrink-0">
            <Link href="/agregar" className="block text-center bg-[var(--red)] text-white font-[var(--sans)] text-[0.9rem] font-bold px-7 py-4 rounded no-underline whitespace-nowrap">
              + Reportar a alguien
            </Link>
            <p className="font-mono text-[0.6rem] text-[var(--text-faint)] text-center tracking-wider">
              GRATIS · MENOS DE 1 MINUTO
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="anim-3 border-t border-b border-[var(--border)] bg-[#0e0e0e]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 flex flex-wrap">
          {[
            { label: "PERSONAS REPORTADAS", value: stats?.total   ?? 0, color: "#f5f0e8" },
            { label: "AÚN SIN CONTACTO",    value: stats?.missing ?? 0, color: "var(--red)" },
            { label: "LOCALIZADAS",          value: stats?.found  ?? 0, color: "var(--green)" },
          ].map((s) => (
            <div key={s.label} className="flex-1 min-w-[120px] flex items-baseline gap-3 py-4 px-3 border-r border-[var(--border)] last:border-r-0">
              <span className="font-[var(--display)] font-bold leading-none" style={{ fontSize: "clamp(1.6rem, 6vw, 2.6rem)", color: s.color }}>
                {s.value.toLocaleString("es-VE")}
              </span>
              <span className="font-mono text-[0.57rem] text-[var(--text-faint)] tracking-widest">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── EMERGENCY PHONES ── */}
      <div className="anim-4 bg-[#1a0505] border-b border-[#3a1010]">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-3 flex flex-wrap items-center gap-4">
          <span className="font-mono text-[0.58rem] font-semibold text-[#cc6060] tracking-[0.16em] whitespace-nowrap flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.53 2 2 0 0 1 3.68 1.36h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            EMERGENCIAS
          </span>
          <div className="w-px h-5 bg-[#3a1010]" />
          {PHONES.map((p, i) => (
            <a key={p.number} href={`tel:${p.number}`} className="flex items-baseline gap-1 no-underline">
              <span className="font-[var(--display)] text-2xl font-bold text-[#e8a0a0] leading-none">{p.number}</span>
              <span className="font-mono text-[0.58rem] text-[#7a4040] tracking-wider">{p.label}</span>
              {i < PHONES.length - 1 && <span className="text-[#3a1010] ml-2 font-mono text-sm">·</span>}
            </a>
          ))}
        </div>
      </div>

      {/* ── SEARCH + GRID ── */}
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 mt-10">
        <div className="mb-6">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {persons.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-faint)] font-mono text-sm">
            {q ? `No se encontraron resultados para "${q}"` : "No hay registros aún. Sé el primero en reportar."}
          </div>
        ) : (
          <ResultsGrid key={q} initial={persons} total={total} query={q} />
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="mx-auto max-w-[1100px] px-4 sm:px-6 mt-16 pt-8 border-t border-[var(--border)] flex flex-wrap justify-between items-start gap-6">
        <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-wider leading-relaxed">
          © 2026 SOS VENEZUELA<br />
          HECHO POR VENEZOLANOS, PARA VENEZOLANOS
        </p>
        <p className="font-[var(--sans)] text-[0.78rem] text-[#4a4438] leading-relaxed max-w-sm">
          Ante una emergencia activa, llama a los organismos de rescate.
          Esta herramienta es ciudadana y no partidista.
        </p>
      </footer>

    </main>
  );
}
